import { describe, it, expect, vi } from 'vitest';
import { api } from '../src/lib/api-client';

import {
  useDashboard,
  useClients,
  useClient,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
  useRegeneratePortalToken,
  useProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useTimeEntriesWeekly,
  useTimeEntries,
  useCreateTimeEntry,
  useUpdateTimeEntry,
  useDeleteTimeEntry,
  useBulkSaveTimeEntries,
  useCopyLastWeek,
  useInvoices,
  useInvoice,
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  useSendInvoice,
  useMarkInvoicePaid,
  useWaiveInvoice,
  usePopulateFromTimeEntries,
  useDuplicateInvoice,
  useTimeReport,
  useRevenueReport,
  useProfitabilityReport,
  useUtilizationReport,
  useProjectSettings,
  useUpdateProjectSettings,
  getInvoiceStatusVariant,
  usePortalData,
} from '../src/apps/projects/hooks';

describe('Projects hooks', () => {
  // ─── Dashboard ──────────────────────────────────────────────────

  describe('dashboard hook', () => {
    it('exports useDashboard as a function', () => {
      expect(typeof useDashboard).toBe('function');
    });
  });

  // ─── Client hooks ───────────────────────────────────────────────

  describe('client hook exports', () => {
    it('exports client query hooks', () => {
      expect(typeof useClients).toBe('function');
      expect(typeof useClient).toBe('function');
    });

    it('exports client mutation hooks', () => {
      expect(typeof useCreateClient).toBe('function');
      expect(typeof useUpdateClient).toBe('function');
      expect(typeof useDeleteClient).toBe('function');
      expect(typeof useRegeneratePortalToken).toBe('function');
    });
  });

  // ─── Project hooks ──────────────────────────────────────────────

  describe('project hook exports', () => {
    it('exports project query hooks', () => {
      expect(typeof useProjects).toBe('function');
      expect(typeof useProject).toBe('function');
    });

    it('exports project mutation hooks', () => {
      expect(typeof useCreateProject).toBe('function');
      expect(typeof useUpdateProject).toBe('function');
      expect(typeof useDeleteProject).toBe('function');
    });
  });

  // ─── Time entry hooks ──────────────────────────────────────────

  describe('time entry hook exports', () => {
    it('exports time entry query hooks', () => {
      expect(typeof useTimeEntriesWeekly).toBe('function');
      expect(typeof useTimeEntries).toBe('function');
    });

    it('exports time entry mutation hooks', () => {
      expect(typeof useCreateTimeEntry).toBe('function');
      expect(typeof useUpdateTimeEntry).toBe('function');
      expect(typeof useDeleteTimeEntry).toBe('function');
      expect(typeof useBulkSaveTimeEntries).toBe('function');
      expect(typeof useCopyLastWeek).toBe('function');
    });
  });

  // ─── Invoice hooks ─────────────────────────────────────────────

  describe('invoice hook exports', () => {
    it('exports invoice query hooks', () => {
      expect(typeof useInvoices).toBe('function');
      expect(typeof useInvoice).toBe('function');
    });

    it('exports invoice mutation hooks', () => {
      expect(typeof useCreateInvoice).toBe('function');
      expect(typeof useUpdateInvoice).toBe('function');
      expect(typeof useDeleteInvoice).toBe('function');
      expect(typeof useSendInvoice).toBe('function');
      expect(typeof useMarkInvoicePaid).toBe('function');
      expect(typeof useWaiveInvoice).toBe('function');
      expect(typeof usePopulateFromTimeEntries).toBe('function');
      expect(typeof useDuplicateInvoice).toBe('function');
    });
  });

  // ─── Report hooks ──────────────────────────────────────────────

  describe('report hook exports', () => {
    it('exports report query hooks', () => {
      expect(typeof useTimeReport).toBe('function');
      expect(typeof useRevenueReport).toBe('function');
      expect(typeof useProfitabilityReport).toBe('function');
      expect(typeof useUtilizationReport).toBe('function');
    });
  });

  // ─── Settings and portal hooks ─────────────────────────────────

  describe('settings and portal hook exports', () => {
    it('exports settings hooks', () => {
      expect(typeof useProjectSettings).toBe('function');
      expect(typeof useUpdateProjectSettings).toBe('function');
    });

    it('exports portal data hook', () => {
      expect(typeof usePortalData).toBe('function');
    });
  });

  // ─── Utility functions ──────────────────────────────────────────

  describe('getInvoiceStatusVariant', () => {
    it('returns correct variant for draft', () => {
      expect(getInvoiceStatusVariant('draft')).toBe('default');
    });

    it('returns correct variant for sent', () => {
      expect(getInvoiceStatusVariant('sent')).toBe('primary');
    });

    it('returns correct variant for viewed', () => {
      expect(getInvoiceStatusVariant('viewed')).toBe('warning');
    });

    it('returns correct variant for paid', () => {
      expect(getInvoiceStatusVariant('paid')).toBe('success');
    });

    it('returns correct variant for overdue', () => {
      expect(getInvoiceStatusVariant('overdue')).toBe('error');
    });

    it('returns correct variant for waived', () => {
      expect(getInvoiceStatusVariant('waived')).toBe('default');
    });

    it('returns default for unknown status', () => {
      expect(getInvoiceStatusVariant('unknown')).toBe('default');
    });
  });

  // ─── Module structure ───────────────────────────────────────────

  describe('module structure', () => {
    it('exports a large number of hooks and utilities', async () => {
      const mod = await import('../src/apps/projects/hooks');
      const exportedFns = Object.values(mod).filter((v) => typeof v === 'function');
      expect(exportedFns.length).toBeGreaterThanOrEqual(30);
    });
  });
});
