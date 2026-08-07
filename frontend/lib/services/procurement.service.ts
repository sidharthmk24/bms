import 'server-only';
import { NotFoundException, BadRequestException, ConflictException } from '../errors';
import { getDataSource } from '../db/data-source';

import { PurchaseOrder, PurchaseOrderStatus } from '../api-backend/procurement/entities/purchase-order.entity';
import { PurchaseOrderItem } from '../api-backend/procurement/entities/purchase-order-item.entity';
import { CreatePurchaseOrderDto } from '../api-backend/procurement/dto/create-purchase-order.dto';
import { UpdatePurchaseOrderStatusDto, ReceivePurchaseOrderItemDto } from '../api-backend/procurement/dto/update-purchase-order-status.dto';

import { generatePurchaseOrderNumber } from '../api-backend/common/helpers/purchase-order-number.helper';
import { JwtPayload } from '../auth/jwt';
import { NotificationsService } from './notifications.service';
import { ExpenseCategory } from '../api-backend/finance/entities/expense.entity';
import { StockMovementType } from '../api-backend/inventory/entities/stock-movement.entity';

export class ProcurementService {
  private notificationsService = new NotificationsService();

  private async getRepos() {
    const ds = await getDataSource();
    return {
      dataSource: ds,
      purchaseOrderRepo: ds.getRepository<PurchaseOrder>("PurchaseOrder"),
    };
  }

