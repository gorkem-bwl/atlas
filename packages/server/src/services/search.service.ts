import { sql, eq, and } from 'drizzle-orm';
import { db } from '../config/database';
import { threads, emails } from '../db/schema';

// ---------------------------------------------------------------------------
// Search query parser — extracts structured operators from the query string
// ---------------------------------------------------------------------------

interface ParsedQuery {
  from: string | null;
  to: string | null;
  subject: string | null;
  hasAttachment: boolean;
  inMailbox: string | null;   // inbox, sent, trash, spam, archive, starred, drafts
  isFilter: string | null;    // unread, starred, read
  newerThan: string | null;   // e.g. 7d, 2w, 1m
  olderThan: string | null;
  freeText: string;
}

function parseSearchQuery(query: string): ParsedQuery {
  const parsed: ParsedQuery = {
    from: null,
    to: null,
    subject: null,
    hasAttachment: false,
    inMailbox: null,
    isFilter: null,
    newerThan: null,
    olderThan: null,
    freeText: '',
  };

  let remaining = query;

  remaining = remaining.replace(/\bfrom:(\S+)/gi, (_, val) => {
    parsed.from = val;
    return '';
  });

  remaining = remaining.replace(/\bto:(\S+)/gi, (_, val) => {
    parsed.to = val;
    return '';
  });

  // subject: supports quoted strings — subject:"multi word"
  remaining = remaining.replace(/\bsubject:"([^"]+)"/gi, (_, val) => {
    parsed.subject = val;
    return '';
  });
  remaining = remaining.replace(/\bsubject:(\S+)/gi, (_, val) => {
    parsed.subject = val;
    return '';
  });

  remaining = remaining.replace(/\bhas:attachment\b/gi, () => {
    parsed.hasAttachment = true;
    return '';
  });

  remaining = remaining.replace(/\bin:(\S+)/gi, (_, val) => {
    parsed.inMailbox = val.toLowerCase();
    return '';
  });

  remaining = remaining.replace(/\bis:(\S+)/gi, (_, val) => {
    parsed.isFilter = val.toLowerCase();
    return '';
  });

  remaining = remaining.replace(/\bnewer_than:(\S+)/gi, (_, val) => {
    parsed.newerThan = val;
    return '';
  });

  remaining = remaining.replace(/\bolder_than:(\S+)/gi, (_, val) => {
    parsed.olderThan = val;
    return '';
  });

  parsed.freeText = remaining.trim();

  return parsed;
}

function hasOperators(parsed: ParsedQuery): boolean {
  return (
    parsed.from !== null ||
    parsed.to !== null ||
    parsed.subject !== null ||
    parsed.hasAttachment ||
    parsed.inMailbox !== null ||
    parsed.isFilter !== null ||
    parsed.newerThan !== null ||
    parsed.olderThan !== null
  );
}

/** Convert "7d", "2w", "1m" to an ISO date string */
function durationToDate(value: string): string | null {
  const match = value.match(/^(\d+)([dwm])$/);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2];
  const now = Date.now();
  let ms = 0;
  if (unit === 'd') ms = num * 86400000;
  else if (unit === 'w') ms = num * 7 * 86400000;
  else if (unit === 'm') ms = num * 30 * 86400000;
  else return null;
  return new Date(now - ms).toISOString();
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Search emails using structured operators + PostgreSQL full-text search.
 * Supports: from:, to:, subject:, has:attachment, in:, is:, newer_than:, older_than:
 */
export async function searchEmails(accountId: string, query: string, limit = 50, offset = 0) {
  const parsed = parseSearchQuery(query);

  if (hasOperators(parsed)) {
    return searchWithOperators(accountId, parsed, limit, offset);
  }

  // Pure free-text search — use tsvector, fall back to ILIKE
  const ftsResults = await searchViaFTS(accountId, parsed.freeText, limit, offset);
  if (ftsResults.length > 0) return ftsResults;
  return searchViaLike(accountId, parsed.freeText, limit, offset);
}

// ---------------------------------------------------------------------------
// Operator-aware search
// ---------------------------------------------------------------------------

