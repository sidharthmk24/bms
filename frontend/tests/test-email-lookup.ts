import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { entities } from '../lib/db/entities';
import { User } from '../lib/api-backend/users/entities/user.entity';
import { NotFoundException } from '../lib/errors';

async function testEmailLookup() {
  const host = process.env.DB_HOST || 'localhost';
  const ds = new DataSource({
    type: 'mysql',
    host,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'test',
    ssl: host.includes('tidbcloud') ? { rejectUnauthorized: true } : undefined,
    synchronize: false,
    logging: false,
    entities,
    namingStrategy: new SnakeNamingStrategy(),
  });

  try {
    await ds.initialize();
    const userRepo = ds.getRepository(User);

    console.log('Testing superadmin@bms.com...');
    const user1 = await userRepo
      .createQueryBuilder('u')
      .where('LOWER(u.email) = :email', { email: 'superadmin@bms.com' })
      .getOne();
    console.log('Found user1:', user1?.name, user1?.email);

    console.log('Testing NONEXISTENT email...');
    const user2 = await userRepo
      .createQueryBuilder('u')
      .where('LOWER(u.email) = :email', { email: 'wrong@bms.com' })
      .getOne();
    console.log('User2 result:', user2);

    await ds.destroy();
  } catch (err) {
    console.error('Test Error:', err);
  }
}

testEmailLookup();
