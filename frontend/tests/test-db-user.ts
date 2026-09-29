import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { entities } from '../lib/db/entities';
import { User } from '../lib/api-backend/users/entities/user.entity';

async function testUserQuery() {
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
    logging: true,
    entities,
    namingStrategy: new SnakeNamingStrategy(),
  });

  try {
    await ds.initialize();
    console.log('DB connected successfully.');
    const userRepo = ds.getRepository(User);
    const user = await userRepo.findOne({ where: { email: 'admin@kairalibooks.com' } });
    console.log('User query result:', user);
    await ds.destroy();
  } catch (err) {
    console.error('Test DB Query Error:', err);
  }
}

testUserQuery();
