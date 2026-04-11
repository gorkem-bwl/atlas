import type { Request, Response } from 'express';
import * as projectService from '../service';
import { logger } from '../../../utils/logger';
import { getAppPermission, canAccess } from '../../../services/app-permissions.service';

// ─── Time Entries ───────────────────────────────────────────────────

export async function listTimeEntries(req: Request, res: Response) {
  try {
    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'projects');
    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const { projectId, startDate, endDate, billed, billable, entryUserId, includeArchived } = req.query;

    const isAdmin = perm.role === 'admin';
    const entries = await projectService.listTimeEntries(userId, tenantId, {
      projectId: projectId as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      billed: billed !== undefined ? billed === 'true' : undefined,
      billable: billable !== undefined ? billable === 'true' : undefined,
      entryUserId: entryUserId as string | undefined,
      includeArchived: includeArchived === 'true',
      isAdmin,
    });

    res.json({ success: true, data: { entries } });
  } catch (error) {
    logger.error({ error }, 'Failed to list time entries');
    res.status(500).json({ success: false, error: 'Failed to list time entries' });
  }
}

export async function getTimeEntry(req: Request, res: Response) {
  try {
    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'projects');
    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const id = req.params.id as string;

    // Non-admins can only read their own time entries.
    const isAdmin = perm.role === 'admin';
    const entry = await projectService.getTimeEntry(userId, tenantId, id, isAdmin ? undefined : userId);
    if (!entry) {
      res.status(404).json({ success: false, error: 'Time entry not found' });
      return;
    }

    res.json({ success: true, data: entry });
  } catch (error) {
    logger.error({ error }, 'Failed to get time entry');
    res.status(500).json({ success: false, error: 'Failed to get time entry' });
  }
}

export async function createTimeEntry(req: Request, res: Response) {
  try {
    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'projects');
    if (!canAccess(perm.role, 'create')) {
      res.status(403).json({ success: false, error: 'No permission to create in projects' });
      return;
    }

    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const { projectId, durationMinutes, workDate, startTime, endTime, billable, notes, taskDescription } = req.body;

    if (!projectId || !workDate) {
      res.status(400).json({ success: false, error: 'projectId and workDate are required' });
      return;
    }

    const isAdmin = perm.role === 'admin';
    let entry;
    try {
      entry = await projectService.createTimeEntry(userId, tenantId, {
        projectId, durationMinutes: durationMinutes || 0, workDate, startTime, endTime, billable, notes, taskDescription,
      }, { isAdmin });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create time entry';
      if (msg === 'No access to this project' || msg === 'Project not found') {
        res.status(403).json({ success: false, error: msg });
        return;
      }
      throw err;
    }

    res.json({ success: true, data: entry });
  } catch (error) {
    logger.error({ error }, 'Failed to create time entry');
    res.status(500).json({ success: false, error: 'Failed to create time entry' });
  }
}

export async function updateTimeEntry(req: Request, res: Response) {
  try {
    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'projects');
    if (!canAccess(perm.role, 'update')) {
      res.status(403).json({ success: false, error: 'No permission to update in projects' });
      return;
    }

    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const id = req.params.id as string;
    const { projectId, durationMinutes, workDate, startTime, endTime, billable, billed, locked, notes, taskDescription, sortOrder, isArchived } = req.body;

    // Non-admins can only update their own time entries.
    const isAdmin = perm.role === 'admin';
    const scopedUserId = isAdmin ? undefined : userId;
    const entry = await projectService.updateTimeEntry(userId, tenantId, id, {
      projectId, durationMinutes, workDate, startTime, endTime, billable, billed, locked, notes, taskDescription, sortOrder, isArchived,
    }, scopedUserId);

    if (!entry) {
      res.status(404).json({ success: false, error: 'Time entry not found' });
      return;
    }

    res.json({ success: true, data: entry });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Cannot edit a locked time entry') {
      res.status(409).json({ success: false, error: error.message });
      return;
    }
    logger.error({ error }, 'Failed to update time entry');
    res.status(500).json({ success: false, error: 'Failed to update time entry' });
  }
}

export async function deleteTimeEntry(req: Request, res: Response) {
  try {
    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'projects');
    if (!canAccess(perm.role, 'delete') && !canAccess(perm.role, 'delete_own')) {
      res.status(403).json({ success: false, error: 'No permission to delete in projects' });
      return;
    }

    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const id = req.params.id as string;

    // Non-admins can only delete their own time entries.
    const isAdmin = perm.role === 'admin';
    await projectService.deleteTimeEntry(userId, tenantId, id, isAdmin ? undefined : userId);
    res.json({ success: true, data: null });
  } catch (error) {
    logger.error({ error }, 'Failed to delete time entry');
    res.status(500).json({ success: false, error: 'Failed to delete time entry' });
  }
}

export async function bulkLockEntries(req: Request, res: Response) {
  try {
    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'projects');
    if (!canAccess(perm.role, 'update')) {
      res.status(403).json({ success: false, error: 'No permission to update in projects' });
      return;
    }

    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const { entryIds, locked } = req.body;

    if (!Array.isArray(entryIds) || entryIds.length === 0) {
      res.status(400).json({ success: false, error: 'entryIds array is required' });
      return;
    }

    // Non-admins can only lock/unlock their own time entries.
    const isAdmin = perm.role === 'admin';
    await projectService.bulkLockEntries(userId, tenantId, entryIds, locked ?? true, isAdmin ? undefined : userId);
    res.json({ success: true, data: null });
  } catch (error) {
    logger.error({ error }, 'Failed to bulk lock entries');
    res.status(500).json({ success: false, error: 'Failed to bulk lock entries' });
  }
}

export async function getWeeklyView(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const weekStart = req.query.weekStart as string;

    if (!weekStart) {
      res.status(400).json({ success: false, error: 'weekStart query parameter is required' });
      return;
    }

    const entries = await projectService.getWeeklyView(userId, tenantId, weekStart);
    res.json({ success: true, data: { entries } });
  } catch (error) {
    logger.error({ error }, 'Failed to get weekly view');
    res.status(500).json({ success: false, error: 'Failed to get weekly view' });
  }
}

// ─── Bulk Time Entry Operations ───────────────────────────────────────

export async function bulkSaveTimeEntries(req: Request, res: Response) {
  try {
    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'projects');
    if (!canAccess(perm.role, 'create')) {
      res.status(403).json({ success: false, error: 'No permission to create in projects' });
      return;
    }

    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const { entries } = req.body;

    if (!Array.isArray(entries)) {
      res.status(400).json({ success: false, error: 'entries array is required' });
      return;
    }

    const created = await projectService.bulkSaveTimeEntries(userId, tenantId, entries);
    res.json({ success: true, data: created });
  } catch (error) {
    logger.error({ error }, 'Failed to bulk save time entries');
    res.status(500).json({ success: false, error: 'Failed to bulk save time entries' });
  }
}

export async function copyLastWeek(req: Request, res: Response) {
  try {
    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'projects');
    if (!canAccess(perm.role, 'create')) {
      res.status(403).json({ success: false, error: 'No permission to create in projects' });
      return;
    }

    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;
    const { weekStart } = req.body;

    if (!weekStart) {
      res.status(400).json({ success: false, error: 'weekStart is required' });
      return;
    }

    const created = await projectService.copyLastWeek(userId, tenantId, weekStart);
    res.json({ success: true, data: created });
  } catch (error) {
    logger.error({ error }, 'Failed to copy last week entries');
    res.status(500).json({ success: false, error: 'Failed to copy last week entries' });
  }
}
