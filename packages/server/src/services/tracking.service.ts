import { eq, and, sql, inArray } from 'drizzle-orm';
import { db } from '../config/database';
import { emailTracking, trackingEvents } from '../db/schema';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import type { ThreadTrackingStats } from '@atlasmail/shared';

// 1x1 transparent GIF (43 bytes)
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

export function getTrackingPixelBuffer(): Buffer {
  return TRANSPARENT_GIF;
}

// ─── Create tracking record ──────────────────────────────────────────

export async function createTrackingRecord(
  accountId: string,
  threadId: string | undefined,
  subject: string | undefined,
  recipientAddress: string,
): Promise<string> {
  const [record] = await db.insert(emailTracking).values({
    accountId,
    threadId: threadId || null,
    subject: subject || null,
    recipientAddress,
  }).returning({ trackingId: emailTracking.trackingId });

  return record.trackingId;
}

// ─── HTML processing ─────────────────────────────────────────────────

export function buildTrackingPixelUrl(trackingId: string): string {
  return `${env.SERVER_PUBLIC_URL}/t/o/${trackingId}`;
}

export function buildClickTrackingUrl(trackingId: string, originalUrl: string): string {
  return `${env.SERVER_PUBLIC_URL}/t/c/${trackingId}?u=${encodeURIComponent(originalUrl)}`;
}

export function injectTrackingPixel(html: string, trackingId: string): string {
  const pixelUrl = buildTrackingPixelUrl(trackingId);
  const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />`;

  // Insert before </body> if present, otherwise append
  const bodyCloseIndex = html.lastIndexOf('</body>');
  if (bodyCloseIndex !== -1) {
    return html.slice(0, bodyCloseIndex) + pixel + html.slice(bodyCloseIndex);
  }
  return html + pixel;
}

export function rewriteLinks(html: string, trackingId: string): string {
  // Match <a ...href="..."...> — capture the href value
  return html.replace(
    /(<a\s[^>]*href=["'])([^"']+)(["'][^>]*>)/gi,
    (_match, prefix: string, url: string, suffix: string) => {
      // Skip mailto:, tel:, #anchors, javascript:, and data: URLs
      const trimmedUrl = url.trim().toLowerCase();
      if (
        trimmedUrl.startsWith('mailto:') ||
        trimmedUrl.startsWith('tel:') ||
        trimmedUrl.startsWith('#') ||
        trimmedUrl.startsWith('javascript:') ||
        trimmedUrl.startsWith('data:')
      ) {
        return `${prefix}${url}${suffix}`;
      }

      const trackedUrl = buildClickTrackingUrl(trackingId, url);
      return `${prefix}${trackedUrl}${suffix}`;
    },
  );
}

export function processHtmlForTracking(html: string, trackingId: string): string {
  const withLinks = rewriteLinks(html, trackingId);
  return injectTrackingPixel(withLinks, trackingId);
}

// ─── Record events ───────────────────────────────────────────────────

export async function recordOpenEvent(
  trackingId: string,
  ipAddress: string | undefined,
  userAgent: string | undefined,
): Promise<void> {
  try {
    await db.insert(trackingEvents).values({
      trackingId,
      eventType: 'open',
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });

    await db.update(emailTracking)
      .set({
        openCount: sql`${emailTracking.openCount} + 1`,
        firstOpenedAt: sql`COALESCE(${emailTracking.firstOpenedAt}, ${new Date()})`,
        lastOpenedAt: new Date(),
      })
      .where(eq(emailTracking.trackingId, trackingId));
  } catch (error) {
    logger.error({ error, trackingId }, 'Failed to record open event');
  }
}

export async function recordClickEvent(
  trackingId: string,
  linkUrl: string,
  ipAddress: string | undefined,
  userAgent: string | undefined,
): Promise<void> {
  try {
    await db.insert(trackingEvents).values({
      trackingId,
      eventType: 'click',
      linkUrl,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });

    await db.update(emailTracking)
      .set({
        clickCount: sql`${emailTracking.clickCount} + 1`,
      })
      .where(eq(emailTracking.trackingId, trackingId));
  } catch (error) {
    logger.error({ error, trackingId }, 'Failed to record click event');
  }
}

// ─── Query stats ─────────────────────────────────────────────────────

export async function getThreadTrackingStats(
  accountId: string,
  threadId: string,
): Promise<ThreadTrackingStats> {
  const records = await db.select()
    .from(emailTracking)
    .where(and(
      eq(emailTracking.accountId, accountId),
      eq(emailTracking.threadId, threadId),
    ));

  if (records.length === 0) {
    return { totalOpens: 0, totalClicks: 0, uniqueRecipients: 0, records: [], events: [] };
  }

  const trackingIds = records.map((r) => r.trackingId);

  const events = await db.select()
    .from(trackingEvents)
    .where(inArray(trackingEvents.trackingId, trackingIds))
    .orderBy(trackingEvents.createdAt);

  const totalOpens = records.reduce((sum, r) => sum + r.openCount, 0);
  const totalClicks = records.reduce((sum, r) => sum + r.clickCount, 0);
  const uniqueRecipients = new Set(records.map((r) => r.recipientAddress)).size;

  return {
    totalOpens,
    totalClicks,
    uniqueRecipients,
    records: records.map((r) => ({
      id: r.id,
      trackingId: r.trackingId,
      emailId: r.emailId,
      threadId: r.threadId,
      subject: r.subject,
      recipientAddress: r.recipientAddress,
      openCount: r.openCount,
      clickCount: r.clickCount,
      firstOpenedAt: r.firstOpenedAt?.toISOString() ?? null,
      lastOpenedAt: r.lastOpenedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
    events: events.map((e) => ({
      id: e.id,
      trackingId: e.trackingId,
      eventType: e.eventType as 'open' | 'click',
      linkUrl: e.linkUrl,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}
