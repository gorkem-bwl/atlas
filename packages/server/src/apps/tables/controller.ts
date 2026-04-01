import type { Request, Response } from 'express';
import * as tableService from './service';
import { logger } from '../../utils/logger';
import { getAppPermission, canAccess } from '../../services/app-permissions.service';

// GET /api/tables
export async function listSpreadsheets(req: Request, res: Response) {
  try {
    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'tables');
    if (!canAccess(perm.role, 'view')) {
      res.status(403).json({ success: false, error: 'No permission to view tables' });
      return;
    }

    const userId = req.auth!.userId;
    const accountId = req.auth!.accountId;
    const includeArchived = req.query.includeArchived === 'true';

    // Auto-seed sample spreadsheet on first visit
    await tableService.seedSampleSpreadsheets(userId, accountId);

    const spreadsheets = await tableService.listSpreadsheets(userId, includeArchived);

    res.json({ success: true, data: { spreadsheets } });
  } catch (error) {
    logger.error({ error }, 'Failed to list spreadsheets');
    res.status(500).json({ success: false, error: 'Failed to list spreadsheets' });
  }
}

// POST /api/tables
export async function createSpreadsheet(req: Request, res: Response) {
  try {
    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'tables');
    if (!canAccess(perm.role, 'create')) {
      res.status(403).json({ success: false, error: 'No permission to create tables' });
      return;
    }

    const userId = req.auth!.userId;
    const accountId = req.auth!.accountId;
    const { title, columns, rows, viewConfig, color, icon } = req.body;

    const spreadsheet = await tableService.createSpreadsheet(userId, accountId, {
      title,
      columns,
      rows,
      viewConfig,
      color,
      icon,
    });

    res.json({ success: true, data: spreadsheet });
  } catch (error) {
    logger.error({ error }, 'Failed to create spreadsheet');
    res.status(500).json({ success: false, error: 'Failed to create spreadsheet' });
  }
}

// GET /api/tables/:id
export async function getSpreadsheet(req: Request, res: Response) {
  try {
    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'tables');
    if (!canAccess(perm.role, 'view')) {
      res.status(403).json({ success: false, error: 'No permission to view tables' });
      return;
    }

    const userId = req.auth!.userId;
    const spreadsheetId = req.params.id as string;

    const spreadsheet = await tableService.getSpreadsheet(userId, spreadsheetId);

    if (!spreadsheet) {
      res.status(404).json({ success: false, error: 'Spreadsheet not found' });
      return;
    }

    res.json({ success: true, data: spreadsheet });
  } catch (error) {
    logger.error({ error }, 'Failed to get spreadsheet');
    res.status(500).json({ success: false, error: 'Failed to get spreadsheet' });
  }
}

// PATCH /api/tables/:id
export async function updateSpreadsheet(req: Request, res: Response) {
  try {
    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'tables');
    if (!canAccess(perm.role, 'update')) {
      res.status(403).json({ success: false, error: 'No permission to update tables' });
      return;
    }

    const userId = req.auth!.userId;
    const spreadsheetId = req.params.id as string;
    const { title, columns, rows, viewConfig, isArchived, color, icon, guide } = req.body;

    const spreadsheet = await tableService.updateSpreadsheet(userId, spreadsheetId, {
      title,
      columns,
      rows,
      viewConfig,
      isArchived,
      color,
      icon,
      guide,
    });

    if (!spreadsheet) {
      res.status(404).json({ success: false, error: 'Spreadsheet not found' });
      return;
    }

    res.json({ success: true, data: spreadsheet });
  } catch (error) {
    logger.error({ error }, 'Failed to update spreadsheet');
    res.status(500).json({ success: false, error: 'Failed to update spreadsheet' });
  }
}

// DELETE /api/tables/:id (soft delete)
export async function deleteSpreadsheet(req: Request, res: Response) {
  try {
    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'tables');
    if (!canAccess(perm.role, 'delete') && !canAccess(perm.role, 'delete_own')) {
      res.status(403).json({ success: false, error: 'No permission to delete tables' });
      return;
    }

    const userId = req.auth!.userId;
    const spreadsheetId = req.params.id as string;

    const result = await tableService.deleteSpreadsheet(userId, spreadsheetId);

    if (!result) {
      res.status(404).json({ success: false, error: 'Spreadsheet not found' });
      return;
    }

    res.json({ success: true, data: null });
  } catch (error) {
    logger.error({ error }, 'Failed to delete spreadsheet');
    res.status(500).json({ success: false, error: 'Failed to delete spreadsheet' });
  }
}

// PATCH /api/tables/:id/restore
export async function restoreSpreadsheet(req: Request, res: Response) {
  try {
    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'tables');
    if (!canAccess(perm.role, 'update')) {
      res.status(403).json({ success: false, error: 'No permission to update tables' });
      return;
    }

    const userId = req.auth!.userId;
    const spreadsheetId = req.params.id as string;

    const spreadsheet = await tableService.restoreSpreadsheet(userId, spreadsheetId);

    if (!spreadsheet) {
      res.status(404).json({ success: false, error: 'Spreadsheet not found' });
      return;
    }

    res.json({ success: true, data: spreadsheet });
  } catch (error) {
    logger.error({ error }, 'Failed to restore spreadsheet');
    res.status(500).json({ success: false, error: 'Failed to restore spreadsheet' });
  }
}

// POST /api/tables/seed
export async function seedSampleData(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const accountId = req.auth!.accountId;

    const result = await tableService.seedSampleSpreadsheets(userId, accountId);
    res.json({ success: true, data: { message: 'Seeded Tables sample data', ...result } });
  } catch (error) {
    logger.error({ error }, 'Failed to seed Tables sample data');
    res.status(500).json({ success: false, error: 'Failed to seed Tables sample data' });
  }
}

// GET /api/tables/search?q=...
export async function searchSpreadsheets(req: Request, res: Response) {
  try {
    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'tables');
    if (!canAccess(perm.role, 'view')) {
      res.status(403).json({ success: false, error: 'No permission to view tables' });
      return;
    }

    const userId = req.auth!.userId;
    const query = (req.query.q as string) || '';

    if (!query.trim()) {
      res.json({ success: true, data: [] });
      return;
    }

    const results = await tableService.searchSpreadsheets(userId, query.trim());
    res.json({ success: true, data: results });
  } catch (error) {
    logger.error({ error }, 'Failed to search spreadsheets');
    res.status(500).json({ success: false, error: 'Failed to search spreadsheets' });
  }
}
