import { google } from 'googleapis';
import { getAuthenticatedClient } from './google-auth';
import { db } from '../config/database';
import { accounts, threads, emails, attachments } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { sleep, withRetry } from '../utils/retry';

// ─── Helpers ───────────────────────────────────────────────────────────

interface ParsedAddress {
  name: string;
  address: string;
}

function parseEmailAddress(header: string): ParsedAddress {
  if (!header) return { name: '', address: '' };
  const match = header.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].replace(/^["']|["']$/g, '').trim(), address: match[2].trim().toLowerCase() };
  }
  return { name: '', address: header.trim().toLowerCase() };
}

function parseAddressList(header: string | undefined): ParsedAddress[] {
  if (!header) return [];
  // Split on commas but not commas inside angle brackets or quotes
  const parts: string[] = [];
  let current = '';
  let inAngle = false;
  let inQuote = false;
  for (const ch of header) {
    if (ch === '"') inQuote = !inQuote;
    if (ch === '<' && !inQuote) inAngle = true;
    if (ch === '>' && !inQuote) inAngle = false;
    if (ch === ',' && !inAngle && !inQuote) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts.map(parseEmailAddress).filter((a) => a.address);
}

function getHeader(headers: Array<{ name?: string | null; value?: string | null }>, name: string): string | undefined {
  const found = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return found?.value ?? undefined;
}

function extractBody(payload: any): { text: string; html: string } {
  let text = '';
  let html = '';

  function walk(part: any) {
    if (!part) return;
    const mimeType = part.mimeType || '';

    if (mimeType === 'text/plain' && part.body?.data && !text) {
      text = Buffer.from(part.body.data, 'base64url').toString('utf-8');
    }
    if (mimeType === 'text/html' && part.body?.data && !html) {
      html = Buffer.from(part.body.data, 'base64url').toString('utf-8');
    }

    if (part.parts) {
      for (const child of part.parts) {
        walk(child);
      }
    }
  }

  walk(payload);
  return { text, html };
}

function extractAttachments(payload: any): Array<{ filename: string; mimeType: string; size: number; attachmentId: string; contentId?: string; isInline: boolean }> {
  const results: Array<{ filename: string; mimeType: string; size: number; attachmentId: string; contentId?: string; isInline: boolean }> = [];

  function walk(part: any) {
    if (!part) return;
    if (part.filename && part.body?.attachmentId) {
      results.push({
        filename: part.filename,
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body.size || 0,
        attachmentId: part.body.attachmentId,
        contentId: part.headers?.find((h: any) => h.name.toLowerCase() === 'content-id')?.value?.replace(/[<>]/g, ''),
        isInline: !!(part.headers?.find((h: any) => h.name.toLowerCase() === 'content-disposition')?.value?.includes('inline')),
      });
    }
    if (part.parts) {
      for (const child of part.parts) {
        walk(child);
      }
    }
  }

  walk(payload);
  return results;
}

// withRetry and sleep are imported from ../utils/retry

// ─── Full Sync ─────────────────────────────────────────────────────────

export async function performFullSync(accountId: string) {
  logger.info({ accountId }, 'Starting full email sync');

  try {
    // Mark account as syncing
    await db.update(accounts).set({ syncStatus: 'syncing', syncError: null, updatedAt: new Date() })
      .where(eq(accounts.id, accountId));

    const client = await getAuthenticatedClient(accountId);
    const gmail = google.gmail({ version: 'v1', auth: client });

    // Get profile for historyId
    const profile = await withRetry(() => gmail.users.getProfile({ userId: 'me' }), 'Gmail API');
    const latestHistoryId = Number(profile.data.historyId);

    // Paginate through all messages
    let pageToken: string | undefined;
    let totalProcessed = 0;

    do {
      const listRes = await withRetry(() =>
        gmail.users.messages.list({
          userId: 'me',
          maxResults: 500,
          pageToken,
        }),
        'Gmail API',
      );

      const messageIds = listRes.data.messages?.map((m) => m.id!) ?? [];
      pageToken = listRes.data.nextPageToken ?? undefined;

      // Process in batches of 50
      for (let i = 0; i < messageIds.length; i += 50) {
        const batch = messageIds.slice(i, i + 50);
        await Promise.all(batch.map((msgId) => fetchAndUpsertMessage(gmail, accountId, msgId)));
        totalProcessed += batch.length;

        // Small delay between batches to avoid rate limits
        if (i + 50 < messageIds.length) {
          await sleep(100);
        }
      }
    } while (pageToken);

    // Update account with sync completion
    const now = new Date();
    await db.update(accounts).set({
      historyId: latestHistoryId,
      lastFullSync: now,
      lastSync: now,
      syncStatus: 'active',
      syncError: null,
      updatedAt: now,
    }).where(eq(accounts.id, accountId));

    logger.info({ accountId, totalProcessed }, 'Full email sync completed');
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error, accountId }, 'Full email sync failed');
    await db.update(accounts).set({
      syncStatus: 'error',
      syncError: errorMessage,
      updatedAt: new Date(),
    }).where(eq(accounts.id, accountId));
    throw error;
  }
}

