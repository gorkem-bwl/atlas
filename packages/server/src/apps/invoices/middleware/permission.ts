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
      invoicesPerm?: ResolvedAppPermission;
    }
  }
}

/**
 * Express middleware factory that checks the caller's Invoices app permission
 * for a given operation. Attaches the resolved permission to `req.invoicesPerm`
 * so downstream handlers can reuse it without re-querying.
 */
export function requireInvoicesPermission(operation: AppOperation) {
  return async function invoicesPermissionMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.auth!.userId;
      const tenantId = req.auth?.tenantId;
      const perm = await getAppPermission(tenantId, userId, 'invoices');
      if (!canAccess(perm.role, operation)) {
        res.status(403).json({ success: false, error: 'No permission to access invoices' });
        return;
      }
      req.invoicesPerm = perm;
      next();
    } catch (error) {
      logger.error({ error }, 'Invoices permission middleware failed');
      res.status(500).json({ success: false, error: 'Failed to resolve Invoices permission' });
    }
  };
}
