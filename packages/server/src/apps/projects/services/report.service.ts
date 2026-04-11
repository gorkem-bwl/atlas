import { db } from '../../../config/database';
import {
  projectTimeEntries, projectProjects, invoices, crmCompanies, users,
} from '../../../db/schema';
import { eq, and, asc, gte, lte, sql } from 'drizzle-orm';

// ─── Reports ────────────────────────────────────────────────────────

function accessibleProjectExists(projectIdCol: unknown, tenantId: string, userId: string) {
  return sql`EXISTS (
    SELECT 1 FROM project_projects pp
    WHERE pp.id = ${projectIdCol}
      AND pp.tenant_id = ${tenantId}
      AND (
        pp.user_id = ${userId}
        OR EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = pp.id AND pm.user_id = ${userId}
        )
      )
  )`;
}

export async function getTimeReport(
  tenantId: string,
  filters?: {
    startDate?: string;
    endDate?: string;
    projectId?: string;
  },
  userId?: string,
) {
  const conditions = [
    eq(projectTimeEntries.tenantId, tenantId),
    eq(projectTimeEntries.isArchived, false),
  ];
  if (filters?.startDate) conditions.push(gte(projectTimeEntries.workDate, filters.startDate));
  if (filters?.endDate) conditions.push(lte(projectTimeEntries.workDate, filters.endDate));
  if (filters?.projectId) conditions.push(eq(projectTimeEntries.projectId, filters.projectId));

  // Non-admin callers: restrict to projects they own or are a member of.
  // Inline EXISTS avoids a separate SELECT round-trip.
  if (userId) {
    conditions.push(accessibleProjectExists(projectTimeEntries.projectId, tenantId, userId));
  }

  // Run all independent report queries in parallel
  const [totalsResult, byProject, byUser, byDay] = await Promise.all([
    // Total minutes
    db.select({
      totalMinutes: sql<number>`COALESCE(SUM(${projectTimeEntries.durationMinutes}), 0)`.as('total_minutes'),
      billableMinutes: sql<number>`COALESCE(SUM(CASE WHEN ${projectTimeEntries.billable} THEN ${projectTimeEntries.durationMinutes} ELSE 0 END), 0)`.as('billable_minutes'),
      nonBillableMinutes: sql<number>`COALESCE(SUM(CASE WHEN NOT ${projectTimeEntries.billable} THEN ${projectTimeEntries.durationMinutes} ELSE 0 END), 0)`.as('non_billable_minutes'),
    })
    .from(projectTimeEntries)
    .where(and(...conditions)),

    // By project
    db.select({
      projectId: projectTimeEntries.projectId,
      projectName: projectProjects.name,
      minutes: sql<number>`COALESCE(SUM(${projectTimeEntries.durationMinutes}), 0)`.as('minutes'),
      billableMinutes: sql<number>`COALESCE(SUM(CASE WHEN ${projectTimeEntries.billable} THEN ${projectTimeEntries.durationMinutes} ELSE 0 END), 0)`.as('billable_minutes'),
    })
    .from(projectTimeEntries)
    .innerJoin(projectProjects, eq(projectTimeEntries.projectId, projectProjects.id))
    .where(and(...conditions))
    .groupBy(projectTimeEntries.projectId, projectProjects.name),

    // By user
    db.select({
      userId: projectTimeEntries.userId,
      userName: users.name,
      minutes: sql<number>`COALESCE(SUM(${projectTimeEntries.durationMinutes}), 0)`.as('minutes'),
      billableMinutes: sql<number>`COALESCE(SUM(CASE WHEN ${projectTimeEntries.billable} THEN ${projectTimeEntries.durationMinutes} ELSE 0 END), 0)`.as('billable_minutes'),
    })
    .from(projectTimeEntries)
    .innerJoin(users, eq(projectTimeEntries.userId, users.id))
    .where(and(...conditions))
    .groupBy(projectTimeEntries.userId, users.name),

    // By day
    db.select({
      date: projectTimeEntries.workDate,
      minutes: sql<number>`COALESCE(SUM(${projectTimeEntries.durationMinutes}), 0)`.as('minutes'),
    })
    .from(projectTimeEntries)
    .where(and(...conditions))
    .groupBy(projectTimeEntries.workDate)
    .orderBy(asc(projectTimeEntries.workDate)),
  ]);

  const totals = totalsResult[0];

  return {
    totalMinutes: Number(totals?.totalMinutes ?? 0),
    billableMinutes: Number(totals?.billableMinutes ?? 0),
    nonBillableMinutes: Number(totals?.nonBillableMinutes ?? 0),
    byProject,
    byUser,
    byDay,
  };
}

