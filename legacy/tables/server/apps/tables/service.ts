import { db } from '../../config/database';
import { spreadsheets, tableRowComments, users } from '../../db/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import type { CreateSpreadsheetInput, UpdateSpreadsheetInput } from '@atlas-platform/shared';

// ─── List all spreadsheets (flat list) ───────────────────────────────

export async function listSpreadsheets(
  tenantId: string,
  includeArchived = false,
  userIdFilter?: string,
) {
  const conditions = [eq(spreadsheets.tenantId, tenantId)];

  if (!includeArchived) {
    conditions.push(eq(spreadsheets.isArchived, false));
  }
  if (userIdFilter) {
    conditions.push(eq(spreadsheets.userId, userIdFilter));
  }

  return db
    .select({
      id: spreadsheets.id,
      tenantId: spreadsheets.tenantId,
      userId: spreadsheets.userId,
      title: spreadsheets.title,
      columns: spreadsheets.columns,
      viewConfig: spreadsheets.viewConfig,
      sortOrder: spreadsheets.sortOrder,
      isArchived: spreadsheets.isArchived,
      color: spreadsheets.color,
      icon: spreadsheets.icon,
      createdAt: spreadsheets.createdAt,
      updatedAt: spreadsheets.updatedAt,
    })
    .from(spreadsheets)
    .where(and(...conditions))
    .orderBy(asc(spreadsheets.sortOrder), asc(spreadsheets.createdAt));
}

// ─── Get a single spreadsheet with full data ──────────────────────────

export async function getSpreadsheet(
  tenantId: string,
  spreadsheetId: string,
  userIdFilter?: string,
) {
  const [spreadsheet] = await db
    .select()
    .from(spreadsheets)
    .where(
      and(
        eq(spreadsheets.id, spreadsheetId),
        eq(spreadsheets.tenantId, tenantId),
        ...(userIdFilter ? [eq(spreadsheets.userId, userIdFilter)] : []),
      ),
    )
    .limit(1);

  return spreadsheet || null;
}

// ─── Seed sample spreadsheets on first visit ─────────────────────────

export async function seedSampleSpreadsheets(userId: string, tenantId: string) {
  const existing = await db
    .select({ id: spreadsheets.id })
    .from(spreadsheets)
    .where(eq(spreadsheets.tenantId, tenantId))
    .limit(1);

  if (existing.length > 0) return { skipped: true }; // Tenant already has tables

  const now = new Date();
  const ts = now.toISOString();

  const bugCols = [
    { id: 'col_title', name: 'Title', type: 'text' as const, width: 280 },
    { id: 'col_priority', name: 'Priority', type: 'singleSelect' as const, width: 120, options: ['Critical', 'High', 'Medium', 'Low'] },
    { id: 'col_status', name: 'Status', type: 'singleSelect' as const, width: 130, options: ['Open', 'In Progress', 'Fixed', 'Closed'] },
    { id: 'col_assigned', name: 'Assigned To', type: 'text' as const, width: 160 },
  ];

  const bugRows = [
    { _id: 'bug_1', _createdAt: ts, col_title: 'Login page crashes on Safari 17', col_priority: 'Critical', col_status: 'In Progress', col_assigned: 'Alice Chen' },
    { _id: 'bug_2', _createdAt: ts, col_title: 'Dark mode flicker on page load', col_priority: 'High', col_status: 'Open', col_assigned: 'Eva Schmidt' },
    { _id: 'bug_3', _createdAt: ts, col_title: 'CSV export missing last column', col_priority: 'Medium', col_status: 'Fixed', col_assigned: 'Alice Chen' },
  ];

  await db.insert(spreadsheets).values({
    tenantId, userId, title: 'Bug tracker', columns: bugCols, rows: bugRows,
    viewConfig: { activeView: 'grid' }, sortOrder: 0, createdAt: now, updatedAt: now,
  });

  logger.info({ tenantId, userId }, 'Seeded sample spreadsheets');
  return { spreadsheets: 1 };
}

// ─── Create a new spreadsheet ────────────────────────────────────────

