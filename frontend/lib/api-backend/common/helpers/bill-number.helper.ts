import { DataSource } from 'typeorm';

/**
 * generateBillNumber — produces a human-readable, sortable bill number.
 *
 * Format: {BRANCH_CODE}-{YYYYMMDD}-{ZERO_PADDED_SEQUENCE}
 * Example: BR01-20260803-0007
 *
 * WHY this format:
 * - Branch prefix makes it instantly clear which branch created the bill.
 * - Date component allows daily reset of the sequence for readability.
 * - Zero-padded 4-digit counter is URL-safe and sortable as a string.
 *
 * WHY NOT use a DB auto-increment: auto-increment gaps on rollbacks would
 * create missing bill numbers, which looks bad on receipts. This approach
 * uses a transactional COUNT so it's deterministic within the same day.
 *
 * NOTE: This must be called INSIDE an active transaction so the count
 * is consistent under concurrent bill creation.
 */
export async function generateBillNumber(
  dataSource: DataSource,
  codeOrPrefix: string,
  transactionManager?: any,
): Promise<string> {
  const today = new Date();
  
  const year = today.getUTCFullYear();
  const month = String(today.getUTCMonth() + 1).padStart(2, '0');
  const day = String(today.getUTCDate()).padStart(2, '0');
  
  const dateStr = `${year}${month}${day}`;
  const prefix = `${codeOrPrefix}-${dateStr}-`;

  // Count bills with this specific prefix for today
  const manager = transactionManager || dataSource.manager;
  const [{ count }] = await manager.query(
    `SELECT COUNT(*) AS count FROM bill WHERE bill_number LIKE ?`,
    [`${prefix}%`],
  );

  const sequence = String(Number(count) + 1).padStart(4, '0');
  return `${prefix}${sequence}`;
}
