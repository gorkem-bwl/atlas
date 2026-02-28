import type { Request, Response } from 'express';
import * as driveService from '../services/drive.service';
import { logger } from '../utils/logger';
import path from 'node:path';
import { existsSync, createReadStream, statSync } from 'node:fs';

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// GET /api/drive
export async function listItems(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const accountId = req.auth!.accountId;
    const parentId = (req.query.parentId as string) || null;

    // Auto-seed on first visit
    await driveService.seedSampleFolder(userId, accountId);

    const items = await driveService.listItems(userId, parentId);
    res.json({ success: true, data: { items } });
  } catch (error) {
    logger.error({ error }, 'Failed to list drive items');
    res.status(500).json({ success: false, error: 'Failed to list drive items' });
  }
}

// POST /api/drive/folder
export async function createFolder(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const accountId = req.auth!.accountId;
    const { name, parentId } = req.body;

    const folder = await driveService.createFolder(userId, accountId, { name, parentId });
    res.json({ success: true, data: folder });
  } catch (error) {
    logger.error({ error }, 'Failed to create folder');
    res.status(500).json({ success: false, error: 'Failed to create folder' });
  }
}

// POST /api/drive/upload
export async function uploadFiles(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const accountId = req.auth!.accountId;
    const parentId = (req.body.parentId as string) || null;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ success: false, error: 'No files uploaded' });
      return;
    }

    const created = [];
    for (const file of files) {
      const item = await driveService.uploadFile(userId, accountId, {
        name: file.originalname,
        type: 'file',
        mimeType: file.mimetype,
        size: file.size,
        parentId,
        storagePath: file.filename,
      });
      created.push(item);
    }

    res.json({ success: true, data: { items: created } });
  } catch (error) {
    logger.error({ error }, 'Failed to upload files');
    res.status(500).json({ success: false, error: 'Failed to upload files' });
  }
}

// GET /api/drive/search?q=
export async function searchItems(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const query = (req.query.q as string) || '';

    if (!query.trim()) {
      res.json({ success: true, data: { items: [] } });
      return;
    }

    const items = await driveService.searchItems(userId, query.trim());
    res.json({ success: true, data: { items } });
  } catch (error) {
    logger.error({ error }, 'Failed to search drive items');
    res.status(500).json({ success: false, error: 'Failed to search drive items' });
  }
}

// GET /api/drive/trash
export async function listTrash(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const items = await driveService.listTrash(userId);
    res.json({ success: true, data: { items } });
  } catch (error) {
    logger.error({ error }, 'Failed to list trash');
    res.status(500).json({ success: false, error: 'Failed to list trash' });
  }
}

// GET /api/drive/favourites
export async function listFavourites(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const items = await driveService.listFavourites(userId);
    res.json({ success: true, data: { items } });
  } catch (error) {
    logger.error({ error }, 'Failed to list favourites');
    res.status(500).json({ success: false, error: 'Failed to list favourites' });
  }
}

// GET /api/drive/recent
export async function listRecent(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    const items = await driveService.listRecent(userId, limit);
    res.json({ success: true, data: { items } });
  } catch (error) {
    logger.error({ error }, 'Failed to list recent files');
    res.status(500).json({ success: false, error: 'Failed to list recent files' });
  }
}

// GET /api/drive/folders
export async function listFolders(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const folders = await driveService.listFolders(userId);
    res.json({ success: true, data: { folders } });
  } catch (error) {
    logger.error({ error }, 'Failed to list folders');
    res.status(500).json({ success: false, error: 'Failed to list folders' });
  }
}

// GET /api/drive/storage
export async function getStorageUsage(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const total = await driveService.getStorageUsage(userId);
    res.json({ success: true, data: { totalBytes: total } });
  } catch (error) {
    logger.error({ error }, 'Failed to get storage usage');
    res.status(500).json({ success: false, error: 'Failed to get storage usage' });
  }
}

// GET /api/drive/:id
export async function getItem(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const itemId = req.params.id as string;

    const item = await driveService.getItem(userId, itemId);
    if (!item) {
      res.status(404).json({ success: false, error: 'Item not found' });
      return;
    }

    res.json({ success: true, data: item });
  } catch (error) {
    logger.error({ error }, 'Failed to get drive item');
    res.status(500).json({ success: false, error: 'Failed to get drive item' });
  }
}

