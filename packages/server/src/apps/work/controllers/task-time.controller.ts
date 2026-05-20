import type { Request, Response } from 'express';
import * as taskTime from '../services/task-time.service';
import { canAccess } from '../../../services/app-permissions.service';
import { logger } from '../../../utils/logger';

// Maps service errors to HTTP status codes. The service throws plain
// Errors with stable messages; everything else is a 500.
function sendServiceError(res: Response, err: unknown, fallback: string) {
  const msg = err instanceof Error ? err.message : fallback;
  if (msg === 'No access to this project' || msg === 'Project not found') {
    res.status(403).json({ success: false, error: msg });
    return;
  }
  if (msg === 'Task not found') {
    res.status(404).json({ success: false, error: msg });
    return;
  }
  if (msg === 'Task must be attached to a project to track time') {
    res.status(400).json({ success: false, error: msg });
    return;
  }
  logger.error({ err }, fallback);
  res.status(500).json({ success: false, error: fallback });
}

export async function listTaskTimeEntries(req: Request, res: Response) {
  try {
    const tenantId = req.auth!.tenantId!;
    const taskId = req.params.id as string;
    const [entries, totalMinutes] = await Promise.all([
      taskTime.listByTask(req.auth!.userId, tenantId, taskId),
      taskTime.getTaskTotalMinutes(tenantId, taskId),
    ]);
    res.json({ success: true, data: { entries, totalMinutes } });
  } catch (error) {
    logger.error({ error }, 'Failed to list task time entries');
    res.status(500).json({ success: false, error: 'Failed to list task time entries' });
  }
}

export async function createTaskTimeEntry(req: Request, res: Response) {
  try {
    const perm = req.workPerm!;
    if (!canAccess(perm.role, 'create')) {
      res.status(403).json({ success: false, error: 'No permission to create time entries' });
      return;
    }
    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId!;
    const taskId = req.params.id as string;
    const { projectId, durationMinutes, workDate, startTime, endTime, notes, tags } = req.body;
    const entry = await taskTime.logTime(userId, tenantId, {
      taskId, projectId, durationMinutes: durationMinutes || 0, workDate, startTime, endTime, notes, tags,
    }, { isAdmin: perm.role === 'admin' });
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    sendServiceError(res, error, 'Failed to create task time entry');
  }
}

export async function updateTaskTimeEntry(req: Request, res: Response) {
  try {
    const perm = req.workPerm!;
    if (!canAccess(perm.role, 'update')) {
      res.status(403).json({ success: false, error: 'No permission to update time entries' });
      return;
    }
    const entryId = req.params.entryId as string;
    const { durationMinutes, workDate, startTime, endTime, notes, tags } = req.body;
    const updated = await taskTime.updateEntry(req.auth!.userId, req.auth!.tenantId!, entryId, {
      durationMinutes, workDate, startTime, endTime, notes, tags,
    });
    if (!updated) {
      res.status(404).json({ success: false, error: 'Time entry not found' });
      return;
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error({ error }, 'Failed to update task time entry');
    res.status(500).json({ success: false, error: 'Failed to update task time entry' });
  }
}

export async function deleteTaskTimeEntry(req: Request, res: Response) {
  try {
    const perm = req.workPerm!;
    if (!canAccess(perm.role, 'delete') && !canAccess(perm.role, 'delete_own')) {
      res.status(403).json({ success: false, error: 'No permission to delete time entries' });
      return;
    }
    const ok = await taskTime.deleteEntry(req.auth!.userId, req.auth!.tenantId!, req.params.entryId as string);
    if (!ok) {
      res.status(404).json({ success: false, error: 'Time entry not found' });
      return;
    }
    res.json({ success: true, data: null });
  } catch (error) {
    logger.error({ error }, 'Failed to delete task time entry');
    res.status(500).json({ success: false, error: 'Failed to delete task time entry' });
  }
}

// ─── Live timer ─────────────────────────────────────────────────────
export async function getActiveTimer(req: Request, res: Response) {
  try {
    const timer = await taskTime.getActiveTimer(req.auth!.userId, req.auth!.tenantId!);
    res.json({ success: true, data: timer });
  } catch (error) {
    logger.error({ error }, 'Failed to get active timer');
    res.status(500).json({ success: false, error: 'Failed to get active timer' });
  }
}

export async function startTaskTimer(req: Request, res: Response) {
  try {
    const perm = req.workPerm!;
    if (!canAccess(perm.role, 'create')) {
      res.status(403).json({ success: false, error: 'No permission to track time' });
      return;
    }
    const taskId = req.params.id as string;
    const { projectId, note } = req.body;
    const timer = await taskTime.startTimer(
      req.auth!.userId, req.auth!.tenantId!, taskId, projectId, note, { isAdmin: perm.role === 'admin' },
    );
    res.status(201).json({ success: true, data: timer });
  } catch (error) {
    sendServiceError(res, error, 'Failed to start timer');
  }
}

export async function stopTaskTimer(req: Request, res: Response) {
  try {
    const entry = await taskTime.stopTimer(req.auth!.userId, req.auth!.tenantId!);
    if (!entry) {
      res.status(404).json({ success: false, error: 'No running timer' });
      return;
    }
    res.json({ success: true, data: entry });
  } catch (error) {
    logger.error({ error }, 'Failed to stop timer');
    res.status(500).json({ success: false, error: 'Failed to stop timer' });
  }
}

export async function cancelTaskTimer(req: Request, res: Response) {
  try {
    const ok = await taskTime.cancelTimer(req.auth!.userId, req.auth!.tenantId!);
    res.json({ success: true, data: { cancelled: ok } });
  } catch (error) {
    logger.error({ error }, 'Failed to cancel timer');
    res.status(500).json({ success: false, error: 'Failed to cancel timer' });
  }
}