  async createOrder(
    createDto: CreatePurchaseOrderDto,
    user: JwtPayload,
    ipAddress: string,
  ): Promise<PurchaseOrder> {
    const { dataSource, purchaseOrderRepo } = await this.getRepos();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const orderNumber = await generatePurchaseOrderNumber(dataSource, queryRunner.manager);

      let totalCost = 0;
      for (const item of createDto.items) {
        totalCost += item.quantityOrdered * item.unitCost;
      }

      const expectedDate = createDto.expectedDate ? new Date(createDto.expectedDate).toISOString().split('T')[0] : null;

      // Insert PO using raw SQL to avoid TypeORM hot-reload entity class mismatch
      await queryRunner.manager.query(
        `INSERT INTO purchase_order (id, order_number, supplier_id, expected_date, placed_by_id, status, total_cost, created_at, updated_at)
         VALUES (UUID(), ?, ?, ?, ?, 'DRAFT', ?, NOW(), NOW())`,
        [orderNumber, createDto.supplierId, expectedDate, user.userId, totalCost],
      );

      // Fetch the saved PO id
      const [savedPoRow] = await queryRunner.manager.query(
        `SELECT id FROM purchase_order WHERE order_number = ?`,
        [orderNumber],
      );
      const savedPoId = savedPoRow.id;

      // Insert each item using raw SQL
      for (const item of createDto.items) {
        await queryRunner.manager.query(
          `INSERT INTO purchase_order_item (id, purchase_order_id, book_id, quantity_ordered, unit_cost, quantity_received, created_at, updated_at)
           VALUES (UUID(), ?, ?, ?, ?, 0, NOW(), NOW())`,
          [savedPoId, item.bookId, item.quantityOrdered, item.unitCost],
        );
      }

      // Audit log
      await queryRunner.manager.query(
        'INSERT INTO `audit_log`(`id`, `user_id`, `action`, `entity_type`, `entity_id`, `before_json`, `after_json`, `ip_address`, `created_at`) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, DEFAULT)',
        [
          user.userId,
          'PURCHASE_ORDER_CREATED',
          'PurchaseOrder',
          savedPoId,
          null,
          JSON.stringify({ orderNumber, totalCost }),
          ipAddress,
        ],
      );

      await queryRunner.commitTransaction();
      this.notificationsService.triggerRefresh('procurement_changed');

      return await this.findOne(savedPoId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<PurchaseOrder[]> {
    const { purchaseOrderRepo } = await this.getRepos();
    return purchaseOrderRepo.find({
      relations: ['supplier', 'placedBy', 'items'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<PurchaseOrder> {
    const { purchaseOrderRepo } = await this.getRepos();
    const po = await purchaseOrderRepo.findOne({
      where: { id },
      relations: ['supplier', 'placedBy', 'items', 'items.book'],
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order ${id} not found`);
    }

    return po;
  }

  async updateStatus(
    id: string,
    updateDto: UpdatePurchaseOrderStatusDto,
    user: JwtPayload,
    ipAddress: string,
  ): Promise<PurchaseOrder> {
    const { purchaseOrderRepo } = await this.getRepos();
    const po = await this.findOne(id);
    
    if (updateDto.status === PurchaseOrderStatus.PLACED) {
      return this.placeOrder(po, user, ipAddress);
    } else if (
      updateDto.status === PurchaseOrderStatus.RECEIVED ||
      updateDto.status === PurchaseOrderStatus.PARTIALLY_RECEIVED
    ) {
      if (!updateDto.items || updateDto.items.length === 0) {
        throw new BadRequestException('Items with quantityReceived are required when receiving an order');
      }
      return this.receiveOrder(po, updateDto.status, updateDto.items, user, ipAddress);
    } else if (updateDto.status === PurchaseOrderStatus.CANCELLED) {
      if (po.status !== PurchaseOrderStatus.DRAFT) {
        throw new ConflictException('Can only cancel DRAFT orders');
      }
      po.status = PurchaseOrderStatus.CANCELLED;
      const updated = await purchaseOrderRepo.save(po);
      this.notificationsService.triggerRefresh('procurement_changed');
      return updated;
    }

    throw new BadRequestException('Invalid status transition');
  }

  private async placeOrder(
    po: PurchaseOrder,
    user: JwtPayload,
    ipAddress: string,
  ): Promise<PurchaseOrder> {
    const { purchaseOrderRepo } = await this.getRepos();
    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new ConflictException(`Cannot place order from status ${po.status}`);
    }

    po.status = PurchaseOrderStatus.PLACED;
    const updated = await purchaseOrderRepo.save(po);

    this.notificationsService.triggerRefresh('procurement_changed');
    return updated;
  }

  private async receiveOrder(
    po: PurchaseOrder,
    newStatus: PurchaseOrderStatus,
    receivedItems: ReceivePurchaseOrderItemDto[],
    user: JwtPayload,
    ipAddress: string,
  ): Promise<PurchaseOrder> {
    if (po.status !== PurchaseOrderStatus.PLACED && po.status !== PurchaseOrderStatus.PARTIALLY_RECEIVED) {
      throw new ConflictException(`Cannot receive order from status ${po.status}`);
    }

    const { dataSource } = await this.getRepos();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Update quantities on PO Items
      let receivedTotalCost = 0;
      for (const receiveDto of receivedItems) {
        const item = po.items.find(i => i.id === receiveDto.itemId);
        if (!item) {
          throw new NotFoundException(`Item ${receiveDto.itemId} not found in this PO`);
        }
        
        // UI sends the incremental qty being received now (not the new cumulative total)
        const newlyReceivedQty = receiveDto.quantityReceived;
        
        if (newlyReceivedQty < 0) {
           throw new BadRequestException(`Received quantity cannot be negative for item ${item.id}`);
        }
        if (newlyReceivedQty === 0) {
           continue; // Nothing new received for this line
        }

        const newCumulativeQty = item.quantityReceived + newlyReceivedQty;
        
        // Ensure we don't receive more than ordered
        if (newCumulativeQty > item.quantityOrdered) {
          throw new BadRequestException(
            `Cannot receive more than ordered. Ordered: ${item.quantityOrdered}, already received: ${item.quantityReceived}, trying to receive: ${newlyReceivedQty}`
          );
        }

        item.quantityReceived = newCumulativeQty;
        receivedTotalCost += newlyReceivedQty * item.unitCost;

        await queryRunner.manager.query(
          `UPDATE purchase_order_item SET quantity_received = ? WHERE id = ?`,
          [newCumulativeQty, item.id]
        );

        // 2. Atomically increment central stock
        await queryRunner.manager.query(
          `INSERT INTO central_stock (id, book_id, quantity, reorder_threshold, created_at, updated_at)
           VALUES (UUID(), ?, ?, 10, NOW(), NOW())
           ON DUPLICATE KEY UPDATE quantity = quantity + ?, updated_at = NOW()`,
          [item.bookId, newlyReceivedQty, newlyReceivedQty],
        );

        // 3. Write Stock Movement
        await queryRunner.manager.query(
          `INSERT INTO stock_movement 
             (id, book_id, type, reason, quantity, reference_type, reference_id, performed_by_id, note, created_at)
           VALUES (UUID(), ?, ?, NULL, ?, ?, ?, ?, NULL, NOW())`,
          [
            item.bookId,
            StockMovementType.PURCHASE_RECEIPT,
            newlyReceivedQty,
            'PURCHASE_ORDER',
            po.id,
            user.userId,
          ],
        );
      }

      // 4. Update PO status
      po.status = newStatus;
      await queryRunner.manager.query(`UPDATE purchase_order SET status = ? WHERE id = ?`, [newStatus, po.id]);

      // 5. Record expense for the newly received goods
      if (receivedTotalCost > 0) {
        await queryRunner.manager.query(
          `INSERT INTO expense (id, category, amount, description, expense_date, entered_by_id, created_at, updated_at)
           VALUES (UUID(), ?, ?, ?, CURDATE(), ?, NOW(), NOW())`,
          [
            ExpenseCategory.PROCUREMENT,
            receivedTotalCost,
            `Procurement costs for PO ${po.orderNumber}`,
            user.userId,
          ]
        );
      }

      // 6. Audit Log
      await queryRunner.manager.query(
        'INSERT INTO `audit_log`(`id`, `user_id`, `action`, `entity_type`, `entity_id`, `before_json`, `after_json`, `ip_address`, `created_at`) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, DEFAULT)',
        [
          user.userId,
          'PURCHASE_ORDER_RECEIVED',
          'PurchaseOrder',
          po.id,
          null, // skip full snapshot to avoid clutter
          null,
          ipAddress,
        ],
      );

      await queryRunner.commitTransaction();

      this.notificationsService.triggerRefresh('procurement_changed');
      this.notificationsService.triggerRefresh('stock_changed');
      this.notificationsService.triggerRefresh('finance_changed');

      return await this.findOne(po.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
