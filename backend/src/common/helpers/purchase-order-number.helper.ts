import { DataSource } from 'typeorm';

/**
 * generatePurchaseOrderNumber
 * Format: PO-{YYYYMMDD}-{ZERO_PADDED_SEQUENCE}
 * Example: PO-20260803-0001
 */
export async function generatePurchaseOrderNumber(
  dataSource: DataSource,
  transactionManager?: any,
): Promise<string> {
  const today = new Date();
  const dateStr = [
    today.getUTCFullYear(),
    String(today.getUTCMonth() + 1).padStart(2, '0'),
    String(today.getUTCDate()).padStart(2, '0'),
  ].join('');

  const manager = transactionManager || dataSource.manager;
  const [{ count }] = await manager.query(
    `SELECT COUNT(*) AS count FROM purchase_order
     WHERE DATE(created_at) = CURDATE()`,
  );

  const sequence = String(Number(count) + 1).padStart(4, '0');
  return `PO-${dateStr}-${sequence}`;
}
