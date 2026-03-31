import { Router } from 'express';
import * as systemController from './controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/metrics', systemController.getMetrics);
router.get('/email-settings', systemController.getEmailSettings);
router.put('/email-settings', systemController.updateEmailSettings);
router.post('/email-test', systemController.testEmail);

export default router;
