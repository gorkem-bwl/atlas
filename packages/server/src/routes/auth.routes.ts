import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth';
import { authLimiter } from '../middleware/rate-limit';

const router = Router();

router.get('/url', authController.getAuthUrl);
router.post('/callback', authLimiter, authController.handleCallback);
router.post('/refresh', authLimiter, authController.refreshToken);
router.get('/me', authMiddleware, authController.getMe);

export default router;
