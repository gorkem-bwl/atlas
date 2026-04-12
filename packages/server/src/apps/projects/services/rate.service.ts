import { db } from '../../../config/database';
import { projectRates } from '../../../db/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import { logger } from '../../../utils/logger';

// ─── Input types ────────────────────────────────────────────────────

interface CreateRateInput {
  title: string;
  factor?: number;
  extraPerHour?: number;
}

interface UpdateRateInput {
  title?: string;
  factor?: number;
  extraPerHour?: number;
  sortOrder?: number;
}

// ─── Rates ──────────────────────────────────────────────────────────

export async function listRates(tenantId: string) {
  return db
    .select()
    .from(projectRates)
    .where(and(eq(projectRates.tenantId, tenantId), eq(projectRates.isArchived, false)))
    .orderBy(asc(projectRates.sortOrder));
}

export async function createRate(tenantId: string, input: CreateRateInput) {
  const now = new Date();
  const [maxSort] = await db
    .select({ max: sql<number>`COALESCE(MAX(${projectRates.sortOrder}), -1)` })
    .from(projectRates)
    .where(eq(projectRates.tenantId, tenantId));

  const sortOrder = (maxSort?.max ?? -1) + 1;

  const [created] = await db
    .insert(projectRates)
    .values({
      tenantId,
      title: input.title,
      factor: input.factor ?? 1,
      extraPerHour: input.extraPerHour ?? 0,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  logger.info({ tenantId, rateId: created.id }, 'Project rate created');
  return created;
}

export async function updateRate(tenantId: string, rateId: string, input: UpdateRateInput) {
  const now = new Date();
  const updates: Record<string, unknown> = { updatedAt: now };

  if (input.title !== undefined) updates.title = input.title;
  if (input.factor !== undefined) updates.factor = input.factor;
  if (input.extraPerHour !== undefined) updates.extraPerHour = input.extraPerHour;
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;

  const [updated] = await db
    .update(projectRates)
    .set(updates)
    .where(and(eq(projectRates.id, rateId), eq(projectRates.tenantId, tenantId)))
    .returning();

  return updated ?? null;
}

export async function deleteRate(tenantId: string, rateId: string) {
  const now = new Date();
  const [updated] = await db
    .update(projectRates)
    .set({ isArchived: true, updatedAt: now })
    .where(and(eq(projectRates.id, rateId), eq(projectRates.tenantId, tenantId)))
    .returning();

  return updated ?? null;
}
