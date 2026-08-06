import { hasRole } from '../common/helpers/role.helper';
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

// ── Entity imports ────────────────────────────────────────────────────────────
import { RestockRequest, RestockRequestStatus } from './entities/restock-request.entity';
import { RestockRequestItem } from './entities/restock-request-item.entity';
import { CentralStock } from '../inventory/entities/central-stock.entity';
import { BranchInventory } from '../inventory/entities/branch-inventory.entity';
import { StockMovement, StockMovementType } from '../inventory/entities/stock-movement.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Book } from '../catalog/entities/book.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

// ── DTO imports ───────────────────────────────────────────────────────────────
import { CreateRestockRequestDto } from './dto/create-restock-request.dto';
import { ReviewRestockRequestDto, ReviewStatus } from './dto/review-restock-request.dto';
import { GetRestockRequestsQueryDto } from './dto/get-restock-requests-query.dto';

// ── Helpers ──────────────────────────────────────────────────────────────────
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import {
  decrementCentralStock,
  incrementBranchStock,
  writeStockMovement,
} from '../common/helpers/stock.helper';

@Injectable()
export class RestockService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(RestockRequest)
    private readonly restockRequestRepository: Repository<RestockRequest>,
    @InjectRepository(RestockRequestItem)
    private readonly restockRequestItemRepository: Repository<RestockRequestItem>,
    @InjectRepository(CentralStock)
    private readonly centralStockRepository: Repository<CentralStock>,
    @InjectRepository(BranchInventory)
    private readonly branchInventoryRepository: Repository<BranchInventory>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── HELPER: Check user branch read access ──────────────────────────────────
  private checkBranchAccess(currentUser: JwtPayload, branchId: string) {
    const chainWideRoles = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.FINANCE,
      UserRole.CENTRAL_INVENTORY_MANAGER,
    ];

    if (chainWideRoles.includes(currentUser.primaryRole as UserRole)) {
      return; // Chain-wide has full visibility
    }

    if (currentUser.branchId !== branchId) {
      throw new ForbiddenException(
        `Access denied. You belong to branch ${currentUser.branchId}, but requested branch ${branchId}`,
      );
    }
  }

  // ── 1. CREATE REQUEST ──────────────────────────────────────────────────────

  async createRequest(
    dto: CreateRestockRequestDto,
    currentUser: JwtPayload,
    ipAddress: string,
  ): Promise<RestockRequest> {
    const branchId = currentUser.branchId;
    if (!branchId) {
      throw new BadRequestException('Restock requests must be created under a specific branch context.');
    }

    // Verify branch exists and is NOT a warehouse
    const branch = await this.branchRepository.findOne({ where: { id: branchId } });
    if (!branch) throw new NotFoundException(`Branch with ID ${branchId} not found`);
    if (branch.type === 'WAREHOUSE') {
      throw new BadRequestException('Central Warehouse cannot create restock requests.');
    }

    if (dto.items.length === 0) {
      throw new BadRequestException('Restock request must contain at least one book item.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create request
      const request = queryRunner.manager.create(RestockRequest, {
        branchId,
        requestedById: currentUser.userId,
        status: RestockRequestStatus.PENDING,
      });
      const savedRequest = await queryRunner.manager.save(RestockRequest, request);

      // Create items
      for (const itemDto of dto.items) {
        const book = await queryRunner.manager.findOne(Book, {
          where: { id: itemDto.bookId, isActive: true },
        });
        if (!book) throw new NotFoundException(`Book with ID ${itemDto.bookId} not found`);

        const item = queryRunner.manager.create(RestockRequestItem, {
          restockRequestId: savedRequest.id,
          bookId: itemDto.bookId,
          quantityRequested: itemDto.quantity,
          quantityApproved: 0,
          quantityReceived: 0,
        });
        await queryRunner.manager.save(RestockRequestItem, item);
      }

      // Audit Log
      await queryRunner.manager.save(AuditLog, {
        userId: currentUser.userId,
        action: 'RESTOCK_REQUEST_CREATED',
        entityType: 'RestockRequest',
        entityId: savedRequest.id,
        beforeJson: null,
        afterJson: savedRequest,
        ipAddress,
      });

      await queryRunner.commitTransaction();

      // Trigger SSE update
      this.notificationsService.triggerRefresh('restock_changed');

      return savedRequest;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ── 2. GET REQUESTS ────────────────────────────────────────────────────────

  async getRequests(query: GetRestockRequestsQueryDto, currentUser: JwtPayload) {
    const effectiveBranchId = currentUser.branchId || query.branchId;
    if (currentUser.branchId) {
      this.checkBranchAccess(currentUser, currentUser.branchId);
    }

    const { status, page = 1, limit = 15 } = query;
    const skip = (page - 1) * limit;

    const qb = this.restockRequestRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.branch', 'branch')
      .leftJoinAndSelect('r.requestedBy', 'requestedBy')
      .leftJoinAndSelect('r.reviewedBy', 'reviewedBy')
      .leftJoinAndSelect('r.items', 'items')
      .leftJoinAndSelect('items.book', 'book')
      .leftJoinAndMapOne('items.centralStock', CentralStock, 'centralStock', 'centralStock.bookId = book.id')
      .orderBy('r.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (effectiveBranchId) {
      qb.andWhere('r.branchId = :branchId', { branchId: effectiveBranchId });
    }

    if (status) {
      qb.andWhere('r.status = :status', { status });
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── 3. GET SINGLE REQUEST ──────────────────────────────────────────────────

  async findOne(id: string, currentUser: JwtPayload): Promise<RestockRequest> {
    const request = await this.restockRequestRepository.findOne({
      where: { id },
      relations: ['branch', 'requestedBy', 'reviewedBy', 'items', 'items.book'],
    });

    if (!request) throw new NotFoundException(`Restock request with ID ${id} not found`);

    this.checkBranchAccess(currentUser, request.branchId);
    return request;
  }

  // ── 4. REVIEW REQUEST ──────────────────────────────────────────────────────

  async reviewRequest(
    id: string,
    dto: ReviewRestockRequestDto,
    currentUser: JwtPayload,
    ipAddress: string,
  ): Promise<RestockRequest> {
    const request = await this.restockRequestRepository.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!request) throw new NotFoundException(`Restock request with ID ${id} not found`);

    if (request.status !== RestockRequestStatus.PENDING) {
      throw new ConflictException('Only pending restock requests can be reviewed.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const beforeState = { ...request };

      request.reviewedById = currentUser.userId;
      request.reviewedAt = new Date();
      request.reviewNote = dto.note || null;

      if (dto.status === ReviewStatus.REJECTED) {
        request.status = RestockRequestStatus.REJECTED;
        await queryRunner.manager.save(RestockRequest, request);
      } else {
        // APPROVED / PARTIALLY_APPROVED flow
        if (!dto.items || dto.items.length === 0) {
          throw new BadRequestException('Approved items list is required when approving a request.');
        }

        let hasPartial = false;

        for (const item of request.items) {
          const approvedItemDto = dto.items.find((i) => i.bookId === item.bookId);
          if (!approvedItemDto) {
            throw new BadRequestException(`Approved quantity mapping is missing for book ID ${item.bookId}`);
          }

          if (approvedItemDto.quantityApproved > item.quantityRequested) {
            throw new BadRequestException(
              `Approved quantity (${approvedItemDto.quantityApproved}) cannot exceed requested quantity (${item.quantityRequested}) for book ID ${item.bookId}`,
            );
          }

          if (approvedItemDto.quantityApproved < item.quantityRequested) {
            hasPartial = true;
          }

          item.quantityApproved = approvedItemDto.quantityApproved;
          await queryRunner.manager.save(RestockRequestItem, item);
        }

        request.status = hasPartial
          ? RestockRequestStatus.PARTIALLY_APPROVED
          : RestockRequestStatus.APPROVED;

        await queryRunner.manager.save(RestockRequest, request);
      }

      // Audit Log
      await queryRunner.manager.save(AuditLog, {
        userId: currentUser.userId,
        action: `RESTOCK_REQUEST_REVIEWED_${dto.status}`,
        entityType: 'RestockRequest',
        entityId: request.id,
        beforeJson: beforeState,
        afterJson: request,
        ipAddress,
      });

      await queryRunner.commitTransaction();

      // Trigger SSE update
      this.notificationsService.triggerRefresh('restock_changed');

      return request;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ── 5. DISPATCH REQUEST ────────────────────────────────────────────────────

  async dispatchRequest(
    id: string,
    currentUser: JwtPayload,
    ipAddress: string,
  ): Promise<RestockRequest> {
    const request = await this.restockRequestRepository.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!request) throw new NotFoundException(`Restock request with ID ${id} not found`);

    const validStatuses = [RestockRequestStatus.APPROVED, RestockRequestStatus.PARTIALLY_APPROVED];
    if (!validStatuses.includes(request.status)) {
      throw new ConflictException('Only approved or partially approved requests can be dispatched.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const beforeState = { ...request };

      request.status = RestockRequestStatus.FULFILLED;
      const saved = await queryRunner.manager.save(RestockRequest, request);

      // Decrement central stock and write movements
      for (const item of request.items) {
        if (item.quantityApproved > 0) {
          // Atomically decrement central stock. Throws INSUFFICIENT_CENTRAL_STOCK if warehouse doesn't have it.
          await decrementCentralStock(queryRunner, item.bookId, item.quantityApproved);

          // Write StockMovement TRANSFER_OUT from Central Warehouse (branchId = null)
          await writeStockMovement(queryRunner, {
            bookId: item.bookId,
            branchId: null, // null = central warehouse
            type: 'TRANSFER_OUT',
            quantity: -item.quantityApproved,
            performedById: currentUser.userId,
            referenceType: 'RESTOCK_REQUEST',
            referenceId: request.id,
          });
        }
      }

      // Audit Log
      await queryRunner.manager.save(AuditLog, {
        userId: currentUser.userId,
        action: 'RESTOCK_REQUEST_DISPATCHED',
        entityType: 'RestockRequest',
        entityId: request.id,
        beforeJson: beforeState,
        afterJson: saved,
        ipAddress,
      });

      await queryRunner.commitTransaction();

      // Trigger SSE update
      this.notificationsService.triggerRefresh('stock_changed');
      this.notificationsService.triggerRefresh('restock_changed');

      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ── 6. RECEIVE REQUEST ─────────────────────────────────────────────────────

  async receiveRequest(
    id: string,
    currentUser: JwtPayload,
    ipAddress: string,
  ): Promise<RestockRequest> {
    const request = await this.restockRequestRepository.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!request) throw new NotFoundException(`Restock request with ID ${id} not found`);

    // Verify user belongs to requesting branch
    this.checkBranchAccess(currentUser, request.branchId);

    if (request.status !== RestockRequestStatus.FULFILLED) {
      throw new ConflictException('Only fulfilled restock requests can be received.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const beforeState = { ...request };

      request.status = RestockRequestStatus.RECEIVED;
      const saved = await queryRunner.manager.save(RestockRequest, request);

      // Increment branch stock and write movements
      for (const item of request.items) {
        if (item.quantityApproved > 0) {
          // Set quantityReceived to matched approved
          item.quantityReceived = item.quantityApproved;
          await queryRunner.manager.save(RestockRequestItem, item);

          // Atomically increment branch stock
          await incrementBranchStock(queryRunner, request.branchId, item.bookId, item.quantityApproved);

          // Write StockMovement TRANSFER_IN into branch
          await writeStockMovement(queryRunner, {
            bookId: item.bookId,
            branchId: request.branchId,
            type: 'TRANSFER_IN',
            quantity: item.quantityApproved,
            performedById: currentUser.userId,
            referenceType: 'RESTOCK_REQUEST',
            referenceId: request.id,
          });
        }
      }

      // Audit Log
      await queryRunner.manager.save(AuditLog, {
        userId: currentUser.userId,
        action: 'RESTOCK_REQUEST_RECEIVED',
        entityType: 'RestockRequest',
        entityId: request.id,
        beforeJson: beforeState,
        afterJson: saved,
        ipAddress,
      });

      await queryRunner.commitTransaction();

      // Trigger SSE update
      this.notificationsService.triggerRefresh('stock_changed');
      this.notificationsService.triggerRefresh('restock_changed');

      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
