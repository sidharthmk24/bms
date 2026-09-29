// import 'server-only';
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
 * Build a fingerprint from the entity constructor identity (not class.name,
 * which gets minified to single letters like 'u' in Vercel production builds).
 * We use the array index + a slice of the constructor source as a stable key.
 */
function buildFingerprint(): string {
  return entities
    .map((e, i) => `${i}:${e.toString().slice(0, 60)}`)
    .join('|');
}

async function createDataSource(): Promise<DataSource> {
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bms_db',
    ssl: process.env.DB_HOST?.includes('tidbcloud') ? { rejectUnauthorized: true } : undefined,
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
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
  let entitiesChanged = false;
  if (globalForDb.dataSource?.isInitialized) {
    const registered = globalForDb.dataSource.options.entities as any[];
    if (!registered || registered.length !== entities.length) {
      entitiesChanged = true;
    } else {
      for (let i = 0; i < entities.length; i++) {
        if (entities[i] !== registered[i]) {
          entitiesChanged = true;
          break;
        }
      }
    }
  }

  if (globalForDb.dataSource?.isInitialized && (globalForDb.entityFingerprint !== fingerprint || entitiesChanged)) {
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
