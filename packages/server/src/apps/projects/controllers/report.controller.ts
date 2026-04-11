import type { Request, Response } from 'express';
import * as projectService from '../service';
import { logger } from '../../../utils/logger';
import { getAppPermission, canAccess } from '../../../services/app-permissions.service';

// ─── Time Billing ──────────────────────────────────────────────────

export async function previewTimeBillingLineItems(req: Request, res: Response) {
  try {
    const tenantId = req.auth!.tenantId;
    const { companyId, clientId, startDate, endDate, timeEntryIds } = req.body;

    const lineItems = await projectService.previewTimeEntryLineItems(
      tenantId, companyId || clientId, startDate, endDate,
      Array.isArray(timeEntryIds) ? timeEntryIds : undefined,
    );

    res.json({ success: true, data: { lineItems } });
  } catch (error) {
    logger.error({ error }, 'Failed to preview time billing line items');
    res.status(500).json({ success: false, error: 'Failed to preview line items' });
  }
}

export async function populateTimeBilling(req: Request, res: Response) {
  try {
    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'projects');
    if (!canAccess(perm.role, 'create')) {
      res.status(403).json({ success: false, error: 'No permission' });
      return;
    }

    const tenantId = req.auth!.tenantId;
    const { invoiceId, companyId, clientId, startDate, endDate, timeEntryIds } = req.body;

    const lineItems = await projectService.populateFromTimeEntries(
      tenantId, invoiceId, companyId || clientId, startDate, endDate,
      Array.isArray(timeEntryIds) ? timeEntryIds : undefined,
    );

    res.json({ success: true, data: { lineItems } });
  } catch (error) {
    logger.error({ error }, 'Failed to populate time billing');
    res.status(500).json({ success: false, error: 'Failed to populate from time entries' });
  }
}

// ─── Reports ────────────────────────────────────────────────────────

export async function getTimeReport(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const { startDate, endDate, projectId } = req.query;

    const report = await projectService.getTimeReport(userId, tenantId, {
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      projectId: projectId as string | undefined,
    });

    res.json({ success: true, data: report });
  } catch (error) {
    logger.error({ error }, 'Failed to get time report');
    res.status(500).json({ success: false, error: 'Failed to get time report' });
  }
}

export async function getRevenueReport(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const { startDate, endDate } = req.query;

    const report = await projectService.getRevenueReport(userId, tenantId, {
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    });

    res.json({ success: true, data: report });
  } catch (error) {
    logger.error({ error }, 'Failed to get revenue report');
    res.status(500).json({ success: false, error: 'Failed to get revenue report' });
  }
}

export async function getProjectProfitability(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;

    const report = await projectService.getProjectProfitability(userId, tenantId);
    res.json({ success: true, data: report });
  } catch (error) {
    logger.error({ error }, 'Failed to get project profitability');
    res.status(500).json({ success: false, error: 'Failed to get project profitability' });
  }
}

export async function getTeamUtilization(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const { startDate, endDate } = req.query;

    const report = await projectService.getTeamUtilization(userId, tenantId, {
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    });

    res.json({ success: true, data: report });
  } catch (error) {
    logger.error({ error }, 'Failed to get team utilization');
    res.status(500).json({ success: false, error: 'Failed to get team utilization' });
  }
}
