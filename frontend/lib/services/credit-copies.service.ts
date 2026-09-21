import 'server-only';
import { getDataSource } from '../db/data-source';
import { CreditCopy } from '../api-backend/credit-copies/entities/credit-copy.entity';
import { JwtPayload } from '../auth/jwt';
import { UserRole } from '../api-backend/users/enums/user-role.enum';
import { hasRole } from '../api-backend/common/helpers/role.helper';
import { writeStockMovement, decrementBranchStock, decrementCentralStock, incrementBranchStock, incrementCentralStock } from './stock.helper';
import { ForbiddenException, BadRequestException, NotFoundException } from '../errors';
import { Bill, PaymentStatus, PaymentMode, BillStatus } from '../api-backend/billing/entities/bill.entity';
import { BillItem } from '../api-backend/billing/entities/bill-item.entity';
import { Branch, BranchType } from '../api-backend/branches/entities/branch.entity';
import { Book } from '../api-backend/catalog/entities/book.entity';
import { generateBillNumber } from '../api-backend/common/helpers/bill-number.helper';

export class CreditCopiesService {
  private async getRepos() {
    const ds = await getDataSource();
    return {
      dataSource: ds,
      creditCopyRepo: ds.getRepository(CreditCopy),
    };
  }

  async findAll(user: JwtPayload, query: any = {}): Promise<any> {
    const { creditCopyRepo } = await this.getRepos();
    const isAdmin = hasRole(user, UserRole.SUPER_ADMIN) || hasRole(user, UserRole.ADMIN) || hasRole(user, UserRole.FINANCE);

    const pageNum = Math.max(1, parseInt(String(query.page || 1), 10));
    const limitNum = Math.max(1, parseInt(String(query.limit || 20), 10));
    const skip = (pageNum - 1) * limitNum;

    const qb = creditCopyRepo.createQueryBuilder('cc')
      .leftJoinAndSelect('cc.book', 'book')
      .leftJoinAndSelect('cc.branch', 'branch')
      .leftJoinAndSelect('cc.issuedBy', 'issuedBy')
      .orderBy('cc.createdAt', 'DESC');

    if (!isAdmin) {
      if (!user.branchId) return { items: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 };
      qb.where('cc.branchId = :branchId', { branchId: user.branchId });
    } else if (query.branchId && query.branchId !== 'all') {
      qb.where('cc.branchId = :branchId', { branchId: query.branchId });
    }

    if (query.search && String(query.search).trim()) {
      const searchStr = `%${String(query.search).trim()}%`;
      qb.andWhere(
        '(book.title LIKE :searchStr OR book.isbn LIKE :searchStr OR book.barcode LIKE :searchStr OR cc.recipientName LIKE :searchStr OR cc.note LIKE :searchStr OR branch.name LIKE :searchStr)',
        { searchStr }
      );
    }

    qb.skip(skip).take(limitNum);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async issueCreditCopy(
    bookId: string,
    quantity: number,
    recipientName: string,
    note: string | undefined,
    user: JwtPayload,
    branchId: string | undefined,
    ipAddress: string
  ): Promise<CreditCopy> {
    if (quantity <= 0) throw new BadRequestException('Quantity must be greater than 0');

    // Only allow assigning to central if admin
    const targetBranchId = branchId || user.branchId;
    const isCentral = !targetBranchId;
    
    if (isCentral && !hasRole(user, UserRole.SUPER_ADMIN) && !hasRole(user, UserRole.ADMIN)) {
      throw new ForbiddenException('Only administrators can issue central credit copies');
    }

    if (targetBranchId && !hasRole(user, UserRole.SUPER_ADMIN) && !hasRole(user, UserRole.ADMIN) && user.branchId !== targetBranchId) {
      throw new ForbiddenException('Cannot issue credit copies for another branch');
    }

    const { dataSource, creditCopyRepo } = await this.getRepos();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Resolve branch context
      let branch: Branch | null = null;
      if (isCentral) {
        branch = await queryRunner.manager.findOne(Branch, {
          where: { type: BranchType.WAREHOUSE },
        });
        if (!branch) throw new NotFoundException('Central Warehouse branch not found in DB');
      } else {
        branch = await queryRunner.manager.findOne(Branch, {
          where: { id: targetBranchId },
        });
        if (!branch) throw new NotFoundException(`Branch with ID ${targetBranchId} not found`);
      }

      // 2. Load book to get pricing/cost
      const book = await queryRunner.manager.findOne(Book, {
        where: { id: bookId },
      });
      if (!book) throw new NotFoundException(`Book with ID ${bookId} not found`);

      // 3. Decrement stock
      if (isCentral) {
        await decrementCentralStock(queryRunner, bookId, quantity);
      } else {
        await decrementBranchStock(queryRunner, targetBranchId!, bookId, quantity);
      }

      // 4. Generate bill number
      const billNumber = await generateBillNumber(dataSource, branch.code, queryRunner.manager);

      const subTotal = Number(book.price) * quantity;
      const discount = 0;
      const totalAmount = subTotal;
      const totalCost = Number(book.costPrice || 0) * quantity;

      // 5. Create Bill (marked as CREDIT COPY)
      const newBill = queryRunner.manager.create(Bill, {
        billNumber,
        branchId: branch.id,
        createdById: user.userId,
        subTotal,
        discount,
        totalAmount,
        totalCost,
        paymentStatus: PaymentStatus.PAID,
        paymentMode: PaymentMode.CREDIT,
        status: BillStatus.COMPLETED,
        customerName: recipientName.toLowerCase().includes('credit') ? recipientName : `Credit Copy: ${recipientName}`,
        customerPhone: null,
        exhibitionId: null,
      } as any);

      const savedBill = await queryRunner.manager.save(Bill, newBill) as any;

      // 6. Create BillItem
      const newBillItem = queryRunner.manager.create(BillItem, {
        billId: savedBill.id,
        bookId: book.id,
        quantity,
        unitPrice: book.price,
        unitCost: Number(book.costPrice || 0),
        lineTotal: subTotal,
      });
      await queryRunner.manager.save(BillItem, newBillItem);

      // 7. Write stock movement (referencing the bill)
      await writeStockMovement(queryRunner, {
        bookId,
        branchId: targetBranchId || null,
        type: 'CREDIT_OUT',
        quantity: -quantity,
        performedById: user.userId,
        referenceType: 'BILL',
        referenceId: savedBill.id,
        note: `Credit Copy to: ${recipientName}`,
      });

      // 8. Log credit copy
      const creditCopy = creditCopyRepo.create({
        bookId,
        branchId: targetBranchId || null,
        quantity,
        recipientName,
        note: note || null,
        issuedById: user.userId,
      });
      const saved = await queryRunner.manager.getRepository(CreditCopy).save(creditCopy);

      await queryRunner.manager.query(
        'INSERT INTO `audit_log`(`id`,`user_id`,`action`,`entity_type`,`entity_id`,`before_json`,`after_json`,`ip_address`,`created_at`) VALUES (UUID(),?,?,?,?,NULL,?,?,DEFAULT)',
        [user.userId, 'CREDIT_COPY_ISSUED', 'CreditCopy', saved.id, JSON.stringify(saved), ipAddress]
      );

      await queryRunner.commitTransaction();
      return JSON.parse(JSON.stringify(saved));
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async issueBatchCreditCopies(
    items: Array<{ bookId: string; quantity: number }>,
    recipientName: string,
    note: string | undefined,
    user: JwtPayload,
    branchId: string | undefined,
    ipAddress: string
  ): Promise<CreditCopy[]> {
    if (!items || items.length === 0) throw new BadRequestException('At least one book item is required');
    for (const it of items) {
      if (!it.bookId) throw new BadRequestException('All items must have a book selected');
      if (!it.quantity || it.quantity <= 0) throw new BadRequestException('Quantity must be greater than 0');
    }

    const targetBranchId = branchId || user.branchId;
    const isCentral = !targetBranchId;

    if (isCentral && !hasRole(user, UserRole.SUPER_ADMIN) && !hasRole(user, UserRole.ADMIN)) {
      throw new ForbiddenException('Only administrators can issue central credit copies');
    }

    if (targetBranchId && !hasRole(user, UserRole.SUPER_ADMIN) && !hasRole(user, UserRole.ADMIN) && user.branchId !== targetBranchId) {
      throw new ForbiddenException('Cannot issue credit copies for another branch');
    }

    const { dataSource, creditCopyRepo } = await this.getRepos();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let branch: Branch | null = null;
      if (isCentral) {
        branch = await queryRunner.manager.findOne(Branch, {
          where: { type: BranchType.WAREHOUSE },
        });
        if (!branch) throw new NotFoundException('Central Warehouse branch not found in DB');
      } else {
        branch = await queryRunner.manager.findOne(Branch, {
          where: { id: targetBranchId },
        });
        if (!branch) throw new NotFoundException(`Branch with ID ${targetBranchId} not found`);
      }

      const billNumber = await generateBillNumber(dataSource, branch.code, queryRunner.manager);

      let subTotal = 0;
      let totalCost = 0;

      const preparedItems: Array<{ book: Book; quantity: number; lineTotal: number }> = [];

      for (const it of items) {
        const book = await queryRunner.manager.findOne(Book, { where: { id: it.bookId } });
        if (!book) throw new NotFoundException(`Book with ID ${it.bookId} not found`);

        if (isCentral) {
          await decrementCentralStock(queryRunner, it.bookId, it.quantity);
        } else {
          await decrementBranchStock(queryRunner, targetBranchId!, it.bookId, it.quantity);
        }

        const lineTotal = Number(book.price) * it.quantity;
        subTotal += lineTotal;
        totalCost += Number(book.costPrice || 0) * it.quantity;

        preparedItems.push({ book, quantity: it.quantity, lineTotal });
      }

      const newBill = queryRunner.manager.create(Bill, {
        billNumber,
        branchId: branch.id,
        createdById: user.userId,
        subTotal,
        discount: 0,
        totalAmount: subTotal,
        totalCost,
        paymentStatus: PaymentStatus.PAID,
        paymentMode: PaymentMode.CREDIT,
        status: BillStatus.COMPLETED,
        customerName: recipientName.toLowerCase().includes('credit') ? recipientName : `Credit Copy: ${recipientName}`,
        customerPhone: null,
        exhibitionId: null,
      } as any);

      const savedBill = await queryRunner.manager.save(Bill, newBill) as any;

      const createdCreditCopies: CreditCopy[] = [];

      for (const item of preparedItems) {
        const newBillItem = queryRunner.manager.create(BillItem, {
          billId: savedBill.id,
          bookId: item.book.id,
          quantity: item.quantity,
          unitPrice: item.book.price,
          unitCost: Number(item.book.costPrice || 0),
          lineTotal: item.lineTotal,
        });
        await queryRunner.manager.save(BillItem, newBillItem);

        await writeStockMovement(queryRunner, {
          bookId: item.book.id,
          branchId: targetBranchId || null,
          type: 'CREDIT_OUT',
          quantity: -item.quantity,
          performedById: user.userId,
          referenceType: 'BILL',
          referenceId: savedBill.id,
          note: `Credit Copy to: ${recipientName}`,
        });

        const creditCopy = creditCopyRepo.create({
          bookId: item.book.id,
          branchId: targetBranchId || null,
          quantity: item.quantity,
          recipientName,
          note: note || null,
          issuedById: user.userId,
        });
        const saved = await queryRunner.manager.getRepository(CreditCopy).save(creditCopy);
        createdCreditCopies.push(saved);

        await queryRunner.manager.query(
          'INSERT INTO `audit_log`(`id`,`user_id`,`action`,`entity_type`,`entity_id`,`before_json`,`after_json`,`ip_address`,`created_at`) VALUES (UUID(),?,?,?,?,NULL,?,?,DEFAULT)',
          [user.userId, 'CREDIT_COPY_ISSUED', 'CreditCopy', saved.id, JSON.stringify(saved), ipAddress]
        );
      }

      await queryRunner.commitTransaction();
      return JSON.parse(JSON.stringify(createdCreditCopies));
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateCreditCopy(
    id: string,
    dto: {
      bookId?: string;
      recipientName?: string;
      note?: string;
      quantity?: number;
    },
    user: JwtPayload,
    ipAddress: string
  ): Promise<CreditCopy> {
    const { dataSource, creditCopyRepo } = await this.getRepos();
    const creditCopy = await creditCopyRepo.findOne({
      where: { id },
      relations: ['book', 'branch', 'issuedBy'],
    });

    if (!creditCopy) throw new NotFoundException(`Credit copy record with ID ${id} not found`);

    const isAdmin = hasRole(user, UserRole.SUPER_ADMIN) || hasRole(user, UserRole.ADMIN) || hasRole(user, UserRole.CENTRAL_INVENTORY_MANAGER);
    if (!isAdmin) {
      if (user.branchId && creditCopy.branchId !== user.branchId) {
        throw new ForbiddenException('Cannot edit credit copies for another branch');
      }
      if (creditCopy.issuedById !== user.userId) {
        throw new ForbiddenException('Only the issuer or an administrator can edit this credit copy');
      }
    }

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const beforeJson = JSON.stringify(creditCopy);

      if (dto.recipientName !== undefined) {
        creditCopy.recipientName = dto.recipientName.trim();
      }
      if (dto.note !== undefined) {
        creditCopy.note = dto.note ? dto.note.trim() : null;
      }

      const targetQty = (dto.quantity !== undefined && Number(dto.quantity) > 0) ? Number(dto.quantity) : creditCopy.quantity;

      // Case 1: Book is changed to a different book
      if (dto.bookId && dto.bookId !== creditCopy.bookId) {
        const newBook = await queryRunner.manager.findOne(Book, { where: { id: dto.bookId } });
        if (!newBook) throw new NotFoundException(`New book with ID ${dto.bookId} not found`);

        const oldBookId = creditCopy.bookId;
        const oldQty = creditCopy.quantity;
        const oldBookTitle = creditCopy.book?.title || 'Previous Book';

        // 1. Return old book stock
        if (!creditCopy.branchId) {
          await incrementCentralStock(queryRunner, oldBookId, oldQty);
        } else {
          await incrementBranchStock(queryRunner, creditCopy.branchId, oldBookId, oldQty);
        }

        await writeStockMovement(queryRunner, {
          bookId: oldBookId,
          branchId: creditCopy.branchId || null,
          type: 'ADJUSTMENT',
          quantity: oldQty,
          performedById: user.userId,
          referenceType: 'MANUAL',
          referenceId: creditCopy.id,
          note: `Credit Copy Book Changed (Returned ${oldQty}x "${oldBookTitle}") from recipient: ${creditCopy.recipientName}`,
        });

        // 2. Deduct new book stock
        if (!creditCopy.branchId) {
          await decrementCentralStock(queryRunner, dto.bookId, targetQty);
        } else {
          await decrementBranchStock(queryRunner, creditCopy.branchId, dto.bookId, targetQty);
        }

        await writeStockMovement(queryRunner, {
          bookId: dto.bookId,
          branchId: creditCopy.branchId || null,
          type: 'CREDIT_OUT',
          quantity: -targetQty,
          performedById: user.userId,
          referenceType: 'MANUAL',
          referenceId: creditCopy.id,
          note: `Credit Copy Book Changed (Issued ${targetQty}x "${newBook.title}") to recipient: ${creditCopy.recipientName}`,
        });

        creditCopy.bookId = dto.bookId;
        creditCopy.book = newBook;
        creditCopy.quantity = targetQty;
      } 
      // Case 2: Same book, quantity is adjusted
      else if (dto.quantity !== undefined && Number(dto.quantity) > 0 && Number(dto.quantity) !== creditCopy.quantity) {
        const newQty = Number(dto.quantity);
        const oldQty = creditCopy.quantity;
        const diff = newQty - oldQty;

        if (diff > 0) {
          // Decrement additional stock
          if (!creditCopy.branchId) {
            await decrementCentralStock(queryRunner, creditCopy.bookId, diff);
          } else {
            await decrementBranchStock(queryRunner, creditCopy.branchId, creditCopy.bookId, diff);
          }

          await writeStockMovement(queryRunner, {
            bookId: creditCopy.bookId,
            branchId: creditCopy.branchId || null,
            type: 'CREDIT_OUT',
            quantity: -diff,
            performedById: user.userId,
            referenceType: 'MANUAL',
            referenceId: creditCopy.id,
            note: `Credit Copy Adjustment (+${diff}) to: ${creditCopy.recipientName}`,
          });
        } else if (diff < 0) {
          // Return excess stock
          const returnQty = Math.abs(diff);
          if (!creditCopy.branchId) {
            await incrementCentralStock(queryRunner, creditCopy.bookId, returnQty);
          } else {
            await incrementBranchStock(queryRunner, creditCopy.branchId, creditCopy.bookId, returnQty);
          }

          await writeStockMovement(queryRunner, {
            bookId: creditCopy.bookId,
            branchId: creditCopy.branchId || null,
            type: 'ADJUSTMENT',
            quantity: returnQty,
            performedById: user.userId,
            referenceType: 'MANUAL',
            referenceId: creditCopy.id,
            note: `Credit Copy Return (-${returnQty}) from: ${creditCopy.recipientName}`,
          });
        }

        creditCopy.quantity = newQty;
      }

      const saved = await queryRunner.manager.getRepository(CreditCopy).save(creditCopy);

      await queryRunner.manager.query(
        'INSERT INTO `audit_log`(`id`,`user_id`,`action`,`entity_type`,`entity_id`,`before_json`,`after_json`,`ip_address`,`created_at`) VALUES (UUID(),?,?,?,?,?,?,?,DEFAULT)',
        [user.userId, 'CREDIT_COPY_UPDATED', 'CreditCopy', saved.id, beforeJson, JSON.stringify(saved), ipAddress]
      );

      await queryRunner.commitTransaction();
      return JSON.parse(JSON.stringify(saved));
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteCreditCopy(
    id: string,
    user: JwtPayload,
    ipAddress: string
  ): Promise<void> {
    const { dataSource, creditCopyRepo } = await this.getRepos();
    const creditCopy = await creditCopyRepo.findOne({
      where: { id },
      relations: ['book', 'branch', 'issuedBy'],
    });

    if (!creditCopy) throw new NotFoundException(`Credit copy record with ID ${id} not found`);

    const isAdmin = hasRole(user, UserRole.SUPER_ADMIN) || hasRole(user, UserRole.ADMIN) || hasRole(user, UserRole.CENTRAL_INVENTORY_MANAGER);
    if (!isAdmin) {
      if (user.branchId && creditCopy.branchId !== user.branchId) {
        throw new ForbiddenException('Cannot delete credit copies for another branch');
      }
      if (creditCopy.issuedById !== user.userId) {
        throw new ForbiddenException('Only the issuer or an administrator can delete this credit copy');
      }
    }

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const beforeJson = JSON.stringify(creditCopy);
      const returnQty = creditCopy.quantity;
      const bookTitle = creditCopy.book?.title || 'Book';

      // 1. Return stock back to inventory
      if (!creditCopy.branchId) {
        await incrementCentralStock(queryRunner, creditCopy.bookId, returnQty);
      } else {
        await incrementBranchStock(queryRunner, creditCopy.branchId, creditCopy.bookId, returnQty);
      }

      // 2. Write stock movement
      await writeStockMovement(queryRunner, {
        bookId: creditCopy.bookId,
        branchId: creditCopy.branchId || null,
        type: 'ADJUSTMENT',
        quantity: returnQty,
        performedById: user.userId,
        referenceType: 'MANUAL',
        referenceId: creditCopy.id,
        note: `Credit Copy Cancelled/Voided: Returned ${returnQty}x "${bookTitle}" from recipient ${creditCopy.recipientName}`,
      });

      // 3. Remove credit copy
      await queryRunner.manager.getRepository(CreditCopy).remove(creditCopy);

      // 4. Audit Log
      await queryRunner.manager.query(
        'INSERT INTO `audit_log`(`id`,`user_id`,`action`,`entity_type`,`entity_id`,`before_json`,`after_json`,`ip_address`,`created_at`) VALUES (UUID(),?,?,?,?,?,NULL,?,DEFAULT)',
        [user.userId, 'CREDIT_COPY_DELETED', 'CreditCopy', id, beforeJson, ipAddress]
      );

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
