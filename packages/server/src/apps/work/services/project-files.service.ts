import { db } from '../../../config/database';
import { recordLinks, driveItems } from '../../../db/schema';
import { eq, and, or, inArray } from 'drizzle-orm';

export async function listProjectFiles(tenantId: string, projectId: string) {
  const links = await db
    .select({
      sourceRecordId: recordLinks.sourceRecordId,
      targetRecordId: recordLinks.targetRecordId,
      sourceAppId: recordLinks.sourceAppId,
      targetAppId: recordLinks.targetAppId,
    })
    .from(recordLinks)
    .where(and(
      eq(recordLinks.tenantId, tenantId),
      or(
        and(eq(recordLinks.sourceAppId, 'work'), eq(recordLinks.sourceRecordId, projectId), eq(recordLinks.targetAppId, 'drive')),
        and(eq(recordLinks.targetAppId, 'work'), eq(recordLinks.targetRecordId, projectId), eq(recordLinks.sourceAppId, 'drive')),
      ),
    ));

  const driveItemIds = links.map(l =>
    l.sourceAppId === 'drive' ? l.sourceRecordId : l.targetRecordId,
  );
  if (driveItemIds.length === 0) return [];

  return db.select().from(driveItems)
    .where(and(eq(driveItems.tenantId, tenantId), inArray(driveItems.id, driveItemIds)));
}

export async function addProjectFile(tenantId: string, projectId: string, driveItemId: string, userId: string) {
  const existing = await db
    .select({ id: recordLinks.id })
    .from(recordLinks)
    .where(and(
      eq(recordLinks.tenantId, tenantId),
      eq(recordLinks.sourceAppId, 'work'),
      eq(recordLinks.sourceRecordId, projectId),
      eq(recordLinks.targetAppId, 'drive'),
      eq(recordLinks.targetRecordId, driveItemId),
    ))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const [link] = await db.insert(recordLinks).values({
    tenantId,
    sourceAppId: 'work',
    sourceRecordId: projectId,
    targetAppId: 'drive',
    targetRecordId: driveItemId,
    createdBy: userId,
  }).returning();

  return link;
}

export async function removeProjectFile(tenantId: string, projectId: string, driveItemId: string) {
  await db.delete(recordLinks).where(and(
    eq(recordLinks.tenantId, tenantId),
    or(
      and(eq(recordLinks.sourceAppId, 'work'), eq(recordLinks.sourceRecordId, projectId), eq(recordLinks.targetAppId, 'drive'), eq(recordLinks.targetRecordId, driveItemId)),
      and(eq(recordLinks.targetAppId, 'work'), eq(recordLinks.targetRecordId, projectId), eq(recordLinks.sourceAppId, 'drive'), eq(recordLinks.sourceRecordId, driveItemId)),
    ),
  ));
}
