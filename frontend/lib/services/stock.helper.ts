import 'server-only';
import { QueryRunner } from 'typeorm';
import { ConflictException } from '../errors';

export type StockMovementType =
  | 'SALE'
  | 'SALE_VOID'
  | 'RESTOCK_IN'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'EXHIBITION_OUT'
  | 'EXHIBITION_RETURN'
  | 'PURCHASE_RECEIPT'
  | 'ADJUSTMENT';

export async function decrementBranchStock(
  queryRunner: QueryRunner,
  branchId: string,
  bookId: string,
  quantity: number,
): Promise<void> {
  const result = await queryRunner.manager.query(
    `UPDATE branch_inventory
     SET quantity = quantity - ?
     WHERE branch_id = ? AND book_id = ? AND quantity >= ?`,
    [quantity, branchId, bookId, quantity],
  );

  const header = Array.isArray(result) ? result[0] : result;
  if (!header || header.affectedRows === 0) {
    throw new ConflictException('INSUFFICIENT_STOCK');
  }

  try {
    const updatedRows = await queryRunner.manager.query(
      `SELECT bi.quantity, bi.reorder_threshold, b.title, br.name as branch_name 
       FROM branch_inventory bi
       JOIN book b ON bi.book_id = b.id
       JOIN branch br ON bi.branch_id = br.id
       WHERE bi.branch_id = ? AND bi.book_id = ?`,
      [branchId, bookId]
    );

    if (updatedRows && updatedRows.length > 0) {
      const { quantity: newQty, reorder_threshold: threshold, title, branch_name } = updatedRows[0];
      
      const { NotificationsService } = await import('./notifications.service');
      const { UserRole } = await import('../api-backend/users/enums/user-role.enum');
      const notificationsService = new NotificationsService();

      if (newQty === 0) {
        await notificationsService.notifyRoles(
          [UserRole.BRANCH_MANAGER, UserRole.BRANCH_INVENTORY],
          branchId,
          'Book Sold Out',
          `"${title}" is sold out at ${branch_name}!`,
          'SOLD_OUT'
        );
      } else if (newQty <= threshold) {
        await notificationsService.notifyRoles(
          [UserRole.BRANCH_MANAGER, UserRole.BRANCH_INVENTORY],
          branchId,
          'Low Stock Warning',
          `"${title}" is low in stock at ${branch_name} (Current: ${newQty}, Threshold: ${threshold})`,
          'LOW_STOCK'
        );
      }
    }
  } catch (err) {
    console.error('[stock.helper] Failed to trigger branch stock notification:', err);
  }
}

export async function incrementBranchStock(
  queryRunner: QueryRunner,
  branchId: string,
  bookId: string,
  quantity: number,
): Promise<void> {
  await queryRunner.manager.query(
    `INSERT INTO branch_inventory (id, branch_id, book_id, quantity, reorder_threshold, created_at, updated_at)
     VALUES (UUID(), ?, ?, ?, 5, NOW(), NOW())
     ON DUPLICATE KEY UPDATE quantity = quantity + ?, updated_at = NOW()`,
    [branchId, bookId, quantity, quantity],
  );
}

export async function decrementCentralStock(
  queryRunner: QueryRunner,
  bookId: string,
  quantity: number,
): Promise<void> {
  const result = await queryRunner.manager.query(
    `UPDATE central_stock
     SET quantity = quantity - ?
     WHERE book_id = ? AND quantity >= ?`,
    [quantity, bookId, quantity],
  );

  const header = Array.isArray(result) ? result[0] : result;
  if (!header || header.affectedRows === 0) {
    throw new ConflictException('INSUFFICIENT_CENTRAL_STOCK');
  }

  try {
    const updatedRows = await queryRunner.manager.query(
      `SELECT cs.quantity, cs.reorder_threshold, b.title 
       FROM central_stock cs
       JOIN book b ON cs.book_id = b.id
       WHERE cs.book_id = ?`,
      [bookId]
    );

    if (updatedRows && updatedRows.length > 0) {
      const { quantity: newQty, reorder_threshold: threshold, title } = updatedRows[0];
      
      const { NotificationsService } = await import('./notifications.service');
      const { UserRole } = await import('../api-backend/users/enums/user-role.enum');
      const notificationsService = new NotificationsService();

      if (newQty === 0) {
        await notificationsService.notifyRoles(
          [UserRole.CENTRAL_INVENTORY_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
          null,
          'Central Stock Sold Out',
          `"${title}" is completely sold out in the Central Warehouse!`,
          'SOLD_OUT'
        );
      } else if (newQty <= threshold) {
        await notificationsService.notifyRoles(
          [UserRole.CENTRAL_INVENTORY_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
          null,
          'Central Low Stock Warning',
          `"${title}" is low in stock in the Central Warehouse (Current: ${newQty}, Threshold: ${threshold})`,
          'LOW_STOCK'
        );
      }
    }
  } catch (err) {
    console.error('[stock.helper] Failed to trigger central stock notification:', err);
  }
}

export async function incrementCentralStock(
  queryRunner: QueryRunner,
  bookId: string,
  quantity: number,
): Promise<void> {
  await queryRunner.manager.query(
    `UPDATE central_stock SET quantity = quantity + ?, updated_at = NOW()
     WHERE book_id = ?`,
    [quantity, bookId],
  );
}

export async function writeStockMovement(
  queryRunner: QueryRunner,
  opts: {
    bookId: string;
    branchId: string | null;
    type: StockMovementType;
    quantity: number; // signed
    performedById: string;
    referenceType?: 'BILL' | 'RESTOCK_REQUEST' | 'EXHIBITION' | 'PURCHASE_ORDER' | 'MANUAL';
    referenceId?: string;
    reason?: string;
    note?: string;
  },
): Promise<void> {
  const { v4: uuidv4 } = await import('uuid');

  await queryRunner.manager.query(
    `INSERT INTO stock_movement
       (id, book_id, branch_id, type, reason, quantity,
        reference_type, reference_id, performed_by_id, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      uuidv4(),
      opts.bookId,
      opts.branchId ?? null,
      opts.type,
      opts.reason ?? null,
      opts.quantity,
      opts.referenceType ?? null,
      opts.referenceId ?? null,
      opts.performedById,
      opts.note ?? null,
    ],
  );
}
