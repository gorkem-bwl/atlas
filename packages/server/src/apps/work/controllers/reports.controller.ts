import type { Request, Response } from 'express';
import { isTenantAdmin } from '@atlas-platform/shared';
import * as timeReportService from '../services/time-report.service';
import { logger } from '../../../utils/logger';

// Admin gate: only tenant owner/admin (or instance super-admins) may view
// team-wide time reports. Mirrors the Paraşüt controller's ensureAdmin.
function ensureAdmin(req: Request, res: Response): boolean {
  if (req.auth?.isSuperAdmin || isTenantAdmin(req.auth?.tenantRole)) return true;
  res.status(403).json({ success: false, error: 'Admin access required' });
  return false;
}

// GET /work/reports/time?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function getTeamTimeReport(req: Request, res: Response) {
  try {
    if (!ensureAdmin(req, res)) return;
    const tenantId = req.auth!.tenantId;
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;

    const data = await timeReportService.getTeamTimeReport(tenantId, { from, to });
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ error }, 'Failed to build team time report');
    res.status(500).json({ success: false, error: 'Failed to build team time report' });
  }
}