export async function getRevenueReport(
  tenantId: string,
  filters?: {
    startDate?: string;
    endDate?: string;
  },
  userId?: string,
) {
  const conditions = [
    eq(invoices.tenantId, tenantId),
    eq(invoices.isArchived, false),
  ];
  if (filters?.startDate) conditions.push(gte(invoices.issueDate, new Date(filters.startDate)));
  if (filters?.endDate) conditions.push(lte(invoices.issueDate, new Date(filters.endDate)));

  // Non-admin callers: restrict to invoices for companies tied to
  // projects they own or are a member of. Inline EXISTS avoids a
  // separate SELECT round-trip.
  if (userId) {
    conditions.push(sql`EXISTS (
      SELECT 1 FROM project_projects pp
      WHERE pp.tenant_id = ${tenantId}
        AND pp.company_id = ${invoices.companyId}
        AND pp.company_id IS NOT NULL
        AND (
          pp.user_id = ${userId}
          OR EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = pp.id AND pm.user_id = ${userId}
          )
        )
    )`);
  }

  // Run all independent report queries in parallel
  const [totalsResult, byMonth, byCompany] = await Promise.all([
    // Totals
    db.select({
      totalInvoiced: sql<number>`COALESCE(SUM(${invoices.total}), 0)`.as('total_invoiced'),
      totalPaid: sql<number>`COALESCE(SUM(CASE WHEN ${invoices.status} = 'paid' THEN ${invoices.total} ELSE 0 END), 0)`.as('total_paid'),
      totalOutstanding: sql<number>`COALESCE(SUM(CASE WHEN ${invoices.status} IN ('sent', 'viewed') THEN ${invoices.total} ELSE 0 END), 0)`.as('total_outstanding'),
      totalOverdue: sql<number>`COALESCE(SUM(CASE WHEN ${invoices.status} = 'overdue' THEN ${invoices.total} ELSE 0 END), 0)`.as('total_overdue'),
    })
    .from(invoices)
    .where(and(...conditions)),

    // By month
    db.select({
      month: sql<string>`TO_CHAR(${invoices.issueDate}, 'YYYY-MM')`.as('month'),
      invoiced: sql<number>`COALESCE(SUM(${invoices.total}), 0)`.as('invoiced'),
      paid: sql<number>`COALESCE(SUM(CASE WHEN ${invoices.status} = 'paid' THEN ${invoices.total} ELSE 0 END), 0)`.as('paid'),
    })
    .from(invoices)
    .where(and(...conditions, sql`${invoices.issueDate} IS NOT NULL`))
    .groupBy(sql`TO_CHAR(${invoices.issueDate}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${invoices.issueDate}, 'YYYY-MM')`),

    // By company
    db.select({
      clientId: invoices.companyId,
      clientName: crmCompanies.name,
      invoiced: sql<number>`COALESCE(SUM(${invoices.total}), 0)`.as('invoiced'),
      outstanding: sql<number>`COALESCE(SUM(CASE WHEN ${invoices.status} IN ('sent', 'viewed', 'overdue') THEN ${invoices.total} ELSE 0 END), 0)`.as('outstanding'),
    })
    .from(invoices)
    .leftJoin(crmCompanies, eq(invoices.companyId, crmCompanies.id))
    .where(and(...conditions))
    .groupBy(invoices.companyId, crmCompanies.name),
  ]);

  const totals = totalsResult[0];

  return {
    invoiced: Number(totals?.totalInvoiced ?? 0),
    outstanding: Number(totals?.totalOutstanding ?? 0),
    overdue: Number(totals?.totalOverdue ?? 0),
    paid: Number(totals?.totalPaid ?? 0),
    byMonth,
    byClient: byCompany,
  };
}

