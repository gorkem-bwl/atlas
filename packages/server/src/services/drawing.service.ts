import { db } from '../config/database';
import { drawings } from '../db/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import type { CreateDrawingInput, UpdateDrawingInput } from '@atlasmail/shared';

// ─── List all drawings (flat list) ───────────────────────────────────

export async function listDrawings(userId: string, includeArchived = false) {
  const conditions = [eq(drawings.userId, userId)];

  if (!includeArchived) {
    conditions.push(eq(drawings.isArchived, false));
  }

  return db
    .select({
      id: drawings.id,
      accountId: drawings.accountId,
      userId: drawings.userId,
      title: drawings.title,
      thumbnailUrl: drawings.thumbnailUrl,
      sortOrder: drawings.sortOrder,
      isArchived: drawings.isArchived,
      createdAt: drawings.createdAt,
      updatedAt: drawings.updatedAt,
    })
    .from(drawings)
    .where(and(...conditions))
    .orderBy(asc(drawings.sortOrder), asc(drawings.createdAt));
}

// ─── Get a single drawing with full content ──────────────────────────

export async function getDrawing(userId: string, drawingId: string) {
  const [drawing] = await db
    .select()
    .from(drawings)
    .where(and(eq(drawings.id, drawingId), eq(drawings.userId, userId)))
    .limit(1);

  return drawing || null;
}

// ─── Seed sample drawings on first visit ─────────────────────────────

export async function seedSampleDrawings(userId: string, accountId: string) {
  const existing = await db
    .select({ id: drawings.id })
    .from(drawings)
    .where(eq(drawings.userId, userId))
    .limit(1);

  if (existing.length > 0) return; // User already has drawings

  const now = new Date();

  await db.insert(drawings).values({
    accountId,
    userId,
    title: 'Getting started',
    content: {
      elements: [],
      appState: { viewBackgroundColor: '#ffffff' },
      files: {},
    },
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  });

  logger.info({ userId }, 'Seeded sample drawing');
}

// ─── Create a new drawing ────────────────────────────────────────────

export async function createDrawing(userId: string, accountId: string, input: CreateDrawingInput) {
  const now = new Date();

  // Determine the next sort order
  const [maxSort] = await db
    .select({ max: sql<number>`COALESCE(MAX(${drawings.sortOrder}), -1)` })
    .from(drawings)
    .where(eq(drawings.userId, userId));

  const sortOrder = (maxSort?.max ?? -1) + 1;

  const [created] = await db
    .insert(drawings)
    .values({
      accountId,
      userId,
      title: input.title || 'Untitled drawing',
      content: input.content ?? null,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  logger.info({ userId, drawingId: created.id }, 'Drawing created');
  return created;
}

// ─── Update a drawing ────────────────────────────────────────────────

export async function updateDrawing(
  userId: string,
  drawingId: string,
  input: UpdateDrawingInput,
) {
  const now = new Date();

  const updates: Record<string, unknown> = { updatedAt: now };

  if (input.title !== undefined) updates.title = input.title;
  if (input.content !== undefined) updates.content = input.content;
  if (input.thumbnailUrl !== undefined) updates.thumbnailUrl = input.thumbnailUrl;
  if (input.isArchived !== undefined) updates.isArchived = input.isArchived;

  await db
    .update(drawings)
    .set(updates)
    .where(and(eq(drawings.id, drawingId), eq(drawings.userId, userId)));

  const [updated] = await db
    .select()
    .from(drawings)
    .where(and(eq(drawings.id, drawingId), eq(drawings.userId, userId)))
    .limit(1);

  return updated || null;
}

// ─── Delete (soft delete) a drawing ──────────────────────────────────

export async function deleteDrawing(userId: string, drawingId: string) {
  await updateDrawing(userId, drawingId, { isArchived: true });
}

// ─── Restore an archived drawing ─────────────────────────────────────

export async function restoreDrawing(userId: string, drawingId: string) {
  const now = new Date();

  await db
    .update(drawings)
    .set({ isArchived: false, updatedAt: now })
    .where(and(eq(drawings.id, drawingId), eq(drawings.userId, userId)));

  const [restored] = await db
    .select()
    .from(drawings)
    .where(and(eq(drawings.id, drawingId), eq(drawings.userId, userId)))
    .limit(1);

  return restored || null;
}

// ─── Search drawings by title ────────────────────────────────────────

export async function searchDrawings(userId: string, query: string) {
  const searchTerm = `%${query}%`;
  return db
    .select({
      id: drawings.id,
      accountId: drawings.accountId,
      userId: drawings.userId,
      title: drawings.title,
      thumbnailUrl: drawings.thumbnailUrl,
      sortOrder: drawings.sortOrder,
      isArchived: drawings.isArchived,
      createdAt: drawings.createdAt,
      updatedAt: drawings.updatedAt,
    })
    .from(drawings)
    .where(
      and(
        eq(drawings.userId, userId),
        eq(drawings.isArchived, false),
        sql`${drawings.title} LIKE ${searchTerm}`,
      ),
    )
    .orderBy(asc(drawings.updatedAt))
    .limit(20);
}

// ─── Auto-purge archived drawings older than 30 days ─────────────────

const PURGE_DAYS = 30;

export async function purgeOldArchivedDrawings() {
  const cutoff = new Date(Date.now() - PURGE_DAYS * 24 * 60 * 60 * 1000);

  const deleted = await db
    .delete(drawings)
    .where(
      and(
        eq(drawings.isArchived, true),
        sql`${drawings.updatedAt} < ${cutoff}`,
      ),
    )
    .returning({ id: drawings.id });

  if (deleted.length > 0) {
    logger.info({ count: deleted.length }, 'Auto-purged archived drawings older than 30 days');
  }

  return deleted.length;
}
