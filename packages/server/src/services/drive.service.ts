import { db } from '../config/database';
import { driveItems } from '../db/schema';
import { eq, and, asc, desc, sql, isNull } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { unlinkSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { CreateDriveItemInput, UpdateDriveItemInput } from '@atlasmail/shared';

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// ─── List items in a folder ──────────────────────────────────────────

export async function listItems(userId: string, parentId: string | null, includeArchived = false) {
  const conditions = [eq(driveItems.userId, userId)];

  if (parentId) {
    conditions.push(eq(driveItems.parentId, parentId));
  } else {
    conditions.push(isNull(driveItems.parentId));
  }

  if (!includeArchived) {
    conditions.push(eq(driveItems.isArchived, false));
  }

  return db
    .select()
    .from(driveItems)
    .where(and(...conditions))
    .orderBy(desc(sql`CASE WHEN ${driveItems.type} = 'folder' THEN 0 ELSE 1 END`), asc(driveItems.sortOrder), asc(driveItems.name));
}

// ─── Get a single item ──────────────────────────────────────────────

export async function getItem(userId: string, itemId: string) {
  const [item] = await db
    .select()
    .from(driveItems)
    .where(and(eq(driveItems.id, itemId), eq(driveItems.userId, userId)))
    .limit(1);

  return item || null;
}

// ─── Create a folder ─────────────────────────────────────────────────

export async function createFolder(userId: string, accountId: string, input: { name: string; parentId?: string | null }) {
  const now = new Date().toISOString();

  const [maxSort] = await db
    .select({ max: sql<number>`COALESCE(MAX(${driveItems.sortOrder}), -1)` })
    .from(driveItems)
    .where(eq(driveItems.userId, userId));

  const sortOrder = (maxSort?.max ?? -1) + 1;

  const [created] = await db
    .insert(driveItems)
    .values({
      accountId,
      userId,
      name: input.name || 'Untitled folder',
      type: 'folder',
      parentId: input.parentId || null,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  logger.info({ userId, itemId: created.id }, 'Drive folder created');
  return created;
}

// ─── Upload file (create record after multer has saved the file) ─────

export async function uploadFile(userId: string, accountId: string, input: CreateDriveItemInput) {
  const now = new Date().toISOString();

  const [maxSort] = await db
    .select({ max: sql<number>`COALESCE(MAX(${driveItems.sortOrder}), -1)` })
    .from(driveItems)
    .where(eq(driveItems.userId, userId));

  const sortOrder = (maxSort?.max ?? -1) + 1;

  const [created] = await db
    .insert(driveItems)
    .values({
      accountId,
      userId,
      name: input.name,
      type: 'file',
      mimeType: input.mimeType || null,
      size: input.size || null,
      parentId: input.parentId || null,
      storagePath: input.storagePath || null,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  logger.info({ userId, itemId: created.id, name: input.name }, 'Drive file uploaded');
  return created;
}

// ─── Update an item (rename, move, favourite, archive) ───────────────

export async function updateItem(userId: string, itemId: string, input: UpdateDriveItemInput) {
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updatedAt: now };

  if (input.name !== undefined) updates.name = input.name;
  if (input.parentId !== undefined) updates.parentId = input.parentId;
  if (input.isFavourite !== undefined) updates.isFavourite = input.isFavourite;
  if (input.isArchived !== undefined) updates.isArchived = input.isArchived;

  await db
    .update(driveItems)
    .set(updates)
    .where(and(eq(driveItems.id, itemId), eq(driveItems.userId, userId)));

  const [updated] = await db
    .select()
    .from(driveItems)
    .where(and(eq(driveItems.id, itemId), eq(driveItems.userId, userId)))
    .limit(1);

  return updated || null;
}

// ─── Soft delete (move to trash) ─────────────────────────────────────

export async function deleteItem(userId: string, itemId: string) {
  await updateItem(userId, itemId, { isArchived: true });
}

// ─── Restore from trash ──────────────────────────────────────────────

export async function restoreItem(userId: string, itemId: string) {
  const now = new Date().toISOString();

  await db
    .update(driveItems)
    .set({ isArchived: false, updatedAt: now })
    .where(and(eq(driveItems.id, itemId), eq(driveItems.userId, userId)));

  const [restored] = await db
    .select()
    .from(driveItems)
    .where(and(eq(driveItems.id, itemId), eq(driveItems.userId, userId)))
    .limit(1);

  return restored || null;
}

// ─── Permanent delete + unlink from disk ─────────────────────────────

export async function permanentDelete(userId: string, itemId: string) {
  const item = await getItem(userId, itemId);
  if (!item) return;

  // If it's a file with a storage path, remove from disk
  if (item.type === 'file' && item.storagePath) {
    const filePath = path.join(UPLOADS_DIR, item.storagePath);
    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    } catch (err) {
      logger.warn({ err, filePath }, 'Failed to unlink drive file from disk');
    }
  }

  // If it's a folder, recursively delete children
  if (item.type === 'folder') {
    const children = await db
      .select()
      .from(driveItems)
      .where(and(eq(driveItems.parentId, itemId), eq(driveItems.userId, userId)));

    for (const child of children) {
      await permanentDelete(userId, child.id);
    }
  }

  await db.delete(driveItems).where(and(eq(driveItems.id, itemId), eq(driveItems.userId, userId)));

  logger.info({ userId, itemId }, 'Drive item permanently deleted');
}

// ─── List trash ──────────────────────────────────────────────────────

export async function listTrash(userId: string) {
  return db
    .select()
    .from(driveItems)
    .where(and(eq(driveItems.userId, userId), eq(driveItems.isArchived, true)))
    .orderBy(desc(driveItems.updatedAt));
}

// ─── List favourites ─────────────────────────────────────────────────

export async function listFavourites(userId: string) {
  return db
    .select()
    .from(driveItems)
    .where(and(eq(driveItems.userId, userId), eq(driveItems.isFavourite, true), eq(driveItems.isArchived, false)))
    .orderBy(desc(driveItems.updatedAt));
}

// ─── List recent files ───────────────────────────────────────────────

export async function listRecent(userId: string, limit = 20) {
  return db
    .select()
    .from(driveItems)
    .where(and(eq(driveItems.userId, userId), eq(driveItems.type, 'file'), eq(driveItems.isArchived, false)))
    .orderBy(desc(driveItems.updatedAt))
    .limit(limit);
}

// ─── Search items by name ────────────────────────────────────────────

export async function searchItems(userId: string, query: string) {
  const searchTerm = `%${query}%`;
  return db
    .select()
    .from(driveItems)
    .where(
      and(
        eq(driveItems.userId, userId),
        eq(driveItems.isArchived, false),
        sql`${driveItems.name} LIKE ${searchTerm}`,
      ),
    )
    .orderBy(desc(driveItems.updatedAt))
    .limit(50);
}

// ─── Get breadcrumbs ─────────────────────────────────────────────────

export async function getBreadcrumbs(userId: string, itemId: string) {
  const crumbs: Array<{ id: string; name: string }> = [];
  let currentId: string | null = itemId;

  while (currentId) {
    const item = await getItem(userId, currentId);
    if (!item) break;
    crumbs.unshift({ id: item.id, name: item.name });
    currentId = item.parentId;
  }

  return crumbs;
}

// ─── Get storage usage ──────────────────────────────────────────────

export async function getStorageUsage(userId: string) {
  const [result] = await db
    .select({ total: sql<number>`COALESCE(SUM(${driveItems.size}), 0)` })
    .from(driveItems)
    .where(and(eq(driveItems.userId, userId), eq(driveItems.type, 'file')));

  return result?.total ?? 0;
}

// ─── Seed sample folder on first visit ───────────────────────────────

export async function seedSampleFolder(userId: string, accountId: string) {
  const existing = await db
    .select({ id: driveItems.id })
    .from(driveItems)
    .where(eq(driveItems.userId, userId))
    .limit(1);

  if (existing.length > 0) return;

  const now = new Date().toISOString();

  await db.insert(driveItems).values({
    accountId,
    userId,
    name: 'Getting started',
    type: 'folder',
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  });

  logger.info({ userId }, 'Seeded sample drive folder');
}

// ─── List all folders (for move modal) ───────────────────────────────

export async function listFolders(userId: string) {
  return db
    .select({ id: driveItems.id, name: driveItems.name, parentId: driveItems.parentId })
    .from(driveItems)
    .where(and(eq(driveItems.userId, userId), eq(driveItems.type, 'folder'), eq(driveItems.isArchived, false)))
    .orderBy(asc(driveItems.name));
}

// ─── Create linked resources ─────────────────────────────────────────

export async function createLinkedDocument(userId: string, accountId: string, parentId?: string | null) {
  const { createDocument } = await import('./document.service');
  const doc = await createDocument(userId, accountId, { title: 'Untitled document' });

  const now = new Date().toISOString();
  const [maxSort] = await db
    .select({ max: sql<number>`COALESCE(MAX(${driveItems.sortOrder}), -1)` })
    .from(driveItems)
    .where(eq(driveItems.userId, userId));
  const sortOrder = (maxSort?.max ?? -1) + 1;

  const [created] = await db
    .insert(driveItems)
    .values({
      accountId,
      userId,
      name: 'Untitled document',
      type: 'file',
      mimeType: 'application/vnd.atlasmail.document',
      parentId: parentId || null,
      linkedResourceType: 'document',
      linkedResourceId: doc.id,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  logger.info({ userId, itemId: created.id, resourceId: doc.id }, 'Linked document created in Drive');
  return { driveItem: created, resourceId: doc.id };
}

export async function createLinkedDrawing(userId: string, accountId: string, parentId?: string | null) {
  const { createDrawing } = await import('./drawing.service');
  const drawing = await createDrawing(userId, accountId, { title: 'Untitled drawing' });

  const now = new Date().toISOString();
  const [maxSort] = await db
    .select({ max: sql<number>`COALESCE(MAX(${driveItems.sortOrder}), -1)` })
    .from(driveItems)
    .where(eq(driveItems.userId, userId));
  const sortOrder = (maxSort?.max ?? -1) + 1;

  const [created] = await db
    .insert(driveItems)
    .values({
      accountId,
      userId,
      name: 'Untitled drawing',
      type: 'file',
      mimeType: 'application/vnd.atlasmail.drawing',
      parentId: parentId || null,
      linkedResourceType: 'drawing',
      linkedResourceId: drawing.id,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  logger.info({ userId, itemId: created.id, resourceId: drawing.id }, 'Linked drawing created in Drive');
  return { driveItem: created, resourceId: drawing.id };
}

export async function createLinkedSpreadsheet(userId: string, accountId: string, parentId?: string | null) {
  const { createSpreadsheet } = await import('./table.service');
  const spreadsheet = await createSpreadsheet(userId, accountId, { title: 'Untitled spreadsheet' });

  const now = new Date().toISOString();
  const [maxSort] = await db
    .select({ max: sql<number>`COALESCE(MAX(${driveItems.sortOrder}), -1)` })
    .from(driveItems)
    .where(eq(driveItems.userId, userId));
  const sortOrder = (maxSort?.max ?? -1) + 1;

  const [created] = await db
    .insert(driveItems)
    .values({
      accountId,
      userId,
      name: 'Untitled spreadsheet',
      type: 'file',
      mimeType: 'application/vnd.atlasmail.spreadsheet',
      parentId: parentId || null,
      linkedResourceType: 'spreadsheet',
      linkedResourceId: spreadsheet.id,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  logger.info({ userId, itemId: created.id, resourceId: spreadsheet.id }, 'Linked spreadsheet created in Drive');
  return { driveItem: created, resourceId: spreadsheet.id };
}
