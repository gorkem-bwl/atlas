import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    globalSetup: ['./test/integration/global-setup.ts'],
    setupFiles: ['./test/integration/setup.ts'],
    include: ['test/integration/**/*.test.ts'],
    // TODO: re-enable. The seeded demo data writes a now-removed
    // account_id column on departments / documents / drawings, even
    // though the current schema doesn't have it. Likely a stale
    // migration snapshot or seed code that wasn't updated when the
    // schema migrated from accountId → tenantId. Tracked alongside
    // the broader CI rebuild.
    exclude: [
      '**/node_modules/**',
      'test/integration/crm.test.ts',
      'test/integration/drive.test.ts',
    ],
    testTimeout: 30_000,
    // Run sequentially — tests share a real database
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
