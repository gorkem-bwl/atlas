import { db } from '../../../config/database';
import {
  projectTimeEntries, activeTimers, tasks, projectProjects, projectMembers, userSettings,
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
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
    return tz;
  } catch {
    logger.warn({ userId, tz }, 'Invalid user timezone, falling back to UTC');
    return 'UTC';
  }
}

function workDateIn(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

function clockTimeIn(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}

// ─── Access control ─────────────────────────────────────────────────
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
// effective project id and the task title (for the entry's description).
async function resolveTaskProject(
  userId: string, tenantId: string, taskId: string, projectId?: string | null, isAdmin?: boolean,
): Promise<{ projectId: string; title: string }> {
  const [task] = await db
    .select({ id: tasks.id, projectId: tasks.projectId, title: tasks.title })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId)))
    .limit(1);
  if (!task) throw new Error('Task not found');

  const effectiveProjectId = task.projectId ?? projectId ?? null;
  if (!effectiveProjectId) {
    throw new Error('Task must be attached to a project to track time');
  }
  await assertProjectAccess(userId, tenantId, effectiveProjectId, isAdmin);

  if (!task.projectId) {
    await db.update(tasks)
      .set({ projectId: effectiveProjectId, updatedAt: new Date() })
      .where(and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId)));
    logger.info({ taskId, projectId: effectiveProjectId }, 'Task attached to project for time tracking');
  }
  return { projectId: effectiveProjectId, title: task.title };
}

async function getTaskTitle(tenantId: string, taskId: string): Promise<string> {
  const [task] = await db
    .select({ title: tasks.title })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId)))
    .limit(1);
  return task?.title || 'Task';
}

// ─── Input types ────────────────────────────────────────────────────
interface LogTimeInput {
  taskId: string;
  projectId?: string | null;
  durationMinutes: number;
  workDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  notes?: string | null;
  tags?: string[];
}

// ─── Manual entry ───────────────────────────────────────────────────
export async function logTime(userId: string, tenantId: string, input: LogTimeInput, options?: { isAdmin?: boolean }) {
  const { projectId, title } = await resolveTaskProject(userId, tenantId, input.taskId, input.projectId, options?.isAdmin);
  const tz = await resolveTimezone(userId);
  const now = new Date();

  const [created] = await db
    .insert(projectTimeEntries)
    .values({
      tenantId,
      userId,
      projectId,
      taskId: input.taskId,
      durationMinutes: Math.max(0, Math.round(input.durationMinutes)),
      workDate: input.workDate ?? workDateIn(now, tz),
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      notes: input.notes ?? null,
      taskDescription: title.slice(0, 500),
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  logger.info({ userId, timeEntryId: created.id, taskId: input.taskId }, 'Task time entry logged');
  return created;
}

export async function listByTask(userId: string, tenantId: string, taskId: string) {
  return db
    .select()
    .from(projectTimeEntries)
    .where(and(eq(projectTimeEntries.tenantId, tenantId), eq(projectTimeEntries.taskId, taskId)))
    .orderBy(desc(projectTimeEntries.workDate), desc(projectTimeEntries.createdAt));
}

export async function getTaskTotalMinutes(tenantId: string, taskId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(${projectTimeEntries.durationMinutes}), 0)` })
    .from(projectTimeEntries)
    .where(and(eq(projectTimeEntries.tenantId, tenantId), eq(projectTimeEntries.taskId, taskId)));
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
    .update(projectTimeEntries)
    .set(patch)
    .where(and(eq(projectTimeEntries.id, id), eq(projectTimeEntries.tenantId, tenantId), eq(projectTimeEntries.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function deleteEntry(userId: string, tenantId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(projectTimeEntries)
    .where(and(eq(projectTimeEntries.id, id), eq(projectTimeEntries.tenantId, tenantId), eq(projectTimeEntries.userId, userId)))
    .returning({ id: projectTimeEntries.id });
  return deleted.length > 0;
}

// ─── Live timer ─────────────────────────────────────────────────────
export async function getActiveTimer(userId: string, tenantId: string) {
  const [timer] = await db
    .select({
      id: activeTimers.id,
      tenantId: activeTimers.tenantId,
      userId: activeTimers.userId,
      taskId: activeTimers.taskId,
      projectId: activeTimers.projectId,
      startedAt: activeTimers.startedAt,
      note: activeTimers.note,
      createdAt: activeTimers.createdAt,
      taskTitle: tasks.title,
    })
    .from(activeTimers)
    .leftJoin(tasks, eq(tasks.id, activeTimers.taskId))
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
  const { projectId: effectiveProjectId } = await resolveTaskProject(userId, tenantId, taskId, projectId, options?.isAdmin);
  const now = new Date();
  // Upsert on the per-user unique index (tenant_id, user_id): the stop above
  // normally clears any prior timer, but a concurrent/double-click start can
  // race past it and hit idx_active_timers_user_unique. Rather than throwing
  // a raw 23505 → 500, gracefully replace the single active timer.
  const [timer] = await db
    .insert(activeTimers)
    .values({ tenantId, userId, taskId, projectId: effectiveProjectId, startedAt: now, note: note ?? null, createdAt: now })
    .onConflictDoUpdate({
      target: [activeTimers.tenantId, activeTimers.userId],
      set: { taskId, projectId: effectiveProjectId, startedAt: now, note: note ?? null },
    })
    .returning();
  logger.info({ userId, taskId, timerId: timer.id }, 'Task timer started');
  return timer;
}

// Stops the running timer, converting elapsed time into a project time
// entry (linked to the task) stamped in the user's timezone. Returns the
// created entry, or null when no timer was running.
export async function stopTimer(userId: string, tenantId: string, _options?: { isAdmin?: boolean }) {
  const timer = await getActiveTimer(userId, tenantId);
  if (!timer) return null;

  const tz = await resolveTimezone(userId);
  const title = await getTaskTitle(tenantId, timer.taskId);
  const startedAt = new Date(timer.startedAt);
  const endedAt = new Date();
  const durationMinutes = Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));

  const [created] = await db
    .insert(projectTimeEntries)
    .values({
      tenantId,
      userId,
      projectId: timer.projectId,
      taskId: timer.taskId,
      durationMinutes,
      workDate: workDateIn(startedAt, tz),
      startTime: clockTimeIn(startedAt, tz),
      endTime: clockTimeIn(endedAt, tz),
      notes: timer.note ?? null,
      taskDescription: title.slice(0, 500),
      tags: [],
      createdAt: endedAt,
      updatedAt: endedAt,
    })
    .returning();

  await db.delete(activeTimers).where(eq(activeTimers.id, timer.id));
  logger.info({ userId, timeEntryId: created.id, durationMinutes }, 'Task timer stopped');
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
