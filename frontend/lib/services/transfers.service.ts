import 'server-only';
import { getDataSource } from '../db/data-source';
import { StockTransfer, StockTransferStatus } from '../api-backend/transfers/entities/stock-transfer.entity';
import { StockTransferItem } from '../api-backend/transfers/entities/stock-transfer-item.entity';
import { Branch } from '../api-backend/branches/entities/branch.entity';
import { Book } from '../api-backend/catalog/entities/book.entity';
import { AuditLog } from '../api-backend/audit/entities/audit-log.entity';
import { UserRole } from '../api-backend/users/enums/user-role.enum';
import { JwtPayload } from '../auth/jwt';
import { NotificationsService } from './notifications.service';
import { CentralStock } from '../api-backend/inventory/entities/central-stock.entity';
import { BranchInventory } from '../api-backend/inventory/entities/branch-inventory.entity';
import {
  decrementBranchStock,
  incrementBranchStock,
  decrementCentralStock,
  incrementCentralStock,
  writeStockMovement,
} from './stock.helper';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '../errors';
import { hasRole } from '../api-backend/common/helpers/role.helper';

export class TransfersService {
  private notificationsService = new NotificationsService();

  private async getRepos() {
    const ds = await getDataSource();
    return {
      dataSource: ds,
      transferRepo: ds.getRepository(StockTransfer),
      itemRepo: ds.getRepository(StockTransferItem),
      branchRepo: ds.getRepository(Branch),
      bookRepo: ds.getRepository(Book),
      auditRepo: ds.getRepository(AuditLog),
    };
  }

