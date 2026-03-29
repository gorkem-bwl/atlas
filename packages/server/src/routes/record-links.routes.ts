import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as recordLinkService from '../services/record-link.service';
import { logger } from '../utils/logger';

const router = Router();
router.use(authMiddleware);

router.get('/:appId/:recordId', async (req: Request, res: Response) => {
  try {
    const links = await recordLinkService.getLinksForRecord(
      req.params.appId as string,
      req.params.recordId as string,
    );
    res.json({ success: true, data: links });
  } catch (err) {
    logger.error({ err }, 'Failed to get record links');
    res.status(500).json({ success: false, error: 'Failed to get record links' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { sourceAppId, sourceRecordId, targetAppId, targetRecordId, linkType, metadata } = req.body;

    if (!sourceAppId || !sourceRecordId || !targetAppId || !targetRecordId) {
      res.status(400).json({ success: false, error: 'sourceAppId, sourceRecordId, targetAppId, and targetRecordId are required' });
      return;
    }

    const link = await recordLinkService.createLink({
      tenantId: req.auth!.tenantId,
      sourceAppId,
      sourceRecordId,
      targetAppId,
      targetRecordId,
      linkType,
      metadata,
      createdBy: req.auth!.userId,
    });
    res.status(201).json({ success: true, data: link });
  } catch (err: any) {
    if (err?.code === '23505') {
      res.status(409).json({ success: false, error: 'This link already exists' });
      return;
    }
    logger.error({ err }, 'Failed to create record link');
    res.status(500).json({ success: false, error: 'Failed to create link' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await recordLinkService.deleteLink(req.params.id as string);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Link not found' });
      return;
    }
    res.json({ success: true, data: { message: 'Link deleted' } });
  } catch (err) {
    logger.error({ err }, 'Failed to delete record link');
    res.status(500).json({ success: false, error: 'Failed to delete link' });
  }
});

export default router;
