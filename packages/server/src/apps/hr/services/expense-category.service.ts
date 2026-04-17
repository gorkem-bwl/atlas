import { db } from '../../../config/database';
import { hrExpenseCategories } from '../../../db/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import { logger } from '../../../utils/logger';

// ─── Expense Categories ──────────────────────────────────────────

export async function listExpenseCategories(tenantId: string) {
  return db.select().from(hrExpenseCategories)
    .where(and(eq(hrExpenseCategories.tenantId, tenantId), eq(hrExpenseCategories.isArchived, false)))
    .orderBy(asc(hrExpenseCategories.sortOrder));
}

export async function createExpenseCategory(tenantId: string, input: {
  name: string; icon?: string; color?: string; maxAmount?: number | null;
  receiptRequired?: boolean; isActive?: boolean;
}) {
  const now = new Date();
  const [maxSort] = await db
    .select({ max: sql<number>`COALESCE(MAX(${hrExpenseCategories.sortOrder}), -1)` })
    .from(hrExpenseCategories).where(eq(hrExpenseCategories.tenantId, tenantId));
  const sortOrder = (maxSort?.max ?? -1) + 1;

  const [created] = await db.insert(hrExpenseCategories).values({
    tenantId,
    name: input.name,
    icon: input.icon ?? 'receipt',
    color: input.color ?? '#6b7280',
    maxAmount: input.maxAmount ?? null,
    receiptRequired: input.receiptRequired ?? false,
    isActive: input.isActive ?? true,
    sortOrder,
    createdAt: now,
  }).returning();
  return created;
}

export async function updateExpenseCategory(tenantId: string, id: string, input: Partial<{
  name: string; icon: string; color: string; maxAmount: number | null;
  receiptRequired: boolean; isActive: boolean; sortOrder: number;
}>) {
  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) { if (v !== undefined) updates[k] = v; }

  const [updated] = await db.update(hrExpenseCategories).set(updates)
    .where(and(eq(hrExpenseCategories.id, id), eq(hrExpenseCategories.tenantId, tenantId))).returning();
  return updated || null;
}

export async function deleteExpenseCategory(tenantId: string, id: string) {
  const [deleted] = await db.update(hrExpenseCategories)
    .set({ isArchived: true, isActive: false, updatedAt: new Date() })
    .where(and(eq(hrExpenseCategories.id, id), eq(hrExpenseCategories.tenantId, tenantId))).returning();
  return deleted || null;
}

export async function reorderExpenseCategories(tenantId: string, items: { id: string; sortOrder: number }[]) {
  for (const item of items) {
    await db.update(hrExpenseCategories).set({ sortOrder: item.sortOrder })
      .where(and(eq(hrExpenseCategories.id, item.id), eq(hrExpenseCategories.tenantId, tenantId)));
  }
}

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Travel', color: '#3b82f6', icon: 'plane' },
  { name: 'Accommodation', color: '#8b5cf6', icon: 'bed' },
  { name: 'Meals', color: '#f97316', icon: 'utensils' },
  { name: 'Transportation', color: '#10b981', icon: 'car' },
  { name: 'Office Supplies', color: '#6366f1', icon: 'package' },
  { name: 'Software', color: '#0ea5e9', icon: 'monitor' },
  { name: 'Client Entertainment', color: '#ec4899', icon: 'wine' },
  { name: 'Training', color: '#f59e0b', icon: 'graduation-cap' },
  { name: 'Phone/Internet', color: '#6b7280', icon: 'phone' },
  { name: 'Miscellaneous', color: '#9ca3af', icon: 'receipt' },
];

export async function seedExpenseCategories(tenantId: string) {
  const existing = await db.select({ id: hrExpenseCategories.id }).from(hrExpenseCategories)
    .where(eq(hrExpenseCategories.tenantId, tenantId)).limit(1);
  if (existing.length > 0) return null;

  const now = new Date();
  const rows = DEFAULT_EXPENSE_CATEGORIES.map((cat, i) => ({
    tenantId,
    name: cat.name,
    color: cat.color,
    icon: cat.icon,
    sortOrder: i,
    createdAt: now,
  }));

  const created = await db.insert(hrExpenseCategories).values(rows).returning();
  logger.info({ tenantId, count: created.length }, 'Seeded default expense categories');
  return { categories: created };
}
