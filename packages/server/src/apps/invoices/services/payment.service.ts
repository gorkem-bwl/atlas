import { db } from '../../../config/database';
import { invoices, invoicePayments } from '../../../db/schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import { logger } from '../../../utils/logger';
import type {
  InvoicePayment,
  RecordPaymentInput,
  UpdatePaymentInput,
  PaymentType,
} from '@atlas-platform/shared';

// ─── Helpers ────────────────────────────────────────────────────────

const MONEY_EPSILON = 0.01;
const OVERPAY_EPSILON_FACTOR = 1.0001;

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function serializePayment(row: typeof invoicePayments.$inferSelect): InvoicePayment {
  return {
    id: row.id,
    tenantId: row.tenantId,
    invoiceId: row.invoiceId,
    userId: row.userId,
    type: row.type as PaymentType,
    amount: row.amount,
    currency: row.currency,
    paymentDate: row.paymentDate,
    method: row.method ?? null,
    reference: row.reference ?? null,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function loadInvoiceForTenant(invoiceId: string, tenantId: string) {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)))
    .limit(1);
  if (!invoice) {
    throw new Error('404: invoice not found');
  }
  return invoice;
}

/**
 * Computes net paid amount for an invoice: sum(payments) - sum(refunds).
 * Optionally excludes a specific payment id (used by updatePayment to
 * exclude the row being edited so we can re-validate with the new amount).
 */
async function computeNetPaid(invoiceId: string, excludePaymentId?: string): Promise<number> {
  const rows = await db
    .select({ type: invoicePayments.type, amount: invoicePayments.amount, id: invoicePayments.id })
    .from(invoicePayments)
    .where(eq(invoicePayments.invoiceId, invoiceId));

  let net = 0;
  for (const r of rows) {
    if (excludePaymentId && r.id === excludePaymentId) continue;
    net += r.type === 'refund' ? -r.amount : r.amount;
  }
  return net;
}

// ─── Public API ─────────────────────────────────────────────────────

export async function listPaymentsForInvoice(
  invoiceId: string,
  tenantId: string,
): Promise<InvoicePayment[]> {
  const rows = await db
    .select()
    .from(invoicePayments)
    .where(and(eq(invoicePayments.invoiceId, invoiceId), eq(invoicePayments.tenantId, tenantId)))
    .orderBy(desc(invoicePayments.paymentDate), desc(invoicePayments.createdAt));
  return rows.map(serializePayment);
}

