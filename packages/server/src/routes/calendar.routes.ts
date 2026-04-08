import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../config/database';
import { accounts } from '../db/schema';
import * as calendarController from '../controllers/calendar.controller';
import * as aggregatorService from '../services/calendar/aggregator.service';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

async function getAccountId(userId: string): Promise<string> {
  const [row] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId)).limit(1);
  return row?.id ?? '';
}

const router = Router();
router.use(authMiddleware);

router.get('/calendars', calendarController.listCalendars);
router.post('/calendars', calendarController.createCalendar);
router.post('/sync', calendarController.syncCalendars);
router.post('/freebusy', calendarController.getFreeBusy);

router.get('/events/aggregated', async (req, res) => {
  try {
    const { timeMin, timeMax } = req.query;
    if (!timeMin || !timeMax) {
      res.status(400).json({ success: false, error: 'timeMin and timeMax required' });
      return;
    }
    const accountId = await getAccountId(req.auth!.userId);
    const events = await aggregatorService.getAggregatedEvents(
      accountId, req.auth!.userId, req.auth!.tenantId,
      timeMin as string, timeMax as string,
    );
    res.json({ success: true, data: events });
  } catch (error) {
    logger.error({ error }, 'Failed to get aggregated events');
    res.status(500).json({ success: false, error: 'Failed to get aggregated events' });
  }
});

router.get('/events', calendarController.listEvents);
router.get('/events/search', calendarController.searchEvents);
router.post('/events', calendarController.createEvent);
router.patch('/events/:eventId', calendarController.updateEvent);
router.delete('/events/:eventId', calendarController.deleteEvent);
router.patch('/calendars/:calendarId/toggle', calendarController.toggleCalendar);

export default router;
