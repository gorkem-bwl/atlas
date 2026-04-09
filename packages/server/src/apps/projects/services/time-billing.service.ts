import { db } from '../../../config/database';
import {
  invoices, invoiceLineItems,
  projectTimeEntries, projectProjects, projectMembers,
} from '../../../db/schema';
import { eq, and, gte, lte, inArray, sql } from 'drizzle-orm';
import { getSettings } from './settings.service';

/**
 * Preview what line items would be generated from unbilled time entries
 * for a given company within a date range.
 */
export async function previewTimeEntryLineItems(
  tenantId: string,
  companyId: string,
  startDate: string,
  endDate: string,
) {
  // Find all company's projects
  const companyProjects = await db
    .select({ id: projectProjects.id })
    .from(projectProjects)
    .where(and(
      eq(projectProjects.companyId, companyId),
      eq(projectProjects.tenantId, tenantId),
    ));

  const projectIds = companyProjects.map(p => p.id);
  if (projectIds.length === 0) return [];

  // Find unbilled billable time entries in date range
  const entries = await db
    .select({
      id: projectTimeEntries.id,
      durationMinutes: projectTimeEntries.durationMinutes,
      taskDescription: projectTimeEntries.taskDescription,
      notes: projectTimeEntries.notes,
      workDate: projectTimeEntries.workDate,
      userId: projectTimeEntries.userId,
      projectId: projectTimeEntries.projectId,
    })
    .from(projectTimeEntries)
    .where(and(
      eq(projectTimeEntries.tenantId, tenantId),
      eq(projectTimeEntries.billable, true),
      eq(projectTimeEntries.billed, false),
      eq(projectTimeEntries.isArchived, false),
      inArray(projectTimeEntries.projectId, projectIds),
      gte(projectTimeEntries.workDate, startDate),
      lte(projectTimeEntries.workDate, endDate),
    ));

  // Batch: collect all unique (projectId, userId) pairs for member rate lookup
  const memberKeys = new Set<string>();
  for (const entry of entries) {
    memberKeys.add(`${entry.projectId}:${entry.userId}`);
  }
  const uniquePairs = [...memberKeys].map(k => { const [p, u] = k.split(':'); return { projectId: p, userId: u }; });

  // Batch-query all relevant project members in one query
  const allMembers = uniquePairs.length > 0
    ? await db
        .select({
          projectId: projectMembers.projectId,
          userId: projectMembers.userId,
          hourlyRate: projectMembers.hourlyRate,
        })
        .from(projectMembers)
        .where(sql`(${projectMembers.projectId}, ${projectMembers.userId}) IN (${sql.raw(
          uniquePairs.map(p => `('${p.projectId}', '${p.userId}')`).join(', ')
        )})`)
    : [];

  // Build O(1) lookup map
  const memberRateMap = new Map<string, number | null>();
  for (const m of allMembers) {
    memberRateMap.set(`${m.projectId}:${m.userId}`, m.hourlyRate);
  }

  // Load settings once for default rate fallback
  const settings = await getSettings(tenantId);
  const defaultRate = settings?.defaultHourlyRate ?? 0;

  const lineItems = entries.map(entry => {
    const rate = memberRateMap.get(`${entry.projectId}:${entry.userId}`) ?? defaultRate;
    const hours = entry.durationMinutes / 60;
    const description = entry.taskDescription || entry.notes || `Time entry ${entry.workDate}`;
    return { description, quantity: hours, unitPrice: rate };
  });

  return lineItems;
}

/**
 * Actually create line items from unbilled time entries, writing to the
 * shared `invoices` and `invoice_line_items` tables.
 */
