import type { Response } from 'express';
import { canAccess, type AppRole } from '../services/app-permissions.service';

/**
 * Assert that the caller can delete a record. Writes a 403 or 404
 * to the response and returns false if the check fails; returns
 * true if the caller is allowed to proceed.
 *
 * Admins with blanket 'delete' permission always pass. Editors with
 * 'delete_own' pass only when recordOwnerUserId matches the caller.
 * Viewers always get 403.
 *
 * Returns 404 (not 403) when the record belongs to someone else —
 * matches the existing-not-leaked pattern used by the Invoices/HR
 * controllers.
 *
 * Lives in middleware/ rather than services/ so the app-permissions
 * service can remain framework-agnostic (no Express imports).
 */
export function assertCanDelete(
  res: Response,
  role: AppRole,
  recordOwnerUserId: string | null | undefined,
  currentUserId: string,
): boolean {
  if (canAccess(role, 'delete')) return true;
  if (!canAccess(role, 'delete_own')) {
    res.status(403).json({ success: false, error: 'No permission to delete' });
    return false;
  }
  if (recordOwnerUserId !== currentUserId) {
    res.status(404).json({ success: false, error: 'Not found' });
    return false;
  }
  return true;
}
