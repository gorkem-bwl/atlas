import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Mocks ----------------------------------------------------------------

// Mock drizzle-orm operators so calls don't blow up when building queries.
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => 'eq'),
  and: vi.fn(() => 'and'),
  asc: vi.fn(() => 'asc'),
  sql: Object.assign(
    vi.fn(() => 'sql'),
    { raw: vi.fn(() => 'sql-raw') },
  ),
}));

// Mock schema — the service only references these as objects passed to drizzle.
vi.mock('../src/db/schema', () => ({
  invoices: { id: 'id', tenantId: 'tenantId', emailSentCount: 'emailSentCount' },
  crmCompanies: { id: 'id', $inferSelect: {} as any },
  crmContacts: {
    email: 'email',
    companyId: 'companyId',
    isArchived: 'isArchived',
    sortOrder: 'sortOrder',
    createdAt: 'createdAt',
  },
}));

// Per-test mutable state for contact-lookup fallback
const contactRowsRef: { rows: Array<{ email: string | null }> } = { rows: [] };

vi.mock('../src/config/database', () => {
  // select() is used for:
  //   1. crmCompanies lookup (in Promise.all, chained .where().limit())
  //   2. crmContacts lookup (chained .where().orderBy().limit())
  // We return a chain that resolves to a configurable array depending on
  // the last `from` call.
  let currentFrom: 'companies' | 'contacts' | 'other' = 'other';

  const companyChain = {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn(() =>
      Promise.resolve([
        {
          id: 'company-1',
          name: 'Acme Inc',
          portalToken: 'portal-token-abc',
        },
      ]),
    ),
  };

  const contactChain = {
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn(() => Promise.resolve(contactRowsRef.rows)),
  };

  const db = {
    select: vi.fn(() => ({
      from: vi.fn((table: any) => {
        if (table && table.id === 'id' && table.$inferSelect !== undefined) {
          currentFrom = 'companies';
          return companyChain;
        }
        if (table && table.email === 'email') {
          currentFrom = 'contacts';
          return contactChain;
        }
        currentFrom = 'other';
        return companyChain;
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve(undefined)),
      })),
    })),
    __companyChain: companyChain,
    __contactChain: contactChain,
    __setCompanyRows: (rows: any[]) => {
      companyChain.limit.mockImplementationOnce(() => Promise.resolve(rows));
    },
  };

  return { db };
});

vi.mock('../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../src/config/env', () => ({
  env: {
    CLIENT_PUBLIC_URL: 'https://app.test',
    SERVER_PUBLIC_URL: 'https://api.test',
  },
}));

// Mock email sender — THIS is where we observe dispatch + simulate throws.
const sendEmailMock = vi.fn().mockResolvedValue(true);
vi.mock('../src/services/email.service', () => ({
  sendEmail: (...args: any[]) => sendEmailMock(...args),
}));

// Mock invoice.service.getInvoice
const getInvoiceMock = vi.fn();
vi.mock('../src/apps/invoices/services/invoice.service', () => ({
  getInvoice: (...args: any[]) => getInvoiceMock(...args),
}));

// Mock settings.service.getInvoiceSettings
const getInvoiceSettingsMock = vi.fn().mockResolvedValue({
  companyName: 'Seller Co',
  companyEmail: 'billing@seller.test',
  accentColor: '#13715B',
});
vi.mock('../src/apps/invoices/services/settings.service', () => ({
  getInvoiceSettings: (...args: any[]) => getInvoiceSettingsMock(...args),
}));

// Mock pdf.service.generateInvoicePdf
const generateInvoicePdfMock = vi
  .fn()
  .mockResolvedValue(Buffer.from('PDFDATA'));
vi.mock('../src/apps/invoices/services/pdf.service', () => ({
  generateInvoicePdf: (...args: any[]) => generateInvoicePdfMock(...args),
}));

// Mock email templates
const buildInvoiceEmailTemplateMock = vi.fn(() => ({
  subject: 'Invoice subject',
  text: 'text body',
  html: '<p>html</p>',
}));
const buildInvoiceReminderTemplateMock = vi.fn(() => ({
  subject: 'Reminder subject',
  text: 'reminder text',
  html: '<p>reminder</p>',
}));
vi.mock('../src/apps/invoices/email-templates', () => ({
  buildInvoiceEmailTemplate: (...args: any[]) =>
    buildInvoiceEmailTemplateMock(...args),
  buildInvoiceReminderTemplate: (...args: any[]) =>
    buildInvoiceReminderTemplateMock(...args),
}));

// ---- Import under test (after all mocks) ---------------------------------
import { sendInvoiceEmail } from '../src/apps/invoices/services/invoice-email.service';

// ---- Helpers --------------------------------------------------------------

function makeInvoice(overrides: Partial<any> = {}) {
  return {
    id: 'inv-1',
    invoiceNumber: 'INV-001',
    companyId: 'company-1',
    tenantId: 'tenant-1',
    total: 1000,
    currency: 'USD',
    dueDate: new Date('2026-05-01'),
    issueDate: new Date('2026-04-01'),
    contactEmail: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  contactRowsRef.rows = [];
  sendEmailMock.mockResolvedValue(true);
  getInvoiceMock.mockResolvedValue(makeInvoice());
  buildInvoiceEmailTemplateMock.mockReturnValue({
    subject: 'Invoice subject',
    text: 'text body',
    html: '<p>html</p>',
  });
  buildInvoiceReminderTemplateMock.mockReturnValue({
    subject: 'Reminder subject',
    text: 'reminder text',
    html: '<p>reminder</p>',
  });
});

