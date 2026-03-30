import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as eventService from '../services/event.service';
import { logger } from '../utils/logger';

const router = Router();

router.use(authMiddleware);

// GET /notifications
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const accountId = req.auth!.accountId;
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string | undefined;

    const data = await eventService.listNotifications(userId, accountId, limit, before);
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ error }, 'Failed to list notifications');
    res.status(500).json({ success: false, error: 'Failed to list notifications' });
  }
});

// GET /notifications/unread-count
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const accountId = req.auth!.accountId;

    const count = await eventService.getUnreadCount(userId, accountId);
    res.json({ success: true, data: { count } });
  } catch (error) {
    logger.error({ error }, 'Failed to get unread count');
    res.status(500).json({ success: false, error: 'Failed to get unread count' });
  }
});

// POST /notifications/:id/read
router.post('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const notificationId = req.params.id as string;

    await eventService.markNotificationRead(notificationId, userId);
    res.json({ success: true, data: null });
  } catch (error) {
    logger.error({ error }, 'Failed to mark notification as read');
    res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
});

// POST /notifications/read-all
router.post('/read-all', async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const accountId = req.auth!.accountId;

    await eventService.markAllNotificationsRead(userId, accountId);
    res.json({ success: true, data: null });
  } catch (error) {
    logger.error({ error }, 'Failed to mark all notifications as read');
    res.status(500).json({ success: false, error: 'Failed to mark all notifications as read' });
  }
});

// DELETE /notifications/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId;
    const notificationId = req.params.id as string;

    await eventService.dismissNotification(notificationId, userId);
    res.json({ success: true, data: null });
  } catch (error) {
    logger.error({ error }, 'Failed to dismiss notification');
    res.status(500).json({ success: false, error: 'Failed to dismiss notification' });
  }
});

// GET /activity-feed
router.get('/activity-feed', async (req: Request, res: Response) => {
  try {
    const tenantId = req.auth!.tenantId;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant context required' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string | undefined;

    const data = await eventService.listActivityFeed(tenantId, limit, before);
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ error }, 'Failed to list activity feed');
    res.status(500).json({ success: false, error: 'Failed to list activity feed' });
  }
});

export default router;
