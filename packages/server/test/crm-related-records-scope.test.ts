import { describe, it, expect, vi } from 'vitest';

// Separate file from crm-related-records.test.ts: that one mocks the service
// under test to isolate the controllers, which would defeat these assertions.
vi.mock('../src/config/database', () => ({ db: {}, pool: {} }));
vi.mock('../src/services/platform/tenant-app.service', () => ({ isAppEnabled: vi.fn() }));
vi.mock('../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { __test } = await import('../src/apps/crm/services/related-records.service');

/**
 * Guards a real bug caught in review: keying the row filter off `recordAccess`
 * rather than `role` leaked other users' invoices into the CRM page. A default
 * tenant member resolves to { role: 'editor', recordAccess: 'all' }, while
 * both the Invoices and Work apps gate on `role === 'admin'` alone — so the
 * two are very different gates and only the role one matches those apps.
 */
describe('related-records row scoping mirrors the source apps', () => {
  const admin = { role: 'admin', recordAccess: 'all' } as any;
  const member = { role: 'editor', recordAccess: 'all' } as any;
  const viewer = { role: 'viewer', recordAccess: 'own' } as any;

  it('leaves invoices unfiltered for an admin', () => {
    expect(__test.invoiceScopeFor(admin, 'u1')).toBeUndefined();
  });

  it('filters invoices to the caller for a non-admin, even with recordAccess "all"', () => {
    expect(__test.invoiceScopeFor(member, 'u1')).toBeDefined();
    expect(__test.invoiceScopeFor(viewer, 'u1')).toBeDefined();
  });

  it('leaves projects unfiltered for an admin', () => {
    expect(__test.projectScopeFor(admin, 'u1')).toBeUndefined();
  });

  it('filters projects to owner-or-member for a non-admin', () => {
    expect(__test.projectScopeFor(member, 'u1')).toBeDefined();
    expect(__test.projectScopeFor(viewer, 'u1')).toBeDefined();
  });
});
