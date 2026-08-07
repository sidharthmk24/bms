import 'dotenv/config';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import * as path from 'path';
import { entities } from '../lib/db/entities';

async function syncDb() {
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bms_test',
    synchronize: true, // CREATE TABLES
    dropSchema: true,  // DROP ALL EXISTING TABLES BEFORE CREATING
    logging: false,
    entities,
    namingStrategy: new SnakeNamingStrategy(),
  });

  await ds.initialize();
  await ds.destroy();
  console.log('Test database synchronized successfully.');
}

syncDb().catch((err) => {
  console.error('Failed to sync DB:', err);
  process.exit(1);
});