// GET /api/drive/:id/breadcrumbs
export async function getBreadcrumbs(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const itemId = req.params.id as string;

    const crumbs = await driveService.getBreadcrumbs(userId, itemId);
    res.json({ success: true, data: { breadcrumbs: crumbs } });
  } catch (error) {
    logger.error({ error }, 'Failed to get breadcrumbs');
    res.status(500).json({ success: false, error: 'Failed to get breadcrumbs' });
  }
}

// PATCH /api/drive/:id
export async function updateItem(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const itemId = req.params.id as string;
    const { name, parentId, isFavourite, isArchived } = req.body;

    const item = await driveService.updateItem(userId, itemId, {
      name,
      parentId,
      isFavourite,
      isArchived,
    });

    if (!item) {
      res.status(404).json({ success: false, error: 'Item not found' });
      return;
    }

    res.json({ success: true, data: item });
  } catch (error) {
    logger.error({ error }, 'Failed to update drive item');
    res.status(500).json({ success: false, error: 'Failed to update drive item' });
  }
}

// DELETE /api/drive/:id (soft delete)
export async function deleteItem(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const itemId = req.params.id as string;

    await driveService.deleteItem(userId, itemId);
    res.json({ success: true, data: null });
  } catch (error) {
    logger.error({ error }, 'Failed to delete drive item');
    res.status(500).json({ success: false, error: 'Failed to delete drive item' });
  }
}

// PATCH /api/drive/:id/restore
export async function restoreItem(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const itemId = req.params.id as string;

    const item = await driveService.restoreItem(userId, itemId);
    if (!item) {
      res.status(404).json({ success: false, error: 'Item not found' });
      return;
    }

    res.json({ success: true, data: item });
  } catch (error) {
    logger.error({ error }, 'Failed to restore drive item');
    res.status(500).json({ success: false, error: 'Failed to restore drive item' });
  }
}

// DELETE /api/drive/:id/permanent
export async function permanentDelete(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const itemId = req.params.id as string;

    await driveService.permanentDelete(userId, itemId);
    res.json({ success: true, data: null });
  } catch (error) {
    logger.error({ error }, 'Failed to permanently delete drive item');
    res.status(500).json({ success: false, error: 'Failed to permanently delete drive item' });
  }
}

// POST /api/drive/create-document
export async function createLinkedDocument(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const accountId = req.auth!.accountId;
    const { parentId } = req.body as { parentId?: string };

    const result = await driveService.createLinkedDocument(userId, accountId, parentId);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error({ error }, 'Failed to create linked document');
    res.status(500).json({ success: false, error: 'Failed to create linked document' });
  }
}

// POST /api/drive/create-drawing
export async function createLinkedDrawing(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const accountId = req.auth!.accountId;
    const { parentId } = req.body as { parentId?: string };

    const result = await driveService.createLinkedDrawing(userId, accountId, parentId);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error({ error }, 'Failed to create linked drawing');
    res.status(500).json({ success: false, error: 'Failed to create linked drawing' });
  }
}

// POST /api/drive/create-spreadsheet
export async function createLinkedSpreadsheet(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const accountId = req.auth!.accountId;
    const { parentId } = req.body as { parentId?: string };

    const result = await driveService.createLinkedSpreadsheet(userId, accountId, parentId);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error({ error }, 'Failed to create linked spreadsheet');
    res.status(500).json({ success: false, error: 'Failed to create linked spreadsheet' });
  }
}

// GET /api/drive/:id/download
export async function downloadFile(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const itemId = req.params.id as string;

    const item = await driveService.getItem(userId, itemId);
    if (!item || item.type !== 'file' || !item.storagePath) {
      res.status(404).json({ success: false, error: 'File not found' });
      return;
    }

    const filePath = path.join(UPLOADS_DIR, item.storagePath);
    if (!existsSync(filePath)) {
      res.status(404).json({ success: false, error: 'File not found on disk' });
      return;
    }

    const stat = statSync(filePath);
    const mimeType = item.mimeType || 'application/octet-stream';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(item.name)}"`);

    createReadStream(filePath).pipe(res);
  } catch (error) {
    logger.error({ error }, 'Failed to download file');
    res.status(500).json({ success: false, error: 'Failed to download file' });
  }
}
