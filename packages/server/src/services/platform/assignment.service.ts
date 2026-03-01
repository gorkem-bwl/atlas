import { eq, and, inArray } from 'drizzle-orm';
import { getPlatformDb } from '../../config/platform-database';
import { appUserAssignments, appInstallations } from '../../db/schema-platform';
import { logger } from '../../utils/logger';
import type { AppRole } from '@atlasmail/shared';

/**
 * Assign a user to an app installation (upsert — updates role if already assigned).
 */
export async function assignUserToApp(
  installationId: string,
  userId: string,
  appRole: AppRole,
  assignedBy: string,
) {
  const db = getPlatformDb();

  const [existing] = await db
    .select()
    .from(appUserAssignments)
    .where(and(
      eq(appUserAssignments.installationId, installationId),
      eq(appUserAssignments.userId, userId),
    ))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(appUserAssignments)
      .set({ appRole, assignedBy, updatedAt: new Date() })
      .where(eq(appUserAssignments.id, existing.id))
      .returning();
    logger.info({ installationId, userId, appRole }, 'Updated app user assignment');
    return updated;
  }

  const [assignment] = await db
    .insert(appUserAssignments)
    .values({ installationId, userId, appRole, assignedBy })
    .returning();

  logger.info({ installationId, userId, appRole }, 'Assigned user to app');
  return assignment;
}

/**
 * Remove a user's assignment from an app installation.
 */
export async function removeUserFromApp(installationId: string, userId: string) {
  const db = getPlatformDb();
  const result = await db
    .delete(appUserAssignments)
    .where(and(
      eq(appUserAssignments.installationId, installationId),
      eq(appUserAssignments.userId, userId),
    ))
    .returning();

  if (result.length > 0) {
    logger.info({ installationId, userId }, 'Removed user from app');
  }
  return result.length > 0;
}

/**
 * Update a user's role for an app installation.
 */
export async function updateAppRole(installationId: string, userId: string, newRole: AppRole) {
  const db = getPlatformDb();
  const [updated] = await db
    .update(appUserAssignments)
    .set({ appRole: newRole, updatedAt: new Date() })
    .where(and(
      eq(appUserAssignments.installationId, installationId),
      eq(appUserAssignments.userId, userId),
    ))
    .returning();

  if (updated) {
    logger.info({ installationId, userId, newRole }, 'Updated app role');
  }
  return updated ?? null;
}

/**
 * Get a single assignment (or null if user is not assigned).
 */
export async function getAppAssignment(installationId: string, userId: string) {
  const db = getPlatformDb();
  const [assignment] = await db
    .select()
    .from(appUserAssignments)
    .where(and(
      eq(appUserAssignments.installationId, installationId),
      eq(appUserAssignments.userId, userId),
    ))
    .limit(1);

  return assignment ?? null;
}

/**
 * List all users assigned to an app installation.
 */
export async function listAppAssignments(installationId: string) {
  const db = getPlatformDb();
  return db
    .select()
    .from(appUserAssignments)
    .where(eq(appUserAssignments.installationId, installationId));
}

/**
 * List all app assignments for a user within a tenant.
 */
export async function listUserAssignments(tenantId: string, userId: string) {
  const db = getPlatformDb();

  // First get all installations for this tenant
  const installations = await db
    .select({ id: appInstallations.id })
    .from(appInstallations)
    .where(eq(appInstallations.tenantId, tenantId));

  if (installations.length === 0) return [];

  const installationIds = installations.map((i) => i.id);

  return db
    .select()
    .from(appUserAssignments)
    .where(and(
      inArray(appUserAssignments.installationId, installationIds),
      eq(appUserAssignments.userId, userId),
    ));
}

/**
 * Bulk assign multiple users to an app installation.
 */
export async function bulkAssignUsers(
  installationId: string,
  userIds: string[],
  appRole: AppRole,
  assignedBy: string,
) {
  const results = [];
  for (const userId of userIds) {
    const assignment = await assignUserToApp(installationId, userId, appRole, assignedBy);
    results.push(assignment);
  }
  return results;
}

/**
 * Count assignments for an installation.
 */
export async function countAppAssignments(installationId: string): Promise<number> {
  const db = getPlatformDb();
  const rows = await db
    .select({ id: appUserAssignments.id })
    .from(appUserAssignments)
    .where(eq(appUserAssignments.installationId, installationId));
  return rows.length;
}
