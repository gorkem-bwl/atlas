import { db } from '../../../config/database';
import {
  projectSettings,
} from '../../../db/schema';
import { eq, sql } from 'drizzle-orm';

// ─── Settings ───────────────────────────────────────────────────────

export async function getSettings(tenantId: string) {
  const [settings] = await db
    .select()
    .from(projectSettings)
    .where(eq(projectSettings.tenantId, tenantId))
    .limit(1);

  return settings || null;
}

export async function updateSettings(tenantId: string, input: {
  defaultHourlyRate?: number;
  companyName?: string | null;
  companyAddress?: string | null;
  companyLogo?: string | null;
}) {
  const now = new Date();

  // Upsert
  let [existing] = await db
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

  const [updated] = await db
    .update(projectSettings)
    .set(updates)
    .where(eq(projectSettings.tenantId, tenantId))
    .returning();

  return updated ?? null;
}

// ─── Seed Sample Data ───────────────────────────────────────────────

export async function seedSampleData(userId: string, tenantId: string) {
  return { skipped: true };
}