// ---- Tests ----------------------------------------------------------------

describe('sendInvoiceEmail - template branching', () => {
  it('uses the invoice template when template is omitted (default)', async () => {
    contactRowsRef.rows = [{ email: 'buyer@acme.test' }];

    const result = await sendInvoiceEmail('inv-1', 'tenant-1');

    expect(result.sent).toBe(true);
    expect(buildInvoiceEmailTemplateMock).toHaveBeenCalledTimes(1);
    expect(buildInvoiceReminderTemplateMock).not.toHaveBeenCalled();
  });

  it('uses the reminder template and forwards the stage when template is "reminder"', async () => {
    contactRowsRef.rows = [{ email: 'buyer@acme.test' }];

    const result = await sendInvoiceEmail('inv-1', 'tenant-1', {
      template: 'reminder',
      stage: 3,
    });

    expect(result.sent).toBe(true);
    expect(buildInvoiceReminderTemplateMock).toHaveBeenCalledTimes(1);
    // Second arg is the stage
    expect(buildInvoiceReminderTemplateMock.mock.calls[0][1]).toBe(3);
    expect(buildInvoiceEmailTemplateMock).not.toHaveBeenCalled();
  });
});

describe('sendInvoiceEmail - recipient resolution', () => {
  it('uses recipientOverride when provided (wins over everything)', async () => {
    contactRowsRef.rows = [{ email: 'buyer@acme.test' }];

    const result = await sendInvoiceEmail('inv-1', 'tenant-1', {
      recipientOverride: 'override@custom.test',
    });

    expect(result.sent).toBe(true);
    expect(result.recipient).toBe('override@custom.test');
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'override@custom.test' }),
    );
  });

  it('falls back to primary CRM contact when no override is given', async () => {
    contactRowsRef.rows = [{ email: 'primary@acme.test' }];

    const result = await sendInvoiceEmail('inv-1', 'tenant-1');

    expect(result.sent).toBe(true);
    expect(result.recipient).toBe('primary@acme.test');
  });

  it('falls back to invoice.contactEmail when there is no CRM contact email', async () => {
    contactRowsRef.rows = [];
    getInvoiceMock.mockResolvedValueOnce(
      makeInvoice({ contactEmail: 'invoice-contact@acme.test' }),
    );

    const result = await sendInvoiceEmail('inv-1', 'tenant-1');

    expect(result.sent).toBe(true);
    expect(result.recipient).toBe('invoice-contact@acme.test');
  });

  it('returns { sent: false } with a reason when no recipient can be resolved', async () => {
    contactRowsRef.rows = [];
    getInvoiceMock.mockResolvedValueOnce(makeInvoice({ contactEmail: null }));

    const result = await sendInvoiceEmail('inv-1', 'tenant-1');

    expect(result.sent).toBe(false);
    expect(result.reason).toMatch(/no recipient/i);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});

describe('sendInvoiceEmail - portal token hard-fail', () => {
  it('returns { sent: false } (does not throw) when company has no portal token', async () => {
    contactRowsRef.rows = [{ email: 'buyer@acme.test' }];
    const { db } = (await import('../src/config/database')) as any;
    db.__setCompanyRows([
      { id: 'company-1', name: 'Acme Inc', portalToken: null },
    ]);

    const result = await sendInvoiceEmail('inv-1', 'tenant-1');

    expect(result.sent).toBe(false);
    expect(result.reason).toMatch(/portal token/i);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});

describe('sendInvoiceEmail - never-throw contract', () => {
  it('catches errors thrown by sendEmail and returns { sent: false }', async () => {
    contactRowsRef.rows = [{ email: 'buyer@acme.test' }];
    sendEmailMock.mockRejectedValueOnce(new Error('SMTP exploded'));

    // Must not throw
    const result = await sendInvoiceEmail('inv-1', 'tenant-1');

    expect(result.sent).toBe(false);
    expect(result.reason).toBeDefined();
  });
});

describe('sendInvoiceEmail - PDF attachment', () => {
  it('generates the PDF and passes it as an attachment on the outgoing email', async () => {
    contactRowsRef.rows = [{ email: 'buyer@acme.test' }];

    const result = await sendInvoiceEmail('inv-1', 'tenant-1');

    expect(result.sent).toBe(true);
    expect(generateInvoicePdfMock).toHaveBeenCalledWith('tenant-1', 'inv-1');

    const callArg = sendEmailMock.mock.calls[0][0];
    expect(callArg.attachments).toHaveLength(1);
    expect(callArg.attachments[0]).toMatchObject({
      filename: 'Invoice-INV-001.pdf',
      contentType: 'application/pdf',
    });
    expect(Buffer.isBuffer(callArg.attachments[0].content)).toBe(true);
    expect(callArg.attachments[0].content.toString()).toBe('PDFDATA');
  });
});
