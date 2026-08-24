import { db } from '../../../config/database';
import { invoices, crmContacts } from '../../../db/schema';
import { resolveInvoiceParty } from './invoice-party.service';
import { and, asc, eq, sql } from 'drizzle-orm';
import { logger } from '../../../utils/logger';
import { env } from '../../../config/env';
import { sendEmail } from '../../../services/email.service';
import { getInvoice } from './invoice.service';
import { getInvoiceSettings } from './settings.service';
import { generateInvoicePdf } from './pdf.service';
import { buildInvoiceEmailTemplate, buildInvoiceReminderTemplate } from '../email-templates';

export interface SendInvoiceEmailOptions {
  customSubject?: string;
  customMessage?: string;
  ccEmails?: string[];
  recipientOverride?: string;
  /** Which email template to render. Defaults to 'invoice' (initial delivery). */
  template?: 'invoice' | 'reminder';
  /** Reminder stage (1-4). Only used when template === 'reminder'. */
  stage?: 1 | 2 | 3 | 4;
  /**
   * Outstanding balance to show in the email. If omitted, falls back to
   * invoice.total (correct for freshly-issued invoices with no payments).
   * The reminder scheduler passes the SQL-computed balance here so the
   * email shows the actual amount owed rather than the original total.
   */
  balanceDue?: number;
}

export interface SendInvoiceEmailResult {
  sent: boolean;
  reason?: string;
  recipient?: string;
}

