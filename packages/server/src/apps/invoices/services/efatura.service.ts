import { db } from '../../../config/database';
import { invoices, invoiceLineItems, crmCompanies, invoiceSettings } from '../../../db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { generateUblXml } from '../../../services/efatura/ubl-generator';
import { generateInvoiceHtml } from '../../../services/efatura/pdf-generator';
import { logger } from '../../../utils/logger';

// ─── e-Fatura Service ──────────────────────────────────────────────

export async function getEFaturaContext(tenantId: string, invoiceId: string) {
  // Load invoice
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)))
    .limit(1);

  if (!invoice) return null;

  // Load line items
  const lineItems = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, invoiceId))
    .orderBy(asc(invoiceLineItems.createdAt));

  // Load client (company). e-Fatura is deliberately company-only: Turkish
  // e-invoicing identifies an individual by TCKN under a different UBL
  // PartyIdentification scheme than a company's VKN, with its own validation
  // rules. Rather than emit a malformed document for a contact-billed
  // invoice, we resolve no client here and the callers below refuse.
  const [client] = invoice.companyId
    ? await db
        .select()
        .from(crmCompanies)
        .where(eq(crmCompanies.id, invoice.companyId))
        .limit(1)
    : [undefined];

  // Load settings
  const [settings] = await db
    .select()
    .from(invoiceSettings)
    .where(eq(invoiceSettings.tenantId, tenantId))
    .limit(1);

  return { invoice, lineItems, client: client || null, settings: settings || null };
}

export async function generateEFatura(tenantId: string, invoiceId: string, eFaturaType?: string) {
  const ctx = await getEFaturaContext(tenantId, invoiceId);
  if (!ctx) return null;

  const { invoice, lineItems, client, settings } = ctx;

  if (!settings?.eFaturaEnabled) {
    throw new Error('e-Fatura is not enabled');
  }

  if (!client) {
    throw new Error(
      invoice.companyId
        ? 'Invoice client not found'
        : 'e-Fatura requires a company recipient; this invoice is billed to an individual',
    );
  }

  if (lineItems.length === 0) {
    throw new Error('Invoice has no line items');
  }

  // Generate UUID if not already set
  const eFaturaUuid = invoice.eFaturaUuid || randomUUID();
  const type = eFaturaType || invoice.eFaturaType || 'satis';

  // Map settings fields to the CompanySettings interface expected by generators
  const companySettings = {
    companyName: settings.eFaturaCompanyName,
    companyAddress: settings.eFaturaCompanyAddress,
    companyTaxId: settings.eFaturaCompanyTaxId,
    companyTaxOffice: settings.eFaturaCompanyTaxOffice,
    companyCity: settings.eFaturaCompanyCity,
    companyCountry: settings.eFaturaCompanyCountry,
  };

  // Generate UBL-TR XML
  const xml = generateUblXml(
    { ...invoice, amount: invoice.total, eFaturaUuid, eFaturaType: type },
    lineItems,
    client,
    companySettings,
  );

  // Store in database
  const now = new Date();
  const [updated] = await db
    .update(invoices)
    .set({
      eFaturaUuid,
      eFaturaType: type,
      eFaturaStatus: 'generated',
      eFaturaXml: xml,
      updatedAt: now,
    })
    .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)))
    .returning();

  logger.info({ invoiceId, eFaturaUuid }, 'e-Fatura XML generated');

  return updated;
}

export async function getEFaturaXml(tenantId: string, invoiceId: string): Promise<string | null> {
  const [invoice] = await db
    .select({ eFaturaXml: invoices.eFaturaXml })
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)))
    .limit(1);

  return invoice?.eFaturaXml || null;
}

export async function getEFaturaPreviewHtml(tenantId: string, invoiceId: string): Promise<string | null> {
  const ctx = await getEFaturaContext(tenantId, invoiceId);
  if (!ctx) return null;

  const { invoice, lineItems, client, settings } = ctx;
  if (!client || !settings) return null;

  const companySettings = {
    companyName: settings.eFaturaCompanyName,
    companyAddress: settings.eFaturaCompanyAddress,
    companyTaxId: settings.eFaturaCompanyTaxId,
    companyTaxOffice: settings.eFaturaCompanyTaxOffice,
    companyCity: settings.eFaturaCompanyCity,
    companyCountry: settings.eFaturaCompanyCountry,
  };

  const html = generateInvoiceHtml(
    { ...invoice, amount: invoice.total, eFaturaUuid: invoice.eFaturaUuid || undefined },
    lineItems,
    client,
    companySettings,
  );

  return html;
}
