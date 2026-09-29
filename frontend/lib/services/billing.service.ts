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
import { CreditCopy, CreditCopyReason } from '../api-backend/credit-copies/entities/credit-copy.entity';
import { ExhibitionDayClose } from '../api-backend/exhibitions/entities/exhibition-day-close.entity';
import { canAccessExhibition } from './exhibition-access.helper';
import {
  decrementBranchStock,
  incrementBranchStock,
  decrementExhibitionStock,
  restoreExhibitionStock,
  decrementExhibitionCreditStock,
  restoreExhibitionCreditStock,
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
    if (dto.items.length === 0) {
      throw new BadRequestException('Checkout must contain at least one item');
    }

    const { branchRepository, dataSource } = await this.getRepos();

    let exhibitionAccess: any = null;
    let branchId = currentUser.branchId;

    if (dto.exhibitionId) {
      exhibitionAccess = await canAccessExhibition(currentUser, dto.exhibitionId, dataSource);
      const exh = exhibitionAccess.exhibition;
      if (['CLOSED', 'CANCELLED', 'REJECTED'].includes(exh.status)) {
        throw new BadRequestException(`Cannot create bill for exhibition in ${exh.status} status`);
      }
      branchId = branchId || exh.sourceBranchId;
    } else {
      if (!branchId) {
        throw new BadRequestException(
          'Chain-wide roles must perform transactions under a specific branch scope (branchId context is missing).',
        );
      }
      const branch = await branchRepository.findOne({ where: { id: branchId } });
      if (!branch) throw new NotFoundException(`Branch with ID ${branchId} not found`);
    }

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Determine bill prefix: EXH01 for exhibition, branch code for store
      let codeOrPrefix = 'EXH01';
      if (!dto.exhibitionId && branchId) {
        const branch = await queryRunner.manager.findOne(Branch, { where: { id: branchId } });
        codeOrPrefix = branch?.code || 'BR01';
      }

      const billNumber = await generateBillNumber(dataSource, codeOrPrefix, queryRunner.manager);

      // Fetch threshold for credit copies
      let threshold = 3;
      try {
        const thresholdRow = await queryRunner.manager.query(
          `SELECT setting_value FROM setting WHERE setting_key = 'exhibition_credit_copy_approval_threshold' LIMIT 1`
        );
        if (thresholdRow && thresholdRow.length > 0) {
          threshold = parseInt(thresholdRow[0].setting_value, 10) || 3;
        }
      } catch (err) {
        // Fallback default
      }

      let subTotal = 0;
      let totalCost = 0;
      const preparedItems: {
        itemDto: typeof dto.items[0];
        book: Book;
        unitPrice: number;
        unitCost: number;
        lineTotal: number;
        isCreditCopy: boolean;
      }[] = [];

      for (const item of dto.items) {
        const book = await queryRunner.manager.findOne(Book, {
          where: { id: item.bookId },
        }) as any;
        if (!book) throw new NotFoundException(`Book with ID ${item.bookId} not found`);

        const isCredit = !!item.isCreditCopy;
        const unitCost = Number(book.costPrice || 0);

        if (isCredit) {
          if (!item.recipient || !item.recipient.trim() || !item.reason) {
            throw new BadRequestException('Credit copy requires recipient and reason');
          }
          if (item.quantity > threshold) {
            const isLeadOrAdmin =
              exhibitionAccess?.isLead ||
              exhibitionAccess?.isBranchManager ||
              exhibitionAccess?.isAdmin ||
              hasRole(currentUser, UserRole.ADMIN) ||
              hasRole(currentUser, UserRole.SUPER_ADMIN);
            if (!isLeadOrAdmin) {
              throw new ForbiddenException(
                `Credit copy quantity (${item.quantity}) exceeds threshold (${threshold}) and requires LEAD approval`,
              );
            }
          }
          if (dto.exhibitionId) {
            await decrementExhibitionCreditStock(queryRunner, dto.exhibitionId, item.bookId, item.quantity);
          } else {
            await decrementBranchStock(queryRunner, branchId!, item.bookId, item.quantity);
          }

          const lineTotal = 0;
          subTotal += lineTotal;
          totalCost += unitCost * item.quantity;
          preparedItems.push({ itemDto: item, book, unitPrice: Number(book.price), unitCost, lineTotal, isCreditCopy: true });
        } else {
          if (dto.exhibitionId) {
            await decrementExhibitionStock(queryRunner, dto.exhibitionId, item.bookId, item.quantity);
          } else {
            await decrementBranchStock(queryRunner, branchId!, item.bookId, item.quantity);
          }

          const lineTotal = Number(book.price) * item.quantity;
          subTotal += lineTotal;
          totalCost += unitCost * item.quantity;
          preparedItems.push({ itemDto: item, book, unitPrice: Number(book.price), unitCost, lineTotal, isCreditCopy: false });
        }
      }

      const discount = dto.discount || 0;
      if (discount < 0) throw new BadRequestException('Discount cannot be negative');
      if (discount > subTotal) {
        throw new BadRequestException('Discount cannot be greater than bill subtotal');
      }

      const totalAmount = subTotal - discount;

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

      for (const prep of preparedItems) {
        const itemEntity = queryRunner.manager.create(BillItem, {
          billId: savedBill.id,
          bookId: prep.itemDto.bookId,
          quantity: prep.itemDto.quantity,
          unitPrice: prep.unitPrice,
          unitCost: prep.unitCost,
          lineTotal: prep.lineTotal,
          isCreditCopy: prep.isCreditCopy,
        }) as any;
        const savedItem = await queryRunner.manager.save(BillItem, itemEntity);

        if (prep.isCreditCopy) {
          await writeStockMovement(queryRunner, {
            bookId: prep.itemDto.bookId,
            branchId: dto.exhibitionId ? null : branchId,
            type: dto.exhibitionId ? 'EXHIBITION_CREDIT' : 'CREDIT_OUT',
            quantity: -prep.itemDto.quantity,
            performedById: currentUser.userId,
            referenceType: 'BILL',
            referenceId: savedBill.id,
          });

          const creditCopyRecord = queryRunner.manager.create(CreditCopy, {
            billItemId: savedItem.id,
            exhibitionId: dto.exhibitionId || null,
            branchId: branchId,
            bookId: prep.itemDto.bookId,
            quantity: prep.itemDto.quantity,
            recipientName: prep.itemDto.recipient!,
            reason: prep.itemDto.reason as CreditCopyReason,
            issuedById: currentUser.userId,
            approvedById: prep.itemDto.quantity > threshold ? currentUser.userId : null,
          });
          await queryRunner.manager.save(CreditCopy, creditCopyRecord);
        } else {
          await writeStockMovement(queryRunner, {
            bookId: prep.itemDto.bookId,
            branchId: dto.exhibitionId ? null : branchId,
            type: 'SALE',
            quantity: -prep.itemDto.quantity,
            performedById: currentUser.userId,
            referenceType: 'BILL',
            referenceId: savedBill.id,
          });
        }
      }

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

      this.notificationsService.triggerRefresh('stock_changed');
      this.notificationsService.triggerRefresh('bill_created');

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

  async getBills(query: any, currentUser: JwtPayload) {
    // Resolve branch boundary filtering
    const effectiveBranchId = currentUser.branchId || (query.branchId && query.branchId !== 'all' ? query.branchId : undefined);
    if (currentUser.branchId) {
      // Scoped users can only read their own branch bills
      this.checkBranchAccess(currentUser, currentUser.branchId);
    }

    const { billRepository } = await this.getRepos();

    const pageNum = Math.max(1, parseInt(String(query.page || 1), 10));
    const limitNum = Math.max(1, parseInt(String(query.limit || 20), 10));
    const skip = (pageNum - 1) * limitNum;

    const qb = billRepository
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.branch', 'branch')
      .leftJoinAndSelect('b.createdBy', 'createdBy')
      .leftJoinAndSelect('b.items', 'items')
      .leftJoinAndSelect('items.book', 'book')
      .orderBy('b.createdAt', 'DESC')
      .skip(skip)
      .take(limitNum);

    if (effectiveBranchId) {
      qb.andWhere('b.branchId = :branchId', { branchId: effectiveBranchId });
    }

    // Payment mode filter
    if (query.paymentMode && query.paymentMode !== 'all') {
      qb.andWhere('b.paymentMode = :paymentMode', { paymentMode: query.paymentMode });
    }

    // Status filter
    if (query.status && query.status !== 'all') {
      qb.andWhere('b.status = :status', { status: query.status });
    }

    // Source filter (STORE vs EXHIBITION)
    if (query.source === 'STORE') {
      qb.andWhere('b.exhibitionId IS NULL');
    } else if (query.source === 'EXHIBITION') {
      qb.andWhere('b.exhibitionId IS NOT NULL');
    }

    // Search filter across billNumber, customerName, customerPhone, branch, and book details
    if (query.search && String(query.search).trim()) {
      const searchStr = `%${String(query.search).trim()}%`;
      qb.andWhere(
        '(b.billNumber LIKE :searchStr OR b.customerName LIKE :searchStr OR b.customerPhone LIKE :searchStr OR branch.name LIKE :searchStr OR book.title LIKE :searchStr OR book.isbn LIKE :searchStr OR book.barcode LIKE :searchStr)',
        { searchStr }
      );
    }

    // Date range filter
    if (query.startDate || query.endDate) {
      const start = query.startDate ? new Date(query.startDate) : new Date('2000-01-01');
      const end = query.endDate ? new Date(query.endDate) : new Date('2100-01-01');
      qb.andWhere('b.createdAt BETWEEN :start AND :end', { start, end });
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
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

    if (bill.exhibitionId) {
      await canAccessExhibition(currentUser, bill.exhibitionId, dataSource);

      // Check if day is closed for this exhibition on date of bill
      const billDateStr = new Date(bill.createdAt).toISOString().split('T')[0];
      const dayCloseRows = await dataSource.query(
        `SELECT * FROM exhibition_day_close WHERE exhibition_id = ? AND close_date = ?`,
        [bill.exhibitionId, billDateStr],
      );

      if (dayCloseRows && dayCloseRows.length > 0) {
        const isAdmin = hasRole(currentUser, UserRole.SUPER_ADMIN) || hasRole(currentUser, UserRole.ADMIN);
        if (!isAdmin) {
          throw new ForbiddenException('This exhibition day is already closed. Voiding requires Admin approval.');
        }
      }
    } else {
      this.checkBranchAccess(currentUser, bill.branchId);
    }

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

      bill.status = BillStatus.VOIDED;
      bill.voidReason = voidReason;
      bill.voidedById = currentUser.userId;
      bill.voidedAt = new Date();

      const saved = await queryRunner.manager.save(Bill, bill);

      for (const item of bill.items) {
        if (bill.exhibitionId) {
          if (item.isCreditCopy) {
            await restoreExhibitionCreditStock(queryRunner, bill.exhibitionId, item.bookId, item.quantity);
          } else {
            await restoreExhibitionStock(queryRunner, bill.exhibitionId, item.bookId, item.quantity);
          }
        } else {
          await incrementBranchStock(queryRunner, bill.branchId, item.bookId, item.quantity);
        }

        await writeStockMovement(queryRunner, {
          bookId: item.bookId,
          branchId: bill.exhibitionId ? null : bill.branchId,
          type: 'SALE_VOID',
          quantity: item.quantity,
          performedById: currentUser.userId,
          referenceType: 'BILL',
          referenceId: bill.id,
        });
      }

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
