import { Router } from 'express';
import type { Request, Response } from 'express';
import * as driveService from '../apps/drive/service';
import { logger } from '../utils/logger';
import path from 'node:path';
import { existsSync, createReadStream, statSync } from 'node:fs';

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

const router = Router();

// GET /api/v1/share/:token — public file metadata
router.get('/:token', async (req: Request, res: Response) => {
  try {
    const token = req.params.token as string;
    const item = await driveService.getItemByShareToken(token);

    if (!item) {
      res.status(404).json({ success: false, error: 'Link expired or not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        name: item.name,
        type: item.type,
        mimeType: item.mimeType,
        size: item.size,
        passwordRequired: item.hasPassword,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get shared item');
    res.status(500).json({ success: false, error: 'Failed to get shared item' });
  }
});

// GET /api/v1/share/:token/download — public file download
router.get('/:token/download', async (req: Request, res: Response) => {
  try {
    const token = req.params.token as string;
    const item = await driveService.getItemByShareToken(token);

    if (!item || item.type !== 'file' || !item.storagePath) {
      res.status(404).json({ success: false, error: 'Link expired or not found' });
      return;
    }

    // Password protection check
    if (item.hasPassword) {
      const password = req.query.password as string | undefined;
      if (!password) {
        res.status(401).json({ success: false, error: 'Password required', passwordRequired: true });
        return;
      }
      const valid = await driveService.verifyShareLinkPassword(token, password);
      if (!valid) {
        res.status(401).json({ success: false, error: 'Incorrect password', passwordRequired: true });
        return;
      }
    }

    const filePath = path.join(UPLOADS_DIR, item.storagePath);
    if (!existsSync(filePath)) {
      res.status(404).json({ success: false, error: 'File not found on disk' });
      return;
    }

    const stat = statSync(filePath);
    const mimeType = item.mimeType || 'application/octet-stream';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(item.name)}"`);

    createReadStream(filePath).pipe(res);
  } catch (error) {
    logger.error({ error }, 'Failed to download shared file');
    res.status(500).json({ success: false, error: 'Failed to download shared file' });
  }
});

export default router;
