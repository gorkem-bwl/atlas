import { describe, it, expect } from 'vitest';
import {
  buildInvoiceEmailTemplate,
  buildInvoiceReminderTemplate,
  buildPaymentConfirmationTemplate,
  type InvoiceEmailData,
} from '../src/apps/invoices/email-templates';

function makeData(overrides: Partial<InvoiceEmailData> = {}): InvoiceEmailData {
  return {
    invoice: {
      id: 'inv-1',
      invoiceNumber: 'INV-001',
      total: 1234.5,
      currency: 'USD',
      dueDate: new Date('2026-05-01T00:00:00Z'),
      issueDate: new Date('2026-04-01T00:00:00Z'),
    },
    company: {
      name: 'Acme Corp',
      email: 'billing@acme.test',
    },
    settings: {
      companyName: 'Supplier Ltd',
    },
    portalUrl: 'https://portal.example.com/invoices/inv-1',
    ...overrides,
  };
}

describe('email-templates: buildInvoiceEmailTemplate', () => {
  it('produces non-empty subject, text and html', () => {
    const out = buildInvoiceEmailTemplate(makeData());
    expect(out.subject).toMatch(/INV-001/);
    expect(out.subject).toMatch(/Supplier Ltd/);
    expect(out.text.length).toBeGreaterThan(0);
    expect(out.html.length).toBeGreaterThan(0);
    expect(out.text).toContain('INV-001');
    expect(out.html).toContain('INV-001');
  });

  it('uses customSubject when provided', () => {
    const out = buildInvoiceEmailTemplate(
      makeData({ customSubject: 'Your custom subject line' }),
    );
    expect(out.subject).toBe('Your custom subject line');
  });

  it('injects customMessage into both text and html', () => {
    const out = buildInvoiceEmailTemplate(
      makeData({ customMessage: 'Please pay promptly, thanks!' }),
    );
    expect(out.text).toContain('Please pay promptly, thanks!');
    expect(out.html).toContain('Please pay promptly, thanks!');
  });

  it('falls back to default accent color #13715B when not provided', () => {
    const out = buildInvoiceEmailTemplate(makeData());
    expect(out.html).toContain('#13715B');
  });

  it('uses a custom accent color when provided', () => {
    const out = buildInvoiceEmailTemplate(
      makeData({ settings: { companyName: 'Supplier Ltd', accentColor: '#ff00aa' } }),
    );
    expect(out.html).toContain('#ff00aa');
  });

  it('includes companyTaxId in footer output', () => {
    const out = buildInvoiceEmailTemplate(
      makeData({
        settings: { companyName: 'Supplier Ltd', companyTaxId: 'TAX-9988-XYZ' },
      }),
    );
    expect(out.text).toContain('Tax ID: TAX-9988-XYZ');
    expect(out.html).toContain('TAX-9988-XYZ');
  });

  it('escapes HTML-dangerous characters in customMessage and client name', () => {
    const out = buildInvoiceEmailTemplate(
      makeData({
        company: { name: 'Evil & Co <script>alert(1)</script>' },
        customMessage: 'hi <script>alert("xss")</script> & bye',
      }),
    );
    // Raw script tag must not appear in html output
    expect(out.html).not.toContain('<script>alert(1)</script>');
    expect(out.html).not.toContain('<script>alert("xss")</script>');
    // Escaped form should appear
    expect(out.html).toContain('&lt;script&gt;');
    expect(out.html).toContain('&amp;');
  });
});

describe('email-templates: buildInvoiceReminderTemplate', () => {
  it('produces distinct subjects for stages 1, 2, 3, 4', () => {
    const d = makeData();
    const s1 = buildInvoiceReminderTemplate(d, 1).subject;
    const s2 = buildInvoiceReminderTemplate(d, 2).subject;
    const s3 = buildInvoiceReminderTemplate(d, 3).subject;
    const s4 = buildInvoiceReminderTemplate(d, 4).subject;

    expect(s1).toMatch(/Friendly reminder/i);
    expect(s2).toMatch(/Second reminder/i);
    expect(s3).toMatch(/Third notice/i);
    expect(s4).toMatch(/final notice/i);

    const all = new Set([s1, s2, s3, s4]);
    expect(all.size).toBe(4);

    for (const s of [s1, s2, s3, s4]) {
      expect(s).toContain('INV-001');
    }
  });

  it('each reminder stage produces non-empty subject/text/html', () => {
    const d = makeData();
    for (const stage of [1, 2, 3, 4] as const) {
      const out = buildInvoiceReminderTemplate(d, stage);
      expect(out.subject.length).toBeGreaterThan(0);
      expect(out.text.length).toBeGreaterThan(0);
      expect(out.html.length).toBeGreaterThan(0);
    }
  });
});

describe('email-templates: buildPaymentConfirmationTemplate', () => {
  it('produces non-empty subject/text/html and mentions paid amount', () => {
    const out = buildPaymentConfirmationTemplate({
      ...makeData(),
      paidAmount: 500,
      paymentMethod: 'bank transfer',
      remainingBalance: 734.5,
    });
    expect(out.subject).toMatch(/Payment received/i);
    expect(out.subject).toContain('INV-001');
    expect(out.text).toContain('bank transfer');
    expect(out.text).toContain('500');
    expect(out.html).toContain('bank transfer');
  });

  it('signals fully settled when remainingBalance is zero', () => {
    const out = buildPaymentConfirmationTemplate({
      ...makeData(),
      paidAmount: 1234.5,
      remainingBalance: 0,
    });
    expect(out.text).toMatch(/fully settled/i);
    expect(out.html).toMatch(/fully settled/i);
  });
});
