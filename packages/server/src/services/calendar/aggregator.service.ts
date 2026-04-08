import { db } from '../../config/database';
import {
  accounts, crmActivities, crmDeals, crmContacts,
  hrLeaveApplications, employees, hrLeaveTypes, tasks,
} from '../../db/schema';
import { eq, and, gte, lte, isNotNull, not, inArray, or } from 'drizzle-orm';
import { listEvents } from './crud.service';
import { getAppPermission, type ResolvedAppPermission } from '../app-permissions.service';
import { logger } from '../../utils/logger';

// ─── Types ──────────────────────────────────────────────────────────

export interface AggregatedEvent {
  id: string;
  source: 'google' | 'crm' | 'hr-leave' | 'task';
  sourceId: string;
  title: string;
  description?: string;
  startTime: string; // ISO
  endTime: string;   // ISO
  isAllDay: boolean;
  color: string;
  route?: string;
  metadata?: Record<string, unknown>;
}

// ─── Main aggregator ────────────────────────────────────────────────

export async function getAggregatedEvents(
  accountId: string,
  userId: string,
  tenantId: string,
  timeMin: string,
  timeMax: string,
): Promise<AggregatedEvent[]> {
  // Step 1 — Check app permissions (catch errors = no access)
  const [crmPerm, hrPerm, tasksPerm] = await Promise.all([
    getAppPermission(tenantId, userId, 'crm').catch(() => null),
    getAppPermission(tenantId, userId, 'hr').catch(() => null),
    getAppPermission(tenantId, userId, 'tasks').catch(() => null),
  ]);
  const hasCrm = crmPerm && crmPerm.role !== ('none' as string);
  const hasHr = hrPerm && hrPerm.role !== ('none' as string);
  const hasTasks = tasksPerm && tasksPerm.role !== ('none' as string);

  // Step 2 — Build data-source fetchers

  async function fetchGoogleEvents(): Promise<AggregatedEvent[]> {
    try {
      const events = await listEvents(accountId, timeMin, timeMax);
      return events.map(e => ({
        id: `google:${e.id}`,
        source: 'google' as const,
        sourceId: e.id,
        title: e.summary || '(No title)',
        description: e.description || undefined,
        startTime: new Date(e.startTime).toISOString(),
        endTime: new Date(e.endTime).toISOString(),
        isAllDay: e.isAllDay ?? false,
        color: e.colorId ? `var(--gc-color-${e.colorId})` : '#4285f4',
        metadata: { calendarId: e.calendarId, googleEventId: e.googleEventId },
      }));
    } catch {
      return [];
    }
  }

  async function fetchCrmActivities(): Promise<AggregatedEvent[]> {
    try {
      const rows = await db.select({
        id: crmActivities.id,
        type: crmActivities.type,
        body: crmActivities.body,
        scheduledAt: crmActivities.scheduledAt,
        dealTitle: crmDeals.title,
        contactName: crmContacts.name,
      })
        .from(crmActivities)
        .leftJoin(crmDeals, eq(crmActivities.dealId, crmDeals.id))
        .leftJoin(crmContacts, eq(crmActivities.contactId, crmContacts.id))
        .where(and(
          eq(crmActivities.tenantId, tenantId),
          isNotNull(crmActivities.scheduledAt),
          gte(crmActivities.scheduledAt, new Date(timeMin)),
          lte(crmActivities.scheduledAt, new Date(timeMax)),
          eq(crmActivities.isArchived, false),
        ));

      return rows.filter(r => r.scheduledAt).map(r => {
        const scheduledAt = new Date(r.scheduledAt!).toISOString();
        const endAt = new Date(new Date(r.scheduledAt!).getTime() + 60 * 60 * 1000).toISOString();
        const context = r.dealTitle || r.contactName || (r.body ? r.body.slice(0, 50) : '');
        return {
          id: `crm:${r.id}`,
          source: 'crm' as const,
          sourceId: r.id,
          title: `${r.type}${context ? ': ' + context : ''}`,
          startTime: scheduledAt,
          endTime: endAt,
          isAllDay: false,
          color: '#f97316',
          route: '/crm?view=activities',
          metadata: { type: r.type },
        };
      });
    } catch (error) {
      logger.error({ error }, 'Failed to fetch CRM activities for calendar');
      return [];
    }
  }

  async function fetchHrLeave(): Promise<AggregatedEvent[]> {
    try {
      const rows = await db.select({
        id: hrLeaveApplications.id,
        employeeId: hrLeaveApplications.employeeId,
        startDate: hrLeaveApplications.startDate,
        endDate: hrLeaveApplications.endDate,
        employeeName: employees.name,
        leaveTypeName: hrLeaveTypes.name,
        leaveTypeColor: hrLeaveTypes.color,
      })
        .from(hrLeaveApplications)
        .innerJoin(employees, eq(hrLeaveApplications.employeeId, employees.id))
        .innerJoin(hrLeaveTypes, eq(hrLeaveApplications.leaveTypeId, hrLeaveTypes.id))
        .where(and(
          eq(hrLeaveApplications.tenantId, tenantId),
          eq(hrLeaveApplications.status, 'approved'),
          lte(hrLeaveApplications.startDate, timeMax.slice(0, 10)),
          gte(hrLeaveApplications.endDate, timeMin.slice(0, 10)),
        ));

      // For HR viewer role, filter to only their own leave
      let filtered = rows;
      if (hrPerm?.role === 'viewer' && rows.length > 0) {
        const [emp] = await db.select({ id: employees.id })
          .from(employees)
          .innerJoin(accounts, eq(employees.email, accounts.email))
          .where(eq(accounts.userId, userId))
          .limit(1);
        filtered = emp ? rows.filter(r => r.employeeId === emp.id) : [];
      }

      return filtered.map(r => ({
        id: `hr:${r.id}`,
        source: 'hr-leave' as const,
        sourceId: r.id,
        title: `${r.employeeName} — ${r.leaveTypeName}`,
        startTime: new Date(r.startDate + 'T00:00:00').toISOString(),
        endTime: new Date(r.endDate + 'T23:59:59').toISOString(),
        isAllDay: true,
        color: r.leaveTypeColor || '#10b981',
        route: '/hr?view=my-leave',
      }));
    } catch (error) {
      logger.error({ error }, 'Failed to fetch HR leave for calendar');
      return [];
    }
  }

  async function fetchTasks(): Promise<AggregatedEvent[]> {
    try {
      const rows = await db.select()
        .from(tasks)
        .where(and(
          eq(tasks.tenantId, tenantId),
          isNotNull(tasks.dueDate),
          gte(tasks.dueDate, timeMin.slice(0, 10)),
          lte(tasks.dueDate, timeMax.slice(0, 10)),
          not(inArray(tasks.status, ['completed', 'cancelled'])),
          eq(tasks.isArchived, false),
          or(eq(tasks.userId, userId), eq(tasks.visibility, 'team')),
        ));

      return rows.map(r => ({
        id: `task:${r.id}`,
        source: 'task' as const,
        sourceId: r.id,
        title: r.title || 'Untitled task',
        startTime: new Date(r.dueDate + 'T00:00:00').toISOString(),
        endTime: new Date(r.dueDate + 'T23:59:59').toISOString(),
        isAllDay: true,
        color: '#6366f1',
        route: '/tasks',
        metadata: { priority: r.priority, projectId: r.projectId },
      }));
    } catch (error) {
      logger.error({ error }, 'Failed to fetch tasks for calendar');
      return [];
    }
  }

  // Step 3 — Run in parallel and merge
  const promises: Promise<AggregatedEvent[]>[] = [fetchGoogleEvents()];
  if (hasCrm) promises.push(fetchCrmActivities());
  if (hasHr) promises.push(fetchHrLeave());
  if (hasTasks) promises.push(fetchTasks());

  const results = await Promise.all(promises);
  const all = results.flat();
  all.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  return all;
}
