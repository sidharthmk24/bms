/**
 * data-source.ts — TypeORM DataSource for the CLI (migrations & seeds).
 *
 * This file is used ONLY by the TypeORM CLI commands (migration:run,
 * migration:generate, migration:revert). The app itself connects via
 * the TypeOrmModule registered in AppModule.
 *
 * Why a separate file: TypeORM CLI needs a DataSource instance it can
 * import directly; it cannot bootstrap NestJS to get the TypeOrmModule config.
 */

import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import * as path from 'path';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME || 'bms_user',
  password: process.env.DB_PASSWORD || 'BmsApp@2026',
  database: process.env.DB_NAME || 'bms_db',
  synchronize: false, // NEVER synchronize in production
  logging: process.env.DB_LOGGING === 'true',
  charset: 'utf8mb4_unicode_ci',
  timezone: 'Z',
  entities: [path.join(process.cwd(), 'lib/api-backend/**/*.entity{.ts,.js}')],
  migrations: [path.join(process.cwd(), 'lib/api-backend/database/migrations/*{.ts,.js}')],
  migrationsTableName: 'typeorm_migrations',
  namingStrategy: new SnakeNamingStrategy(),
});
