import { Router } from 'express';
import authRoutes from './auth.routes';
import threadsRoutes from './threads.routes';
import searchRoutes from './search.routes';
import settingsRoutes from './settings.routes';
import contactsRoutes from './contacts.routes';
import aiRoutes from './ai.routes';
import calendarRoutes from './calendar.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/threads', threadsRoutes);
router.use('/search', searchRoutes);
router.use('/settings', settingsRoutes);
router.use('/contacts', contactsRoutes);
router.use('/ai', aiRoutes);
router.use('/calendar', calendarRoutes);

export default router;
