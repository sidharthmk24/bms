import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: './tests/globalSetup.ts',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 120000,
    hookTimeout: 120000,
    // Disable concurrency if tests rely on the same DB state
    fileParallelism: false,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    }
  } as any,
});
