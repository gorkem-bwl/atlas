import { describe, it, expect } from 'vitest';

import {
  useTableList,
  useTable,
  useCreateTable,
  useUpdateTable,
  useDeleteTable,
  useRestoreTable,
  useAutoSaveTable,
} from '../src/apps/tables/hooks';

describe('Tables hooks', () => {
  // ─── Query hooks ────────────────────────────────────────────────

  describe('query hook exports', () => {
    it('exports useTableList as a function', () => {
      expect(typeof useTableList).toBe('function');
    });

    it('exports useTable as a function', () => {
      expect(typeof useTable).toBe('function');
    });
  });

  // ─── Mutation hooks ─────────────────────────────────────────────

  describe('mutation hook exports', () => {
    it('exports useCreateTable as a function', () => {
      expect(typeof useCreateTable).toBe('function');
    });

    it('exports useUpdateTable as a function', () => {
      expect(typeof useUpdateTable).toBe('function');
    });

    it('exports useDeleteTable as a function', () => {
      expect(typeof useDeleteTable).toBe('function');
    });

    it('exports useRestoreTable as a function', () => {
      expect(typeof useRestoreTable).toBe('function');
    });
  });

  // ─── Auto-save hook ─────────────────────────────────────────────

  describe('auto-save hook', () => {
    it('exports useAutoSaveTable as a function', () => {
      expect(typeof useAutoSaveTable).toBe('function');
    });
  });

  // ─── Module structure ───────────────────────────────────────────

  describe('module structure', () => {
    it('exports at least 7 hooks', async () => {
      const mod = await import('../src/apps/tables/hooks');
      const exportedFns = Object.values(mod).filter((v) => typeof v === 'function');
      expect(exportedFns.length).toBeGreaterThanOrEqual(7);
    });

    it('all exports are functions', async () => {
      const mod = await import('../src/apps/tables/hooks');
      for (const [key, value] of Object.entries(mod)) {
        expect(typeof value).toBe('function');
      }
    });
  });
});
