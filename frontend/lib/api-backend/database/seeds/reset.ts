import 'dotenv/config';
import { AppDataSource } from '../data-source';

async function reset() {
  console.log('\n🧹 Connecting to database for reset...');
  await AppDataSource.initialize();
  const qr = AppDataSource.createQueryRunner();
  await qr.connect();

  try {
    console.log('🧹 Clearing all data from tables...');
    await qr.startTransaction();

    // Disable foreign key checks so we can truncate tables in any order
    await qr.query('SET FOREIGN_KEY_CHECKS = 0');

    const tables = [
      'audit_log',
      'bill_item',
      'bill',
      'book_enquiry',
      'branch_inventory',
      'central_stock',
      'exhibition_stock',
      'exhibition',
      'expense_revision',
      'expense',
      'new_title_request',
      'password_reset_token',
      'purchase_order_item',
      'purchase_order',
      'refresh_token',
      'restock_request_item',
      'restock_request',
      'stock_movement',
      'system_setting',
      'user',
      'book',
      'author',
      'publisher',
      'category',
      'supplier',
      'branch',
    ];

    for (const table of tables) {
      await qr.query(`TRUNCATE TABLE \`${table}\``);
    }

    // Re-enable foreign key checks
    await qr.query('SET FOREIGN_KEY_CHECKS = 1');
    await qr.commitTransaction();
    console.log('🧹 All database tables successfully truncated!');
  } catch (err) {
    console.error('❌ Reset failed:', err);
    try {
      await qr.rollbackTransaction();
    } catch (e) {}
    throw err;
  } finally {
    await qr.release();
    await AppDataSource.destroy();
    console.log('🧹 Connection closed.\n');
  }
}

reset().catch(() => process.exit(1));
