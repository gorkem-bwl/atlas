import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for recurring-invoice.service.ts
 *
 * The service uses drizzle-orm chain builders against the real `db`.
 * We mock the `db` module from '../src/config/database' and replace
 * `db.select / db.update / db.delete / db.insert / db.transaction`
 * with per-test stubs that capture payloads and return fixtures.
 *
 * `addFrequency` is not exported, so it is tested indirectly via
 * `generateInvoiceFromRecurring` (which advances `nextRunAt` by the
 * configured frequency from `now`) and via `updateRecurringInvoice`
 * (which, when runCount > 0 and lastRunAt is set, advances from lastRunAt).
 */

// ─── Mocks ──────────────────────────────────────────────────────────

vi.mock('../src/config/database', () => {
  const db: any = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  };
  return { db };
});

// Retrieved after the mock is wired up.
import { db as _db } from '../src/config/database';
const dbMock = _db as any;

vi.mock('../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../src/apps/invoices/services/invoice.service', () => ({
  getNextInvoiceNumber: vi.fn(),
  sendInvoice: vi.fn(),
}));

vi.mock('../src/apps/invoices/services/invoice-email.service', () => ({
  sendInvoiceEmail: vi.fn(),
}));

import {
  generateInvoiceFromRecurring,
  updateRecurringInvoice,
} from '../src/apps/invoices/services/recurring-invoice.service';
import * as invoiceService from '../src/apps/invoices/services/invoice.service';
import * as invoiceEmailService from '../src/apps/invoices/services/invoice-email.service';

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Build a chainable "select" builder that resolves (via thenable and
 * via terminal methods like .limit / .orderBy) to `rows`.
 */
function selectReturning(rows: any[]) {
  const chain: any = {};
  const methods = ['from', 'where', 'orderBy', 'for', 'limit'];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  chain.then = (resolve: any) => resolve(rows);
  return chain;
}

function insertReturning(rows: any[]) {
  const chain: any = {};
  chain.values = vi.fn(() => chain);
  chain.returning = vi.fn(() => Promise.resolve(rows));
  // When there is no .returning() call (e.g. line items insert),
  // the chain itself should be awaitable.
  chain.then = (resolve: any) => resolve(undefined);
  return chain;
}

function updateBuilder(capture: { payload?: any }) {
  const chain: any = {};
  chain.set = vi.fn((payload: any) => {
    capture.payload = payload;
    return chain;
  });
  chain.where = vi.fn(() => chain);
  chain.returning = vi.fn(() => Promise.resolve([{ id: 'rec1' }]));
  chain.then = (resolve: any) => resolve(undefined);
  return chain;
}

