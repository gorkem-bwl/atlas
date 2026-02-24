import { eq, and, desc } from 'drizzle-orm';
import { db } from '../config/database';
import { threads, emails } from '../db/schema';

export async function getThreads(accountId: string, options: { category?: string; limit?: number; offset?: number }) {
  const conditions = [
    eq(threads.accountId, accountId),
    eq(threads.isArchived, false),
    eq(threads.isTrashed, false),
    eq(threads.isSpam, false),
  ];
  if (options.category) {
    conditions.push(eq(threads.category, options.category));
  }

  const result = await db.select()
    .from(threads)
    .where(and(...conditions))
    .orderBy(desc(threads.lastMessageAt))
    .limit(options.limit || 50)
    .offset(options.offset || 0);

  return result;
}

export async function getThreadById(accountId: string, threadId: string) {
  const [thread] = await db.select()
    .from(threads)
    .where(and(eq(threads.id, threadId), eq(threads.accountId, accountId)))
    .limit(1);

  if (!thread) return null;

  const threadEmails = await db.select()
    .from(emails)
    .where(eq(emails.threadId, threadId))
    .orderBy(emails.internalDate);

  return { ...thread, emails: threadEmails };
}

export async function archiveThread(accountId: string, threadId: string) {
  await db.update(threads)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(and(eq(threads.id, threadId), eq(threads.accountId, accountId)));
}

export async function trashThread(accountId: string, threadId: string) {
  await db.update(threads)
    .set({ isTrashed: true, updatedAt: new Date() })
    .where(and(eq(threads.id, threadId), eq(threads.accountId, accountId)));
}

export async function toggleStar(accountId: string, threadId: string) {
  const [thread] = await db.select({ isStarred: threads.isStarred })
    .from(threads)
    .where(and(eq(threads.id, threadId), eq(threads.accountId, accountId)))
    .limit(1);

  if (thread) {
    await db.update(threads)
      .set({ isStarred: !thread.isStarred, updatedAt: new Date() })
      .where(and(eq(threads.id, threadId), eq(threads.accountId, accountId)));
  }
}
