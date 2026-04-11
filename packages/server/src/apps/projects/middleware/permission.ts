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
      projectsPerm?: ResolvedAppPermission;
    }
  }
}

/**
 * Express middleware factory that checks the caller's Projects app permission
 * for a given operation. Attaches the resolved permission to `req.projectsPerm`
 * so downstream handlers can reuse it without re-querying.
 */
export function requireProjectsPermission(operation: AppOperation) {
  return async function projectsPermissionMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.auth!.userId;
      const tenantId = req.auth?.tenantId;
      const perm = await getAppPermission(tenantId, userId, 'projects');
      if (!canAccess(perm.role, operation)) {
        res.status(403).json({ success: false, error: 'No permission to access projects' });
        return;
      }
      req.projectsPerm = perm;
      next();
    } catch (error) {
      logger.error({ error }, 'Projects permission middleware failed');
      res.status(500).json({ success: false, error: 'Failed to resolve Projects permission' });
    }
  };
}
