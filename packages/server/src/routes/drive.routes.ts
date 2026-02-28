import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import * as driveController from '../controllers/drive.controller';
import { authMiddleware } from '../middleware/auth';

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (_req, file, cb) => {
    const userId = (_req as any).auth?.userId || 'anon';
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${userId}_${timestamp}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});

const router = Router();
router.use(authMiddleware);

router.get('/', driveController.listItems);
router.post('/folder', driveController.createFolder);
router.post('/upload', upload.array('files', 20), driveController.uploadFiles);
router.get('/search', driveController.searchItems);
router.get('/trash', driveController.listTrash);
router.get('/favourites', driveController.listFavourites);
router.get('/recent', driveController.listRecent);
router.get('/folders', driveController.listFolders);
router.get('/storage', driveController.getStorageUsage);
router.post('/batch/delete', driveController.batchDelete);
router.post('/batch/move', driveController.batchMove);
router.post('/batch/favourite', driveController.batchFavourite);
router.get('/:id', driveController.getItem);
router.get('/:id/breadcrumbs', driveController.getBreadcrumbs);
router.get('/:id/preview', driveController.previewFile);
router.get('/:id/download', driveController.downloadFile);
router.get('/:id/download-zip', driveController.downloadZip);
router.post('/:id/duplicate', driveController.duplicateItem);
router.patch('/:id', driveController.updateItem);
router.delete('/:id', driveController.deleteItem);
router.patch('/:id/restore', driveController.restoreItem);
router.delete('/:id/permanent', driveController.permanentDelete);

export default router;
