import 'server-only';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { entities } from './entities';

// Cache the DataSource on globalThis to survive Next.js HMR restarts
const globalForDb = globalThis as unknown as {
  dataSource?: DataSource;
  entityFingerprint?: string;
};

/**
 * Build a fingerprint from the entity class names + their constructor identity.
 * Every hot-reload creates new class objects, so toString() on the constructor
 * gives a unique-enough string per reload cycle.
 */
function buildFingerprint(): string {
  return entities.map(e => e.name + '_' + e.toString().slice(0, 40)).join('|');
}

async function createDataSource(): Promise<DataSource> {
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bms_db',
    synchronize: false,
    logging: false,
    entities,
    subscribers: [],
    migrations: [],
    namingStrategy: new SnakeNamingStrategy(),
  });
  await ds.initialize();
  return ds;
}

export async function getDataSource(): Promise<DataSource> {
  const fingerprint = buildFingerprint();

  // If entity classes changed (hot-reload), destroy the stale DataSource
  if (globalForDb.dataSource?.isInitialized && globalForDb.entityFingerprint !== fingerprint) {
    console.warn('[DB] Entity classes changed after hot-reload — reinitialising DataSource...');
    try { await globalForDb.dataSource.destroy(); } catch (_) {}
    globalForDb.dataSource = undefined;
    globalForDb.entityFingerprint = undefined;
  }

  if (globalForDb.dataSource?.isInitialized) {
    return globalForDb.dataSource;
  }

  const ds = await createDataSource();
  globalForDb.dataSource = ds;
  globalForDb.entityFingerprint = fingerprint;
  return ds;
}