async function searchWithOperators(accountId: string, parsed: ParsedQuery, limit: number, offset: number) {
  const conditions: ReturnType<typeof sql>[] = [];

  // Always scope to the account
  conditions.push(sql`e.account_id = ${accountId}`);

  // from: — match from_address or from_name (case-insensitive ILIKE)
  if (parsed.from) {
    const likeTerm = `%${escapeLike(parsed.from)}%`;
    conditions.push(sql`(e.from_address ILIKE ${likeTerm} OR e.from_name ILIKE ${likeTerm})`);
  }

  // to: — match to_addresses JSONB (cast to text for ILIKE search)
  if (parsed.to) {
    const likeTerm = `%${escapeLike(parsed.to)}%`;
    conditions.push(sql`e.to_addresses::text ILIKE ${likeTerm}`);
  }

  // subject: — match email subject
  if (parsed.subject) {
    const likeTerm = `%${escapeLike(parsed.subject)}%`;
    conditions.push(sql`e.subject ILIKE ${likeTerm}`);
  }

  // is:unread
  if (parsed.isFilter === 'unread') {
    conditions.push(sql`e.is_unread = true`);
  }
  // is:read
  if (parsed.isFilter === 'read') {
    conditions.push(sql`e.is_unread = false`);
  }

  // newer_than:
  if (parsed.newerThan) {
    const cutoff = durationToDate(parsed.newerThan);
    if (cutoff) {
      conditions.push(sql`e.internal_date >= ${cutoff}::timestamptz`);
    }
  }

  // older_than:
  if (parsed.olderThan) {
    const cutoff = durationToDate(parsed.olderThan);
    if (cutoff) {
      conditions.push(sql`e.internal_date <= ${cutoff}::timestamptz`);
    }
  }

  // in:sent — emails with SENT label (JSONB contains)
  if (parsed.inMailbox === 'sent') {
    conditions.push(sql`e.gmail_labels @> '["SENT"]'::jsonb`);
  }

  // Free-text portion: use tsvector to get candidate thread IDs
  let ftsThreadIds: Set<string> | null = null;
  if (parsed.freeText) {
    try {
      const ftsRows = await db
        .select({ threadId: emails.threadId })
        .from(emails)
        .where(
          and(
            eq(emails.accountId, accountId),
            sql`${emails.searchVector} @@ websearch_to_tsquery('english', ${parsed.freeText})`,
          ),
        )
        .limit(1000);

      if (ftsRows.length > 0) {
        ftsThreadIds = new Set(ftsRows.map((r) => r.threadId));
      }
    } catch {
      // FTS syntax error — fall through to ILIKE
    }

    // If FTS didn't work, add ILIKE conditions for free text
    if (!ftsThreadIds) {
      const likeTerm = `%${escapeLike(parsed.freeText)}%`;
      conditions.push(sql`(
        e.subject ILIKE ${likeTerm}
        OR e.from_name ILIKE ${likeTerm}
        OR e.from_address ILIKE ${likeTerm}
        OR e.body_text ILIKE ${likeTerm}
      )`);
    }
  }

  // Execute the email query to get candidate thread IDs using Drizzle
  const whereClause = conditions.length > 0
    ? sql.join(conditions, sql` AND `)
    : sql`true`;

  const candidateRows = await db.execute(sql`
    SELECT DISTINCT e.thread_id
    FROM emails e
    WHERE ${whereClause}
    LIMIT 500
  `) as { rows: Array<{ thread_id: string }> };

  let threadIds = (candidateRows.rows || []).map((r: any) => r.thread_id);

  // Intersect with FTS results if we had free text
  if (ftsThreadIds) {
    threadIds = threadIds.filter((id: string) => ftsThreadIds!.has(id));
  }

  if (threadIds.length === 0) return [];

  // Step 2: Apply thread-level filters and fetch results
  return fetchThreadsWithFilters(accountId, threadIds, parsed, limit, offset);
}

// ---------------------------------------------------------------------------
// Thread-level filtering + fetch
// ---------------------------------------------------------------------------

async function fetchThreadsWithFilters(
  accountId: string,
  threadIds: string[],
  parsed: ParsedQuery,
  limit: number,
  offset: number,
) {
  const conditions: ReturnType<typeof sql>[] = [];

  conditions.push(sql`t.account_id = ${accountId}`);
  conditions.push(sql`t.id = ANY(${threadIds}::uuid[])`);

  // has:attachment
  if (parsed.hasAttachment) {
    conditions.push(sql`t.has_attachments = true`);
  }

  // is:starred
  if (parsed.isFilter === 'starred') {
    conditions.push(sql`t.is_starred = true`);
  }

  // in:inbox
  if (parsed.inMailbox === 'inbox') {
    conditions.push(sql`t.is_archived = false AND t.is_trashed = false AND t.is_spam = false`);
  }

  // in:archive
  if (parsed.inMailbox === 'archive') {
    conditions.push(sql`t.is_archived = true`);
  }

  // in:trash
  if (parsed.inMailbox === 'trash') {
    conditions.push(sql`t.is_trashed = true`);
  }

  // in:spam
  if (parsed.inMailbox === 'spam') {
    conditions.push(sql`t.is_spam = true`);
  }

  // in:starred
  if (parsed.inMailbox === 'starred') {
    conditions.push(sql`t.is_starred = true`);
  }

  const whereClause = sql.join(conditions, sql` AND `);

  const threadResult = await db.execute(sql`
    SELECT t.*
    FROM threads t
    WHERE ${whereClause}
    ORDER BY t.last_message_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `) as { rows: any[] };

  const threadRows = threadResult.rows || [];
  if (threadRows.length === 0) return [];

  // Attach sender info
  const resultThreadIds = threadRows.map((t: any) => t.id);

  const senderResult = await db.execute(sql`
    SELECT e.thread_id, e.from_address, e.from_name
    FROM emails e
    WHERE e.account_id = ${accountId}
      AND e.thread_id = ANY(${resultThreadIds}::uuid[])
      AND e.internal_date = (
        SELECT MIN(e2.internal_date) FROM emails e2 WHERE e2.thread_id = e.thread_id
      )
  `) as { rows: Array<{ thread_id: string; from_address: string; from_name: string | null }> };

  const senderByThread = new Map(
    (senderResult.rows || []).map((e: any) => [e.thread_id, { fromAddress: e.from_address, fromName: e.from_name }]),
  );

  return threadRows.map((t: any) => {
    const sender = senderByThread.get(t.id);
    return {
      ...mapRawThread(t),
      senderName: sender?.fromName || sender?.fromAddress || null,
      senderEmail: sender?.fromAddress || null,
    };
  });
}

