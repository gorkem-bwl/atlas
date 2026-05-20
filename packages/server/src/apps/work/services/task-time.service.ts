import { db } from '../../../config/database';
import {
  taskTimeEntries, activeTimers, tasks, projectProjects, projectMembers, userSettings,
} from '../../../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { logger } from '../../../utils/logger';
import { getAccountIdForUser } from '../../../utils/account-lookup';

// ─── Timezone helpers ───────────────────────────────────────────────
// Time entries store a local work_date (YYYY-MM-DD) and HH:MM clock
// times. Those must reflect the user's configured timezone, not the
// server's UTC clock — otherwise a timer stopped at 00:30 local lands on
// the wrong calendar day. We resolve the timezone from user_settings and
// derive the parts with Intl, falling back to UTC when unset/invalid.
async function resolveTimezone(userId: string): Promise<string> {
  const accountId = await getAccountIdForUser(userId);
  if (!accountId) return 'UTC';
  const [settings] = await db
    .select({ timezone: userSettings.timezone })
    .from(userSettings)
    .where(eq(userSettings.accountId, accountId))
    .limit(1);
  const tz = settings?.timezone?.trim();
  if (!tz) return 'UTC';
  try {
    // Throws RangeError for an invalid IANA zone.
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
    return tz;
  } catch {
    logger.warn({ userId, tz }, 'Invalid user timezone, falling back to UTC');
    return 'UTC';
  }
}

// YYYY-MM-DD for `date` rendered in `timeZone`.
function workDateIn(date: Date, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

// HH:MM (24h) for `date` rendered in `timeZone`.
function clockTimeIn(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}

// ─── Access control ─────────────────────────────────────────────────
// A task is trackable only when it belongs to a project the user can
// reach. Mirrors the membership rule used by project time entries.
async function assertProjectAccess(userId: string, tenantId: string, projectId: string, isAdmin?: boolean) {
  const [project] = await db
    .select({ id: projectProjects.id, ownerId: projectProjects.userId })
    .from(projectProjects)
    .where(and(eq(projectProjects.id, projectId), eq(projectProjects.tenantId, tenantId)))
    .limit(1);
  if (!project) throw new Error('Project not found');
  if (isAdmin || project.ownerId === userId) return;
  const [member] = await db
    .select({ id: projectMembers.id })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .limit(1);
  if (!member) throw new Error('No access to this project');
}

// Loads the task within the tenant and, when `projectId` is supplied for
// a project-less task, attaches it (the inline-picker flow). Returns the
// effective project id for the entry, or throws if none is resolvable.
async function resolveTaskProject(
  userId: string, tenantId: string, taskId: string, projectId?: string | null, isAdmin?: boolean,
): Promise<string> {
  const [task] = await db
    .select({ id: tasks.id, projectId: tasks.projectId })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId)))
    .limit(1);
  if (!task) throw new Error('Task not found');

  const effectiveProjectId = task.projectId ?? projectId ?? null;
  if (!effectiveProjectId) {
    throw new Error('Task must be attached to a project to track time');
  }
  await assertProjectAccess(userId, tenantId, effectiveProjectId, isAdmin);

  // Attach the project to the task if it had none (inline-picker flow).
  if (!task.projectId) {
    await db.update(tasks)
      .set({ projectId: effectiveProjectId, updatedAt: new Date() })
      .where(and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId)));
    logger.info({ taskId, projectId: effectiveProjectId }, 'Task attached to project for time tracking');
  }
  return effectiveProjectId;
}

// ─── Input types ────────────────────────────────────────────────────
interface LogTimeInput {
  taskId: string;
  projectId?: string | null;   // required only when the task has no project yet
  durationMinutes: number;
  workDate?: string | null;    // defaults to "today" in the user's timezone
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
  tags?: string[];
}

