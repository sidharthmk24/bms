import { config } from 'dotenv';
import path from 'path';
config({ path: path.join(process.cwd(), '.env.local') });
config();

import { getDataSource } from './lib/db/data-source';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

async function cleanDummyData() {
  console.log('🔄 Connecting to database...');
  const ds = await getDataSource();
  const queryRunner = ds.createQueryRunner();
  await queryRunner.connect();

  try {
    console.log('🔒 Disabling foreign key checks temporarily...');
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0;');

    // 1. Clear dummy transactional and activity tables
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
      'audit_log',
      'refresh_token',
      'password_reset_token',
    ];

    for (const table of tablesToClear) {
      try {
        await queryRunner.query(`TRUNCATE TABLE \`${table}\`;`);
        console.log(`  ✓ Cleared table: ${table}`);
      } catch (err: any) {
        // Fallback to DELETE if TRUNCATE fails
        await queryRunner.query(`DELETE FROM \`${table}\`;`);
        console.log(`  ✓ Emptied table (via DELETE): ${table}`);
      }
    }

    // Optional tables if they exist in schema
    const optionalTables = [
      'purchase_order_request',
      'stock_transfer_item',
      'stock_transfer',
      'credit_copy',
      'notification',
    ];

    for (const table of optionalTables) {
      try {
        await queryRunner.query(`TRUNCATE TABLE \`${table}\`;`);
        console.log(`  ✓ Cleared optional table: ${table}`);
      } catch {
        // Ignore if table does not exist
      }
    }

    // 2. Remove test / dummy scratch branches
    console.log('\n🏢 Cleaning branches...');
    await queryRunner.query(`
      DELETE FROM \`branch\` 
      WHERE \`code\` NOT IN ('WH-01', 'BR-01', 'BR-02', 'BR-03')
    `);
    
    // Ensure Central Warehouse and branches are active and properly typed
    await queryRunner.query(`
      UPDATE \`branch\` 
      SET \`is_active\` = 1, \`type\` = 'WAREHOUSE' 
      WHERE \`code\` = 'WH-01'
    `);
    await queryRunner.query(`
      UPDATE \`branch\` 
      SET \`is_active\` = 1, \`type\` = 'STORE' 
      WHERE \`code\` IN ('BR-01', 'BR-02', 'BR-03')
    `);
    console.log('  ✓ Standard branches preserved and active (WH-01, BR-01, BR-02, BR-03)');

    // 3. User & Role cleanup - retain only SUPER_ADMIN
    console.log('\n👤 Cleaning users & roles (keeping only SUPER_ADMIN)...');
    
    // Check if superadmin exists
    const superAdminRows = await queryRunner.query(
      `SELECT * FROM \`user\` WHERE \`email\` = 'superadmin@bms.com' LIMIT 1;`
    );

    let superAdminId: string;
    const passwordHash = bcrypt.hashSync('Password@123', 10);

    if (superAdminRows && superAdminRows.length > 0) {
      superAdminId = superAdminRows[0].id;
      await queryRunner.query(
        `UPDATE \`user\` 
         SET \`name\` = 'Super Admin', 
             \`primary_role\` = 'SUPER_ADMIN', 
             \`branch_id\` = NULL, 
             \`is_active\` = 1, 
             \`password_hash\` = ?
         WHERE \`id\` = ?`,
        [passwordHash, superAdminId]
      );
      console.log(`  ✓ Updated existing Super Admin (${superAdminId})`);
    } else {
      superAdminId = uuidv4();
      await queryRunner.query(
        `INSERT INTO \`user\` (\`id\`, \`name\`, \`email\`, \`primary_role\`, \`branch_id\`, \`is_active\`, \`password_hash\`, \`created_at\`, \`updated_at\`)
         VALUES (?, 'Super Admin', 'superadmin@bms.com', 'SUPER_ADMIN', NULL, 1, ?, NOW(), NOW())`,
        [superAdminId, passwordHash]
      );
      console.log(`  ✓ Created new Super Admin (${superAdminId})`);
    }

    // Delete all user roles except for superadmin's SUPER_ADMIN role
    await queryRunner.query(`DELETE FROM \`user_roles\` WHERE \`user_id\` != ?;`, [superAdminId]);
    await queryRunner.query(`DELETE FROM \`user_roles\` WHERE \`user_id\` = ? AND \`role\` != 'SUPER_ADMIN';`, [superAdminId]);

    // Ensure superadmin has the SUPER_ADMIN role entry
    const existingRole = await queryRunner.query(
      `SELECT * FROM \`user_roles\` WHERE \`user_id\` = ? AND \`role\` = 'SUPER_ADMIN' LIMIT 1;`,
      [superAdminId]
    );
    if (!existingRole || existingRole.length === 0) {
      await queryRunner.query(
        `INSERT INTO \`user_roles\` (\`id\`, \`user_id\`, \`role\`, \`created_at\`)
         VALUES (?, ?, 'SUPER_ADMIN', NOW())`,
        [uuidv4(), superAdminId]
      );
      console.log('  ✓ Added SUPER_ADMIN role entry');
    } else {
      console.log('  ✓ SUPER_ADMIN role entry confirmed');
    }

    // Delete all other users
    await queryRunner.query(
      `DELETE FROM \`user\` WHERE \`id\` != ?;`,
      [superAdminId]
    );
    console.log(`  ✓ Removed other user accounts`);

    // 4. Update system settings
    console.log('\n⚙️ Verifying system settings...');
    const defaultSettings = [
      { key: 'allowed_payment_modes', value: JSON.stringify(['CASH', 'UPI', 'CARD']) },
      { key: 'default_low_stock_threshold', value: JSON.stringify(5) },
      { key: 'currency_symbol', value: JSON.stringify('₹') },
      { key: 'bill_number_prefix', value: JSON.stringify('BMS') },
      { key: 'company_name', value: JSON.stringify('Book Management System') },
    ];

    for (const setting of defaultSettings) {
      const existing = await queryRunner.query(
        `SELECT * FROM \`system_setting\` WHERE \`key\` = ? LIMIT 1;`,
        [setting.key]
      );
      if (existing && existing.length > 0) {
        await queryRunner.query(
          `UPDATE \`system_setting\` SET \`updated_by_id\` = ?, \`value\` = ? WHERE \`key\` = ?;`,
          [superAdminId, setting.value, setting.key]
        );
      } else {
        await queryRunner.query(
          `INSERT INTO \`system_setting\` (\`key\`, \`value\`, \`updated_by_id\`, \`updated_at\`)
           VALUES (?, ?, ?, NOW());`,
          [setting.key, setting.value, superAdminId]
        );
      }
    }
    console.log('  ✓ System settings linked to Super Admin');

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

cleanDummyData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