export async function createSpreadsheet(userId: string, tenantId: string, input: CreateSpreadsheetInput) {
  const now = new Date();

  const [created] = await db
    .insert(spreadsheets)
    .values({
      tenantId,
      userId,
      title: input.title || 'Untitled table',
      columns: input.columns ?? [],
      rows: input.rows ?? [],
      viewConfig: input.viewConfig ?? { activeView: 'grid' as const },
      sortOrder: sql`COALESCE((SELECT MAX(${spreadsheets.sortOrder}) FROM spreadsheets WHERE ${spreadsheets.tenantId} = ${tenantId}), -1) + 1`,
      color: input.color ?? null,
      icon: input.icon ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  logger.info({ userId, tenantId, spreadsheetId: created.id }, 'Spreadsheet created');
  return created;
}

// ─── Update a spreadsheet ────────────────────────────────────────────

export async function updateSpreadsheet(
  tenantId: string,
  spreadsheetId: string,
  input: UpdateSpreadsheetInput,
  userIdFilter?: string,
) {
  const now = new Date();

  const updates: Record<string, unknown> = { updatedAt: now };

  if (input.title !== undefined) updates.title = input.title;
  if (input.columns !== undefined) updates.columns = input.columns;
  if (input.rows !== undefined) updates.rows = input.rows;
  if (input.viewConfig !== undefined) updates.viewConfig = input.viewConfig;
  if (input.isArchived !== undefined) updates.isArchived = input.isArchived;
  if (input.color !== undefined) updates.color = input.color;
  if (input.icon !== undefined) updates.icon = input.icon;
  if (input.guide !== undefined) updates.guide = input.guide;

  const [updated] = await db
    .update(spreadsheets)
    .set(updates)
    .where(
      and(
        eq(spreadsheets.id, spreadsheetId),
        eq(spreadsheets.tenantId, tenantId),
        ...(userIdFilter ? [eq(spreadsheets.userId, userIdFilter)] : []),
      ),
    )
    .returning();

  return updated || null;
}

// ─── Delete (soft delete) a spreadsheet ──────────────────────────────

export async function deleteSpreadsheet(
  tenantId: string,
  spreadsheetId: string,
  userIdFilter?: string,
) {
  return updateSpreadsheet(tenantId, spreadsheetId, { isArchived: true }, userIdFilter);
}

// ─── Restore an archived spreadsheet ─────────────────────────────────

export async function restoreSpreadsheet(
  tenantId: string,
  spreadsheetId: string,
  userIdFilter?: string,
) {
  const now = new Date();

  const [restored] = await db
    .update(spreadsheets)
    .set({ isArchived: false, updatedAt: now })
    .where(
      and(
        eq(spreadsheets.id, spreadsheetId),
        eq(spreadsheets.tenantId, tenantId),
        ...(userIdFilter ? [eq(spreadsheets.userId, userIdFilter)] : []),
      ),
    )
    .returning();

  return restored || null;
}

// ─── Search spreadsheets by title ────────────────────────────────────

export async function searchSpreadsheets(
  tenantId: string,
  query: string,
  userIdFilter?: string,
) {
  const searchTerm = `%${query}%`;
  return db
    .select({
      id: spreadsheets.id,
      tenantId: spreadsheets.tenantId,
      userId: spreadsheets.userId,
      title: spreadsheets.title,
      columns: spreadsheets.columns,
      viewConfig: spreadsheets.viewConfig,
      sortOrder: spreadsheets.sortOrder,
      isArchived: spreadsheets.isArchived,
      color: spreadsheets.color,
      icon: spreadsheets.icon,
      createdAt: spreadsheets.createdAt,
      updatedAt: spreadsheets.updatedAt,
    })
    .from(spreadsheets)
    .where(
      and(
        eq(spreadsheets.tenantId, tenantId),
        eq(spreadsheets.isArchived, false),
        sql`${spreadsheets.title} LIKE ${searchTerm}`,
        ...(userIdFilter ? [eq(spreadsheets.userId, userIdFilter)] : []),
      ),
    )
    .orderBy(asc(spreadsheets.updatedAt))
    .limit(20);
}

// ─── Row Comments ───────────────────────────────────────────────────

export async function listRowComments(spreadsheetId: string, rowId: string) {
  return db
    .select({
      id: tableRowComments.id,
      spreadsheetId: tableRowComments.spreadsheetId,
      rowId: tableRowComments.rowId,
      tenantId: tableRowComments.tenantId,
      userId: tableRowComments.userId,
      body: tableRowComments.body,
      userName: users.name,
      userEmail: users.email,
      createdAt: tableRowComments.createdAt,
      updatedAt: tableRowComments.updatedAt,
    })
    .from(tableRowComments)
    .leftJoin(users, eq(tableRowComments.userId, users.id))
    .where(
      and(
        eq(tableRowComments.spreadsheetId, spreadsheetId),
        eq(tableRowComments.rowId, rowId),
      ),
    )
    .orderBy(asc(tableRowComments.createdAt));
}

export async function createRowComment(
  userId: string,
  tenantId: string,
  spreadsheetId: string,
  rowId: string,
  body: string,
) {
  const now = new Date();
  const [created] = await db
    .insert(tableRowComments)
    .values({
      spreadsheetId,
      rowId,
      tenantId,
      userId,
      body,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Return with user info
  const [result] = await db
    .select({
      id: tableRowComments.id,
      spreadsheetId: tableRowComments.spreadsheetId,
      rowId: tableRowComments.rowId,
      tenantId: tableRowComments.tenantId,
      userId: tableRowComments.userId,
      body: tableRowComments.body,
      userName: users.name,
      userEmail: users.email,
      createdAt: tableRowComments.createdAt,
      updatedAt: tableRowComments.updatedAt,
    })
    .from(tableRowComments)
    .leftJoin(users, eq(tableRowComments.userId, users.id))
    .where(eq(tableRowComments.id, created.id))
    .limit(1);

  return result;
}

export async function deleteRowComment(userId: string, commentId: string) {
  // Only the author can delete
  const [comment] = await db
    .select()
    .from(tableRowComments)
    .where(eq(tableRowComments.id, commentId))
    .limit(1);

  if (!comment) return false;
  if (comment.userId !== userId) return false;

  await db.delete(tableRowComments).where(eq(tableRowComments.id, commentId));
  return true;
}
