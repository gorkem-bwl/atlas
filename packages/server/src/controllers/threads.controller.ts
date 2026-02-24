import type { Request, Response } from 'express';
import * as threadService from '../services/thread.service';

export async function listThreads(req: Request, res: Response) {
  const { category, limit, offset } = req.query;
  const result = await threadService.getThreads(req.auth!.accountId, {
    category: category as string | undefined,
    limit: limit ? parseInt(limit as string) : 50,
    offset: offset ? parseInt(offset as string) : 0,
  });
  res.json({ success: true, data: result });
}

export async function getThread(req: Request, res: Response) {
  const id = req.params.id as string;
  const thread = await threadService.getThreadById(req.auth!.accountId, id);
  if (!thread) {
    res.status(404).json({ success: false, error: 'Thread not found' });
    return;
  }
  res.json({ success: true, data: thread });
}

export async function archiveThread(req: Request, res: Response) {
  const id = req.params.id as string;
  await threadService.archiveThread(req.auth!.accountId, id);
  res.json({ success: true, data: null });
}

export async function trashThread(req: Request, res: Response) {
  const id = req.params.id as string;
  await threadService.trashThread(req.auth!.accountId, id);
  res.json({ success: true, data: null });
}

export async function starThread(req: Request, res: Response) {
  const id = req.params.id as string;
  await threadService.toggleStar(req.auth!.accountId, id);
  res.json({ success: true, data: null });
}
