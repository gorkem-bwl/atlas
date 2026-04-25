import { eq, and } from 'drizzle-orm';
import { db } from '../../config/database';
import { tenants, tenantMembers } from '../../db/schema';
import { logger } from '../../utils/logger';
import type { CreateTenantInput, TenantPlan } from '@atlas-platform/shared';

export async function createTenant(input: CreateTenantInput, ownerId: string) {
  const k8sNamespace = `tenant-${input.slug}`;

  let tenant: typeof tenants.$inferSelect;
  try {
    const [inserted] = await db.insert(tenants).values({
      slug: input.slug,
      name: input.name,
      plan: input.plan ?? 'starter',
      ownerId,
      k8sNamespace,
    }).returning();
    tenant = inserted;
  } catch (err: any) {
    if (err?.code === '23505' || err?.cause?.code === '23505') {
      const friendly = new Error(`A tenant with slug "${input.slug}" already exists.`);
      (friendly as any).code = 'TENANT_SLUG_TAKEN';
      (friendly as any).statusCode = 409;
      throw friendly;
    }
    throw err;
  }

  // Add owner as first member
  await db.insert(tenantMembers).values({
    tenantId: tenant.id,
    userId: ownerId,
    role: 'owner',
  });

  // Seed default apps for the new tenant
  try {
    const { seedDefaultApps } = await import('./tenant-app.service');
    await seedDefaultApps(tenant.id, ownerId);
  } catch (err) {
    logger.warn({ err, tenantId: tenant.id }, 'Failed to seed default apps — apps can be enabled manually');
  }

  // Seed default task statuses (issue #8 phase 2)
  try {
    const { seedDefaultTaskStatuses } = await import('../../apps/work/services/task-status.service');
    await seedDefaultTaskStatuses(tenant.id);
  } catch (err) {
    logger.warn({ err, tenantId: tenant.id }, 'Failed to seed default task statuses');
  }

  logger.info({ tenantId: tenant.id, slug: input.slug }, 'Tenant created');
  return tenant;
}

export async function getTenantById(id: string) {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return tenant ?? null;
}

export async function getTenantBySlug(slug: string) {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  return tenant ?? null;
}

export async function listTenantsForUser(userId: string) {
  const memberships = await db
    .select({
      tenant: tenants,
      role: tenantMembers.role,
    })
    .from(tenantMembers)
    .innerJoin(tenants, eq(tenantMembers.tenantId, tenants.id))
    .where(eq(tenantMembers.userId, userId));

  return memberships.map((m) => ({ ...m.tenant, role: m.role }));
}

export async function getTenantMembership(tenantId: string, userId: string) {
  const [membership] = await db
    .select()
    .from(tenantMembers)
    .where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, userId)))
    .limit(1);
  return membership ?? null;
}

export async function addTenantMember(tenantId: string, userId: string, role: string) {
  await db.insert(tenantMembers).values({ tenantId, userId, role }).onConflictDoNothing();
}

export async function updateTenantName(tenantId: string, name: string) {
  const [updated] = await db
    .update(tenants)
    .set({ name, updatedAt: new Date() })
    .where(eq(tenants.id, tenantId))
    .returning();
  return updated;
}

export async function updateTenantPlan(tenantId: string, plan: TenantPlan) {
  const [updated] = await db
    .update(tenants)
    .set({ plan, updatedAt: new Date() })
    .where(eq(tenants.id, tenantId))
    .returning();
  return updated;
}

export async function updateTenantStorageQuota(tenantId: string, storageQuotaBytes: number) {
  const [updated] = await db
    .update(tenants)
    .set({ storageQuotaBytes, updatedAt: new Date() })
    .where(eq(tenants.id, tenantId))
    .returning();
  return updated;
}
