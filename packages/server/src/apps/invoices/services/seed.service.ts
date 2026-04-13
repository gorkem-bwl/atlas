import { db } from '../../../config/database';
import {
  invoices, invoiceLineItems, invoicePayments,
  crmCompanies,
} from '../../../db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../../../utils/logger';
import { getNextInvoiceNumber } from './invoice.service';

// ─── Seed Sample Invoices ──────────────────────────────────────────

export async function seedSampleInvoices(userId: string, tenantId: string) {
  // Idempotency guard — skip if invoices already exist for this tenant
  const existing = await db.select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.tenantId, tenantId), eq(invoices.isArchived, false)))
    .limit(1);

  if (existing.length > 0) {
    logger.info({ userId, tenantId }, 'Invoice seed skipped — invoices already exist');
    return { invoices: 0, lineItems: 0, payments: 0 };
  }

  // We need at least one CRM company to attach invoices to.
  // Grab up to 3 companies (CRM seed should have run first).
  const companies = await db.select({ id: crmCompanies.id, name: crmCompanies.name })
    .from(crmCompanies)
    .where(and(eq(crmCompanies.tenantId, tenantId), eq(crmCompanies.isArchived, false)))
    .limit(3);

  if (companies.length === 0) {
    logger.warn({ tenantId }, 'Invoice seed skipped — no CRM companies found');
    return { invoices: 0, lineItems: 0, payments: 0 };
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const inFifteenDays = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
  const inThirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Use available companies (cycle if fewer than 3)
  const company1 = companies[0];
  const company2 = companies[1] || companies[0];
  const company3 = companies[2] || companies[0];

  // ─── Invoice 1: Website redesign — PAID ─────────────────────────

  const inv1Number = await getNextInvoiceNumber(tenantId);
  const [inv1] = await db.insert(invoices).values({
    tenantId,
    userId,
    companyId: company1.id,
    invoiceNumber: inv1Number,
    status: 'paid',
    currency: 'USD',
    subtotal: 3500,
    taxPercent: 0,
    taxAmount: 0,
    discountPercent: 0,
    discountAmount: 0,
    total: 3500,
    notes: 'Thank you for your business!',
    issueDate: thirtyDaysAgo,
    dueDate: fifteenDaysAgo,
    sentAt: thirtyDaysAgo,
    viewedAt: thirtyDaysAgo,
    paidAt: tenDaysAgo,
    createdAt: thirtyDaysAgo,
    updatedAt: tenDaysAgo,
  }).returning();

  await db.insert(invoiceLineItems).values([
    {
      invoiceId: inv1.id,
      description: 'Website redesign — UX research & wireframes',
      quantity: 1,
      unitPrice: 1500,
      amount: 1500,
      taxRate: 0,
      sortOrder: 0,
      createdAt: thirtyDaysAgo,
    },
    {
      invoiceId: inv1.id,
      description: 'Website redesign — visual design & development',
      quantity: 1,
      unitPrice: 2000,
      amount: 2000,
      taxRate: 0,
      sortOrder: 1,
      createdAt: thirtyDaysAgo,
    },
  ]);

  // Record payment for the paid invoice
  await db.insert(invoicePayments).values({
    tenantId,
    invoiceId: inv1.id,
    userId,
    type: 'payment',
    amount: 3500,
    currency: 'USD',
    paymentDate: tenDaysAgo,
    method: 'bank_transfer',
    reference: 'TXN-29841',
    notes: 'Full payment received',
    createdAt: tenDaysAgo,
    updatedAt: tenDaysAgo,
  });

  // ─── Invoice 2: Monthly retainer — SENT ─────────────────────────

  const inv2Number = await getNextInvoiceNumber(tenantId);
  const [inv2] = await db.insert(invoices).values({
    tenantId,
    userId,
    companyId: company2.id,
    invoiceNumber: inv2Number,
    status: 'sent',
    currency: 'USD',
    subtotal: 2000,
    taxPercent: 0,
    taxAmount: 0,
    discountPercent: 0,
    discountAmount: 0,
    total: 2000,
    notes: 'Monthly retainer — March 2026',
    issueDate: fiveDaysAgo,
    dueDate: inFifteenDays,
    sentAt: fiveDaysAgo,
    createdAt: fiveDaysAgo,
    updatedAt: fiveDaysAgo,
  }).returning();

  await db.insert(invoiceLineItems).values([
    {
      invoiceId: inv2.id,
      description: 'Monthly retainer — consulting & support (March)',
      quantity: 1,
      unitPrice: 2000,
      amount: 2000,
      taxRate: 0,
      sortOrder: 0,
      createdAt: fiveDaysAgo,
    },
  ]);

  // ─── Invoice 3: Brand identity package — DRAFT ──────────────────

  const inv3Number = await getNextInvoiceNumber(tenantId);
  const [inv3] = await db.insert(invoices).values({
    tenantId,
    userId,
    companyId: company3.id,
    invoiceNumber: inv3Number,
    status: 'draft',
    currency: 'USD',
    subtotal: 8500,
    taxPercent: 0,
    taxAmount: 0,
    discountPercent: 0,
    discountAmount: 0,
    total: 8500,
    issueDate: now,
    dueDate: inThirtyDays,
    createdAt: now,
    updatedAt: now,
  }).returning();

  await db.insert(invoiceLineItems).values([
    {
      invoiceId: inv3.id,
      description: 'Brand strategy & market research',
      quantity: 1,
      unitPrice: 2500,
      amount: 2500,
      taxRate: 0,
      sortOrder: 0,
      createdAt: now,
    },
    {
      invoiceId: inv3.id,
      description: 'Logo design & visual identity system',
      quantity: 1,
      unitPrice: 3500,
      amount: 3500,
      taxRate: 0,
      sortOrder: 1,
      createdAt: now,
    },
    {
      invoiceId: inv3.id,
      description: 'Brand guidelines document',
      quantity: 1,
      unitPrice: 2500,
      amount: 2500,
      taxRate: 0,
      sortOrder: 2,
      createdAt: now,
    },
  ]);

  logger.info({ userId, tenantId }, 'Seeded invoice sample data (3 invoices, 6 line items, 1 payment)');
  return { invoices: 3, lineItems: 6, payments: 1 };
}
