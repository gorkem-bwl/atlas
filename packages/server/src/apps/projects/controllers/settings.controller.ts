import type { Request, Response } from 'express';
import * as projectService from '../service';
import { logger } from '../../../utils/logger';
import { canAccess } from '../../../services/app-permissions.service';

// ─── Widget ─────────────────────────────────────────────────────────

export async function getWidgetData(req: Request, res: Response) {
  try {
    const tenantId = req.auth!.tenantId;
    // Non-admins see widget numbers scoped to projects they can access.
    const isAdmin = req.projectsPerm!.role === 'admin';
    const scopedUserId = isAdmin ? undefined : req.auth!.userId;
    const data = await projectService.getWidgetData(tenantId, scopedUserId);
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ error }, 'Failed to get Projects widget data');
    res.status(500).json({ success: false, error: 'Failed to get Projects widget data' });
  }
}

export async function getDashboardData(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const data = await projectService.getDashboardData(userId, tenantId);
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ error }, 'Failed to get Projects dashboard data');
    res.status(500).json({ success: false, error: 'Failed to get dashboard data' });
  }
}

// ─── Settings ───────────────────────────────────────────────────────

export async function getSettings(req: Request, res: Response) {
  try {
    const tenantId = req.auth!.tenantId;
    const settings = await projectService.getSettings(tenantId);
    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error({ error }, 'Failed to get project settings');
    res.status(500).json({ success: false, error: 'Failed to get project settings' });
  }
}

export async function updateSettings(req: Request, res: Response) {
  try {
    const perm = req.projectsPerm!;
    if (!canAccess(perm.role, 'update')) {
      res.status(403).json({ success: false, error: 'No permission to update project settings' });
      return;
    }

    const tenantId = req.auth!.tenantId;
    const {
      defaultHourlyRate,
      companyName,
      companyAddress,
      companyLogo,
      weekStartDay,
      defaultProjectVisibility,
      defaultBillable,
      timeRounding,
    } = req.body;

    // Minimal validation on enum-backed columns.
    if (weekStartDay !== undefined && weekStartDay !== 'monday' && weekStartDay !== 'sunday') {
      res.status(400).json({ success: false, error: 'Invalid weekStartDay' });
      return;
    }
    if (
      defaultProjectVisibility !== undefined &&
      defaultProjectVisibility !== 'team' &&
      defaultProjectVisibility !== 'private'
    ) {
      res.status(400).json({ success: false, error: 'Invalid defaultProjectVisibility' });
      return;
    }

    const settings = await projectService.updateSettings(tenantId, {
      defaultHourlyRate,
      companyName,
      companyAddress,
      companyLogo,
      weekStartDay,
      defaultProjectVisibility,
      defaultBillable,
      timeRounding,
    });

    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error({ error }, 'Failed to update project settings');
    res.status(500).json({ success: false, error: 'Failed to update project settings' });
  }
}

// ─── Seed ──────────────────────────────────────────────────────────

export async function seedSampleData(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const result = await projectService.seedSampleData(userId, tenantId);
    res.json({ success: true, data: { message: 'Seeded Projects sample data', ...result } });
  } catch (error) {
    logger.error({ error }, 'Failed to seed Projects sample data');
    res.status(500).json({ success: false, error: 'Failed to seed Projects data' });
  }
}
