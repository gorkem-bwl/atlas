import type { Request, Response } from 'express';
import { z } from 'zod';
import * as aiService from '../services/ai.service';
import { db } from '../config/database';
import { threads, emails, accounts } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';

async function getAccountId(userId: string): Promise<string> {
  const [row] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId)).limit(1);
  return row?.id ?? '';
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const providerConfigSchema = z.object({
  provider: z.string(),
  apiKey: z.string().min(1),
  baseUrl: z.string().optional(),
  model: z.string().optional(),
});

// ---------------------------------------------------------------------------
// POST /api/v1/ai/test-key
// ---------------------------------------------------------------------------

export async function testKey(req: Request, res: Response) {
  try {
    const config = providerConfigSchema.parse(req.body);
    const result = await aiService.testApiKey(config);
    if (result.valid) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/ai/summarize
// ---------------------------------------------------------------------------

const summarizeSchema = z.object({
  threadId: z.string(),
  provider: z.string(),
  apiKey: z.string().min(1),
  baseUrl: z.string().optional(),
  model: z.string().optional(),
});

export async function summarize(req: Request, res: Response) {
  try {
    const { threadId, provider, apiKey, baseUrl, model } = summarizeSchema.parse(req.body);
    const accountId = await getAccountId(req.auth!.userId);

    // Fetch thread + emails
    const [thread] = await db
      .select()
      .from(threads)
      .where(and(eq(threads.id, threadId), eq(threads.accountId, accountId)))
      .limit(1);

    if (!thread) {
      res.status(404).json({ success: false, error: 'Thread not found' });
      return;
    }

    const threadEmails = await db
      .select({
        fromName: emails.fromName,
        fromAddress: emails.fromAddress,
        bodyText: emails.bodyText,
        receivedAt: emails.internalDate,
      })
      .from(emails)
      .where(and(eq(emails.threadId, threadId), eq(emails.accountId, accountId)))
      .orderBy(sql`${emails.internalDate} ASC`);

    if (threadEmails.length === 0) {
      res.status(400).json({ success: false, error: 'No emails in thread' });
      return;
    }

    const summary = await aiService.summarizeThread(
      { provider, apiKey, baseUrl, model },
      thread.subject || '(no subject)',
      threadEmails,
    );

    res.json({ success: true, data: { summary } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/ai/quick-replies
// ---------------------------------------------------------------------------

const quickRepliesSchema = z.object({
  threadId: z.string(),
  provider: z.string(),
  apiKey: z.string().min(1),
  baseUrl: z.string().optional(),
  model: z.string().optional(),
});

export async function quickReplies(req: Request, res: Response) {
  try {
    const { threadId, provider, apiKey, baseUrl, model } = quickRepliesSchema.parse(req.body);
    const accountId = await getAccountId(req.auth!.userId);

    // Get the last email in the thread
    const [thread] = await db
      .select()
      .from(threads)
      .where(and(eq(threads.id, threadId), eq(threads.accountId, accountId)))
      .limit(1);

    if (!thread) {
      res.status(404).json({ success: false, error: 'Thread not found' });
      return;
    }

    const threadEmails = await db
      .select({
        fromName: emails.fromName,
        fromAddress: emails.fromAddress,
        bodyText: emails.bodyText,
      })
      .from(emails)
      .where(and(eq(emails.threadId, threadId), eq(emails.accountId, accountId)))
      .orderBy(sql`${emails.internalDate} DESC`)
      .limit(1);

    if (threadEmails.length === 0) {
      res.status(400).json({ success: false, error: 'No emails in thread' });
      return;
    }

    const lastEmail = threadEmails[0];
    const replies = await aiService.generateQuickReplies(
      { provider, apiKey, baseUrl, model },
      thread.subject || '(no subject)',
      lastEmail.bodyText || '',
      lastEmail.fromName || lastEmail.fromAddress,
    );

    res.json({ success: true, data: { replies } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/ai/write-assist
// ---------------------------------------------------------------------------

const writeAssistSchema = z.object({
  prompt: z.string().min(1),
  provider: z.string(),
  apiKey: z.string().min(1),
  baseUrl: z.string().optional(),
  model: z.string().optional(),
  context: z.object({
    subject: z.string().optional(),
    existingDraft: z.string().optional(),
    threadSnippet: z.string().optional(),
  }).optional(),
});

export async function writeAssist(req: Request, res: Response) {
  try {
    const { prompt, provider, apiKey, baseUrl, model, context } = writeAssistSchema.parse(req.body);

    const result = aiService.assistWriting(
      { provider, apiKey, baseUrl, model },
      prompt,
      context || {},
    );

    // Stream the response
    const stream = (await result).textStream;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');

    for await (const chunk of stream) {
      res.write(chunk);
    }

    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
}
