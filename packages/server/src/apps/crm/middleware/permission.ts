import type { Request, Response, NextFunction } from 'express';
import {
  getAppPermission,
  canAccess,
  type AppOperation,
  type ResolvedAppPermission,
} from '../../../services/app-permissions.service';
import { logger } from '../../../utils/logger';

declare global {
  namespace Express {
    interface Request {
      crmPerm?: ResolvedAppPermission;
    }
  }
}

/**
 * Express middleware factory that checks the caller's CRM app permission
 * for a given operation. Attaches the resolved permission to `req.crmPerm`
 * so downstream handlers can reuse it without re-querying.
 *
 * Mounted once at the router level for the baseline `view` check — every
 * CRM endpoint then inherits a uniform 403 response when the caller lacks
 * access. Per-endpoint create/update/delete/ownership checks still live
 * inside the individual controllers.
 */
export function requireCrmPermission(operation: AppOperation) {
  return async function crmPermissionMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.auth!.userId;
      const tenantId = req.auth?.tenantId;
      const perm = await getAppPermission(tenantId, userId, 'crm');
      if (!canAccess(perm.role, operation)) {
        res.status(403).json({ success: false, error: 'No permission to access CRM records' });
        return;
      }
      req.crmPerm = perm;
      next();
    } catch (error) {
      logger.error({ error }, 'CRM permission middleware failed');
      res.status(500).json({ success: false, error: 'Failed to resolve CRM permission' });
    }
  };
}
