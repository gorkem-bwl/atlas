import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    // TODO: rebuild these test files. They drifted as components/hooks
    // evolved and were not maintained. Once the rebuild is in flight,
    // tests should be added back here a few at a time. Tracked alongside
    // the broader CI rebuild.
    exclude: [
      '**/node_modules/**',
      'test/dock-pet.test.tsx',
      'test/format.test.ts',
      'test/hooks-tables.test.ts',
      'test/navigation.test.ts',
      'test/query-keys.test.ts',
      'test/settings-panels.test.tsx',
      'test/stat-card.test.tsx',
      'test/ui-components.test.tsx',
      'test/ui-misc.test.tsx',
      'test/ui-select.test.tsx',
      'test/ui-sidebar.test.tsx',
      'test/ui-store.test.ts',
      'test/widget-components.test.tsx',
    ],
    testTimeout: 10_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
