import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth';
import { authLimiter } from '../middleware/rate-limit';

const router = Router();

router.get('/setup-status', authController.getSetupStatus);
router.post('/setup', authLimiter, authController.setup);
router.post('/login', authLimiter, authController.loginWithPassword);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);
router.post('/refresh', authLimiter, authController.refreshToken);
router.get('/me', authMiddleware, authController.getMe);
router.get('/accounts', authMiddleware, authController.listAccounts);
router.get('/invitation/:token', authController.getInvitationDetails);
router.post('/invitation/:token/accept', authLimiter, authController.acceptInvitation);

// Google OAuth for CRM email/calendar sync
router.get('/google/connect', authMiddleware, authController.googleConnect);
router.get('/google/callback', authController.googleCallback);
router.post('/google/disconnect', authMiddleware, authController.googleDisconnect);

export default router;
