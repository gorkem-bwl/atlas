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
      drawPerm?: ResolvedAppPermission;
    }
  }
}

/**
 * Express middleware factory that checks the caller's Draw app permission
 * for a given operation. Attaches the resolved permission to `req.drawPerm`
 * so downstream handlers can reuse it without re-querying.
 */
export function requireDrawPermission(operation: AppOperation) {
  return async function drawPermissionMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.auth!.userId;
      const tenantId = req.auth?.tenantId;
      const perm = await getAppPermission(tenantId, userId, 'draw');
      if (!canAccess(perm.role, operation)) {
        res.status(403).json({ success: false, error: 'No permission to access drawings' });
        return;
      }
      req.drawPerm = perm;
      next();
    } catch (error) {
      logger.error({ error }, 'Draw permission middleware failed');
      res.status(500).json({ success: false, error: 'Failed to resolve Draw permission' });
    }
  };
}
