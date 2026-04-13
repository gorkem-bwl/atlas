import type { Request, Response, NextFunction } from 'express';
import { eq, and } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { IF_UNMODIFIED_SINCE_HEADER, STALE_RESOURCE_CODE } from '@atlas-platform/shared';
import { db } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Optimistic concurrency control middleware.
 *
 * Reads the client's `If-Unmodified-Since` header (ISO timestamp) or
 * falls back to `req.body.updatedAt`. Looks up the record's current
 * updated_at in the DB. If the stored timestamp is newer, returns 409
 * with the current updatedAt so the client can show a conflict dialog.
 *
 * ## Scope
 * - Single-record PATCH/PUT endpoints where `req.params.id` identifies
 *   the record and the record is tenant-scoped (`req.auth.tenantId`).
 * - Does NOT cover bulk operations (bulk-save, reorder, etc.) — those
 *   carry low collision risk and would need per-row checks.
 * - Does NOT cover composite operations (e.g. update-deal-and-log-activity);
 *   the middleware only guards the primary record.
 *
 * ## Rollout mode
 * Lenient by default: if the client doesn't send a version, the check
 * is skipped (pass-through). This lets us ship the middleware before
 * every mutation call site is updated. Flip to `strict: true` on a per-
 * route basis (or globally) once all callers send the header.
 *
 * ## Caveats
 * - `updatedAt` is millisecond-precision after JSON serialization.
 *   Two updates within the same ms would pass the check. For human
 *   editing this is effectively never an issue; upgrade to a version
 *   counter if high-frequency automated writes appear.
 * - The middleware adds one extra SELECT per write. At tenant scale
 *   this is negligible. Revisit if write throughput becomes a concern.
 *
 * ## Usage
 * ```ts
 * import { withConcurrencyCheck } from '../../middleware/concurrency-check';
 * import { crmDeals } from '../../db/schema';
 *
 * router.patch('/deals/:id',
 *   withConcurrencyCheck(crmDeals),
 *   dealsController.updateDeal,
 * );
 * ```
 */

interface ConcurrencyOptions {
  /**
   * If true, reject requests that don't send a version. Default: false
   * (lenient — skip the check when no version is provided).
   */
  strict?: boolean;
  /**
   * Name of the route param carrying the record id. Default: 'id'.
   */
  idParam?: string;
  /**
   * If the record isn't tenant-scoped (admin/system ops), set to true
   * to skip the tenant filter. Default: false.
   */
  skipTenantCheck?: boolean;
}

export function withConcurrencyCheck(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: PgTable<any>,
  options: ConcurrencyOptions = {},
) {
  const { strict = false, idParam = 'id', skipTenantCheck = false } = options;

  return async function concurrencyCheck(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const recordId = req.params[idParam];
      if (!recordId) return next();

      const clientVersion =
        req.header(IF_UNMODIFIED_SINCE_HEADER) ||
        (typeof req.body?.updatedAt === 'string' ? req.body.updatedAt : null);

      if (!clientVersion) {
        if (strict) {
          res.status(400).json({
            success: false,
            error: `Missing ${IF_UNMODIFIED_SINCE_HEADER} header (required for concurrency control)`,
          });
          return;
        }
        // Track lenient-mode skips so we can audit which routes still
        // receive version-less writes before flipping to strict.
        logger.debug({ path: req.path, method: req.method }, 'concurrency check skipped (no client version)');
        return next();
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = table as any;
      const conditions = [eq(t.id, recordId)];

      if (!skipTenantCheck && t.tenantId && req.auth?.tenantId) {
        conditions.push(eq(t.tenantId, req.auth.tenantId));
      }

      const [row] = await db
        .select({ updatedAt: t.updatedAt })
        .from(table)
        .where(and(...conditions))
        .limit(1);

      if (!row) return next();

      const storedDate = new Date(row.updatedAt as Date | string);
      const storedAt = storedDate.getTime();
      const clientAt = new Date(clientVersion).getTime();

      if (Number.isNaN(clientAt)) {
        if (strict) {
          res.status(400).json({ success: false, error: `Invalid ${IF_UNMODIFIED_SINCE_HEADER} value` });
          return;
        }
        return next();
      }

      if (storedAt > clientAt) {
        res.status(409).json({
          success: false,
          error: 'conflict',
          code: STALE_RESOURCE_CODE,
          current: { updatedAt: storedDate.toISOString() },
        });
        return;
      }

      return next();
    } catch (error) {
      logger.error({ error }, 'Concurrency check failed');
      // Fail-open: don't block writes on middleware errors. Log and continue.
      return next();
    }
  };
}
