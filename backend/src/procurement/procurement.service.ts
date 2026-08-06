import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';

import { PurchaseOrder, PurchaseOrderStatus } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderStatusDto, ReceivePurchaseOrderItemDto } from './dto/update-purchase-order-status.dto';

import { generatePurchaseOrderNumber } from '../common/helpers/purchase-order-number.helper';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { Expense, ExpenseCategory } from '../finance/entities/expense.entity';
import { StockMovementType } from '../inventory/entities/stock-movement.entity';

@Injectable()
export class ProcurementService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepo: Repository<PurchaseOrder>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createOrder(
    createDto: CreatePurchaseOrderDto,
    user: JwtPayload,
    ipAddress: string,
  ): Promise<PurchaseOrder> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const orderNumber = await generatePurchaseOrderNumber(this.dataSource, queryRunner.manager);

      let totalCost = 0;
      for (const item of createDto.items) {
        totalCost += item.quantityOrdered * item.unitCost;
      }

      const po = this.purchaseOrderRepo.create({
        orderNumber,
        supplierId: createDto.supplierId,
        expectedDate: createDto.expectedDate ? new Date(createDto.expectedDate) : null,
        placedById: user.userId,
        status: PurchaseOrderStatus.DRAFT,
        totalCost,
      });

      const savedPo = await queryRunner.manager.save(PurchaseOrder, po);

      const poItems = createDto.items.map((item) =>
        queryRunner.manager.create(PurchaseOrderItem, {
          purchaseOrderId: savedPo.id,
          bookId: item.bookId,
          quantityOrdered: item.quantityOrdered,
          unitCost: item.unitCost,
          quantityReceived: 0,
        }),
      );

      await queryRunner.manager.save(PurchaseOrderItem, poItems);

      // Audit log
      await queryRunner.manager.query(
        'INSERT INTO `audit_log`(`id`, `user_id`, `action`, `entity_type`, `entity_id`, `before_json`, `after_json`, `ip_address`, `created_at`) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, DEFAULT)',
        [
          user.userId,
          'PURCHASE_ORDER_CREATED',
          'PurchaseOrder',
          savedPo.id,
          null,
          JSON.stringify(savedPo),
          ipAddress,
        ],
      );

      await queryRunner.commitTransaction();
      this.notificationsService.triggerRefresh('procurement_changed');

      return await this.findOne(savedPo.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<PurchaseOrder[]> {
    return this.purchaseOrderRepo.find({
      relations: ['supplier', 'placedBy', 'items'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<PurchaseOrder> {
    const po = await this.purchaseOrderRepo.findOne({
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
      const updated = await this.purchaseOrderRepo.save(po);
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
    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new ConflictException(`Cannot place order from status ${po.status}`);
    }

    po.status = PurchaseOrderStatus.PLACED;
    const updated = await this.purchaseOrderRepo.save(po);

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

    const queryRunner = this.dataSource.createQueryRunner();
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
        
        // Calculate the diff to know how much to increment stock by and how much expense to log this time
        // Actually, if we only allow receiving once, we just take quantityReceived.
        // But since we allow PARTIALLY_RECEIVED, we only add the incremental stock.
        const newlyReceivedQty = receiveDto.quantityReceived - item.quantityReceived;
        
        if (newlyReceivedQty < 0) {
           throw new BadRequestException(`Cannot reduce received quantity for item ${item.id}`);
        }
        if (newlyReceivedQty === 0) {
           continue; // No new items for this line
        }

        item.quantityReceived = receiveDto.quantityReceived;
        receivedTotalCost += newlyReceivedQty * item.unitCost;

        await queryRunner.manager.update(
          PurchaseOrderItem,
          { id: item.id },
          { quantityReceived: item.quantityReceived }
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
      await queryRunner.manager.update(PurchaseOrder, { id: po.id }, { status: newStatus });

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