  async createTransfer(
    dto: {
      fromBranchId: string;
      toBranchId: string;
      note?: string;
      items: Array<{ bookId: string; quantity: number }>;
      instantDispatch?: boolean;
    },
    currentUser: JwtPayload,
    ipAddress: string,
  ): Promise<StockTransfer> {
    const { fromBranchId, toBranchId, note, items, instantDispatch } = dto;
    
    if (fromBranchId === toBranchId) {
      throw new BadRequestException('Source and destination branches cannot be the same');
    }

    // Auth check: if branch-scoped, user can only create transfers involving their own branch
    if (!hasRole(currentUser, UserRole.SUPER_ADMIN) && 
        !hasRole(currentUser, UserRole.ADMIN) && 
        !hasRole(currentUser, UserRole.CENTRAL_INVENTORY_MANAGER)) {
      if (currentUser.branchId !== toBranchId && currentUser.branchId !== fromBranchId) {
        throw new ForbiddenException('You can only create stock transfers involving your own branch');
      }
    }

    if (!items || items.length === 0) {
      throw new BadRequestException('Transfer must contain at least one item');
    }

    const { dataSource, branchRepo } = await this.getRepos();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find latest transfer number YYYYMMDD
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const [countResult] = await queryRunner.manager.query(
        `SELECT COUNT(*) as count FROM stock_transfer WHERE transfer_number LIKE ?`,
        [`TR-${todayStr}-%`]
      );
      const count = Number(countResult?.count || 0) + 1;
      const transferNumber = `TR-${todayStr}-${String(count).padStart(4, '0')}`;

      const transfer = queryRunner.manager.create(StockTransfer, {
        transferNumber,
        fromBranchId,
        toBranchId,
        requestedById: currentUser.userId,
        status: StockTransferStatus.PENDING,
        note: note || null,
      });

      const savedTransfer = await queryRunner.manager.save(StockTransfer, transfer);

      for (const itemDto of items) {
        const book = await queryRunner.manager.findOne(Book, { where: { id: itemDto.bookId } });
        if (!book) throw new NotFoundException(`Book with ID ${itemDto.bookId} not found`);

        const item = queryRunner.manager.create(StockTransferItem, {
          transferId: savedTransfer.id,
          bookId: itemDto.bookId,
          quantityRequested: itemDto.quantity,
          quantityDispatched: 0,
          quantityReceived: 0,
        });
        await queryRunner.manager.save(StockTransferItem, item);
      }

      await queryRunner.manager.save(AuditLog, {
        userId: currentUser.userId,
        action: 'STOCK_TRANSFER_REQUESTED',
        entityType: 'StockTransfer',
        entityId: savedTransfer.id,
        beforeJson: null,
        afterJson: savedTransfer,
        ipAddress,
      });

      await queryRunner.commitTransaction();

      // Trigger SSE updates
      this.notificationsService.triggerRefresh('transfers_changed');

      // Query branch names for notification
      const fromBranch = await branchRepo.findOne({ where: { id: fromBranchId } });
      const toBranch = await branchRepo.findOne({ where: { id: toBranchId } });

      // Notify source branch managers / inventory
      const fromBranchRoles = fromBranch?.type === 'WAREHOUSE' 
        ? [UserRole.CENTRAL_INVENTORY_MANAGER, UserRole.ADMIN]
        : [UserRole.BRANCH_MANAGER, UserRole.BRANCH_INVENTORY];

      await this.notificationsService.notifyRoles(
        fromBranchRoles,
        fromBranch?.type === 'WAREHOUSE' ? null : fromBranchId,
        'New Stock Transfer Request',
        `Branch "${toBranch?.name}" requested a stock transfer of books from your inventory.`,
        'RESTOCK_REQUEST'
      );

      // Handle instant dispatch if requested by chain roles
      if (instantDispatch && (
        hasRole(currentUser, UserRole.SUPER_ADMIN) || 
        hasRole(currentUser, UserRole.ADMIN) || 
        hasRole(currentUser, UserRole.CENTRAL_INVENTORY_MANAGER)
      )) {
        await this.dispatchTransfer(savedTransfer.id, currentUser, ipAddress);
      }

      return this.findOne(savedTransfer.id, currentUser);
    } catch (err) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getTransfers(
    query: {
      status?: string;
      branchId?: string;
      page?: string;
      limit?: string;
    },
    currentUser: JwtPayload,
  ) {
    const page = parseInt(query.page || '1') || 1;
    const limit = parseInt(query.limit || '15') || 15;
    const skip = (page - 1) * limit;

    const { transferRepo } = await this.getRepos();

    const qb = transferRepo.createQueryBuilder('t')
      .leftJoinAndSelect('t.fromBranch', 'fromBranch')
      .leftJoinAndSelect('t.toBranch', 'toBranch')
      .leftJoinAndSelect('t.requestedBy', 'requestedBy')
      .leftJoinAndSelect('t.items', 'items')
      .leftJoinAndSelect('items.book', 'book')
      .orderBy('t.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    // Apply branch role scoping
    if (!hasRole(currentUser, UserRole.SUPER_ADMIN) && 
        !hasRole(currentUser, UserRole.ADMIN) && 
        !hasRole(currentUser, UserRole.CENTRAL_INVENTORY_MANAGER) &&
        !hasRole(currentUser, UserRole.FINANCE)) {
      if (currentUser.branchId) {
        qb.andWhere('(t.fromBranchId = :branchId OR t.toBranchId = :branchId)', { branchId: currentUser.branchId });
      }
    } else if (query.branchId) {
      qb.andWhere('(t.fromBranchId = :branchId OR t.toBranchId = :branchId)', { branchId: query.branchId });
    }

    if (query.status) {
      qb.andWhere('t.status = :status', { status: query.status });
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    };
  }

  async findOne(id: string, currentUser: JwtPayload): Promise<StockTransfer> {
    const { transferRepo } = await this.getRepos();

    const transfer = await transferRepo.findOne({
      where: { id },
      relations: ['fromBranch', 'toBranch', 'requestedBy', 'items', 'items.book'],
    });

    if (!transfer) throw new NotFoundException(`Stock transfer with ID ${id} not found`);

    // Check access scope
    if (!hasRole(currentUser, UserRole.SUPER_ADMIN) && 
        !hasRole(currentUser, UserRole.ADMIN) && 
        !hasRole(currentUser, UserRole.CENTRAL_INVENTORY_MANAGER) &&
        !hasRole(currentUser, UserRole.FINANCE)) {
      if (currentUser.branchId && 
          transfer.fromBranchId !== currentUser.branchId && 
          transfer.toBranchId !== currentUser.branchId) {
        throw new ForbiddenException('You do not have access to this stock transfer');
      }
    }

    return transfer;
  }

  async dispatchTransfer(id: string, currentUser: JwtPayload, ipAddress: string): Promise<StockTransfer> {
    const transfer = await this.findOne(id, currentUser);

    if (transfer.status !== StockTransferStatus.PENDING) {
      throw new ConflictException('Only pending transfers can be dispatched');
    }

    // Permission check: only branch manager of fromBranch (or chain admins/managers) can dispatch
    const allowedChainRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER];
    const hasChainRole = allowedChainRoles.some(r => hasRole(currentUser, r));

    if (!hasChainRole) {
      const isBranchManager = hasRole(currentUser, UserRole.BRANCH_MANAGER);
      if (!isBranchManager || currentUser.branchId !== transfer.fromBranchId) {
        throw new ForbiddenException('Only the branch manager of the source branch can dispatch this transfer');
      }
    }

    const { dataSource } = await this.getRepos();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const beforeState = { ...transfer };
      
      transfer.status = StockTransferStatus.DISPATCHED;
      await queryRunner.manager.save(StockTransfer, transfer);

      // Decrement stock in source branch (fromBranch)
      for (const item of transfer.items) {
        if (transfer.fromBranch.type === 'WAREHOUSE') {
          await decrementCentralStock(queryRunner, item.bookId, item.quantityRequested);
        } else {
          await decrementBranchStock(queryRunner, transfer.fromBranchId, item.bookId, item.quantityRequested);
        }

        // Set quantityDispatched
        item.quantityDispatched = item.quantityRequested;
        await queryRunner.manager.save(StockTransferItem, item);

        // Record stock movement (outbound)
        await writeStockMovement(queryRunner, {
          bookId: item.bookId,
          branchId: transfer.fromBranch.type === 'WAREHOUSE' ? null : transfer.fromBranchId,
          type: 'TRANSFER_OUT',
          quantity: -item.quantityRequested,
          performedById: currentUser.userId,
          referenceType: 'MANUAL',
          referenceId: transfer.id,
          note: `Stock Transfer ${transfer.transferNumber} - Dispatched`,
        });
      }

      await queryRunner.manager.save(AuditLog, {
        userId: currentUser.userId,
        action: 'STOCK_TRANSFER_DISPATCHED',
        entityType: 'StockTransfer',
        entityId: transfer.id,
        beforeJson: beforeState,
        afterJson: transfer,
        ipAddress,
      });

      await queryRunner.commitTransaction();

      // Trigger SSE updates
      this.notificationsService.triggerRefresh('transfers_changed');
      this.notificationsService.triggerRefresh('stock_changed');

      // Notify destination branch managers / inventory
      const toBranchRoles = transfer.toBranch.type === 'WAREHOUSE'
        ? [UserRole.CENTRAL_INVENTORY_MANAGER, UserRole.ADMIN]
        : [UserRole.BRANCH_MANAGER, UserRole.BRANCH_INVENTORY];

      await this.notificationsService.notifyRoles(
        toBranchRoles,
        transfer.toBranch.type === 'WAREHOUSE' ? null : transfer.toBranchId,
        'Stock Transfer Dispatched',
        `Stock transfer ${transfer.transferNumber} has been dispatched from "${transfer.fromBranch.name}" and is on its way.`,
        'RESTOCK_REQUEST'
      );

      return this.findOne(id, currentUser);
    } catch (err) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async receiveTransfer(id: string, currentUser: JwtPayload, ipAddress: string): Promise<StockTransfer> {
    const transfer = await this.findOne(id, currentUser);

    if (transfer.status !== StockTransferStatus.DISPATCHED) {
      throw new ConflictException('Only dispatched transfers can be received');
    }

    // Permission check: only toBranch managers/inventory staff (or chain admins) can receive
    if (!hasRole(currentUser, UserRole.SUPER_ADMIN) && 
        !hasRole(currentUser, UserRole.ADMIN) && 
        !hasRole(currentUser, UserRole.CENTRAL_INVENTORY_MANAGER)) {
      if (currentUser.branchId !== transfer.toBranchId) {
        throw new ForbiddenException('Only managers of the destination branch can receive this transfer');
      }
    }

    const { dataSource } = await this.getRepos();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const beforeState = { ...transfer };
      
      transfer.status = StockTransferStatus.RECEIVED;
      await queryRunner.manager.save(StockTransfer, transfer);

      // Increment stock in destination branch (toBranch)
      for (const item of transfer.items) {
        if (transfer.toBranch.type === 'WAREHOUSE') {
          await incrementCentralStock(queryRunner, item.bookId, item.quantityDispatched);
        } else {
          await incrementBranchStock(queryRunner, transfer.toBranchId, item.bookId, item.quantityDispatched);
        }

        // Set quantityReceived
        item.quantityReceived = item.quantityDispatched;
        await queryRunner.manager.save(StockTransferItem, item);

        // Record stock movement (inbound)
        await writeStockMovement(queryRunner, {
          bookId: item.bookId,
          branchId: transfer.toBranch.type === 'WAREHOUSE' ? null : transfer.toBranchId,
          type: 'TRANSFER_IN',
          quantity: item.quantityDispatched,
          performedById: currentUser.userId,
          referenceType: 'MANUAL',
          referenceId: transfer.id,
          note: `Stock Transfer ${transfer.transferNumber} - Received`,
        });
      }

      await queryRunner.manager.save(AuditLog, {
        userId: currentUser.userId,
        action: 'STOCK_TRANSFER_RECEIVED',
        entityType: 'StockTransfer',
        entityId: transfer.id,
        beforeJson: beforeState,
        afterJson: transfer,
        ipAddress,
      });

      await queryRunner.commitTransaction();

      // Trigger SSE updates
      this.notificationsService.triggerRefresh('transfers_changed');
      this.notificationsService.triggerRefresh('stock_changed');

      // Notify source branch managers / inventory
      const fromBranchRoles = transfer.fromBranch.type === 'WAREHOUSE'
        ? [UserRole.CENTRAL_INVENTORY_MANAGER, UserRole.ADMIN]
        : [UserRole.BRANCH_MANAGER, UserRole.BRANCH_INVENTORY];

      await this.notificationsService.notifyRoles(
        fromBranchRoles,
        transfer.fromBranch.type === 'WAREHOUSE' ? null : transfer.fromBranchId,
        'Stock Transfer Received',
        `Stock transfer ${transfer.transferNumber} has been received successfully by "${transfer.toBranch.name}".`,
        'RESTOCK_REQUEST'
      );

      return this.findOne(id, currentUser);
    } catch (err) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async rejectTransfer(id: string, note: string, currentUser: JwtPayload, ipAddress: string): Promise<StockTransfer> {
    const transfer = await this.findOne(id, currentUser);

    if (transfer.status !== StockTransferStatus.PENDING) {
      throw new ConflictException('Only pending transfers can be rejected');
    }

    // Permission check: only branch manager of fromBranch (or chain admins/managers) can reject
    const allowedChainRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER];
    const hasChainRole = allowedChainRoles.some(r => hasRole(currentUser, r));

