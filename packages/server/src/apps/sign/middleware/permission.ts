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
      signPerm?: ResolvedAppPermission;
    }
  }
}

/**
 * Express middleware factory that checks the caller's Sign app permission
 * for a given operation. Attaches the resolved permission to `req.signPerm`
 * so downstream handlers can reuse it without re-querying.
 *
 * Mounted after authMiddleware but NOT on the public signer routes, which
 * live before the auth middleware in sign/routes.ts.
 */
export function requireSignPermission(operation: AppOperation) {
  return async function signPermissionMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.auth!.userId;
      const tenantId = req.auth?.tenantId;
      const perm = await getAppPermission(tenantId, userId, 'sign');
      if (!canAccess(perm.role, operation)) {
        res.status(403).json({ success: false, error: 'No permission to access Sign records' });
        return;
      }
      req.signPerm = perm;
      next();
    } catch (error) {
      logger.error({ error }, 'Sign permission middleware failed');
      res.status(500).json({ success: false, error: 'Failed to resolve Sign permission' });
    }
  };
}