/** Map raw PG row to the shape expected by the client */
function mapRawThread(row: any) {
  return {
    id: row.id,
    accountId: row.account_id,
    gmailThreadId: row.gmail_thread_id,
    subject: row.subject,
    snippet: row.snippet,
    messageCount: row.message_count,
    unreadCount: row.unread_count,
    hasAttachments: row.has_attachments,
    lastMessageAt: row.last_message_at,
    category: row.category,
    labels: row.labels,
    isStarred: row.is_starred,
    isArchived: row.is_archived,
    isTrashed: row.is_trashed,
    isSpam: row.is_spam,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// tsvector-powered search (pure free-text only)
// ---------------------------------------------------------------------------

async function searchViaFTS(accountId: string, query: string, limit: number, offset: number) {
  if (!query.trim()) return [];

  try {
    const matchedEmails = await db
      .selectDistinct({ threadId: emails.threadId })
      .from(emails)
      .where(
        and(
          eq(emails.accountId, accountId),
          sql`${emails.searchVector} @@ websearch_to_tsquery('english', ${query})`,
        ),
      )
      .limit(500);

    if (matchedEmails.length === 0) return [];

    const threadIds = matchedEmails.map((r) => r.threadId);
    return fetchThreadsWithSenders(accountId, threadIds, limit, offset);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// ILIKE fallback (for emails not yet indexed or FTS parse error)
// ---------------------------------------------------------------------------

async function searchViaLike(accountId: string, query: string, limit: number, offset: number) {
  const likeTerm = `%${escapeLike(query)}%`;

  const matchingRows = await db
    .selectDistinct({ threadId: emails.threadId })
    .from(emails)
    .where(
      and(
        eq(emails.accountId, accountId),
        sql`(
          ${emails.subject} ILIKE ${likeTerm}
          OR ${emails.fromName} ILIKE ${likeTerm}
          OR ${emails.fromAddress} ILIKE ${likeTerm}
          OR ${emails.bodyText} ILIKE ${likeTerm}
        )`,
      ),
    )
    .limit(500);

  if (matchingRows.length === 0) return [];

  const threadIds = matchingRows.map((r) => r.threadId);
  return fetchThreadsWithSenders(accountId, threadIds, limit, offset);
}

function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Shared: fetch threads + sender info (for pure free-text results)
// ---------------------------------------------------------------------------

async function fetchThreadsWithSenders(accountId: string, threadIds: string[], limit: number, offset: number) {
  const threadRows = await db
    .select()
    .from(threads)
    .where(
      and(
        eq(threads.accountId, accountId),
        sql`${threads.id} = ANY(${threadIds}::uuid[])`,
      ),
    )
    .orderBy(sql`${threads.lastMessageAt} DESC`)
    .limit(limit)
    .offset(offset);

  const resultThreadIds = threadRows.map((t) => t.id);
  if (resultThreadIds.length === 0) return [];

  const firstEmailRows = await db
    .select({
      threadId: emails.threadId,
      fromAddress: emails.fromAddress,
      fromName: emails.fromName,
      internalDate: emails.internalDate,
    })
    .from(emails)
    .where(
      and(
        eq(emails.accountId, accountId),
        sql`${emails.threadId} = ANY(${resultThreadIds}::uuid[])`,
        sql`${emails.internalDate} = (
          SELECT MIN(e2.internal_date) FROM emails e2 WHERE e2.thread_id = ${emails.threadId}
        )`,
      ),
    );

  const senderByThread = new Map(
    firstEmailRows.map((e) => [e.threadId, { fromAddress: e.fromAddress, fromName: e.fromName }]),
  );

  return threadRows.map((t) => {
    const sender = senderByThread.get(t.id);
    return {
      ...t,
      senderName: sender?.fromName || sender?.fromAddress || null,
      senderEmail: sender?.fromAddress || null,
    };
  });
}
