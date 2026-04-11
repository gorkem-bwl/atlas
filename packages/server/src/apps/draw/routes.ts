import { Router } from 'express';
import * as drawingController from './controller';
import { authMiddleware } from '../../middleware/auth';
import { requireDrawPermission } from './middleware/permission';

const router = Router();
router.use(authMiddleware);
router.use(requireDrawPermission('view'));

router.post('/seed', drawingController.seedSampleData);
router.get('/', drawingController.listDrawings);
router.post('/', drawingController.createDrawing);
router.get('/search', drawingController.searchDrawings);
router.get('/:id', drawingController.getDrawing);
router.patch('/:id', drawingController.updateDrawing);
router.patch('/:id/visibility', drawingController.updateDrawingVisibility);
router.delete('/:id', drawingController.deleteDrawing);
router.patch('/:id/restore', drawingController.restoreDrawing);

export default router;
