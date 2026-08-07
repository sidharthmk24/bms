import { execSync, spawn } from 'child_process';
import * as path from 'path';

let server: any;

export async function setup() {
  console.log('\n[Global Setup] Initializing test database...');
  
  const env = {
    ...process.env,
    DOTENV_CONFIG_PATH: path.resolve(process.cwd(), '.env.test'),
    TEST_API_BASE_URL: 'http://localhost:3005/api/v1',
    TEST_MODE: '1',
  };

  try {
    // 1. Sync DB
    console.log('[Global Setup] Syncing Schema...');
    execSync('npx tsx tests/sync-db.ts', { env, stdio: 'inherit' });

    // 2. Seed DB
    console.log('[Global Setup] Seeding Database...');
    execSync('npx tsx lib/api-backend/database/seeds/index.ts', { env, stdio: 'inherit' });
    
    // 3. Start Next.js server for testing
    console.log('[Global Setup] Starting Next.js test server on port 3005...');
    server = spawn('npx', ['next', 'dev', '-p', '3005'], { env, stdio: 'inherit', shell: true });
    
    // Give it 30 seconds to start (Turbopack needs time on first request)
    await new Promise((resolve) => setTimeout(resolve, 30000));

    console.log('[Global Setup] Database and Server ready for tests.\n');
  } catch (error) {
    console.error('[Global Setup] Failed to initialize test database.', error);
    process.exit(1);
  }
}

export async function teardown() {
  if (server) {
    console.log('[Global Teardown] Stopping test server...');
    server.kill();
  }
}
