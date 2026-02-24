import { sql } from 'drizzle-orm';
import { db } from '../config/database';

export async function searchEmails(accountId: string, query: string, limit = 50, offset = 0) {
  const results = await db.execute(sql`
    SELECT
      e.id,
      e.thread_id,
      e.subject,
      e.snippet,
      e.from_address,
      e.from_name,
      e.internal_date,
      ts_rank_cd(
        setweight(to_tsvector('english', COALESCE(e.subject, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(e.from_name, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(e.from_address, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(e.body_text, '')), 'C'),
        plainto_tsquery('english', ${query})
      ) AS rank
    FROM emails e
    WHERE e.account_id = ${accountId}
      AND (
        setweight(to_tsvector('english', COALESCE(e.subject, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(e.from_name, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(e.from_address, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(e.body_text, '')), 'C')
      ) @@ plainto_tsquery('english', ${query})
    ORDER BY rank DESC
    LIMIT ${limit} OFFSET ${offset}
  `);
  return results.rows;
}
