import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit tests for invoices payment service.
 *
 * The service under test uses `db.transaction(async tx => ...)` and inside the
 * transaction performs chained Drizzle calls. We mock `db` with a builder-style
 * fake tx whose terminal methods resolve to queued fixture rows.
 */

// ─── Fake tx + db mock ──────────────────────────────────────────────

/**
 * Queue of results for terminal calls made on the tx.
 * Populated per test via `setQueue([...])`. Each entry is consumed in order.
 */
let resultQueue: any[] = [];
let invoiceUpdates: any[] = [];
let paymentInserts: any[] = [];
let paymentUpdates: any[] = [];
let paymentDeletes: any[] = [];
let transactionCalled = 0;
let forUpdateCalled = 0;

function nextResult(fallback: any = []) {
  if (resultQueue.length === 0) return fallback;
  return resultQueue.shift();
}

function makeSelectBuilder() {
  const builder: any = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn(function (this: any) {
      // terminal: return a thenable
      const rows = nextResult([]);
      return Promise.resolve(rows);
    }),
    for: vi.fn(function (this: any, _mode: string) {
      forUpdateCalled++;
      return this;
    }),
  };
  // Also support awaiting without .limit() (e.g. computeNetPaidInTx uses .where then awaits)
  builder.then = (resolve: any, reject: any) => {
    const rows = nextResult([]);
    return Promise.resolve(rows).then(resolve, reject);
  };
  return builder;
}

function makeInsertBuilder() {
  const builder: any = {
    values: vi.fn(function (this: any, vals: any) {
      paymentInserts.push(vals);
      return this;
    }),
    returning: vi.fn(function () {
      const rows = nextResult([{ ...paymentInserts[paymentInserts.length - 1], id: 'new-pay-id' }]);
      return Promise.resolve(rows);
    }),
  };
  return builder;
}

function makeUpdateBuilder(table: string) {
  const builder: any = {
    set: vi.fn(function (this: any, vals: any) {
      if (table === 'invoices') invoiceUpdates.push(vals);
      else paymentUpdates.push(vals);
      return this;
    }),
    where: vi.fn(function (this: any) {
      // `where` can be terminal for invoice updates (no returning) but we
      // also allow `.returning()` chain for payment updates.
      return this;
    }),
    returning: vi.fn(function () {
      const rows = nextResult([{ id: 'updated-pay-id' }]);
      return Promise.resolve(rows);
    }),
  };
  builder.then = (resolve: any, reject: any) => {
    return Promise.resolve(undefined).then(resolve, reject);
  };
  return builder;
}

function makeDeleteBuilder() {
  const builder: any = {
    where: vi.fn(function (this: any) {
      paymentDeletes.push(true);
      return this;
    }),
  };
  builder.then = (resolve: any, reject: any) => {
    return Promise.resolve(undefined).then(resolve, reject);
  };
  return builder;
}

function makeTx() {
  return {
    select: vi.fn(() => makeSelectBuilder()),
    insert: vi.fn(() => makeInsertBuilder()),
    update: vi.fn((table: any) => {
      // Detect invoices vs invoicePayments by checking table ref identity
      const name = table?.[Symbol.for('drizzle:Name')] ?? table?._?.name ?? '';
      return makeUpdateBuilder(String(name).includes('payment') ? 'invoicePayments' : 'invoices');
    }),
    delete: vi.fn(() => makeDeleteBuilder()),
  };
}

vi.mock('../src/config/database', () => {
  const db = {
    select: (...args: any[]) => (globalThis as any).__mockDb.select(...args),
    transaction: (...args: any[]) => (globalThis as any).__mockDb.transaction(...args),
  };
  return { db, pool: {}, closeDb: () => {} };
});

const mockDb = {
  select: vi.fn(() => makeSelectBuilder()),
  transaction: vi.fn(async (fn: (tx: any) => Promise<any>) => {
    transactionCalled++;
    return fn(makeTx());
  }),
};
(globalThis as any).__mockDb = mockDb;