export async function getProjectProfitability(tenantId: string, userId?: string) {
  const projectConditions = [
    eq(projectProjects.tenantId, tenantId),
    eq(projectProjects.isArchived, false),
  ];
  if (userId) {
    projectConditions.push(
      sql`(${projectProjects.userId} = ${userId} OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = ${projectProjects.id} AND pm.user_id = ${userId}))`,
    );
  }
  const projects = await db
    .select({
      projectId: projectProjects.id,
      projectName: projectProjects.name,
      estimatedAmount: projectProjects.estimatedAmount,
      totalMinutes: sql<number>`COALESCE((SELECT SUM(duration_minutes) FROM project_time_entries WHERE project_id = ${projectProjects.id} AND is_archived = false), 0)`.as('total_minutes'),
      billableMinutes: sql<number>`COALESCE((SELECT SUM(duration_minutes) FROM project_time_entries WHERE project_id = ${projectProjects.id} AND is_archived = false AND billable = true), 0)`.as('billable_minutes'),
      billedAmount: sql<number>`COALESCE((SELECT SUM(ili.amount) FROM invoice_line_items ili INNER JOIN project_time_entries pte ON pte.id = ili.time_entry_id WHERE pte.project_id = ${projectProjects.id}), 0)`.as('billed_amount'),
      invoicedAmount: sql<number>`COALESCE((SELECT SUM(i2.total) FROM invoices i2 WHERE i2.is_archived = false AND i2.company_id = ${projectProjects.companyId} AND i2.tenant_id = ${projectProjects.tenantId}), 0)`.as('invoiced_amount'),
      paidAmount: sql<number>`COALESCE((SELECT SUM(i.total) FROM invoices i WHERE i.status = 'paid' AND i.is_archived = false AND i.company_id = ${projectProjects.companyId} AND i.tenant_id = ${projectProjects.tenantId}), 0)`.as('paid_amount'),
    })
    .from(projectProjects)
    .where(and(...projectConditions))
    .orderBy(asc(projectProjects.name));

  return projects.map(p => ({
    projectId: p.projectId,
    projectName: p.projectName,
    totalHours: Number(p.totalMinutes) / 60,
    billableHours: Number(p.billableMinutes) / 60,
    estimatedAmount: Number(p.estimatedAmount ?? 0),
    billedAmount: Number(p.billedAmount),
    invoicedAmount: Number(p.invoicedAmount),
    paidAmount: Number(p.paidAmount),
  }));
}

export async function getTeamUtilization(
  tenantId: string,
  filters?: {
    startDate?: string;
    endDate?: string;
  },
  userId?: string,
) {
  const conditions = [
    eq(projectTimeEntries.tenantId, tenantId),
    eq(projectTimeEntries.isArchived, false),
  ];
  if (filters?.startDate) conditions.push(gte(projectTimeEntries.workDate, filters.startDate));
  if (filters?.endDate) conditions.push(lte(projectTimeEntries.workDate, filters.endDate));

  // Non-admin callers: restrict to time entries for projects they own
  // or are a member of. Inline EXISTS avoids a separate SELECT round-trip.
  if (userId) {
    conditions.push(accessibleProjectExists(projectTimeEntries.projectId, tenantId, userId));
  }

  const utilization = await db
    .select({
      userId: projectTimeEntries.userId,
      userName: users.name,
      totalMinutes: sql<number>`COALESCE(SUM(${projectTimeEntries.durationMinutes}), 0)`.as('total_minutes'),
      billableMinutes: sql<number>`COALESCE(SUM(CASE WHEN ${projectTimeEntries.billable} THEN ${projectTimeEntries.durationMinutes} ELSE 0 END), 0)`.as('billable_minutes'),
    })
    .from(projectTimeEntries)
    .innerJoin(users, eq(projectTimeEntries.userId, users.id))
    .where(and(...conditions))
    .groupBy(projectTimeEntries.userId, users.name);

  return utilization.map(u => ({
    userId: u.userId,
    userName: u.userName,
    totalMinutes: Number(u.totalMinutes),
    billableMinutes: Number(u.billableMinutes),
    utilizationRate: Number(u.totalMinutes) > 0
      ? Number(u.billableMinutes) / Number(u.totalMinutes)
      : 0,
  }));
}
