import type { Request, Response } from 'express';
import * as threadService from '../services/thread.service';
import { logger } from '../utils/logger';

export async function getThreadCounts(req: Request, res: Response) {
  try {
    const counts = await threadService.getThreadCounts(req.auth!.accountId);
    res.json({ success: true, data: counts });
  } catch (error) {
    logger.error({ error }, 'Failed to get thread counts');
    res.status(500).json({ success: false, error: 'Failed to get thread counts' });
  }
}

export async function listThreads(req: Request, res: Response) {
  try {
    const { mailbox, category, limit, offset, gmailLabel } = req.query;
    const result = await threadService.getThreads(req.auth!.accountId, {
      mailbox: mailbox as string | undefined,
      category: category as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
      gmailLabel: gmailLabel as string | undefined,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error({ error }, 'Failed to list threads');
    res.status(500).json({ success: false, error: 'Failed to fetch threads' });
  }
}

export async function getGmailLabels(req: Request, res: Response) {
  try {
    const labels = await threadService.getGmailLabels(req.auth!.accountId);
    res.json({ success: true, data: labels });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch Gmail labels');
    res.status(500).json({ success: false, error: 'Failed to fetch Gmail labels' });
  }
}

export async function getThread(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const thread = await threadService.getThreadById(req.auth!.accountId, id);
    if (!thread) {
      res.status(404).json({ success: false, error: 'Thread not found' });
      return;
    }
    res.json({ success: true, data: thread });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch thread');
    res.status(500).json({ success: false, error: 'Failed to fetch thread' });
  }
}

export async function archiveThread(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    await threadService.archiveThread(req.auth!.accountId, id);
    res.json({ success: true, data: null });
  } catch (error) {
    logger.error({ error }, 'Failed to archive thread');
    res.status(500).json({ success: false, error: 'Failed to archive thread' });
  }
}

export async function trashThread(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    await threadService.trashThread(req.auth!.accountId, id);
    res.json({ success: true, data: null });
  } catch (error) {
    logger.error({ error }, 'Failed to trash thread');
    res.status(500).json({ success: false, error: 'Failed to trash thread' });
  }
}

export async function starThread(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    await threadService.toggleStar(req.auth!.accountId, id);
    res.json({ success: true, data: null });
  } catch (error) {
    logger.error({ error }, 'Failed to star thread');
    res.status(500).json({ success: false, error: 'Failed to update star' });
  }
}

export async function sendEmail(req: Request, res: Response) {
  try {
    const { to, cc, bcc, subject, bodyHtml, threadId, inReplyTo, trackingEnabled } = req.body;

    if (!to || !Array.isArray(to) || to.length === 0) {
      res.status(400).json({ success: false, error: 'At least one recipient is required' });
      return;
    }
    if (!subject || typeof subject !== 'string') {
      res.status(400).json({ success: false, error: 'Subject is required' });
      return;
    }
    if (!bodyHtml || typeof bodyHtml !== 'string') {
      res.status(400).json({ success: false, error: 'Email body is required' });
      return;
    }

    const result = await threadService.sendEmail(req.auth!.accountId, {
      to,
      cc,
      bcc,
      subject,
      bodyHtml,
      threadId,
      inReplyTo,
      trackingEnabled: typeof trackingEnabled === 'boolean' ? trackingEnabled : undefined,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error({ error }, 'Failed to send email');
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
}

export async function spamThread(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    await threadService.markSpam(req.auth!.accountId, id);
    res.json({ success: true, data: null });
  } catch (error) {
    logger.error({ error }, 'Failed to mark thread as spam');
    res.status(500).json({ success: false, error: 'Failed to mark as spam' });
  }
}

export async function markReadUnread(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { isUnread } = req.body;

    if (typeof isUnread !== 'boolean') {
      res.status(400).json({ success: false, error: 'isUnread must be a boolean' });
      return;
    }

    await threadService.markReadUnread(req.auth!.accountId, id, isUnread);
    res.json({ success: true, data: null });
  } catch (error) {
    logger.error({ error }, 'Failed to mark thread read/unread');
    res.status(500).json({ success: false, error: 'Failed to update read status' });
  }
}

export async function snoozeThread(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { snoozeUntil } = req.body;

    if (!snoozeUntil || typeof snoozeUntil !== 'string') {
      res.status(400).json({ success: false, error: 'snoozeUntil is required' });
      return;
    }

    await threadService.snoozeThread(req.auth!.accountId, id, snoozeUntil);
    res.json({ success: true, data: null });
  } catch (error) {
    logger.error({ error }, 'Failed to snooze thread');
    res.status(500).json({ success: false, error: 'Failed to snooze thread' });
  }
}

export async function downloadAttachment(req: Request, res: Response) {
  try {
    const attachmentId = req.params.attachmentId as string;
    const result = await threadService.getAttachmentContent(req.auth!.accountId, attachmentId);

    if (!result) {
      res.status(404).json({ success: false, error: 'Attachment not found' });
      return;
    }

    // Validate mimeType before using as Content-Type header
    const safeMimeType = /^[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_.+]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_.+]*$/.test(result.mimeType)
      ? result.mimeType
      : 'application/octet-stream';
    res.setHeader('Content-Type', safeMimeType);
    res.setHeader('Content-Length', result.buffer.length);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');

    // Use inline for viewable types (images, PDFs), attachment for others
    const isViewable = safeMimeType.startsWith('image/') || safeMimeType === 'application/pdf';
    const disposition = isViewable ? 'inline' : 'attachment';
    // RFC 5987: ASCII-safe fallback in filename, full Unicode in filename*
    const asciiFilename = result.filename.replace(/[^\w. -]/g, '_');
    const encodedFilename = encodeURIComponent(result.filename).replace(/['()]/g, escape);
    res.setHeader('Content-Disposition', `${disposition}; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(result.buffer);
  } catch (error) {
    logger.error({ error }, 'Failed to download attachment');
    res.status(500).json({ success: false, error: 'Failed to download attachment' });
  }
}
