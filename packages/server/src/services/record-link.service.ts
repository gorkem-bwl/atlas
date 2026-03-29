import { eq, and, or } from 'drizzle-orm';
import { db } from '../config/database';
import { recordLinks } from '../db/schema';

export async function getLinksForRecord(appId: string, recordId: string) {
  return db.select().from(recordLinks)
    .where(or(
      and(eq(recordLinks.sourceAppId, appId), eq(recordLinks.sourceRecordId, recordId)),
      and(eq(recordLinks.targetAppId, appId), eq(recordLinks.targetRecordId, recordId)),
    ));
}

export async function createLink(data: {
  tenantId?: string;
  sourceAppId: string;
  sourceRecordId: string;
  targetAppId: string;
  targetRecordId: string;
  linkType?: string;
  metadata?: Record<string, unknown>;
  createdBy: string;
}) {
  const [link] = await db.insert(recordLinks).values({
    tenantId: data.tenantId,
    sourceAppId: data.sourceAppId,
    sourceRecordId: data.sourceRecordId,
    targetAppId: data.targetAppId,
    targetRecordId: data.targetRecordId,
    linkType: data.linkType ?? 'related',
    metadata: data.metadata ?? {},
    createdBy: data.createdBy,
  }).returning();
  return link;
}

export async function deleteLink(id: string) {
  const [deleted] = await db.delete(recordLinks)
    .where(eq(recordLinks.id, id))
    .returning();
  return deleted ?? null;
}
