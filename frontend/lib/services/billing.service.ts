import 'server-only';
import { hasRole } from '../api-backend/common/helpers/role.helper';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '../errors';
import { getDataSource } from '../db/data-source';

import { Bill, PaymentStatus, PaymentMode, BillStatus } from '../api-backend/billing/entities/bill.entity';
import { BillItem } from '../api-backend/billing/entities/bill-item.entity';
import { Book } from '../api-backend/catalog/entities/book.entity';
import { Branch } from '../api-backend/branches/entities/branch.entity';
import { AuditLog } from '../api-backend/audit/entities/audit-log.entity';

import { CreateBillDto } from '../api-backend/billing/dto/create-bill.dto';
import { GetBillsQueryDto } from '../api-backend/billing/dto/get-bills-query.dto';

import { JwtPayload } from '../auth/jwt';
import { UserRole } from '../api-backend/users/enums/user-role.enum';
import { NotificationsService } from './notifications.service';
import { generateBillNumber } from '../api-backend/common/helpers/bill-number.helper';
import {
  decrementBranchStock,
  incrementBranchStock,
  writeStockMovement,
} from './stock.helper';

export class BillingService {
  private notificationsService = new NotificationsService();

  private async getRepos() {
    const ds = await getDataSource();
    return {
      dataSource: ds,
      billRepository: ds.getRepository(Bill),
      billItemRepository: ds.getRepository(BillItem),
      bookRepository: ds.getRepository(Book),
      branchRepository: ds.getRepository(Branch),
      auditLogRepository: ds.getRepository(AuditLog),
    };
  }

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

    const { branchRepository, dataSource } = await this.getRepos();

    const branch = await branchRepository.findOne({ where: { id: branchId } });
    if (!branch) throw new NotFoundException(`Branch with ID ${branchId} not found`);

    if (dto.items.length === 0) {
      throw new BadRequestException('Checkout must contain at least one item');
    }

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Generate daily unique bill number inside transaction for safety
      const billNumber = await generateBillNumber(dataSource, branch.code, queryRunner.manager);

      let subTotal = 0;
      let totalCost = 0;
      const billItemsToSave: Partial<BillItem>[] = [];

      // Validate stock availability and calculate prices
      for (const item of dto.items) {
        // Load book inside transaction to ensure price accuracy
        const book = await queryRunner.manager.findOne(Book, {
          where: { id: item.bookId },
        }) as any;
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
      } as object);

      const savedBill = await queryRunner.manager.save(Bill, newBill) as any;

      // 3. Save Bill Items and Stock Movements
      for (const itemDraft of billItemsToSave) {
        // Save item
        const item = queryRunner.manager.create(BillItem, {
          ...itemDraft,
          billId: savedBill.id,
        }) as any;
        await queryRunner.manager.save(BillItem, item);

        // Write append-only stock movement
        await writeStockMovement(queryRunner, {
          bookId: item.bookId,
          branchId,
          type: 'SALE',
          quantity: -item.quantity!, // negative for sale out
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

      // Fetch the full bill with items and book details to return
      const { billRepository } = await this.getRepos();
      const fullBill = await billRepository.findOne({
        where: { id: savedBill.id },
        relations: ['branch', 'createdBy', 'voidedBy', 'items', 'items.book'],
      });

      return fullBill as Bill;
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

    const { billRepository } = await this.getRepos();

    const { search, page = 1, limit = 15, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const qb = billRepository
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.branch', 'branch')
      .leftJoinAndSelect('b.createdBy', 'createdBy')
      .leftJoinAndSelect('b.items', 'items')
      .leftJoinAndSelect('items.book', 'book')
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
    const { billRepository } = await this.getRepos();
    const bill = await billRepository.findOne({
      where: { id },
      relations: ['branch', 'createdBy', 'voidedBy', 'items', 'items.book'],
    });

    if (!bill) throw new NotFoundException(`Bill with ID ${id} not found`);

    this.checkBranchAccess(currentUser, bill.branchId);
    return bill as any;
  }

  // ── 4. VOID BILL ───────────────────────────────────────────────────────────

  async voidBill(
    id: string,
    voidReason: string,
    currentUser: JwtPayload,
    ipAddress: string,
  ): Promise<Bill> {
    const { billRepository, dataSource } = await this.getRepos();
    const bill = await billRepository.findOne({
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

    const queryRunner = dataSource.createQueryRunner();
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

  // ── SEARCH RETURNING CUSTOMERS ──────────────────────────────────────────────
  async searchCustomers(
    query: string,
    currentUser: JwtPayload
  ): Promise<{ customerName: string; customerPhone: string | null; lastVisit: string }[]> {
    if (!query || !query.trim() || query.trim().length < 2) {
      return [];
    }

    const { dataSource } = await this.getRepos();
    const searchTerm = `%${query.trim()}%`;

    // Query distinct customers from past bills and enquiries
    const rawRows = await dataSource.query(
      `
      SELECT customer_name as customerName, customer_phone as customerPhone, MAX(created_at) as lastVisit
      FROM (
        SELECT customer_name, customer_phone, created_at
        FROM bill
        WHERE customer_name IS NOT NULL AND TRIM(customer_name) != ''
          AND (customer_name LIKE ? OR customer_phone LIKE ?)
        UNION ALL
        SELECT customer_name, customer_phone, created_at
        FROM book_enquiry
        WHERE customer_name IS NOT NULL AND TRIM(customer_name) != ''
          AND (customer_name LIKE ? OR customer_phone LIKE ?)
      ) AS combined
      GROUP BY customer_name, customer_phone
      ORDER BY lastVisit DESC
      LIMIT 10
      `,
      [searchTerm, searchTerm, searchTerm, searchTerm]
    );

    return rawRows.map((r: any) => ({
      customerName: r.customerName,
      customerPhone: r.customerPhone || null,
      lastVisit: r.lastVisit,
    }));
  }
}
