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
      docsPerm?: ResolvedAppPermission;
    }
  }
}

/**
 * Express middleware factory that checks the caller's Docs app permission
 * for a given operation. Attaches the resolved permission to `req.docsPerm`
 * so downstream handlers can reuse it without re-querying.
 */
export function requireDocsPermission(operation: AppOperation) {
  return async function docsPermissionMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.auth!.userId;
      const tenantId = req.auth?.tenantId;
      const perm = await getAppPermission(tenantId, userId, 'docs');
      if (!canAccess(perm.role, operation)) {
        res.status(403).json({ success: false, error: 'No permission to access documents' });
        return;
      }
      req.docsPerm = perm;
      next();
    } catch (error) {
      logger.error({ error }, 'Docs permission middleware failed');
      res.status(500).json({ success: false, error: 'Failed to resolve Docs permission' });
    }
  };
}
