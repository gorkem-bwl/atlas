import { db } from '../../../config/database';
import {
  projectSettings,
} from '../../../db/schema';
import { eq } from 'drizzle-orm';

// ─── Types ─────────────────────────────────────────────────────────

export type WeekStartDay = 'monday' | 'sunday';
export type ProjectVisibility = 'team' | 'private';

export interface UpdateProjectSettingsInput {
  defaultHourlyRate?: number;
  companyName?: string | null;
  companyAddress?: string | null;
  companyLogo?: string | null;
  weekStartDay?: WeekStartDay;
  defaultProjectVisibility?: ProjectVisibility;
  defaultBillable?: boolean;
  timeRounding?: number;
}

// ─── Settings ───────────────────────────────────────────────────────

export async function getSettings(tenantId: string) {
  const [settings] = await db
    .select()
    .from(projectSettings)
    .where(eq(projectSettings.tenantId, tenantId))
    .limit(1);

  if (settings) return settings;

  // Auto-create a row with defaults so callers always get a stable shape.
  const now = new Date();
  const [created] = await db
    .insert(projectSettings)
    .values({ tenantId, createdAt: now, updatedAt: now })
    .returning();
  return created;
}

export async function updateSettings(tenantId: string, input: UpdateProjectSettingsInput) {
  const now = new Date();

  // Upsert
  const [existing] = await db
    .select()
    .from(projectSettings)
    .where(eq(projectSettings.tenantId, tenantId))
    .limit(1);

  if (!existing) {
    const [created] = await db
      .insert(projectSettings)
      .values({
        tenantId,
        ...input,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return created;
  }

  const updates: Record<string, unknown> = { updatedAt: now };
  if (input.defaultHourlyRate !== undefined) updates.defaultHourlyRate = input.defaultHourlyRate;
  if (input.companyName !== undefined) updates.companyName = input.companyName;
  if (input.companyAddress !== undefined) updates.companyAddress = input.companyAddress;
  if (input.companyLogo !== undefined) updates.companyLogo = input.companyLogo;
  if (input.weekStartDay !== undefined) updates.weekStartDay = input.weekStartDay;
  if (input.defaultProjectVisibility !== undefined) {
    updates.defaultProjectVisibility = input.defaultProjectVisibility;
  }
  if (input.defaultBillable !== undefined) updates.defaultBillable = input.defaultBillable;
  if (input.timeRounding !== undefined) updates.timeRounding = input.timeRounding;

  const [updated] = await db
    .update(projectSettings)
    .set(updates)
    .where(eq(projectSettings.tenantId, tenantId))
    .returning();

  return updated ?? null;
}

// ─── Seed Sample Data ───────────────────────────────────────────────

export async function seedSampleData(_userId: string, _tenantId: string) {
  return { skipped: true };
}
