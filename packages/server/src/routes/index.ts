import { Router } from 'express';
import authRoutes from './auth.routes';
import threadsRoutes from './threads.routes';
import searchRoutes from './search.routes';
import settingsRoutes from './settings.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/threads', threadsRoutes);
router.use('/search', searchRoutes);
router.use('/settings', settingsRoutes);

export default router;
