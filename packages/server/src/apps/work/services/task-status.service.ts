import { eq, and, asc } from 'drizzle-orm';
import { db } from '../../../config/database';
import { taskStatuses } from '../../../db/schema';

export interface TaskStatusRow {
  id: string;
  tenantId: string;
  name: string;
  category: 'open' | 'done' | 'cancelled';
  color: string;
  legacySlug: string | null;
  isDefault: boolean;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

// Single source of truth for the four built-in task statuses. The
// idempotent SQL seed in bootstrap.ts must keep its (name, category,
// color, legacy_slug, is_default, sort_order) VALUES list in sync with
// this array — both seed paths exist because the SQL one runs against
// pre-existing tenants on upgrade and this one runs for new tenants.
export const DEFAULT_TASK_STATUSES = [
  { name: 'To Do',       category: 'open' as const,      color: '#6B7280', legacySlug: 'todo',      isDefault: true,  sortOrder: 0 },
  { name: 'In Progress', category: 'open' as const,      color: '#3B82F6', legacySlug: null,        isDefault: false, sortOrder: 1 },
  { name: 'Done',        category: 'done' as const,      color: '#10B981', legacySlug: 'completed', isDefault: true,  sortOrder: 2 },
  { name: 'Cancelled',   category: 'cancelled' as const, color: '#9CA3AF', legacySlug: 'cancelled', isDefault: false, sortOrder: 3 },
];

/**
 * Seed the four built-in task statuses for a brand-new tenant.
 * Idempotent — does nothing if any status already exists for the tenant.
 */
export async function seedDefaultTaskStatuses(tenantId: string): Promise<void> {
  const existing = await db
    .select({ id: taskStatuses.id })
    .from(taskStatuses)
    .where(eq(taskStatuses.tenantId, tenantId))
    .limit(1);
  if (existing.length > 0) return;

  await db.insert(taskStatuses).values(
    DEFAULT_TASK_STATUSES.map((s) => ({ tenantId, ...s })),
  );
}

/**
 * Resolve a legacy status slug ('todo' | 'completed' | 'cancelled') to
 * the tenant's matching task_statuses row. Returns null if no row maps —
 * which can happen if the tenant deleted their default status, in which
 * case the dual-write skips and the text column stays the source of truth.
 */
export async function resolveStatusIdBySlug(
  tenantId: string,
  legacySlug: string,
): Promise<string | null> {
  const [row] = await db
    .select({ id: taskStatuses.id })
    .from(taskStatuses)
    .where(and(
      eq(taskStatuses.tenantId, tenantId),
      eq(taskStatuses.legacySlug, legacySlug),
    ))
    .limit(1);
  return row?.id ?? null;
}

export async function listTaskStatuses(tenantId: string): Promise<TaskStatusRow[]> {
  const rows = await db
    .select()
    .from(taskStatuses)
    .where(and(
      eq(taskStatuses.tenantId, tenantId),
      eq(taskStatuses.isArchived, false),
    ))
    .orderBy(asc(taskStatuses.sortOrder));

  return rows.map((r) => ({
    id: r.id,
    tenantId: r.tenantId,
    name: r.name,
    category: r.category as TaskStatusRow['category'],
    color: r.color,
    legacySlug: r.legacySlug,
    isDefault: r.isDefault,
    sortOrder: r.sortOrder,
    isArchived: r.isArchived,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}
