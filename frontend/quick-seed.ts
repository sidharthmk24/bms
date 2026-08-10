import { config } from 'dotenv';
config({ path: '.env.local' });

import { getDataSource } from './lib/db/data-source';
import { User } from './lib/api-backend/users/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('Connecting to database using credentials from .env.local...');
  const ds = await getDataSource();
  
  const userRepo = ds.getRepository(User);
  const existing = await userRepo.findOne({ where: { email: 'superadmin@bms.com' } });
  if (existing) {
    console.log('Super Admin already exists.');
    process.exit(0);
  }

  console.log('Creating Super Admin...');
  const admin = userRepo.create({
    userId: uuidv4(),
    email: 'superadmin@bms.com',
    passwordHash: bcrypt.hashSync('Password@123', 10),
    name: 'Super Admin',
    role: 'SUPER_ADMIN',
    isActive: true,
  });

  await userRepo.save(admin);
  console.log('Super Admin created successfully!');
  console.log('Email: superadmin@bms.com');
  console.log('Password: Password@123');
  process.exit(0);
}

seed().catch(console.error);
