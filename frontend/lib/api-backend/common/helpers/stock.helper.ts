import {
  ConflictException,
  InternalServerErrorException,
} from '../../../errors';
import { QueryRunner } from 'typeorm';

/**
 * StockMovement type enum — kept here so the helper can be self-contained.
 * The full entity enum is in src/inventory/enums/ (Phase 6).
 */
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

/**
 * decrementBranchStock — atomically decrements branch inventory.
 *
 * WHY a single SQL UPDATE rather than load-then-save:
 * TypeORM's save() pattern would require: (1) load current quantity,
 * (2) subtract in JS, (3) save back. Between steps 1 and 3 another
 * request could sell the same copy — resulting in negative stock.
 *
 * The conditional UPDATE is an atomic operation: the row is only modified
 * if quantity >= requested amount. If affectedRows === 0 it means either
 * the row doesn't exist or stock was insufficient — both are 409 Conflict.
 *
 * MUST be called inside an existing queryRunner transaction.
 */
export async function decrementBranchStock(
  queryRunner: QueryRunner,
  branchId: string,
  bookId: string,
  quantity: number,
): Promise<void> {
  const raw = await queryRunner.manager.query(
    `UPDATE branch_inventory
     SET quantity = quantity - ?
     WHERE branch_id = ? AND book_id = ? AND quantity >= ?`,
    [quantity, branchId, bookId, quantity],
  );

  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header || header.affectedRows === 0) {
    throw new ConflictException('INSUFFICIENT_STOCK');
  }
}

/**
 * incrementBranchStock — atomically increments branch inventory.
 *
 * Used for restocking, exhibition returns, and sale voids.
 * Upserts the row if it doesn't exist yet (e.g. first restock to a new branch).
 *
 * MUST be called inside an existing queryRunner transaction.
 */
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

/**
 * decrementCentralStock — atomically decrements central warehouse stock.
 *
 * Used when dispatching a restock request to a branch.
 * MUST be called inside an existing queryRunner transaction.
 */
export async function decrementCentralStock(
  queryRunner: QueryRunner,
  bookId: string,
  quantity: number,
): Promise<void> {
  const raw = await queryRunner.manager.query(
    `UPDATE central_stock
     SET quantity = quantity - ?
     WHERE book_id = ? AND quantity >= ?`,
    [quantity, bookId, quantity],
  );

  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header || header.affectedRows === 0) {
    throw new ConflictException('INSUFFICIENT_CENTRAL_STOCK');
  }
}

/**
 * incrementCentralStock — atomically increments central warehouse stock.
 *
 * Used when receiving a purchase order.
 * MUST be called inside an existing queryRunner transaction.
 */
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

/**
 * writeStockMovement — inserts an append-only StockMovement row.
 *
 * EVERY stock change must call this in the same transaction.
 * quantity is SIGNED: negative = leaving, positive = arriving.
 *
 * This is the permanent audit trail. Never update or delete these rows.
 *
 * MUST be called inside an existing queryRunner transaction.
 */
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
