import { Router } from 'express';
import * as searchController from '../controllers/search.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.get('/', searchController.searchEmails);

export default router;
