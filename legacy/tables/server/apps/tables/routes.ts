import { Router } from 'express';
import * as tableController from './controller';
import { authMiddleware } from '../../middleware/auth';
import { requireAppPermission } from '../../middleware/require-app-permission';

const router = Router();
router.use(authMiddleware);
router.use(requireAppPermission('tables'));

router.get('/', tableController.listSpreadsheets);
router.post('/', tableController.createSpreadsheet);
router.get('/search', tableController.searchSpreadsheets);

// Seed sample data
router.post('/seed', tableController.seedSampleData);

// Row comments — standalone delete (must be before /:id to avoid conflicts)
router.delete('/comments/:commentId', tableController.deleteRowComment);

router.get('/:id', tableController.getSpreadsheet);
router.patch('/:id', tableController.updateSpreadsheet);
router.delete('/:id', tableController.deleteSpreadsheet);
router.patch('/:id/restore', tableController.restoreSpreadsheet);

// Row comments (nested under spreadsheet)
router.get('/:id/rows/:rowId/comments', tableController.listRowComments);
router.post('/:id/rows/:rowId/comments', tableController.createRowComment);

export default router;
