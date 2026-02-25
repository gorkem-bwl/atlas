import { Router } from 'express';
import * as calendarController from '../controllers/calendar.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/calendars', calendarController.listCalendars);
router.post('/calendars', calendarController.createCalendar);
router.post('/sync', calendarController.syncCalendars);
router.get('/events', calendarController.listEvents);
router.post('/events', calendarController.createEvent);
router.patch('/events/:eventId', calendarController.updateEvent);
router.delete('/events/:eventId', calendarController.deleteEvent);
router.patch('/calendars/:calendarId/toggle', calendarController.toggleCalendar);

export default router;
