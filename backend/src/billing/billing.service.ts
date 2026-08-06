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
import { Bill, PaymentStatus, PaymentMode, BillStatus } from './entities/bill.entity';
import { BillItem } from './entities/bill-item.entity';
import { Book } from '../catalog/entities/book.entity';
import { Branch } from '../branches/entities/branch.entity';
import { User } from '../users/entities/user.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

// ── DTO imports ───────────────────────────────────────────────────────────────
import { CreateBillDto } from './dto/create-bill.dto';
import { GetBillsQueryDto } from './dto/get-bills-query.dto';

// ── Helpers ──────────────────────────────────────────────────────────────────
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { generateBillNumber } from '../common/helpers/bill-number.helper';
import {
  decrementBranchStock,
  incrementBranchStock,
  writeStockMovement,
} from '../common/helpers/stock.helper';

@Injectable()
export class BillingService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Bill)
    private readonly billRepository: Repository<Bill>,
    @InjectRepository(BillItem)
    private readonly billItemRepository: Repository<BillItem>,
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
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

  // ── 1. CHECKOUT ────────────────────────────────────────────────────────────

  async checkout(
    dto: CreateBillDto,
    currentUser: JwtPayload,
    ipAddress: string,
  ): Promise<Bill> {
    // 1. Resolve branch context (must be branch scoped for front-office/manager)
    const branchId = currentUser.branchId;
    if (!branchId) {
      throw new BadRequestException(
        'Chain-wide roles must perform transactions under a specific branch scope (branchId context is missing).',
      );
    }

    const branch = await this.branchRepository.findOne({ where: { id: branchId } });
    if (!branch) throw new NotFoundException(`Branch with ID ${branchId} not found`);

    if (dto.items.length === 0) {
      throw new BadRequestException('Checkout must contain at least one item');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Generate daily unique bill number inside transaction for safety
      const billNumber = await generateBillNumber(this.dataSource, branch.code, queryRunner.manager);

      let subTotal = 0;
      let totalCost = 0;
      const billItemsToSave: Partial<BillItem>[] = [];

      // Validate stock availability and calculate prices
      for (const item of dto.items) {
        // Load book inside transaction to ensure price accuracy
        const book = await queryRunner.manager.findOne(Book, {
          where: { id: item.bookId, isActive: true },
        });
        if (!book) throw new NotFoundException(`Book with ID ${item.bookId} not found`);

        // Atomically decrement stock. Will throw INSUFFICIENT_STOCK if stock is too low.
        await decrementBranchStock(queryRunner, branchId, item.bookId, item.quantity);

        const lineTotal = Number(book.price) * item.quantity;
        subTotal += lineTotal;

        const unitCost = Number(book.costPrice || 0);
        totalCost += unitCost * item.quantity;

        billItemsToSave.push({
          bookId: item.bookId,
          quantity: item.quantity,
          unitPrice: book.price,
          unitCost: unitCost,
          lineTotal,
        });
      }

      // Validate discount
      const discount = dto.discount || 0;
      if (discount < 0) throw new BadRequestException('Discount cannot be negative');
      if (discount > subTotal) {
        throw new BadRequestException('Discount cannot be greater than bill subtotal');
      }

      const totalAmount = subTotal - discount;

      // 2. Save Bill entity
      const newBill = queryRunner.manager.create(Bill, {
        billNumber,
        branchId,
        createdById: currentUser.userId,
        subTotal,
        discount,
        totalAmount,
        totalCost,
        paymentStatus: dto.paymentStatus,
        paymentMode: dto.paymentMode || null,
        status: BillStatus.COMPLETED,
        customerName: dto.customerName || null,
        customerPhone: dto.customerPhone || null,
        exhibitionId: dto.exhibitionId || null,
      });

      const savedBill = await queryRunner.manager.save(Bill, newBill);

      // 3. Save Bill Items and Stock Movements
      for (const itemDraft of billItemsToSave) {
        // Save item
        const item = queryRunner.manager.create(BillItem, {
          ...itemDraft,
          billId: savedBill.id,
        });
        await queryRunner.manager.save(BillItem, item);

        // Write append-only stock movement
        await writeStockMovement(queryRunner, {
          bookId: item.bookId,
          branchId,
          type: 'SALE',
          quantity: -item.quantity, // negative for sale out
          performedById: currentUser.userId,
          referenceType: 'BILL',
          referenceId: savedBill.id,
        });
      }

      // 4. Save Audit Log
      await queryRunner.manager.save(AuditLog, {
        userId: currentUser.userId,
        action: 'BILL_CHECKOUT',
        entityType: 'Bill',
        entityId: savedBill.id,
        beforeJson: null,
        afterJson: savedBill,
        ipAddress,
      });

      await queryRunner.commitTransaction();

      // Trigger SSE signals
      this.notificationsService.triggerRefresh('stock_changed');
      this.notificationsService.triggerRefresh('bill_created');

      return savedBill;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ── 2. GET BILLS ───────────────────────────────────────────────────────────

  async getBills(query: GetBillsQueryDto, currentUser: JwtPayload) {
    // Resolve branch boundary filtering
    const effectiveBranchId = currentUser.branchId || query.branchId;
    if (currentUser.branchId) {
      // Scoped users can only read their own branch bills
      this.checkBranchAccess(currentUser, currentUser.branchId);
    }

    const { search, page = 1, limit = 15, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const qb = this.billRepository
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.branch', 'branch')
      .leftJoinAndSelect('b.createdBy', 'createdBy')
      .orderBy('b.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (effectiveBranchId) {
      qb.andWhere('b.branchId = :branchId', { branchId: effectiveBranchId });
    }

    if (search) {
      qb.andWhere('(b.billNumber LIKE :search OR b.customerName LIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date('2000-01-01');
      const end = endDate ? new Date(endDate) : new Date('2100-01-01');
      qb.andWhere('b.createdAt BETWEEN :start AND :end', { start, end });
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

  // ── 3. GET SINGLE BILL ─────────────────────────────────────────────────────

  async findOne(id: string, currentUser: JwtPayload): Promise<Bill> {
    const bill = await this.billRepository.findOne({
      where: { id },
      relations: ['branch', 'createdBy', 'voidedBy', 'items', 'items.book'],
    });

    if (!bill) throw new NotFoundException(`Bill with ID ${id} not found`);

    this.checkBranchAccess(currentUser, bill.branchId);
    return bill;
  }

  // ── 4. VOID BILL ───────────────────────────────────────────────────────────

  async voidBill(
    id: string,
    voidReason: string,
    currentUser: JwtPayload,
    ipAddress: string,
  ): Promise<Bill> {
    const bill = await this.billRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!bill) throw new NotFoundException(`Bill with ID ${id} not found`);

    this.checkBranchAccess(currentUser, bill.branchId);

    if (bill.status === BillStatus.VOIDED) {
      throw new ConflictException('This bill is already voided');
    }

    if (!voidReason || voidReason.trim() === '') {
      throw new BadRequestException('Void reason is required');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const beforeState = { ...bill };

      // 1. Mark bill status as VOIDED
      bill.status = BillStatus.VOIDED;
      bill.voidReason = voidReason;
      bill.voidedById = currentUser.userId;
      bill.voidedAt = new Date();

      const saved = await queryRunner.manager.save(Bill, bill);

      // 2. Return quantities to branch stock and append stock movements
      for (const item of bill.items) {
        // Atomic increment
        await incrementBranchStock(queryRunner, bill.branchId, item.bookId, item.quantity);

        // Write StockMovement SALE_VOID (positive quantity returned to shelf)
        await writeStockMovement(queryRunner, {
          bookId: item.bookId,
          branchId: bill.branchId,
          type: 'SALE_VOID',
          quantity: item.quantity,
          performedById: currentUser.userId,
          referenceType: 'BILL',
          referenceId: bill.id,
        });
      }

      // 3. Write Audit Log
      await queryRunner.manager.save(AuditLog, {
        userId: currentUser.userId,
        action: 'BILL_VOIDED',
        entityType: 'Bill',
        entityId: bill.id,
        beforeJson: beforeState,
        afterJson: saved,
        ipAddress,
      });

      await queryRunner.commitTransaction();

      // Trigger SSE signals
      this.notificationsService.triggerRefresh('stock_changed');
      this.notificationsService.triggerRefresh('bill_created');

      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