export async function recordPayment(
  input: RecordPaymentInput,
  userId: string,
  tenantId: string,
): Promise<InvoicePayment> {
  // 1. Validate amount
  if (!(typeof input.amount === 'number') || !isFinite(input.amount) || input.amount <= 0) {
    throw new Error('400: amount must be positive');
  }

  // 2. Load invoice (404 if missing)
  const invoice = await loadInvoiceForTenant(input.invoiceId, tenantId);

  // 3. Validate payment date
  const paymentDate = toDate(input.paymentDate);
  if (isNaN(paymentDate.getTime())) {
    throw new Error('400: invalid payment date');
  }
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 1); // 1-day buffer for timezone slack
  if (paymentDate.getTime() > maxDate.getTime()) {
    throw new Error('400: payment date cannot be in the future');
  }

  const type: PaymentType = input.type ?? 'payment';

  // 4/5. Balance checks
  const netPaid = await computeNetPaid(input.invoiceId);
  if (type === 'payment') {
    const limit = invoice.total * OVERPAY_EPSILON_FACTOR;
    if (netPaid + input.amount > limit) {
      throw new Error('400: payment would exceed invoice total');
    }
  } else {
    if (input.amount > netPaid + MONEY_EPSILON) {
      throw new Error('400: refund amount exceeds paid amount');
    }
  }

  // 6. Currency defaulting
  const currency = input.currency ?? invoice.currency;

  const now = new Date();
  const [created] = await db
    .insert(invoicePayments)
    .values({
      tenantId,
      invoiceId: input.invoiceId,
      userId,
      type,
      amount: input.amount,
      currency,
      paymentDate,
      method: (input.method as string | null | undefined) ?? null,
      reference: input.reference ?? null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await updateInvoicePaidStatus(input.invoiceId, tenantId);

  logger.info(
    { userId, invoiceId: input.invoiceId, paymentId: created.id, type, amount: input.amount },
    'Invoice payment recorded',
  );

  return serializePayment(created);
}

export async function updatePayment(
  paymentId: string,
  input: UpdatePaymentInput,
  tenantId: string,
): Promise<InvoicePayment> {
  // Load existing payment scoped to tenant
  const [existing] = await db
    .select()
    .from(invoicePayments)
    .where(and(eq(invoicePayments.id, paymentId), eq(invoicePayments.tenantId, tenantId)))
    .limit(1);
  if (!existing) {
    throw new Error('404: payment not found');
  }

  // Load invoice (ensures it still exists and is tenant-scoped)
  const invoice = await loadInvoiceForTenant(existing.invoiceId, tenantId);

  // Determine new values (type and invoiceId are immutable)
  const newAmount = input.amount !== undefined ? input.amount : existing.amount;
  const newPaymentDate =
    input.paymentDate !== undefined ? toDate(input.paymentDate) : existing.paymentDate;

  if (input.amount !== undefined) {
    if (!(typeof newAmount === 'number') || !isFinite(newAmount) || newAmount <= 0) {
      throw new Error('400: amount must be positive');
    }
  }

  if (input.paymentDate !== undefined) {
    if (isNaN(newPaymentDate.getTime())) {
      throw new Error('400: invalid payment date');
    }
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 1);
    if (newPaymentDate.getTime() > maxDate.getTime()) {
      throw new Error('400: payment date cannot be in the future');
    }
  }

  // Re-run balance validation excluding this row, then adding the updated amount
  const netPaidExcluding = await computeNetPaid(existing.invoiceId, existing.id);
  if (existing.type === 'payment') {
    const limit = invoice.total * OVERPAY_EPSILON_FACTOR;
    if (netPaidExcluding + newAmount > limit) {
      throw new Error('400: payment would exceed invoice total');
    }
  } else {
    // refund: refund amount must not exceed current net paid (without this row)
    if (newAmount > netPaidExcluding + MONEY_EPSILON) {
      throw new Error('400: refund amount exceeds paid amount');
    }
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (input.amount !== undefined) updates.amount = newAmount;
  if (input.paymentDate !== undefined) updates.paymentDate = newPaymentDate;
  if (input.method !== undefined) updates.method = input.method ?? null;
  if (input.reference !== undefined) updates.reference = input.reference ?? null;
  if (input.notes !== undefined) updates.notes = input.notes ?? null;

  const [updated] = await db
    .update(invoicePayments)
    .set(updates)
    .where(and(eq(invoicePayments.id, paymentId), eq(invoicePayments.tenantId, tenantId)))
    .returning();

  await updateInvoicePaidStatus(existing.invoiceId, tenantId);

  return serializePayment(updated);
}

export async function deletePayment(paymentId: string, tenantId: string): Promise<void> {
  const [existing] = await db
    .select({ id: invoicePayments.id, invoiceId: invoicePayments.invoiceId })
    .from(invoicePayments)
    .where(and(eq(invoicePayments.id, paymentId), eq(invoicePayments.tenantId, tenantId)))
    .limit(1);
  if (!existing) {
    throw new Error('404: payment not found');
  }

  await db
    .delete(invoicePayments)
    .where(and(eq(invoicePayments.id, paymentId), eq(invoicePayments.tenantId, tenantId)));

  await updateInvoicePaidStatus(existing.invoiceId, tenantId);
}

/**
 * Recomputes an invoice's paid state from the sum of its payments.
 * - If net paid >= total (within epsilon), set status='paid' and paidAt=NOW().
 * - If status was 'paid' but balance is now positive, revert to 'overdue' (if past due)
 *   or 'sent'. Clears paidAt.
 * - Otherwise leave status alone (partial payments keep status as 'sent'/'draft'; UI
 *   derives "partially paid" from balanceDue at render time).
 */
export async function updateInvoicePaidStatus(
  invoiceId: string,
  tenantId: string,
): Promise<void> {
  const invoice = await loadInvoiceForTenant(invoiceId, tenantId);

  const [{ netPaid }] = await db
    .select({
      netPaid: sql<number>`COALESCE(SUM(CASE WHEN ${invoicePayments.type} = 'payment' THEN ${invoicePayments.amount} ELSE -${invoicePayments.amount} END), 0)`,
    })
    .from(invoicePayments)
    .where(eq(invoicePayments.invoiceId, invoiceId));

  const net = Number(netPaid) || 0;
  const now = new Date();

  if (net >= invoice.total - MONEY_EPSILON) {
    if (invoice.status !== 'paid') {
      await db
        .update(invoices)
        .set({ status: 'paid', paidAt: now, updatedAt: now })
        .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)));
    }
    return;
  }

  // Net paid is below total
  if (invoice.status === 'paid') {
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
    const revertTo = dueDate && dueDate.getTime() < now.getTime() ? 'overdue' : 'sent';
    await db
      .update(invoices)
      .set({ status: revertTo, paidAt: null, updatedAt: now })
      .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)));
  }
  // else: leave status as-is (e.g. 'sent' with partial payment)
}
