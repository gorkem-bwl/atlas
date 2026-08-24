import type { Request, Response } from 'express';
import { db } from '../../../config/database';
import { crmCompanies, crmContacts, invoices, invoiceLineItems } from '../../../db/schema';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import { logger } from '../../../utils/logger';
import { markInvoiceViewed } from '../services/invoice.service';

// ─── Portal (public, token-based) ──────────────────────────────────

/**
 * Resolve a portal token to the party that owns it. Tokens live on both
 * crm_companies and crm_contacts (an invoice can be billed to an individual),
 * and both columns are UNIQUE, so a token identifies exactly one party.
 *
 * The returned `kind` decides which invoice column is filtered on below. That
 * matters for isolation: a contact's token must expose only invoices billed
 * to that contact, never every invoice at the company they belong to.
 */
async function getPartyByPortalToken(portalToken: string) {
  const [company] = await db
    .select({
      id: crmCompanies.id,
      tenantId: crmCompanies.tenantId,
      name: crmCompanies.name,
    })
    .from(crmCompanies)
    .where(and(
      eq(crmCompanies.portalToken, portalToken),
      eq(crmCompanies.isArchived, false),
    ))
    .limit(1);

  if (company) return { ...company, kind: 'company' as const };

  const [contact] = await db
    .select({
      id: crmContacts.id,
      tenantId: crmContacts.tenantId,
      name: crmContacts.name,
    })
    .from(crmContacts)
    .where(and(
      eq(crmContacts.portalToken, portalToken),
      eq(crmContacts.isArchived, false),
    ))
    .limit(1);

  return contact ? { ...contact, kind: 'contact' as const } : null;
}

/** Restrict a portal query to the invoices this token's owner may see. */
function recipientFilter(party: { id: string; kind: 'company' | 'contact' }) {
  return party.kind === 'company'
    ? eq(invoices.companyId, party.id)
    : eq(invoices.contactId, party.id);
}

export async function getPortalInvoices(req: Request, res: Response) {
  try {
    const token = req.params.token as string;
    if (!token) {
      res.status(400).json({ success: false, error: 'Portal token is required' });
      return;
    }

    const party = await getPartyByPortalToken(token);
    if (!party) {
      res.status(404).json({ success: false, error: 'Invalid portal token' });
      return;
    }

    const invoiceList = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        total: invoices.total,
        currency: invoices.currency,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        sentAt: invoices.sentAt,
        paidAt: invoices.paidAt,
      })
      .from(invoices)
      .where(and(
        recipientFilter(party),
        eq(invoices.tenantId, party.tenantId),
        eq(invoices.isArchived, false),
        sql`${invoices.status} != 'draft'`,
      ))
      .orderBy(desc(invoices.createdAt));

    res.json({ success: true, data: { company: { name: party.name }, invoices: invoiceList } });
  } catch (error) {
    logger.error({ error }, 'Failed to get portal invoices');
    res.status(500).json({ success: false, error: 'Failed to get portal invoices' });
  }
}

export async function getPortalInvoice(req: Request, res: Response) {
  try {
    const token = req.params.token as string;
    const invoiceId = req.params.invoiceId as string;
    if (!token || !invoiceId) {
      res.status(400).json({ success: false, error: 'Portal token and invoice ID are required' });
      return;
    }

    const party = await getPartyByPortalToken(token);
    if (!party) {
      res.status(404).json({ success: false, error: 'Invalid portal token' });
      return;
    }

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(
        eq(invoices.id, invoiceId),
        recipientFilter(party),
        eq(invoices.tenantId, party.tenantId),
        eq(invoices.isArchived, false),
        sql`${invoices.status} != 'draft'`,
      ))
      .limit(1);

    if (!invoice) {
      res.status(404).json({ success: false, error: 'Invoice not found' });
      return;
    }

    // Mark as viewed (first time only)
    await markInvoiceViewed(party.tenantId, invoiceId);

    // Fetch line items
    const lineItems = await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, invoiceId))
      .orderBy(asc(invoiceLineItems.sortOrder), asc(invoiceLineItems.createdAt));

    res.json({
      success: true,
      data: {
        company: { name: party.name },
        invoice: { ...invoice, lineItems },
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get portal invoice');
    res.status(500).json({ success: false, error: 'Failed to get portal invoice' });
  }
}
