import { config } from 'dotenv';
import path from 'path';
config({ path: path.join(process.cwd(), '.env.local') });
config();

import { getDataSource } from './lib/db/data-source';
import { User } from './lib/api-backend/users/entities/user.entity';
import { UserRole } from './lib/api-backend/users/entities/user-role.entity';
import { UserRole as UserRoleEnum } from './lib/api-backend/users/enums/user-role.enum';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('Connecting to database...');
  const ds = await getDataSource();
  
  const userRepo = ds.getRepository(User);
  const roleRepo = ds.getRepository(UserRole);

  const existing = await userRepo.findOne({ where: { email: 'superadmin@bms.com' } });
  if (existing) {
    console.log('Super Admin already exists.');
    process.exit(0);
  }

  console.log('Creating Super Admin...');
  const superAdminId = uuidv4();
  const admin = userRepo.create({
    id: superAdminId,
    email: 'superadmin@bms.com',
    passwordHash: bcrypt.hashSync('Password@123', 10),
    name: 'Super Admin',
    primaryRole: UserRoleEnum.SUPER_ADMIN,
    isActive: true,
  });

  await userRepo.save(admin);

  const role = roleRepo.create({
    id: uuidv4(),
    userId: superAdminId,
    role: UserRoleEnum.SUPER_ADMIN,
  });
  await roleRepo.save(role);

  console.log('Super Admin created successfully!');
  console.log('Email: superadmin@bms.com');
  console.log('Password: Password@123');
  process.exit(0);
}

seed().catch(console.error);
