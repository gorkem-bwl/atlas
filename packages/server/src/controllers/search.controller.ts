import type { Request, Response } from 'express';
import * as searchService from '../services/search.service';

export async function searchEmails(req: Request, res: Response) {
  const { q, limit, offset } = req.query;
  if (!q) {
    res.status(400).json({ success: false, error: 'Missing search query' });
    return;
  }
  const results = await searchService.searchEmails(
    req.auth!.accountId,
    q as string,
    limit ? parseInt(limit as string) : 50,
    offset ? parseInt(offset as string) : 0,
  );
  res.json({ success: true, data: results });
}
