import type { Request, Response } from 'express';
import * as driveService from '../services/drive.service';
import { logger } from '../utils/logger';
import path from 'node:path';
import { existsSync, createReadStream, readFileSync, statSync } from 'node:fs';
import archiver from 'archiver';

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// GET /api/drive
export async function listItems(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const accountId = req.auth!.accountId;
    const parentId = (req.query.parentId as string) || null;
    const sortBy = (req.query.sortBy as string) || undefined;

    // Auto-seed on first visit
    await driveService.seedSampleFolder(userId, accountId);

    const items = await driveService.listItems(userId, parentId, false, sortBy);
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
    const { name, parentId, icon, isFavourite, isArchived, tags } = req.body;

    const item = await driveService.updateItem(userId, itemId, {
      name,
      parentId,
      icon,
      isFavourite,
      isArchived,
      tags,
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

// POST /api/drive/:id/duplicate
export async function duplicateItem(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const itemId = req.params.id as string;

    const item = await driveService.duplicateItem(userId, itemId);
    if (!item) {
      res.status(404).json({ success: false, error: 'Item not found' });
      return;
    }

    res.json({ success: true, data: item });
  } catch (error) {
    logger.error({ error }, 'Failed to duplicate drive item');
    res.status(500).json({ success: false, error: 'Failed to duplicate drive item' });
  }
}

// POST /api/drive/batch/delete
export async function batchDelete(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const { itemIds } = req.body as { itemIds: string[] };

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      res.status(400).json({ success: false, error: 'itemIds required' });
      return;
    }

    await driveService.batchDelete(userId, itemIds);
    res.json({ success: true, data: null });
  } catch (error) {
    logger.error({ error }, 'Failed to batch delete');
    res.status(500).json({ success: false, error: 'Failed to batch delete' });
  }
}

// POST /api/drive/batch/move
export async function batchMove(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const { itemIds, parentId } = req.body as { itemIds: string[]; parentId: string | null };

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      res.status(400).json({ success: false, error: 'itemIds required' });
      return;
    }

    await driveService.batchMove(userId, itemIds, parentId ?? null);
    res.json({ success: true, data: null });
  } catch (error) {
    logger.error({ error }, 'Failed to batch move');
    res.status(500).json({ success: false, error: 'Failed to batch move' });
  }
}

// POST /api/drive/batch/favourite
export async function batchFavourite(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const { itemIds, isFavourite } = req.body as { itemIds: string[]; isFavourite: boolean };

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      res.status(400).json({ success: false, error: 'itemIds required' });
      return;
    }

    await driveService.batchFavourite(userId, itemIds, isFavourite);
    res.json({ success: true, data: null });
  } catch (error) {
    logger.error({ error }, 'Failed to batch favourite');
    res.status(500).json({ success: false, error: 'Failed to batch favourite' });
  }
}

// GET /api/drive/:id/download-zip
export async function downloadZip(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const itemId = req.params.id as string;

    const item = await driveService.getItem(userId, itemId);
    if (!item || item.type !== 'folder') {
      res.status(404).json({ success: false, error: 'Folder not found' });
      return;
    }

    const contents = await driveService.getFolderContents(userId, itemId);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(item.name)}.zip"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(res);

    for (const { item: fileItem, relativePath } of contents) {
      if (fileItem.storagePath) {
        const filePath = path.join(UPLOADS_DIR, fileItem.storagePath);
        if (existsSync(filePath)) {
          archive.file(filePath, { name: relativePath });
        }
      }
    }

    await archive.finalize();
  } catch (error) {
    logger.error({ error }, 'Failed to download ZIP');
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Failed to download ZIP' });
    }
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

// GET /api/drive/:id/preview — return text content for previewable files
const MAX_PREVIEW_BYTES = 512 * 1024; // 512KB max preview
const PREVIEWABLE_MIMES = [
  'text/', 'application/json', 'application/xml', 'application/javascript',
  'application/csv', 'application/x-yaml', 'application/x-sh',
];

function isPreviewable(mimeType: string | null, name: string): boolean {
  if (!mimeType) return false;
  if (PREVIEWABLE_MIMES.some((m) => mimeType.startsWith(m) || mimeType.includes(m))) return true;
  // Also allow by extension for common cases where mime type may be generic
  const ext = name.split('.').pop()?.toLowerCase();
  return ['csv', 'md', 'json', 'txt', 'xml', 'yaml', 'yml', 'sh', 'js', 'ts', 'html', 'css', 'log', 'ini', 'toml', 'env', 'sql'].includes(ext || '');
}

export async function previewFile(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const itemId = req.params.id as string;

    const item = await driveService.getItem(userId, itemId);
    if (!item || item.type !== 'file' || !item.storagePath) {
      res.status(404).json({ success: false, error: 'File not found' });
      return;
    }

    if (!isPreviewable(item.mimeType, item.name)) {
      res.status(400).json({ success: false, error: 'File type not previewable as text' });
      return;
    }

    const filePath = path.join(UPLOADS_DIR, item.storagePath);
    if (!existsSync(filePath)) {
      res.status(404).json({ success: false, error: 'File not found on disk' });
      return;
    }

    const stat = statSync(filePath);
    const truncated = stat.size > MAX_PREVIEW_BYTES;
    const buffer = Buffer.alloc(Math.min(stat.size, MAX_PREVIEW_BYTES));
    const fd = require('node:fs').openSync(filePath, 'r');
    require('node:fs').readSync(fd, buffer, 0, buffer.length, 0);
    require('node:fs').closeSync(fd);

    const content = buffer.toString('utf-8');

    res.json({
      success: true,
      data: {
        content,
        truncated,
        totalSize: stat.size,
        mimeType: item.mimeType,
        name: item.name,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to preview file');
    res.status(500).json({ success: false, error: 'Failed to preview file' });
  }
}
