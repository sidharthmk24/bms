import { config } from 'dotenv';
import path from 'path';
config({ path: path.join(process.cwd(), '.env.local') });
config();

import { getDataSource } from './lib/db/data-source';

async function clearDataKeepUsersAndCatalog() {
  console.log('🔄 Connecting to database...');
  const ds = await getDataSource();
  const queryRunner = ds.createQueryRunner();
  await queryRunner.connect();

  try {
    console.log('🔒 Disabling foreign key checks temporarily...');
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0;');

    const tablesToClear = [
      'bill_item',
      'bill',
      'purchase_order_item',
      'purchase_order',
      'restock_request_item',
      'restock_request',
      'exhibition_stock',
      'exhibition',
      'expense_revision',
      'expense',
      'book_enquiry',
      'cash_reconciliation',
      'new_title_request',
      'stock_movement',
      'branch_inventory',
      'central_stock',
      'stock_transfer_item',
      'stock_transfer',
      'credit_copy',
      'notification',
      'audit_log',
      'refresh_token',
      'password_reset_token',
      'purchase_order_request',
    ];

    console.log('\n🧹 Clearing transaction, inventory, exhibition, and activity tables...');
    for (const table of tablesToClear) {
      try {
        await queryRunner.query(`TRUNCATE TABLE \`${table}\`;`);
        console.log(`  ✓ Cleared table: ${table}`);
      } catch (err: any) {
        try {
          await queryRunner.query(`DELETE FROM \`${table}\`;`);
          console.log(`  ✓ Emptied table (via DELETE): ${table}`);
        } catch (e: any) {
          // Table might not exist in database schema, skip safely
        }
      }
    }

    console.log('\n✅ All transactional, inventory, exhibition, and activity data has been wiped.');
    console.log('✅ Users, User Roles, Branches, and Book Catalog have been preserved intact.');

  } catch (err) {
    console.error('❌ Error during cleanup:', err);
    throw err;
  } finally {
    console.log('\n🔓 Re-enabling foreign key checks...');
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1;');
    await queryRunner.release();
  }

  console.log('\n🎉 Cleanup completed successfully!\n');
}

clearDataKeepUsersAndCatalog()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