// ─── Incremental Sync ──────────────────────────────────────────────────

export async function performIncrementalSync(accountId: string) {
  logger.info({ accountId }, 'Starting incremental email sync');

  try {
    // Get current historyId
    const [account] = await db.select({ historyId: accounts.historyId })
      .from(accounts).where(eq(accounts.id, accountId)).limit(1);

    if (!account?.historyId) {
      logger.info({ accountId }, 'No historyId found, falling back to full sync');
      return performFullSync(accountId);
    }

    const client = await getAuthenticatedClient(accountId);
    const gmail = google.gmail({ version: 'v1', auth: client });

    let pageToken: string | undefined;
    let latestHistoryId = account.historyId;

    do {
      let historyRes;
      try {
        historyRes = await withRetry(() =>
          gmail.users.history.list({
            userId: 'me',
            startHistoryId: String(account.historyId),
            pageToken,
          }),
          'Gmail API',
        );
      } catch (err: any) {
        // 404 means historyId is too old
        if (err?.code === 404 || err?.code === 410) {
          logger.warn({ accountId }, 'History ID expired, falling back to full sync');
          return performFullSync(accountId);
        }
        throw err;
      }

      if (historyRes.data.historyId) {
        latestHistoryId = Number(historyRes.data.historyId);
      }

      const histories = historyRes.data.history ?? [];
      pageToken = historyRes.data.nextPageToken ?? undefined;

      for (const history of histories) {
        // Handle added messages
        if (history.messagesAdded) {
          for (const added of history.messagesAdded) {
            if (added.message?.id) {
              await fetchAndUpsertMessage(gmail, accountId, added.message.id);
            }
          }
        }

        // Handle deleted messages
        if (history.messagesDeleted) {
          for (const deleted of history.messagesDeleted) {
            if (deleted.message?.id) {
              // Mark as archived rather than deleting
              await db.update(emails).set({ updatedAt: new Date() })
                .where(sql`${emails.accountId} = ${accountId} AND ${emails.gmailMessageId} = ${deleted.message.id}`);
            }
          }
        }

        // Handle label changes
        if (history.labelsAdded) {
          for (const change of history.labelsAdded) {
            if (change.message?.id && change.labelIds) {
              await fetchAndUpsertMessage(gmail, accountId, change.message.id);
            }
          }
        }

        if (history.labelsRemoved) {
          for (const change of history.labelsRemoved) {
            if (change.message?.id && change.labelIds) {
              await fetchAndUpsertMessage(gmail, accountId, change.message.id);
            }
          }
        }
      }
    } while (pageToken);

    // Update sync metadata
    const now = new Date();
    await db.update(accounts).set({
      historyId: latestHistoryId,
      lastSync: now,
      updatedAt: now,
    }).where(eq(accounts.id, accountId));

    logger.info({ accountId, latestHistoryId }, 'Incremental email sync completed');
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error, accountId }, 'Incremental email sync failed');
    await db.update(accounts).set({
      syncStatus: 'error',
      syncError: errorMessage,
      updatedAt: new Date(),
    }).where(eq(accounts.id, accountId));
    throw error;
  }
}

// ─── Fetch and upsert a single message ─────────────────────────────────

