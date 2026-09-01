import { config } from 'dotenv';
import path from 'path';
config({ path: path.join(process.cwd(), '.env.local') });
config(); // fallback to .env if present

import { getDataSource } from '../../../db/data-source';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

// ── Entity imports ────────────────────────────────────────────────────────────
import { User } from '../../users/entities/user.entity';
import { UserRole as UserRoleEnum } from '../../users/enums/user-role.enum';
import { UserRole as UserRoleEntity } from '../../users/entities/user-role.entity';
import { SystemSetting } from '../../settings/entities/system-setting.entity';

// ── Helpers ───────────────────────────────────────────────────────────────────
const PASSWORD_HASH = bcrypt.hashSync('Password@123', 10);

// ── Main seed function ────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🌱 Connecting to database...');
  const ds = await getDataSource();
  const qr = ds.createQueryRunner();
  await qr.connect();

  try {
    console.log('🧹 Synchronizing clean database schema...');
    await ds.synchronize(true);
    
    console.log('🌱 Creating Super Admin user & settings...\n');

    // ── 1. Super Admin User ───────────────────────────────────────────────────
    const superAdminId = uuidv4();

    const superAdmin = qr.manager.create(User, {
      id: superAdminId,
      name: 'Super Admin',
      email: 'superadmin@bms.com',
      primaryRole: UserRoleEnum.SUPER_ADMIN,
      branchId: null,
      passwordHash: PASSWORD_HASH,
      isActive: true,
      createdById: null,
    });

    await qr.manager.save(User, superAdmin);

    // ── 2. Super Admin Role ───────────────────────────────────────────────────
    const superAdminRole = qr.manager.create(UserRoleEntity, {
      id: uuidv4(),
      userId: superAdminId,
      role: UserRoleEnum.SUPER_ADMIN,
    });
    await qr.manager.save(UserRoleEntity, superAdminRole);
    console.log('✅ Super Admin user & role seeded');

    // ── 3. System Settings ────────────────────────────────────────────────────
    const defaultSettings = [
      { key: 'allowed_payment_modes', value: ['CASH', 'UPI', 'CARD'], updatedById: superAdminId },
      { key: 'default_low_stock_threshold', value: 5, updatedById: superAdminId },
      { key: 'currency_symbol', value: '₹', updatedById: superAdminId },
      { key: 'bill_number_prefix', value: 'BMS', updatedById: superAdminId },
      { key: 'company_name', value: 'Book Management System', updatedById: superAdminId },
    ];

    for (const setting of defaultSettings) {
      await qr.manager.save(SystemSetting, qr.manager.create(SystemSetting, setting));
    }
    console.log('✅ System settings seeded');

    console.log('\n  SEEDED LOGIN:');
    console.log('  Email:    superadmin@bms.com');
    console.log('  Password: Password@123');
    console.log('  Role:     SUPER_ADMIN\n');
    console.log('✅ Clean seed complete!\n');
  } catch (err) {
    console.error('❌ Seed failed:', err);
    throw err;
  } finally {
    await qr.release();
    process.exit(0);
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