    if (!hasChainRole) {
      const isBranchManager = hasRole(currentUser, UserRole.BRANCH_MANAGER);
      if (!isBranchManager || currentUser.branchId !== transfer.fromBranchId) {
        throw new ForbiddenException('Only the branch manager of the source branch can reject this transfer');
      }
    }

    const { transferRepo, auditRepo } = await this.getRepos();
    const beforeState = { ...transfer };

    transfer.status = StockTransferStatus.REJECTED;
    transfer.note = note || 'Rejected by source branch manager';
    await transferRepo.save(transfer);

    await auditRepo.save({
      userId: currentUser.userId,
      action: 'STOCK_TRANSFER_REJECTED',
      entityType: 'StockTransfer',
      entityId: transfer.id,
      beforeJson: beforeState,
      afterJson: transfer,
      ipAddress,
    });

    // Trigger SSE updates
    this.notificationsService.triggerRefresh('transfers_changed');

    // Notify requester user
    await this.notificationsService.createNotification(
      transfer.requestedById,
      'Stock Transfer Rejected',
      `Your stock transfer request ${transfer.transferNumber} was rejected by "${transfer.fromBranch.name}". Reason: ${transfer.note}`,
      'RESTOCK_REQUEST'
    );

    return this.findOne(id, currentUser);
  }

  async cancelTransfer(id: string, currentUser: JwtPayload, ipAddress: string): Promise<StockTransfer> {
    const transfer = await this.findOne(id, currentUser);

    if (transfer.status !== StockTransferStatus.PENDING) {
      throw new ConflictException('Only pending transfers can be cancelled');
    }

    if (!hasRole(currentUser, UserRole.SUPER_ADMIN) && 
        !hasRole(currentUser, UserRole.ADMIN) && 
        !hasRole(currentUser, UserRole.CENTRAL_INVENTORY_MANAGER)) {
      if (currentUser.branchId !== transfer.toBranchId) {
        throw new ForbiddenException('Only the requesting branch manager can cancel this transfer');
      }
    }

    const { transferRepo, auditRepo } = await this.getRepos();
    const beforeState = { ...transfer };

    transfer.status = StockTransferStatus.CANCELLED;
    await transferRepo.save(transfer);

    await auditRepo.save({
      userId: currentUser.userId,
      action: 'STOCK_TRANSFER_CANCELLED',
      entityType: 'StockTransfer',
      entityId: transfer.id,
      beforeJson: beforeState,
      afterJson: transfer,
      ipAddress,
    });

    // Trigger SSE updates
    this.notificationsService.triggerRefresh('transfers_changed');

    return this.findOne(id, currentUser);
  }

  async getBranchStockForTransfer(
    branchId: string,
    search: string,
    currentUser: JwtPayload,
  ): Promise<any[]> {
    const ds = await getDataSource();
    const branchRepo = ds.getRepository(Branch);
    const branch = await branchRepo.findOne({ where: { id: branchId } });
    if (!branch) throw new NotFoundException(`Branch with ID ${branchId} not found`);

    if (branch.type === 'WAREHOUSE') {
      const centralStockRepo = ds.getRepository(CentralStock);
      const qb = centralStockRepo.createQueryBuilder('cs')
        .leftJoinAndSelect('cs.book', 'book')
        .where('cs.quantity > 0');

      if (search) {
        qb.andWhere('(book.title LIKE :search OR book.isbn LIKE :search OR book.barcode LIKE :search)', {
          search: `%${search}%`,
        });
      }

      qb.orderBy('book.title', 'ASC').take(15);
      const items = await qb.getMany();
      return items.map((item) => ({
        id: item.book.id,
        title: item.book.title,
        isbn: item.book.isbn,
        barcode: item.book.barcode,
        quantity: item.quantity,
      }));
    } else {
      const branchInventoryRepo = ds.getRepository(BranchInventory);
      const qb = branchInventoryRepo.createQueryBuilder('bi')
        .leftJoinAndSelect('bi.book', 'book')
        .where('bi.branchId = :branchId', { branchId })
        .andWhere('bi.quantity > 0');

      if (search) {
        qb.andWhere('(book.title LIKE :search OR book.isbn LIKE :search OR book.barcode LIKE :search)', {
          search: `%${search}%`,
        });
      }

      qb.orderBy('book.title', 'ASC').take(15);
      const items = await qb.getMany();
      return items.map((item) => ({
        id: item.book.id,
        title: item.book.title,
        isbn: item.book.isbn,
        barcode: item.book.barcode,
        quantity: item.quantity,
      }));
    }
  }

  async getStockByBook(bookId: string, currentUser: JwtPayload): Promise<any[]> {
    const ds = await getDataSource();
    
    // Find central stock for this book
    const centralStockRepo = ds.getRepository(CentralStock);
    const central = await centralStockRepo.findOne({
      where: { bookId },
      relations: ['book']
    });

    const branchInventoryRepo = ds.getRepository(BranchInventory);
    const branchStock = await branchInventoryRepo.find({
      where: { bookId },
      relations: ['branch', 'book']
    });

    const results = [];

    // Add Central Warehouse if it has stock
    const branchRepo = ds.getRepository(Branch);
    const warehouse = await branchRepo.findOne({ where: { type: 'WAREHOUSE' as any } });
    if (warehouse && central && central.quantity > 0) {
      results.push({
        branchId: warehouse.id,
        branchName: warehouse.name,
        branchCode: warehouse.code,
        quantity: central.quantity
      });
    }

    // Add retail branches if they have stock
    for (const bs of branchStock) {
      if (bs.quantity > 0 && bs.branch.isActive) {
        results.push({
          branchId: bs.branch.id,
          branchName: bs.branch.name,
          branchCode: bs.branch.code,
          quantity: bs.quantity
        });
      }
    }

    return results;
  }
}
