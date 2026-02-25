import { Router } from 'express';
import type { Request, Response } from 'express';
import * as threadsController from '../controllers/threads.controller';
import * as trackingController from '../controllers/tracking.controller';
import { authMiddleware } from '../middleware/auth';
import { fullSync, incrementalSync } from '../services/sync.service';
import { logger } from '../utils/logger';

const router = Router();

router.use(authMiddleware);

router.post('/sync', async (req: Request, res: Response) => {
  const accountId = req.auth!.accountId;
  const mode = req.body.mode === 'full' ? 'full' : 'incremental';
  logger.info({ accountId, mode }, 'Manual sync triggered');
  try {
    if (mode === 'full') {
      await fullSync(accountId);
    } else {
      await incrementalSync(accountId);
    }
    res.json({ success: true, data: { message: `${mode} sync complete` } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error, accountId }, 'Manual sync failed');
    res.status(500).json({ success: false, error: message });
  }
});

router.get('/counts', threadsController.getThreadCounts);
router.get('/labels', threadsController.getGmailLabels);
router.get('/attachments/:attachmentId', threadsController.downloadAttachment);
router.get('/', threadsController.listThreads);
router.post('/send', threadsController.sendEmail);
router.get('/:id', threadsController.getThread);
router.get('/:id/tracking', trackingController.getThreadTracking);
router.post('/:id/archive', threadsController.archiveThread);
router.post('/:id/trash', threadsController.trashThread);
router.post('/:id/star', threadsController.starThread);
router.post('/:id/spam', threadsController.spamThread);
router.post('/:id/read', threadsController.markReadUnread);
router.post('/:id/snooze', threadsController.snoozeThread);

export default router;