// ─── Manual entry ───────────────────────────────────────────────────
export async function logTime(userId: string, tenantId: string, input: LogTimeInput, options?: { isAdmin?: boolean }) {
  const projectId = await resolveTaskProject(userId, tenantId, input.taskId, input.projectId, options?.isAdmin);
  const tz = await resolveTimezone(userId);
  const now = new Date();

  const [created] = await db
    .insert(taskTimeEntries)
    .values({
      tenantId,
      userId,
      taskId: input.taskId,
      projectId,
      durationMinutes: Math.max(0, Math.round(input.durationMinutes)),
      workDate: input.workDate ?? workDateIn(now, tz),
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      notes: input.notes ?? null,
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  logger.info({ userId, taskTimeEntryId: created.id }, 'Task time entry logged');
  return created;
}

export async function listByTask(userId: string, tenantId: string, taskId: string) {
  return db
    .select()
    .from(taskTimeEntries)
    .where(and(eq(taskTimeEntries.tenantId, tenantId), eq(taskTimeEntries.taskId, taskId)))
    .orderBy(desc(taskTimeEntries.workDate), desc(taskTimeEntries.createdAt));
}

export async function getTaskTotalMinutes(tenantId: string, taskId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(${taskTimeEntries.durationMinutes}), 0)` })
    .from(taskTimeEntries)
    .where(and(eq(taskTimeEntries.tenantId, tenantId), eq(taskTimeEntries.taskId, taskId)));
  return Number(row?.total ?? 0);
}

export async function updateEntry(userId: string, tenantId: string, id: string, input: Partial<LogTimeInput>) {
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.durationMinutes !== undefined) patch.durationMinutes = Math.max(0, Math.round(input.durationMinutes));
  if (input.workDate !== undefined) patch.workDate = input.workDate;
  if (input.startTime !== undefined) patch.startTime = input.startTime;
  if (input.endTime !== undefined) patch.endTime = input.endTime;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.tags !== undefined) patch.tags = input.tags;

  const [updated] = await db
    .update(taskTimeEntries)
    .set(patch)
    .where(and(eq(taskTimeEntries.id, id), eq(taskTimeEntries.tenantId, tenantId), eq(taskTimeEntries.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function deleteEntry(userId: string, tenantId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(taskTimeEntries)
    .where(and(eq(taskTimeEntries.id, id), eq(taskTimeEntries.tenantId, tenantId), eq(taskTimeEntries.userId, userId)))
    .returning({ id: taskTimeEntries.id });
  return deleted.length > 0;
}

// ─── Live timer ─────────────────────────────────────────────────────
export async function getActiveTimer(userId: string, tenantId: string) {
  const [timer] = await db
    .select()
    .from(activeTimers)
    .where(and(eq(activeTimers.tenantId, tenantId), eq(activeTimers.userId, userId)))
    .limit(1);
  return timer ?? null;
}

// Starts a timer for a task. One per user — starting a new one while
// another runs auto-stops the previous (writes its entry first).
export async function startTimer(
  userId: string, tenantId: string, taskId: string, projectId?: string | null, note?: string | null, options?: { isAdmin?: boolean },
) {
  const existing = await getActiveTimer(userId, tenantId);
  if (existing) {
    await stopTimer(userId, tenantId, options);
  }
  const effectiveProjectId = await resolveTaskProject(userId, tenantId, taskId, projectId, options?.isAdmin);
  const now = new Date();
  const [timer] = await db
    .insert(activeTimers)
    .values({ tenantId, userId, taskId, projectId: effectiveProjectId, startedAt: now, note: note ?? null, createdAt: now })
    .returning();
  logger.info({ userId, taskId, timerId: timer.id }, 'Task timer started');
  return timer;
}

// Stops the running timer, converting elapsed time into a task time
// entry stamped in the user's timezone. Returns the created entry, or
// null when no timer was running.
export async function stopTimer(userId: string, tenantId: string, options?: { isAdmin?: boolean }) {
  const timer = await getActiveTimer(userId, tenantId);
  if (!timer) return null;

  const tz = await resolveTimezone(userId);
  const startedAt = new Date(timer.startedAt);
  const endedAt = new Date();
  const durationMinutes = Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));

  const [created] = await db
    .insert(taskTimeEntries)
    .values({
      tenantId,
      userId,
      taskId: timer.taskId,
      projectId: timer.projectId,
      durationMinutes,
      workDate: workDateIn(startedAt, tz),
      startTime: clockTimeIn(startedAt, tz),
      endTime: clockTimeIn(endedAt, tz),
      notes: timer.note ?? null,
      tags: [],
      createdAt: endedAt,
      updatedAt: endedAt,
    })
    .returning();

  await db.delete(activeTimers).where(eq(activeTimers.id, timer.id));
  logger.info({ userId, taskTimeEntryId: created.id, durationMinutes }, 'Task timer stopped');
  return created;
}

// Discards a running timer without recording an entry.
export async function cancelTimer(userId: string, tenantId: string): Promise<boolean> {
  const deleted = await db
    .delete(activeTimers)
    .where(and(eq(activeTimers.tenantId, tenantId), eq(activeTimers.userId, userId)))
    .returning({ id: activeTimers.id });
  return deleted.length > 0;
}
