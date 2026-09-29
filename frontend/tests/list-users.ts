import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { entities } from '../lib/db/entities';

async function listUsers() {
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
    const users = await ds.query(`SELECT id, name, email, primary_role, is_active FROM user`);
    console.log('Users in DB:', users);
    await ds.destroy();
  } catch (err) {
    console.error('Failed to list users:', err);
  }
}

listUsers();
