import { Router } from 'express';
import * as threadsController from '../controllers/threads.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.get('/', threadsController.listThreads);
router.get('/:id', threadsController.getThread);
router.post('/:id/archive', threadsController.archiveThread);
router.post('/:id/trash', threadsController.trashThread);
router.post('/:id/star', threadsController.starThread);

export default router;