vi.mock('../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocks
import * as paymentService from '../src/apps/invoices/services/payment.service';
import { AppError } from '../src/middleware/error-handler';

function setQueue(items: any[]) {
  resultQueue = [...items];
}

function resetAll() {
  resultQueue = [];
  invoiceUpdates = [];
  paymentInserts = [];
  paymentUpdates = [];
  paymentDeletes = [];
  transactionCalled = 0;
  forUpdateCalled = 0;
  mockDb.transaction.mockClear();
}

const baseInvoice = {
  id: 'inv-1',
  tenantId: 'tenant-1',
  total: 1000,
  currency: 'USD',
  status: 'sent',
  dueDate: new Date(Date.now() + 7 * 86400_000), // 1 week out
  paidAt: null,
};

const baseInput = {
  invoiceId: 'inv-1',
  amount: 500,
  paymentDate: new Date(),
  type: 'payment' as const,
};

// ─── Tests ──────────────────────────────────────────────────────────

describe('payment.service: recordPayment validation', () => {
  beforeEach(resetAll);

  it('rejects amount <= 0', async () => {
    await expect(
      paymentService.recordPayment({ ...baseInput, amount: 0 }, 'u1', 'tenant-1'),
    ).rejects.toThrow(/amount must be positive/);
    await expect(
      paymentService.recordPayment({ ...baseInput, amount: -5 }, 'u1', 'tenant-1'),
    ).rejects.toThrow(/amount must be positive/);
    // These fail before the transaction even starts
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('rejects future-dated payments (beyond 1-day buffer)', async () => {
    const future = new Date(Date.now() + 10 * 86400_000);
    await expect(
      paymentService.recordPayment(
        { ...baseInput, paymentDate: future },
        'u1',
        'tenant-1',
      ),
    ).rejects.toThrow(/payment date cannot be in the future/);
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('rejects payment amount that would exceed invoice total (overpay)', async () => {
    // Queue: loadInvoiceForUpdate -> [invoice], computeNetPaidInTx -> already 800 paid
    setQueue([
      [baseInvoice], // SELECT invoice FOR UPDATE
      [{ id: 'p-existing', type: 'payment', amount: 800 }], // net paid query
    ]);
    await expect(
      paymentService.recordPayment(
        { ...baseInput, amount: 500 }, // 800 + 500 = 1300 > 1000
        'u1',
        'tenant-1',
      ),
    ).rejects.toThrow(/payment would exceed invoice total/);
    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects refund amount greater than currently paid', async () => {
    setQueue([
      [baseInvoice],
      [{ id: 'p1', type: 'payment', amount: 100 }], // only 100 paid
    ]);
    await expect(
      paymentService.recordPayment(
        { ...baseInput, type: 'refund', amount: 500 },
        'u1',
        'tenant-1',
      ),
    ).rejects.toThrow(/refund amount exceeds paid amount/);
  });
});

describe('payment.service: recordPayment status transitions', () => {
  beforeEach(resetAll);

  it('transitions invoice sent -> paid when payment clears the balance', async () => {
    setQueue([
      [baseInvoice], // loadInvoiceForUpdate
      [], // computeNetPaidInTx — nothing paid yet
      [{ ...baseInput, id: 'pay-new' }], // insert returning
      [{ netPaid: 1000 }], // updateInvoicePaidStatusInTx sum aggregate
    ]);

    await paymentService.recordPayment(
      { ...baseInput, amount: 1000 },
      'u1',
      'tenant-1',
    );

    expect(invoiceUpdates.length).toBe(1);
    expect(invoiceUpdates[0].status).toBe('paid');
    expect(invoiceUpdates[0].paidAt).toBeInstanceOf(Date);
  });

  it('leaves status as sent on a partial payment', async () => {
    setQueue([
      [baseInvoice],
      [],
      [{ ...baseInput, id: 'pay-new' }],
      [{ netPaid: 200 }], // 200 < 1000 total, invoice was 'sent'
    ]);

    await paymentService.recordPayment(
      { ...baseInput, amount: 200 },
      'u1',
      'tenant-1',
    );

    // No invoice update because status was 'sent' and stays 'sent'
    expect(invoiceUpdates.length).toBe(0);
  });
});

describe('payment.service: updateInvoicePaidStatus revert semantics', () => {
  beforeEach(resetAll);

  it('reverts paid -> sent when balance goes positive and due date is in future', async () => {
    const paidInvoice = { ...baseInvoice, status: 'paid', paidAt: new Date() };
    setQueue([
      [paidInvoice], // loadInvoiceForUpdate
      [{ netPaid: 500 }], // sum aggregate after refund — less than total
    ]);

    await paymentService.updateInvoicePaidStatus('inv-1', 'tenant-1');

    expect(invoiceUpdates.length).toBe(1);
    expect(invoiceUpdates[0].status).toBe('sent');
    expect(invoiceUpdates[0].paidAt).toBeNull();
  });

  it('reverts paid -> overdue when due date is in the past', async () => {
    const paidInvoice = {
      ...baseInvoice,
      status: 'paid',
      paidAt: new Date(),
      dueDate: new Date(Date.now() - 86400_000), // yesterday
    };
    setQueue([[paidInvoice], [{ netPaid: 500 }]]);

    await paymentService.updateInvoicePaidStatus('inv-1', 'tenant-1');

    expect(invoiceUpdates.length).toBe(1);
    expect(invoiceUpdates[0].status).toBe('overdue');
  });
});

describe('payment.service: updatePayment immutable fields', () => {
  beforeEach(resetAll);

  it('silently ignores attempts to change type or invoiceId', async () => {
    const existingPayment = {
      id: 'p1',
      tenantId: 'tenant-1',
      invoiceId: 'inv-1',
      type: 'payment',
      amount: 200,
      currency: 'USD',
      paymentDate: new Date(Date.now() - 86400_000),
      method: null,
      reference: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'u1',
    };
    setQueue([
      [existingPayment], // load existing payment
      [baseInvoice], // loadInvoiceForUpdate
      [], // computeNetPaidInTx excluding this row -> 0
      [{ ...existingPayment, amount: 300 }], // update returning
      [{ netPaid: 300 }], // status recompute
    ]);

    // Cast to any so we can pass fields that aren't in the public type
    await paymentService.updatePayment(
      'p1',
      { amount: 300, type: 'refund', invoiceId: 'inv-999' } as any,
      'tenant-1',
    );

    // type/invoiceId must NOT appear in the update payload
    expect(paymentUpdates.length).toBe(1);
    expect(paymentUpdates[0].type).toBeUndefined();
    expect(paymentUpdates[0].invoiceId).toBeUndefined();
    expect(paymentUpdates[0].amount).toBe(300);
  });
});

describe('payment.service: deletePayment recomputation', () => {
  beforeEach(resetAll);

  it('deletes the payment and recomputes invoice balance/status', async () => {
    const paidInvoice = { ...baseInvoice, status: 'paid', paidAt: new Date() };
    setQueue([
      [{ id: 'p1', invoiceId: 'inv-1' }], // existing
      [paidInvoice], // load invoice for update
      [{ netPaid: 0 }], // after delete, nothing paid
    ]);

    await paymentService.deletePayment('p1', 'tenant-1');

    expect(paymentDeletes.length).toBe(1);
    // Status reverted from 'paid' to 'sent' (due date in future)
    expect(invoiceUpdates.length).toBe(1);
    expect(invoiceUpdates[0].status).toBe('sent');
  });
});

describe('payment.service: transaction + row lock semantics', () => {
  beforeEach(resetAll);

  it('recordPayment runs inside db.transaction() and locks invoice with FOR UPDATE', async () => {
    setQueue([
      [baseInvoice],
      [],
      [{ ...baseInput, id: 'pay-new' }],
      [{ netPaid: 500 }],
    ]);

    await paymentService.recordPayment(
      { ...baseInput, amount: 500 },
      'u1',
      'tenant-1',
    );

    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    // loadInvoiceForUpdate() calls .for('update') on the select builder
    expect(forUpdateCalled).toBeGreaterThanOrEqual(1);
  });

  it('throws 404 AppError when the invoice does not exist', async () => {
    setQueue([[]]); // loadInvoiceForUpdate returns no rows

    await expect(
      paymentService.recordPayment(baseInput, 'u1', 'tenant-1'),
    ).rejects.toBeInstanceOf(AppError);
  });
});
