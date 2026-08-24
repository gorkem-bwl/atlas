import { db } from '../../../config/database';
import { crmCompanies, crmContacts } from '../../../db/schema';
import { and, eq } from 'drizzle-orm';

// ─── Invoice recipient resolution ──────────────────────────────────
//
// An invoice is addressed to EITHER a CRM company OR a CRM contact (an
// individual). Before this existed, five call sites — the PDF renderer,
// e-Fatura, the invoice email, the client portal and the Paraşüt sync —
// each did their own `select … from crm_companies where id = invoice.company_id`
// and assumed a row came back. Relaxing invoices.company_id to nullable
// would have meant patching all five independently and keeping them in
// agreement forever.
//
// They all go through this instead. It answers one question — "who is being
// billed, and what do we know about them?" — so the company/individual
// branch is written once.

export type PartyKind = 'company' | 'contact';

export interface InvoiceParty {
  kind: PartyKind;
  id: string;
  name: string;
  email: string | null;
  address: string | null;
  postalCode: string | null;
  state: string | null;
  country: string | null;
  taxId: string | null;
  taxOffice: string | null;
  /**
   * Client-portal token for this recipient. Null means the invoice cannot be
   * emailed or shared yet — callers must degrade gracefully rather than
   * building a URL that would 404.
   */
  portalToken: string | null;
  /**
   * UBL PartyIdentification scheme for Turkish e-Fatura. A company files under
   * a VKN, an individual under a TCKN. Consumers must not assume 'VKN'.
   */
  taxScheme: 'VKN' | 'TCKN';
}

/** The invoice fields this module needs. Structural, so both the raw row and
 *  the joined read model from getInvoice() satisfy it. */
interface InvoiceRecipientRef {
  companyId?: string | null;
  contactId?: string | null;
}

/**
 * Resolve the party an invoice is billed to.
 *
 * The company wins when both are set: an invoice to a named person AT a
 * company is still legally addressed to the company, and the contact is
 * carried separately as the attention line (see `resolveAttentionContact`).
 *
 * Returns null when neither FK resolves — the recipient was deleted, or the
 * row predates the CHECK constraint. Callers must handle null rather than
 * rendering a placeholder, because a document with the wrong "bill to" is
 * worse than one that refuses to generate.
 */
export async function resolveInvoiceParty(
  invoice: InvoiceRecipientRef,
  tenantId: string,
): Promise<InvoiceParty | null> {
  if (invoice.companyId) {
    const [company] = await db
      .select()
      .from(crmCompanies)
      .where(and(eq(crmCompanies.id, invoice.companyId), eq(crmCompanies.tenantId, tenantId)))
      .limit(1);

    if (company) {
      return {
        kind: 'company',
        id: company.id,
        name: company.name,
        email: null, // companies bill through a contact; see resolveAttentionContact
        address: company.address ?? null,
        postalCode: company.postalCode ?? null,
        state: company.state ?? null,
        country: company.country ?? null,
        taxId: company.taxId ?? null,
        taxOffice: company.taxOffice ?? null,
        portalToken: company.portalToken ?? null,
        taxScheme: 'VKN',
      };
    }
    // Fall through: a dangling companyId should still bill the contact if
    // one is set, rather than failing outright.
  }

  if (invoice.contactId) {
    const [contact] = await db
      .select()
      .from(crmContacts)
      .where(and(eq(crmContacts.id, invoice.contactId), eq(crmContacts.tenantId, tenantId)))
      .limit(1);

    if (contact) {
      return {
        kind: 'contact',
        id: contact.id,
        name: contact.name,
        email: contact.email ?? null,
        address: contact.address ?? null,
        postalCode: contact.postalCode ?? null,
        state: contact.state ?? null,
        country: contact.country ?? null,
        taxId: contact.taxId ?? null,
        taxOffice: contact.taxOffice ?? null,
        portalToken: contact.portalToken ?? null,
        taxScheme: 'TCKN',
      };
    }
  }

  return null;
}

/**
 * The person to address, as distinct from the party being billed.
 *
 * For a company invoice this is the named contact at that company, if any.
 * For a contact invoice the party IS the person, so this returns the same
 * record — which keeps "who do we email?" a single lookup for both shapes.
 */
export async function resolveAttentionContact(
  invoice: InvoiceRecipientRef,
  tenantId: string,
): Promise<{ id: string; name: string; email: string | null } | null> {
  if (!invoice.contactId) return null;

  const [contact] = await db
    .select({ id: crmContacts.id, name: crmContacts.name, email: crmContacts.email })
    .from(crmContacts)
    .where(and(eq(crmContacts.id, invoice.contactId), eq(crmContacts.tenantId, tenantId)))
    .limit(1);

  return contact ? { ...contact, email: contact.email ?? null } : null;
}

/**
 * Validate the either/or recipient rule that the database CHECK enforces,
 * so the API returns a 400 with a usable message instead of surfacing a
 * constraint violation as a 500.
 *
 * `current` carries the stored row on an update: clearing one side is only
 * an error when the other side is not already set.
 */
export function hasRecipient(
  input: { companyId?: string | null; contactId?: string | null },
  current?: InvoiceRecipientRef,
): boolean {
  const companyId = input.companyId !== undefined ? input.companyId : current?.companyId;
  const contactId = input.contactId !== undefined ? input.contactId : current?.contactId;
  return Boolean(companyId || contactId);
}