// Shared fixture builders
function makeRecurringRow(overrides: Partial<any> = {}) {
  return {
    id: 'rec1',
    tenantId: 't1',
    userId: 'u1',
    companyId: 'co1',
    title: 'Monthly retainer',
    description: null,
    currency: 'USD',
    taxPercent: 10,
    discountPercent: 0,
    notes: null,
    paymentInstructions: null,
    frequency: 'monthly',
    startDate: new Date('2026-01-01T00:00:00Z'),
    endDate: null,
    nextRunAt: new Date('2026-01-01T00:00:00Z'),
    lastRunAt: null,
    runCount: 0,
    maxRuns: null,
    autoSend: false,
    paymentTermsDays: 30,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeLineItem() {
  return {
    id: 'li1',
    recurringInvoiceId: 'rec1',
    description: 'Consulting',
    quantity: 10,
    unitPrice: 100,
    taxRate: 0,
    sortOrder: 0,
  };
}

// ─── generateInvoiceFromRecurring ───────────────────────────────────

describe('generateInvoiceFromRecurring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  /**
   * Wire up a fake transaction where `tx` behaves just like `db` and
   * returns supplied fixtures. Captures what the service tries to
   * write on the recurring row.
   */
  function setupTx(options: {
    recurring: any;
    items: any[];
    capture: { recurringUpdate?: any; invoiceInsert?: any; lineItemsInsert?: any };
  }) {
    const { recurring, items, capture } = options;

    const tx: any = {
      select: vi.fn((_cols?: any) => {
        // First select in generator = recurring row; second = items.
        const call = tx.select.mock.calls.length;
        if (call === 1) return selectReturning([recurring]);
        return selectReturning(items);
      }),
      insert: vi.fn((_table: any) => {
        const call = tx.insert.mock.calls.length;
        if (call === 1) {
          // insert(invoices).values(...).returning()
          const chain: any = {};
          chain.values = vi.fn((v: any) => {
            capture.invoiceInsert = v;
            return chain;
          });
          chain.returning = vi.fn(() =>
            Promise.resolve([{ id: 'inv1' }]),
          );
          return chain;
        }
        // insert(invoiceLineItems).values(...)
        const chain: any = {};
        chain.values = vi.fn((v: any) => {
          capture.lineItemsInsert = v;
          return Promise.resolve(undefined);
        });
        return chain;
      }),
      update: vi.fn(() => {
        const chain: any = {};
        chain.set = vi.fn((payload: any) => {
          capture.recurringUpdate = payload;
          return chain;
        });
        chain.where = vi.fn(() => Promise.resolve(undefined));
        return chain;
      }),
    };

    dbMock.transaction.mockImplementation(async (cb: any) => cb(tx));
    return tx;
  }

  it('happy path: creates invoice, advances nextRunAt monthly, increments runCount', async () => {
    vi.setSystemTime(new Date(2026, 2, 15, 12, 0, 0)); // Mar 15 2026 local
    vi.mocked(invoiceService.getNextInvoiceNumber).mockResolvedValue('INV-0001');

    const capture: any = {};
    setupTx({
      recurring: makeRecurringRow({ runCount: 2, frequency: 'monthly' }),
      items: [makeLineItem()],
      capture,
    });

    const result = await generateInvoiceFromRecurring('rec1', 't1');

    expect(result).toEqual({ invoiceId: 'inv1', emailed: false, deactivated: false });
    // Invoice totals: subtotal = 10*100 = 1000; tax 10% = 100; total = 1100
    expect(capture.invoiceInsert).toMatchObject({
      invoiceNumber: 'INV-0001',
      subtotal: 1000,
      taxAmount: 100,
      total: 1100,
      status: 'draft',
    });
    // Monthly: Mar 15 -> Apr 15 (local)
    const nextRun: Date = capture.recurringUpdate.nextRunAt;
    expect(nextRun.getFullYear()).toBe(2026);
    expect(nextRun.getMonth()).toBe(3); // April
    expect(nextRun.getDate()).toBe(15);
    expect(capture.recurringUpdate.runCount).toBe(3);
    expect(capture.recurringUpdate.isActive).toBe(true);
  });

  it('weekly frequency advances nextRunAt by 7 days', async () => {
    vi.setSystemTime(new Date(2026, 2, 10, 12, 0, 0));
    vi.mocked(invoiceService.getNextInvoiceNumber).mockResolvedValue('INV-0002');
    const capture: any = {};
    setupTx({
      recurring: makeRecurringRow({ frequency: 'weekly' }),
      items: [makeLineItem()],
      capture,
    });

    await generateInvoiceFromRecurring('rec1', 't1');
    // Weekly = exact +7*86400000 ms from "now".
    const expected = new Date(2026, 2, 10, 12, 0, 0).getTime() + 7 * 24 * 60 * 60 * 1000;
    expect((capture.recurringUpdate.nextRunAt as Date).getTime()).toBe(expected);
  });

  it('quarterly frequency advances nextRunAt by 3 months', async () => {
    // Pick a mid-month "now" and assert by comparing Y/M/D in local time
    // so we do not accidentally test DST transitions on the host.
    vi.setSystemTime(new Date(2026, 0, 15, 12, 0, 0)); // Jan 15 2026, local
    vi.mocked(invoiceService.getNextInvoiceNumber).mockResolvedValue('INV-0003');
    const capture: any = {};
    setupTx({
      recurring: makeRecurringRow({ frequency: 'quarterly' }),
      items: [makeLineItem()],
      capture,
    });

    await generateInvoiceFromRecurring('rec1', 't1');
    const next: Date = capture.recurringUpdate.nextRunAt;
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(3); // April
    expect(next.getDate()).toBe(15);
  });

  it('monthly edge case: Jan 31 overflows to March (not clamped to Feb end) — documents current behavior', async () => {
    // addFrequency uses JS Date.setMonth with no end-of-month clamp.
    // Jan 31 + 1 month => Date tries "Feb 31" which rolls into March.
    // This test pins the current semantics so a future "correct" clamp
    // surfaces as an intentional change.
    vi.setSystemTime(new Date(2026, 0, 31, 12, 0, 0)); // Jan 31 2026 local
    vi.mocked(invoiceService.getNextInvoiceNumber).mockResolvedValue('INV-0004');
    const capture: any = {};
    setupTx({
      recurring: makeRecurringRow({ frequency: 'monthly' }),
      items: [makeLineItem()],
      capture,
    });

    await generateInvoiceFromRecurring('rec1', 't1');
    const next: Date = capture.recurringUpdate.nextRunAt;
    // 2026 is not a leap year => Feb has 28 days => overflow into March.
    expect(next.getMonth()).toBe(2); // March, NOT February
    expect(next.getDate()).toBe(3); // 31 - 28 = 3
  });

  it('yearly edge case: Feb 29 leap year rolls to Mar 1 next year (JS overflow)', async () => {
    // Feb 29 2024 + 1 year => Date tries "Feb 29 2025" => Mar 1 2025.
    vi.setSystemTime(new Date(2024, 1, 29, 12, 0, 0));
    vi.mocked(invoiceService.getNextInvoiceNumber).mockResolvedValue('INV-0005');
    const capture: any = {};
    setupTx({
      recurring: makeRecurringRow({ frequency: 'yearly' }),
      items: [makeLineItem()],
      capture,
    });

    await generateInvoiceFromRecurring('rec1', 't1');
    const next: Date = capture.recurringUpdate.nextRunAt;
    expect(next.getFullYear()).toBe(2025);
    expect(next.getMonth()).toBe(2); // March
    expect(next.getDate()).toBe(1);
  });

  it('deactivates when maxRuns is hit', async () => {
    vi.setSystemTime(new Date('2026-06-01T00:00:00Z'));
    vi.mocked(invoiceService.getNextInvoiceNumber).mockResolvedValue('INV-0006');
    const capture: any = {};
    setupTx({
      recurring: makeRecurringRow({ runCount: 2, maxRuns: 3 }),
      items: [makeLineItem()],
      capture,
    });

    const result = await generateInvoiceFromRecurring('rec1', 't1');
    expect(result.deactivated).toBe(true);
    expect(capture.recurringUpdate.isActive).toBe(false);
    expect(capture.recurringUpdate.runCount).toBe(3);
  });

  it('deactivates when endDate is in the past', async () => {
    vi.setSystemTime(new Date('2026-06-01T00:00:00Z'));
    vi.mocked(invoiceService.getNextInvoiceNumber).mockResolvedValue('INV-0007');
    const capture: any = {};
    setupTx({
      recurring: makeRecurringRow({ endDate: new Date('2026-05-01T00:00:00Z') }),
      items: [makeLineItem()],
      capture,
    });

    const result = await generateInvoiceFromRecurring('rec1', 't1');
    expect(result.deactivated).toBe(true);
    expect(capture.recurringUpdate.isActive).toBe(false);
  });
});

// ─── updateRecurringInvoice ─────────────────────────────────────────

describe('updateRecurringInvoice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('recomputes nextRunAt from lastRunAt using new frequency when runCount > 0', async () => {
    // fetchRecurringWithItems is called twice (before + after the tx).
    // Each call does two selects: the row + its line items.
    const existing = makeRecurringRow({
      runCount: 2,
      lastRunAt: new Date(2026, 1, 15, 12, 0, 0), // Feb 15 2026 local
      frequency: 'monthly',
    });
    const items = [makeLineItem()];

    // db.select calls in order:
    //   1) pre-update fetch: row
    //   2) pre-update fetch: items
    //   3) post-update fetch: row (same row, ok for our assertion)
    //   4) post-update fetch: items
    let selectCall = 0;
    dbMock.select.mockImplementation(() => {
      selectCall += 1;
      if (selectCall === 1 || selectCall === 3) return selectReturning([existing]);
      return selectReturning(items);
    });

    const capture: { payload?: any } = {};
    dbMock.transaction.mockImplementation(async (cb: any) => {
      const tx: any = {
        update: vi.fn(() => updateBuilder(capture)),
        delete: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve(undefined)),
        })),
        insert: vi.fn(() => ({
          values: vi.fn(() => Promise.resolve(undefined)),
        })),
      };
      await cb(tx);
    });

    await updateRecurringInvoice('rec1', { frequency: 'quarterly' }, 't1');

    // quarterly from lastRunAt Feb 15 2026 => May 15 2026
    expect(capture.payload.frequency).toBe('quarterly');
    const next: Date = capture.payload.nextRunAt;
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(4); // May
    expect(next.getDate()).toBe(15);
  });
});
