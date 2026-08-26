import { db } from '../../../config/database';
import { invoices, invoiceLineItems, invoiceSettings } from '../../../db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { generateUblXml } from '../../../services/efatura/ubl-generator';
import { generateInvoiceHtml } from '../../../services/efatura/pdf-generator';
import { logger } from '../../../utils/logger';
import { resolveInvoiceParty } from './invoice-party.service';
import { describeTaxIdProblem } from '../../../services/efatura/tax-id';

// ─── e-Fatura Service ──────────────────────────────────────────────

/**
 * A condition the caller can fix: e-Fatura switched off, no line items, a
 * missing or malformed tax id. Distinguished from a genuine server fault so
 * the controller can answer 400 without matching on message strings — which
 * silently reclassified any reworded message as a 500.
 */
export class EFaturaInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EFaturaInputError';
  }
}

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

  // Resolve the billed party — a company (VKN) or an individual (TCKN). The
  // generators branch on `taxScheme`, because UBL-TR represents a natural
  // person with a different customer-party structure.
  const party = await resolveInvoiceParty(invoice, tenantId);
  const client = party
    ? {
        name: party.name,
        address: party.address,
        // Neither crm_companies nor crm_contacts stores a city today, so
        // CityName goes out empty for both party kinds. Pre-existing gap.
        city: null as string | null,
        country: party.country,
        taxId: party.taxId,
        taxOffice: party.taxOffice,
        taxScheme: party.taxScheme,
      }
    : undefined;

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
    throw new EFaturaInputError('e-Fatura is not enabled');
  }

  if (!client) {
    throw new EFaturaInputError('Invoice client not found');
  }

  // The tax id is what identifies the party to GİB, so a missing or malformed
  // one must stop generation here rather than produce a document that will be
  // rejected — or worse, accepted against the wrong party.
  const taxIdProblem = describeTaxIdProblem(client.taxId, client.taxScheme);
  if (taxIdProblem) {
    throw new EFaturaInputError(taxIdProblem);
  }

  if (lineItems.length === 0) {
    throw new EFaturaInputError('Invoice has no line items');
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