export async function sendInvoiceEmail(
  invoiceId: string,
  tenantId: string,
  options?: SendInvoiceEmailOptions,
): Promise<SendInvoiceEmailResult> {
  try {
    // 1. Load invoice scoped to tenant. Must happen first — we need
    // invoice.companyId before we can load the company.
    // userId is only used for per-user ACL filtering; passing '' bypasses
    // it for tenant-wide email sends (caller must enforce permissions).
    const invoice = await getInvoice('', tenantId, invoiceId);
    if (!invoice) {
      logger.warn({ invoiceId, tenantId }, 'sendInvoiceEmail: invoice not found');
      return { sent: false, reason: 'Invoice not found' };
    }

    // 2. Load company, settings, and PDF in parallel. These are all
    // independent of each other once we have the invoice — company +
    // settings come from the DB, pdf generation only needs
    // (tenantId, invoiceId). PDF is normally the slowest step so
    // overlapping it with the DB reads shaves wall-clock time.
    let party: Awaited<ReturnType<typeof resolveInvoiceParty>>;
    let loadedSettings: Awaited<ReturnType<typeof getInvoiceSettings>>;
    let pdfBuffer: Buffer;
    try {
      [party, loadedSettings, pdfBuffer] = await Promise.all([
        resolveInvoiceParty(invoice, tenantId),
        getInvoiceSettings(tenantId),
        generateInvoicePdf(tenantId, invoiceId),
      ]);
    } catch (err) {
      logger.error({ err, invoiceId }, 'sendInvoiceEmail: failed to load recipient/settings or render PDF');
      return { sent: false, reason: 'Failed to generate invoice PDF' };
    }

    if (!party) {
      logger.warn(
        { invoiceId, companyId: invoice.companyId, contactId: invoice.contactId },
        'sendInvoiceEmail: invoice has no resolvable recipient',
      );
      return { sent: false, reason: 'Invoice recipient not found' };
    }

    const settings: Partial<NonNullable<typeof loadedSettings>> = loadedSettings ?? {};

    // 3. Resolve recipient
    let recipient: string | undefined;
    if (options?.recipientOverride) {
      recipient = options.recipientOverride;
    } else if (party.kind === 'contact') {
      // The billed party is the individual, so their own address is the
      // recipient — there is no company roster to search.
      recipient = party.email ?? invoice.contactEmail ?? undefined;
    } else {
      // First non-archived contact for this company that has an email
      const [primaryContact] = await db
        .select({ email: crmContacts.email })
        .from(crmContacts)
        .where(
          and(
            eq(crmContacts.companyId, party.id),
            eq(crmContacts.isArchived, false),
          ),
        )
        .orderBy(asc(crmContacts.sortOrder), asc(crmContacts.createdAt))
        .limit(1);

      if (primaryContact?.email) {
        recipient = primaryContact.email;
      } else if (invoice.contactEmail) {
        // Fallback to the contact email already joined into the invoice
        recipient = invoice.contactEmail;
      }
    }

    if (!recipient) {
      logger.warn(
        { invoiceId, partyKind: party.kind, partyId: party.id },
        'sendInvoiceEmail: no recipient email available',
      );
      return { sent: false, reason: 'No recipient email address available' };
    }

    // Require a portal token — the public portal route is
    // /api/v1/invoices/portal/:token/:invoiceId, so without a token the
    // CTA in the email would 404.
    if (!party.portalToken) {
      logger.warn(
        { invoiceId, partyKind: party.kind, partyId: party.id },
        'sendInvoiceEmail: recipient has no portal token',
      );
      return { sent: false, reason: 'Recipient has no portal token', recipient };
    }

    // Build portal URL — matches the public route mounted at
    // /api/v1/invoices/portal/:token/:invoiceId (see invoices/routes.ts)
    const baseUrl = env.CLIENT_PUBLIC_URL || env.SERVER_PUBLIC_URL;
    const portalUrl = `${baseUrl}/api/v1/invoices/portal/${party.portalToken}/${invoice.id}`;

    // Build email content. balanceDue falls back to invoice.total, which
    // is correct for freshly-issued invoices with no payments. The
    // reminder scheduler passes an explicit balanceDue computed from the
    // payments ledger so overdue emails show the actual amount owed.
    const templateData = {
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        balanceDue: options?.balanceDue ?? invoice.total,
        currency: invoice.currency,
        dueDate: invoice.dueDate instanceof Date ? invoice.dueDate : invoice.dueDate ? new Date(invoice.dueDate) : null,
        issueDate: invoice.issueDate instanceof Date ? invoice.issueDate : invoice.issueDate ? new Date(invoice.issueDate) : null,
      },
      // Template field name is historical; the value is the billed party,
      // which may be an individual rather than a company.
      company: {
        name: party.name,
        email: party.email,
      },
      settings: {
        companyName: settings.companyName ?? null,
        companyEmail: settings.companyEmail ?? null,
        companyAddress: settings.companyAddress ?? null,
        companyCity: settings.companyCity ?? null,
        companyCountry: settings.companyCountry ?? null,
        companyPhone: settings.companyPhone ?? null,
        companyWebsite: settings.companyWebsite ?? null,
        companyTaxId: settings.companyTaxId ?? null,
        accentColor: settings.accentColor ?? null,
        paymentInstructions: settings.paymentInstructions ?? null,
        bankDetails: settings.bankDetails ?? null,
        footerText: settings.footerText ?? null,
      },
      portalUrl,
      customSubject: options?.customSubject,
      customMessage: options?.customMessage,
    };

    const template =
      options?.template === 'reminder'
        ? buildInvoiceReminderTemplate(templateData, options.stage ?? 1)
        : buildInvoiceEmailTemplate(templateData);

    // 9. Dispatch
    const sent = await sendEmail({
      to: recipient,
      ...(options?.ccEmails && options.ccEmails.length > 0 ? { cc: options.ccEmails } : {}),
      subject: template.subject,
      text: template.text,
      html: template.html,
      attachments: [
        {
          filename: `Invoice-${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    if (sent) {
      try {
        await db
          .update(invoices)
          .set({
            lastEmailedAt: new Date(),
            emailSentCount: sql`${invoices.emailSentCount} + 1`,
            updatedAt: new Date(),
          })
          .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)));
      } catch (err) {
        logger.error({ err, invoiceId }, 'sendInvoiceEmail: failed to update send-state columns');
      }

      logger.info(
        { invoiceId, recipient, invoiceNumber: invoice.invoiceNumber },
        'Invoice email sent',
      );
      return { sent: true, recipient };
    }

    logger.warn(
      { invoiceId, reason: 'SMTP not configured or send failed' },
      'Invoice email not sent',
    );
    return {
      sent: false,
      reason: 'SMTP not configured or send failed',
      recipient,
    };
  } catch (err) {
    logger.error({ err, invoiceId, tenantId }, 'sendInvoiceEmail: unexpected failure');
    return { sent: false, reason: 'Unexpected error sending invoice email' };
  }
}
