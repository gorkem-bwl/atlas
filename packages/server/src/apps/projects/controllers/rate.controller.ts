import type { Request, Response } from 'express';
import * as projectService from '../service';
import { logger } from '../../../utils/logger';
import { canAccess } from '../../../services/app-permissions.service';

// ─── Rates ──────────────────────────────────────────────────────────

export async function listRates(req: Request, res: Response) {
  try {
    const tenantId = req.auth!.tenantId;
    const rates = await projectService.listRates(tenantId);
    res.json({ success: true, data: rates });
  } catch (error) {
    logger.error({ error }, 'Failed to list project rates');
    res.status(500).json({ success: false, error: 'Failed to list project rates' });
  }
}

export async function createRate(req: Request, res: Response) {
  try {
    const perm = req.projectsPerm!;
    if (!canAccess(perm.role, 'create')) {
      res.status(403).json({ success: false, error: 'No permission to create rates' });
      return;
    }

    const tenantId = req.auth!.tenantId;
    const { title, factor, extraPerHour } = req.body;

    if (!title) {
      res.status(400).json({ success: false, error: 'title is required' });
      return;
    }

    const rate = await projectService.createRate(tenantId, { title, factor, extraPerHour });
    res.json({ success: true, data: rate });
  } catch (error) {
    logger.error({ error }, 'Failed to create project rate');
    res.status(500).json({ success: false, error: 'Failed to create project rate' });
  }
}

export async function updateRate(req: Request, res: Response) {
  try {
    const perm = req.projectsPerm!;
    if (!canAccess(perm.role, 'update')) {
      res.status(403).json({ success: false, error: 'No permission to update rates' });
      return;
    }

    const tenantId = req.auth!.tenantId;
    const id = req.params.id as string;
    const { title, factor, extraPerHour, sortOrder } = req.body;

    const rate = await projectService.updateRate(tenantId, id, { title, factor, extraPerHour, sortOrder });
    if (!rate) {
      res.status(404).json({ success: false, error: 'Rate not found' });
      return;
    }

    res.json({ success: true, data: rate });
  } catch (error) {
    logger.error({ error }, 'Failed to update project rate');
    res.status(500).json({ success: false, error: 'Failed to update project rate' });
  }
}

export async function deleteRate(req: Request, res: Response) {
  try {
    const perm = req.projectsPerm!;
    if (!canAccess(perm.role, 'delete')) {
      res.status(403).json({ success: false, error: 'No permission to delete rates' });
      return;
    }

    const tenantId = req.auth!.tenantId;
    const id = req.params.id as string;

    await projectService.deleteRate(tenantId, id);
    res.json({ success: true, data: null });
  } catch (error) {
    logger.error({ error }, 'Failed to delete project rate');
    res.status(500).json({ success: false, error: 'Failed to delete project rate' });
  }
}
