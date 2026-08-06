import { hasRole } from '../common/helpers/role.helper';
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';

// ── Entity imports ────────────────────────────────────────────────────────────
import { CentralStock } from './entities/central-stock.entity';
import { BranchInventory } from './entities/branch-inventory.entity';
import { StockMovement, StockMovementType, AdjustmentReason } from './entities/stock-movement.entity';
import { Book } from '../catalog/entities/book.entity';
import { Branch } from '../branches/entities/branch.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

// ── DTO imports ───────────────────────────────────────────────────────────────
import { UpdateThresholdDto } from './dto/update-threshold.dto';
import { CreateBranchInventoryDto } from './dto/create-branch-inventory.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { GetInventoryQueryDto } from './dto/get-inventory-query.dto';
import { GetMovementsQueryDto } from './dto/get-movements-query.dto';

// ── Helpers ──────────────────────────────────────────────────────────────────
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import {
  decrementBranchStock,
  incrementBranchStock,
  decrementCentralStock,
  incrementCentralStock,
  writeStockMovement,
} from '../common/helpers/stock.helper';

@Injectable()
export class InventoryService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CentralStock)
    private readonly centralStockRepository: Repository<CentralStock>,
    @InjectRepository(BranchInventory)
    private readonly branchInventoryRepository: Repository<BranchInventory>,
    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── HELPER: Validate user role can view/write this branch ──────────────────
  private checkBranchAccess(currentUser: JwtPayload, branchId: string) {
    const chainWideRoles = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.CENTRAL_INVENTORY_MANAGER,
      UserRole.FINANCE,
    ];

    if (chainWideRoles.includes(currentUser.primaryRole as UserRole)) {
      return; // Chain-wide has full read/write visibility
    }

    // Branch-scoped users can ONLY view/write their own branch
    if (currentUser.branchId !== branchId) {
      throw new ForbiddenException(
        `Access denied. You belong to branch ${currentUser.branchId}, but requested branch ${branchId}`,
      );
    }
  }

  // ── CENTRAL STOCK OPERATIONS ───────────────────────────────────────────────

  async getCentralStock(query: GetInventoryQueryDto) {
    const { search, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const qb = this.centralStockRepository
      .createQueryBuilder('cs')
      .leftJoinAndSelect('cs.book', 'book')
      .leftJoinAndSelect('book.author', 'author')
      .leftJoinAndSelect('book.category', 'category')
      .orderBy('book.title', 'ASC')
      .skip(skip)
      .take(limit);

    if (search) {
      qb.where('book.title LIKE :search OR book.isbn LIKE :search OR book.barcode LIKE :search', {
        search: `%${search}%`,
      });
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

  async getCentralStockLow(query: GetInventoryQueryDto) {
    const { search, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const qb = this.centralStockRepository
      .createQueryBuilder('cs')
      .leftJoinAndSelect('cs.book', 'book')
      .leftJoinAndSelect('book.author', 'author')
      .leftJoinAndSelect('book.category', 'category')
      .where('cs.quantity <= cs.reorderThreshold')
      .orderBy('book.title', 'ASC')
      .skip(skip)
      .take(limit);

    if (search) {
      qb.andWhere('(book.title LIKE :search OR book.isbn LIKE :search OR book.barcode LIKE :search)', {
        search: `%${search}%`,
      });
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

  async updateCentralThreshold(
    bookId: string,
    dto: UpdateThresholdDto,
    currentUser: JwtPayload,
    ipAddress: string,
  ): Promise<CentralStock> {
    const row = await this.centralStockRepository.findOne({ where: { bookId } });
    if (!row) throw new NotFoundException(`Central stock for book ${bookId} not found`);

    const beforeState = { ...row };
    row.reorderThreshold = dto.threshold;
    const saved = await this.centralStockRepository.save(row);

    // Audit Log
    await this.auditLogRepository.save({
      userId: currentUser.userId,
      action: 'CENTRAL_STOCK_THRESHOLD_UPDATED',
      entityType: 'CentralStock',
      entityId: saved.id,
      beforeJson: beforeState,
      afterJson: saved,
      ipAddress,
    });

    return saved;
  }

  // ── BRANCH INVENTORY OPERATIONS ────────────────────────────────────────────

  async getBranchInventory(branchId: string, query: GetInventoryQueryDto, currentUser: JwtPayload) {
    this.checkBranchAccess(currentUser, branchId);

    const { search, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const qb = this.branchInventoryRepository
      .createQueryBuilder('bi')
      .leftJoinAndSelect('bi.book', 'book')
      .leftJoinAndSelect('book.author', 'author')
      .leftJoinAndSelect('book.category', 'category')
      .where('bi.branchId = :branchId', { branchId })
      .orderBy('book.title', 'ASC')
      .skip(skip)
      .take(limit);

    if (search) {
      qb.andWhere('(book.title LIKE :search OR book.isbn LIKE :search OR book.barcode LIKE :search)', {
        search: `%${search}%`,
      });
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

  async getBranchInventoryLow(branchId: string, query: GetInventoryQueryDto, currentUser: JwtPayload) {
    this.checkBranchAccess(currentUser, branchId);

    const { search, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const qb = this.branchInventoryRepository
      .createQueryBuilder('bi')
      .leftJoinAndSelect('bi.book', 'book')
      .leftJoinAndSelect('book.author', 'author')
      .leftJoinAndSelect('book.category', 'category')
      .where('bi.branchId = :branchId', { branchId })
      .andWhere('bi.quantity <= bi.reorderThreshold')
      .orderBy('book.title', 'ASC')
      .skip(skip)
      .take(limit);

    if (search) {
      qb.andWhere('(book.title LIKE :search OR book.isbn LIKE :search OR book.barcode LIKE :search)', {
        search: `%${search}%`,
      });
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

  async addBranchInventory(
    branchId: string,
    dto: CreateBranchInventoryDto,
    currentUser: JwtPayload,
    ipAddress: string,
  ): Promise<BranchInventory> {
    this.checkBranchAccess(currentUser, branchId);

    // Verify branch exists
    const branch = await this.branchRepository.findOne({ where: { id: branchId } });
    if (!branch) throw new NotFoundException(`Branch with ID ${branchId} not found`);

    // Verify book exists
    const book = await this.bookRepository.findOne({ where: { id: dto.bookId } });
    if (!book) throw new NotFoundException(`Book with ID ${dto.bookId} not found`);

    // Verify branch doesn't already have this book registered
    const existing = await this.branchInventoryRepository.findOne({
      where: { branchId, bookId: dto.bookId },
    });
    if (existing) {
      throw new ConflictException(`Book ${book.title} is already registered in this branch inventory`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Insert atomically (opening qty >= 0)
      await incrementBranchStock(queryRunner, branchId, dto.bookId, dto.quantity || 0);

      // 2. Load the row to set threshold and return
      const row = await queryRunner.manager.findOne(BranchInventory, {
        where: { branchId, bookId: dto.bookId },
      });
      if (!row) throw new Error('Failed to find created branch inventory row');

      if (dto.threshold !== undefined) {
        row.reorderThreshold = dto.threshold;
        await queryRunner.manager.save(BranchInventory, row);
      }

      // 3. Write StockMovement if opening stock > 0
      if (dto.quantity && dto.quantity > 0) {
        await writeStockMovement(queryRunner, {
          bookId: dto.bookId,
          branchId,
          type: 'ADJUSTMENT' as StockMovementType,
          quantity: dto.quantity,
          performedById: currentUser.userId,
          reason: 'CORRECTION' as any,
          note: 'Opening inventory setup',
        });
      }

      // 4. Audit Log
      await queryRunner.manager.save(AuditLog, {
        userId: currentUser.userId,
        action: 'BRANCH_INVENTORY_ADDED',
        entityType: 'BranchInventory',
        entityId: row.id,
        beforeJson: null,
        afterJson: row,
        ipAddress,
      });

      await queryRunner.commitTransaction();

      // Trigger real-time sync event
      this.notificationsService.triggerRefresh('stock_changed');

      return row;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateBranchThreshold(
    branchId: string,
    bookId: string,
    dto: UpdateThresholdDto,
    currentUser: JwtPayload,
    ipAddress: string,
  ): Promise<BranchInventory> {
    this.checkBranchAccess(currentUser, branchId);

    const row = await this.branchInventoryRepository.findOne({
      where: { branchId, bookId },
    });
    if (!row) throw new NotFoundException(`Book ${bookId} not registered in branch ${branchId}`);

    const beforeState = { ...row };
    row.reorderThreshold = dto.threshold;
    const saved = await this.branchInventoryRepository.save(row);

    // Audit Log
    await this.auditLogRepository.save({
      userId: currentUser.userId,
      action: 'BRANCH_STOCK_THRESHOLD_UPDATED',
      entityType: 'BranchInventory',
      entityId: saved.id,
      beforeJson: beforeState,
      afterJson: saved,
      ipAddress,
    });

    return saved;
  }

  async adjustBranchStock(
    branchId: string,
    bookId: string,
    dto: AdjustStockDto,
    currentUser: JwtPayload,
    ipAddress: string,
  ): Promise<BranchInventory> {
    this.checkBranchAccess(currentUser, branchId);

    const row = await this.branchInventoryRepository.findOne({
      where: { branchId, bookId },
    });
    if (!row) throw new NotFoundException(`Book ${bookId} not registered in branch ${branchId}`);

    if (dto.quantity === 0) {
      throw new BadRequestException('Adjustment quantity cannot be zero');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const beforeState = { ...row };

      if (dto.quantity < 0) {
        // Atomic decrement with safety check
        await decrementBranchStock(queryRunner, branchId, bookId, Math.abs(dto.quantity));
      } else {
        // Atomic increment
        await incrementBranchStock(queryRunner, branchId, bookId, dto.quantity);
      }

      // Load updated state
      const updated = await queryRunner.manager.findOne(BranchInventory, {
        where: { branchId, bookId },
      });
      if (!updated) throw new Error('Updated inventory row not found');

      // Write StockMovement
      await writeStockMovement(queryRunner, {
        bookId,
        branchId,
        type: 'ADJUSTMENT' as StockMovementType,
        quantity: dto.quantity,
        performedById: currentUser.userId,
        reason: dto.reason as any,
        note: dto.note,
      });

      // Write Audit Log
      await queryRunner.manager.save(AuditLog, {
        userId: currentUser.userId,
        action: 'BRANCH_STOCK_ADJUSTED',
        entityType: 'BranchInventory',
        entityId: updated.id,
        beforeJson: beforeState,
        afterJson: updated,
        ipAddress,
      });

      await queryRunner.commitTransaction();

      // Trigger SSE notification
      this.notificationsService.triggerRefresh('stock_changed');

      return updated;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ── STOCK MOVEMENTS LEDGER ─────────────────────────────────────────────────

  async getStockMovements(query: GetMovementsQueryDto) {
    const { bookId, branchId, type, startDate, endDate, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (bookId) where.bookId = bookId;

    if (branchId !== undefined) {
      // Omit/null branchId means central warehouse movements in DB structure
      where.branchId = branchId;
    }

    if (type) where.type = type;

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date('2000-01-01');
      const end = endDate ? new Date(endDate) : new Date('2100-01-01');
      where.createdAt = Between(start, end);
    }

    const [items, total] = await this.stockMovementRepository.findAndCount({
      where,
      relations: ['book', 'branch', 'performedBy'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