async function fetchAndUpsertMessage(gmail: ReturnType<typeof google.gmail>, accountId: string, messageId: string) {
  try {
    const msgRes = await withRetry(() =>
      gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' }),
      'Gmail API',
    );

    const msg = msgRes.data;
    if (!msg.id || !msg.threadId) return;

    const headers = (msg.payload?.headers ?? []) as Array<{ name?: string | null; value?: string | null }>;
    const fromHeader = getHeader(headers, 'From') ?? '';
    const toHeader = getHeader(headers, 'To');
    const ccHeader = getHeader(headers, 'Cc');
    const subject = getHeader(headers, 'Subject') ?? '';
    const messageIdHeader = getHeader(headers, 'Message-ID');
    const inReplyTo = getHeader(headers, 'In-Reply-To');

    const fromParsed = parseEmailAddress(fromHeader);
    const toAddresses = parseAddressList(toHeader);
    const ccAddresses = parseAddressList(ccHeader);

    const { text: bodyText, html: bodyHtml } = extractBody(msg.payload);
    const attachmentMeta = extractAttachments(msg.payload);

    const gmailLabels = msg.labelIds ?? [];
    const internalDate = new Date(Number(msg.internalDate));
    const isUnread = gmailLabels.includes('UNREAD');
    const isStarred = gmailLabels.includes('STARRED');
    const isDraft = gmailLabels.includes('DRAFT');

    // Determine category from labels
    let category = 'other';
    if (gmailLabels.includes('CATEGORY_PRIMARY')) category = 'primary';
    else if (gmailLabels.includes('CATEGORY_SOCIAL')) category = 'social';
    else if (gmailLabels.includes('CATEGORY_PROMOTIONS')) category = 'promotions';
    else if (gmailLabels.includes('CATEGORY_UPDATES')) category = 'updates';
    else if (gmailLabels.includes('CATEGORY_FORUMS')) category = 'forums';
    else if (gmailLabels.includes('INBOX')) category = 'primary';

    // Upsert thread
    const threadValues = {
      accountId,
      gmailThreadId: msg.threadId,
      subject,
      snippet: msg.snippet ?? null,
      messageCount: 1,
      unreadCount: isUnread ? 1 : 0,
      hasAttachments: attachmentMeta.length > 0,
      lastMessageAt: internalDate,
      category,
      labels: gmailLabels,
      isStarred,
      isArchived: !gmailLabels.includes('INBOX'),
      isTrashed: gmailLabels.includes('TRASH'),
      isSpam: gmailLabels.includes('SPAM'),
      updatedAt: new Date(),
    };

    const [thread] = await db.insert(threads)
      .values({ ...threadValues, createdAt: new Date() })
      .onConflictDoUpdate({
        target: [threads.accountId, threads.gmailThreadId],
        set: threadValues,
      })
      .returning({ id: threads.id });

    if (!thread) return;

    // Upsert email
    const emailValues = {
      accountId,
      threadId: thread.id,
      gmailMessageId: msg.id,
      messageIdHeader: messageIdHeader ?? null,
      inReplyTo: inReplyTo ?? null,
      fromAddress: fromParsed.address,
      fromName: fromParsed.name || null,
      toAddresses,
      ccAddresses,
      subject,
      snippet: msg.snippet ?? null,
      bodyText: bodyText || null,
      bodyHtml: bodyHtml || null,
      gmailLabels,
      isUnread,
      isStarred,
      isDraft,
      internalDate,
      sizeEstimate: msg.sizeEstimate ?? null,
      updatedAt: new Date(),
    };

    const [upsertedEmail] = await db.insert(emails)
      .values({ ...emailValues, createdAt: new Date() })
      .onConflictDoUpdate({
        target: [emails.accountId, emails.gmailMessageId],
        set: emailValues,
      })
      .returning({ id: emails.id });

    // Upsert attachments
    if (upsertedEmail && attachmentMeta.length > 0) {
      for (const att of attachmentMeta) {
        await db.insert(attachments)
          .values({
            emailId: upsertedEmail.id,
            gmailAttachmentId: att.attachmentId,
            filename: att.filename,
            mimeType: att.mimeType,
            size: att.size,
            contentId: att.contentId ?? null,
            isInline: att.isInline,
            createdAt: new Date(),
          })
          .onConflictDoNothing();
      }
    }
  } catch (err) {
    logger.error({ err, accountId, messageId }, 'Failed to fetch/upsert message');
  }
}
