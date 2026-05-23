import { db } from '../../../config/database';
import { projectTimeEntries, projectProjects, users } from '../../../db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

// ─── Team time report (admin-only) ───────────────────────────────────
//
// Aggregates project_time_entries for a tenant over a [from, to] date range
// (inclusive, YYYY-MM-DD work_date strings) into a per-user report with
// per-project and per-task breakdowns.

export interface TimeReportProjectBreakdown {
  projectId: string;
  projectName: string;
  projectColor: string | null;
  minutes: number;
}

export interface TimeReportTaskBreakdown {
  taskId: string | null;
  taskDescription: string;
  minutes: number;
}

export interface TimeReportUser {
  userId: string;
  userName: string;
  totalMinutes: number;
  billableMinutes: number;
  entryCount: number;
  byProject: TimeReportProjectBreakdown[];
  byTask: TimeReportTaskBreakdown[];
}

export interface TeamTimeReport {
  from: string;
  to: string;
  totalMinutes: number;
  totalBillableMinutes: number;
  users: TimeReportUser[];
}

// Default range = first..last day of the current month (UTC).
export function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const pad = (n: number) => String(n).padStart(2, '0');
  const first = `${y}-${pad(m + 1)}-01`;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const last = `${y}-${pad(m + 1)}-${pad(lastDay)}`;
  return { from: first, to: last };
}

export async function getTeamTimeReport(
  tenantId: string,
  opts: { from?: string; to?: string } = {},
): Promise<TeamTimeReport> {
  const def = defaultRange();
  const from = opts.from || def.from;
  const to = opts.to || def.to;

  // Single tenant-scoped pull joined to user + project names. Aggregation is
  // assembled in JS — the row count for one tenant/month is small.
  const rows = await db
    .select({
      userId: projectTimeEntries.userId,
      userName: users.name,
      projectId: projectTimeEntries.projectId,
      projectName: projectProjects.name,
      projectColor: projectProjects.color,
      taskId: projectTimeEntries.taskId,
      taskDescription: projectTimeEntries.taskDescription,
      durationMinutes: projectTimeEntries.durationMinutes,
      billable: projectTimeEntries.billable,
    })
    .from(projectTimeEntries)
    .leftJoin(users, eq(projectTimeEntries.userId, users.id))
    .leftJoin(projectProjects, eq(projectTimeEntries.projectId, projectProjects.id))
    .where(
      and(
        eq(projectTimeEntries.tenantId, tenantId),
        eq(projectTimeEntries.isArchived, false),
        gte(projectTimeEntries.workDate, from),
        lte(projectTimeEntries.workDate, to),
      ),
    );

  interface UserAcc {
    userId: string;
    userName: string;
    totalMinutes: number;
    billableMinutes: number;
    entryCount: number;
    byProject: Map<string, TimeReportProjectBreakdown>;
    byTask: Map<string, TimeReportTaskBreakdown>;
  }
  const userMap = new Map<string, UserAcc>();
  let totalMinutes = 0;
  let totalBillableMinutes = 0;

  for (const row of rows) {
    const minutes = Number(row.durationMinutes) || 0;
    totalMinutes += minutes;
    if (row.billable) totalBillableMinutes += minutes;

    let acc = userMap.get(row.userId);
    if (!acc) {
      acc = {
        userId: row.userId,
        userName: row.userName || 'Unknown',
        totalMinutes: 0,
        billableMinutes: 0,
        entryCount: 0,
        byProject: new Map(),
        byTask: new Map(),
      };
      userMap.set(row.userId, acc);
    }
    acc.totalMinutes += minutes;
    if (row.billable) acc.billableMinutes += minutes;
    acc.entryCount += 1;

    // Per-project breakdown.
    const pKey = row.projectId;
    const proj = acc.byProject.get(pKey);
    if (proj) {
      proj.minutes += minutes;
    } else {
      acc.byProject.set(pKey, {
        projectId: row.projectId,
        projectName: row.projectName || 'Unknown project',
        projectColor: row.projectColor ?? null,
        minutes,
      });
    }

    // Per-task breakdown. Group untasked time under a single bucket.
    const tKey = row.taskId ?? '__none__';
    const desc = row.taskDescription || (row.taskId ? 'Task' : 'Untasked');
    const task = acc.byTask.get(tKey);
    if (task) {
      task.minutes += minutes;
    } else {
      acc.byTask.set(tKey, { taskId: row.taskId ?? null, taskDescription: desc, minutes });
    }
  }

  const usersOut: TimeReportUser[] = Array.from(userMap.values())
    .map((acc) => ({
      userId: acc.userId,
      userName: acc.userName,
      totalMinutes: acc.totalMinutes,
      billableMinutes: acc.billableMinutes,
      entryCount: acc.entryCount,
      byProject: Array.from(acc.byProject.values()).sort((a, b) => b.minutes - a.minutes),
      byTask: Array.from(acc.byTask.values()).sort((a, b) => b.minutes - a.minutes),
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);

  return { from, to, totalMinutes, totalBillableMinutes, users: usersOut };
}
