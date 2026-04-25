import type { Request, Response } from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../../config/database';
import { taskStatuses, tasks } from '../../../db/schema';
import { logger } from '../../../utils/logger';
import { listTaskStatuses } from '../services/task-status.service';

const VALID_CATEGORIES = new Set(['open', 'done', 'cancelled']);
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function bad(res: Response, msg: string) {
  res.status(400).json({ success: false, error: msg });
}

export async function listStatuses(req: Request, res: Response) {
  try {
    const tenantId = req.auth!.tenantId!;
    const data = await listTaskStatuses(tenantId);
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ error }, 'Failed to list task statuses');
    res.status(500).json({ success: false, error: 'Failed to list statuses' });
  }
}

export async function createStatus(req: Request, res: Response) {
  try {
    const tenantId = req.auth!.tenantId!;
    const { name, category, color, sortOrder } = req.body ?? {};

    if (typeof name !== 'string' || !name.trim()) return bad(res, 'name is required');
    if (typeof category !== 'string' || !VALID_CATEGORIES.has(category)) return bad(res, "category must be 'open' | 'done' | 'cancelled'");
    if (color !== undefined && (typeof color !== 'string' || !HEX_COLOR.test(color))) return bad(res, 'color must be a 6-char hex like #6B7280');

    const [maxSort] = await db
      .select({ max: sql<number>`COALESCE(MAX(${taskStatuses.sortOrder}), -1)` })
      .from(taskStatuses)
      .where(eq(taskStatuses.tenantId, tenantId));
    const nextSort = (maxSort?.max ?? -1) + 1;

    const [created] = await db.insert(taskStatuses).values({
      tenantId,
      name: name.trim(),
      category,
      color: color ?? '#6B7280',
      sortOrder: typeof sortOrder === 'number' ? sortOrder : nextSort,
    }).returning();

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    logger.error({ error }, 'Failed to create task status');
    res.status(500).json({ success: false, error: 'Failed to create status' });
  }
}

export async function updateStatus(req: Request, res: Response) {
  try {
    const tenantId = req.auth!.tenantId!;
    const id = req.params.id as string;
    const { name, category, color, sortOrder } = req.body ?? {};

    const updates: Partial<typeof taskStatuses.$inferInsert> = { updatedAt: new Date() };
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) return bad(res, 'name must be a non-empty string');
      updates.name = name.trim();
    }
    if (category !== undefined) {
      if (typeof category !== 'string' || !VALID_CATEGORIES.has(category)) return bad(res, "category must be 'open' | 'done' | 'cancelled'");
      updates.category = category;
    }
    if (color !== undefined) {
      if (typeof color !== 'string' || !HEX_COLOR.test(color)) return bad(res, 'color must be a 6-char hex like #6B7280');
      updates.color = color;
    }
    if (sortOrder !== undefined) {
      if (typeof sortOrder !== 'number') return bad(res, 'sortOrder must be a number');
      updates.sortOrder = sortOrder;
    }

    const [updated] = await db
      .update(taskStatuses)
      .set(updates)
      .where(and(eq(taskStatuses.id, id), eq(taskStatuses.tenantId, tenantId)))
      .returning();

    if (!updated) {
      res.status(404).json({ success: false, error: 'Status not found' });
      return;
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error({ error }, 'Failed to update task status');
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
}

/**
 * Soft-delete: archive the status. Tasks pointing at it keep their FK
 * (no rewrite on delete). Default-seeded statuses cannot be archived
 * because they're load-bearing for the legacy text column mapping.
 */
export async function archiveStatus(req: Request, res: Response) {
  try {
    const tenantId = req.auth!.tenantId!;
    const id = req.params.id as string;

    const [row] = await db
      .select()
      .from(taskStatuses)
      .where(and(eq(taskStatuses.id, id), eq(taskStatuses.tenantId, tenantId)))
      .limit(1);

    if (!row) {
      res.status(404).json({ success: false, error: 'Status not found' });
      return;
    }
    if (row.legacySlug !== null) {
      res.status(400).json({ success: false, error: 'Default statuses cannot be archived' });
      return;
    }

    // Reassign any tasks pointing at this status to the tenant's default-open
    // status, so they don't disappear from views.
    const [defaultOpen] = await db
      .select({ id: taskStatuses.id })
      .from(taskStatuses)
      .where(and(
        eq(taskStatuses.tenantId, tenantId),
        eq(taskStatuses.legacySlug, 'todo'),
      ))
      .limit(1);

    if (defaultOpen) {
      await db.update(tasks)
        .set({ taskStatusId: defaultOpen.id })
        .where(and(eq(tasks.tenantId, tenantId), eq(tasks.taskStatusId, id)));
    }

    await db
      .update(taskStatuses)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(and(eq(taskStatuses.id, id), eq(taskStatuses.tenantId, tenantId)));

    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to archive task status');
    res.status(500).json({ success: false, error: 'Failed to archive status' });
  }
}

export async function reorderStatuses(req: Request, res: Response) {
  try {
    const tenantId = req.auth!.tenantId!;
    const { ids } = req.body ?? {};

    if (!Array.isArray(ids) || !ids.every((x) => typeof x === 'string')) {
      return bad(res, 'ids must be a string array');
    }

    await db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx.update(taskStatuses)
          .set({ sortOrder: i, updatedAt: new Date() })
          .where(and(eq(taskStatuses.id, ids[i]), eq(taskStatuses.tenantId, tenantId)));
      }
    });

    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to reorder task statuses');
    res.status(500).json({ success: false, error: 'Failed to reorder statuses' });
  }
}