export async function populateFromTimeEntries(
  tenantId: string,
  invoiceId: string,
  companyId: string,
  startDate: string,
  endDate: string,
) {
  // Find all company's projects
  const companyProjects = await db
    .select({ id: projectProjects.id })
    .from(projectProjects)
    .where(and(
      eq(projectProjects.companyId, companyId),
      eq(projectProjects.tenantId, tenantId),
    ));

  const projectIds = companyProjects.map(p => p.id);
  if (projectIds.length === 0) return [];

  // Find unbilled billable time entries in date range
  const entries = await db
    .select({
      id: projectTimeEntries.id,
      durationMinutes: projectTimeEntries.durationMinutes,
      taskDescription: projectTimeEntries.taskDescription,
      notes: projectTimeEntries.notes,
      workDate: projectTimeEntries.workDate,
      userId: projectTimeEntries.userId,
      projectId: projectTimeEntries.projectId,
    })
    .from(projectTimeEntries)
    .where(and(
      eq(projectTimeEntries.tenantId, tenantId),
      eq(projectTimeEntries.billable, true),
      eq(projectTimeEntries.billed, false),
      eq(projectTimeEntries.isArchived, false),
      inArray(projectTimeEntries.projectId, projectIds),
      gte(projectTimeEntries.workDate, startDate),
      lte(projectTimeEntries.workDate, endDate),
    ));

  const now = new Date();

  // Batch: collect all unique (projectId, userId) pairs for member rate lookup
  const memberKeys = new Set<string>();
  for (const entry of entries) {
    memberKeys.add(`${entry.projectId}:${entry.userId}`);
  }
  const uniquePairs = [...memberKeys].map(k => { const [p, u] = k.split(':'); return { projectId: p, userId: u }; });

  // Batch-query all relevant project members in one query
  const allMembers = uniquePairs.length > 0
    ? await db
        .select({
          projectId: projectMembers.projectId,
          userId: projectMembers.userId,
          hourlyRate: projectMembers.hourlyRate,
        })
        .from(projectMembers)
        .where(sql`(${projectMembers.projectId}, ${projectMembers.userId}) IN (${sql.raw(
          uniquePairs.map(p => `('${p.projectId}', '${p.userId}')`).join(', ')
        )})`)
    : [];

  // Build O(1) lookup map
  const memberRateMap = new Map<string, number | null>();
  for (const m of allMembers) {
    memberRateMap.set(`${m.projectId}:${m.userId}`, m.hourlyRate);
  }

  // Load settings once for the default rate fallback
  const settings = await getSettings(tenantId);
  const defaultRate = settings?.defaultHourlyRate ?? 0;

  // Prepare all line items for batch insert
  const lineItemValues = entries.map((entry, idx) => {
    const rate = memberRateMap.get(`${entry.projectId}:${entry.userId}`) ?? defaultRate;
    const hours = entry.durationMinutes / 60;
    const amount = hours * rate;
    const description = entry.taskDescription || entry.notes || `Time entry ${entry.workDate}`;

    return {
      invoiceId,
      timeEntryId: entry.id,
      description,
      quantity: hours,
      unitPrice: rate,
      amount,
      sortOrder: idx,
      createdAt: now,
    };
  });

  // Batch insert all line items at once
  const createdLineItems = lineItemValues.length > 0
    ? await db.insert(invoiceLineItems).values(lineItemValues).returning()
    : [];

  // Build a map from timeEntryId -> lineItemId for batch update
  const entryToLineItem = new Map<string, string>();
  for (const li of createdLineItems) {
    if (li.timeEntryId) {
      entryToLineItem.set(li.timeEntryId, li.id);
    }
  }

  // Batch update: mark all time entries as billed and locked
  const timeEntryIds = entries.map(e => e.id);
  if (timeEntryIds.length > 0) {
    await db
      .update(projectTimeEntries)
      .set({ billed: true, locked: true, updatedAt: now })
      .where(inArray(projectTimeEntries.id, timeEntryIds));

    // Set invoiceLineItemId for each entry individually (different value per row)
    for (const [entryId, lineItemId] of entryToLineItem) {
      await db
        .update(projectTimeEntries)
        .set({ invoiceLineItemId: lineItemId })
        .where(eq(projectTimeEntries.id, entryId));
    }
  }

  // Update invoice total
  const totalAmount = createdLineItems.reduce((sum, li) => sum + li.amount, 0);
  if (totalAmount > 0) {
    const [existingInvoice] = await db
      .select({ subtotal: invoices.subtotal })
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    const newSubtotal = (existingInvoice?.subtotal ?? 0) + totalAmount;
    await db
      .update(invoices)
      .set({ subtotal: newSubtotal, total: newSubtotal, updatedAt: now })
      .where(eq(invoices.id, invoiceId));
  }

  return createdLineItems;
}
