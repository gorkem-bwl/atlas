import { describe, it, expect, vi, beforeEach } from 'vitest';

// A portal token is an unauthenticated bearer credential: whoever holds the
// URL sees the invoices it resolves to. Tokens now live on BOTH crm_companies
// and crm_contacts, so the lookup has to pick the right invoice column per
// token kind. Getting that wrong is a data leak, not a display bug — a
// contact's token filtering on company_id would expose every invoice at the
// company that person happens to belong to.
//
// These tests pin the filter column to the token's owner.

const eqCalls: Array<{ column: unknown; value: unknown }> = [];

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((column: unknown, value: unknown) => {
    eqCalls.push({ column, value });
    return { __eq: [column, value] };
  }),
  and: vi.fn((...args: unknown[]) => ({ __and: args })),
  sql: Object.assign(vi.fn(() => 'sql'), { raw: vi.fn(() => 'sql-raw') }),
  desc: vi.fn(() => 'desc'),
  asc: vi.fn(() => 'asc'),
}));

vi.mock('../src/db/schema', () => ({
  crmCompanies: {
    id: 'companies.id',
    tenantId: 'companies.tenantId',
    name: 'companies.name',
    portalToken: 'companies.portalToken',
    isArchived: 'companies.isArchived',
  },
  crmContacts: {
    id: 'contacts.id',
    tenantId: 'contacts.tenantId',
    name: 'contacts.name',
    portalToken: 'contacts.portalToken',
    isArchived: 'contacts.isArchived',
  },
  invoices: {
    id: 'invoices.id',
    companyId: 'invoices.companyId',
    contactId: 'invoices.contactId',
    tenantId: 'invoices.tenantId',
    isArchived: 'invoices.isArchived',
    status: 'invoices.status',
    createdAt: 'invoices.createdAt',
    invoiceNumber: 'invoices.invoiceNumber',
    total: 'invoices.total',
    currency: 'invoices.currency',
    issueDate: 'invoices.issueDate',
    dueDate: 'invoices.dueDate',
    sentAt: 'invoices.sentAt',
    paidAt: 'invoices.paidAt',
  },
  invoiceLineItems: { invoiceId: 'lineItems.invoiceId', sortOrder: 's', createdAt: 'c' },
}));

// Which table the current select() chain is reading from, so the mock can
// answer the company lookup, the contact lookup and the invoice list
// differently within a single request.
let companyRows: unknown[] = [];
let contactRows: unknown[] = [];

vi.mock('../src/config/database', () => {
  const makeChain = (rowsFor: () => unknown[]) => {
    const chain: Record<string, unknown> = {};
    chain.where = vi.fn(() => chain);
    chain.orderBy = vi.fn(() => Promise.resolve(rowsFor()));
    chain.limit = vi.fn(() => Promise.resolve(rowsFor()));
    return chain;
  };

  const db = {
    select: vi.fn(() => ({
      from: vi.fn((table: any) => {
        if (table?.id === 'companies.id') return makeChain(() => companyRows);
        if (table?.id === 'contacts.id') return makeChain(() => contactRows);
        return makeChain(() => []);
      }),
    })),
  };
  return { db, pool: {} };
});

vi.mock('../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../src/apps/invoices/services/invoice.service', () => ({
  markInvoiceViewed: vi.fn(),
}));

const { getPortalInvoices } = await import('../src/apps/invoices/controllers/portal.controller');

function mockRes() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: unknown) { this.body = payload; return this; },
  };
  return res;
}

describe('portal token resolution', () => {
  beforeEach(() => {
    eqCalls.length = 0;
    companyRows = [];
    contactRows = [];
  });

  it('filters on company_id for a company token', async () => {
    companyRows = [{ id: 'co1', tenantId: 't1', name: 'Acme Inc' }];

    const res = mockRes();
    await getPortalInvoices({ params: { token: 'tok-company' } } as any, res);

    const filtered = eqCalls.filter((c) => c.column === 'invoices.companyId');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].value).toBe('co1');
    // The contact column must not appear — that would widen the result set.
    expect(eqCalls.some((c) => c.column === 'invoices.contactId')).toBe(false);
  });

  it('filters on contact_id for a contact token, never company_id', async () => {
    // No company owns this token; the contact does.
    contactRows = [{ id: 'ct1', tenantId: 't1', name: 'Jane Doe' }];

    const res = mockRes();
    await getPortalInvoices({ params: { token: 'tok-contact' } } as any, res);

    const filtered = eqCalls.filter((c) => c.column === 'invoices.contactId');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].value).toBe('ct1');
    // The leak this guards against: scoping an individual's portal by the
    // company they belong to would show them colleagues' invoices.
    expect(eqCalls.some((c) => c.column === 'invoices.companyId')).toBe(false);
  });

  it('404s an unknown token without querying invoices', async () => {
    const res = mockRes();
    await getPortalInvoices({ params: { token: 'nope' } } as any, res);

    expect(res.statusCode).toBe(404);
    expect(eqCalls.some((c) => c.column === 'invoices.companyId')).toBe(false);
    expect(eqCalls.some((c) => c.column === 'invoices.contactId')).toBe(false);
  });

  it('scopes every lookup by tenant', async () => {
    companyRows = [{ id: 'co1', tenantId: 't1', name: 'Acme Inc' }];

    const res = mockRes();
    await getPortalInvoices({ params: { token: 'tok-company' } } as any, res);

    const tenantFilter = eqCalls.find((c) => c.column === 'invoices.tenantId');
    expect(tenantFilter?.value).toBe('t1');
  });

  it('prefers the company when a token somehow matches both tables', async () => {
    // Both columns are UNIQUE so this should be impossible, but the resolver
    // checks companies first and must not fall through to the contact branch.
    companyRows = [{ id: 'co1', tenantId: 't1', name: 'Acme Inc' }];
    contactRows = [{ id: 'ct1', tenantId: 't1', name: 'Jane Doe' }];

    const res = mockRes();
    await getPortalInvoices({ params: { token: 'tok-both' } } as any, res);

    expect(eqCalls.some((c) => c.column === 'invoices.companyId')).toBe(true);
    expect(eqCalls.some((c) => c.column === 'invoices.contactId')).toBe(false);
  });
});
