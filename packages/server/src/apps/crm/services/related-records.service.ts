import { and, count, desc, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import { db } from '../../../config/database';
import { invoices, projectProjects, crmContacts } from '../../../db/schema';
import {
  getAppPermission,
  type ResolvedAppPermission,
} from '../../../services/app-permissions.service';
import { isAppEnabled } from '../../../services/platform/tenant-app.service';

/**
 * Cross-app "related records" for a CRM contact or company.
 *
 * The foreign keys joining CRM to Work and Invoices already exist
 * (`invoices.company_id`, `invoices.contact_id`, `project_projects.company_id`)
 * but nothing renders them back at the customer, so a user has to visit three
 * apps to see one customer's history. See #22.
 *
 * Two separate gates apply, and they answer different questions:
 *
 *  - `visibility` — is the target app enabled for this tenant at all? A tenant
 *    without Invoices gets no invoices section rather than an empty one.
 *  - row scope — which rows may this caller see? This mirrors the source apps
 *    exactly (see `invoiceScopeFor` / `projectScopeFor`); it deliberately does
 *    NOT use `recordAccess`, which would be more permissive than the app the
 *    data comes from.
 */

const MAX_ROWS_PER_SECTION = 50;

export interface RelatedInvoice {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  currency: string;
  issueDate: string | null;
  dueDate: string | null;
}

export interface RelatedProject {
  id: string;
  name: string;
  status: string;
  color: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface RelatedRecords {
  invoices: RelatedInvoice[];
  projects: RelatedProject[];
  /**
   * Full match counts, before the per-section row cap. The lists are truncated
   * at MAX_ROWS_PER_SECTION, so rendering `invoices.length` as the total would
   * silently under-report a customer with more than 50 invoices.
   */
  totals: { invoices: number; projects: number };
  /**
   * Which sections the caller is allowed to see at all. The client uses this
   * to distinguish "no records" from "this app is not enabled", which are very
   * different messages for the user.
   */
  visibility: { invoices: boolean; projects: boolean };
}

/**
 * Row-level scope for each target app.
 *
 * These deliberately mirror the source apps rather than using `recordAccess`:
 * both Invoices and Work gate on `role === 'admin'` alone, and a plain tenant
 * member resolves to `{ role: 'editor', recordAccess: 'all' }` by default. So
 * keying off `recordAccess` here would show a member every invoice at a
 * company while the Invoices app itself shows them only their own.
 *
 * If the scoping in either app changes, it has to change here too.
 */

/** Mirrors `listInvoices` — non-admins see only invoices they created. */
function invoiceScopeFor(perm: ResolvedAppPermission, userId: string): SQL | undefined {
  if (perm.role === 'admin') return undefined;
  return eq(invoices.userId, userId);
}

/** Mirrors `listProjects` — non-admins see projects they own or are a member of. */
function projectScopeFor(perm: ResolvedAppPermission, userId: string): SQL | undefined {
  if (perm.role === 'admin') return undefined;
  return sql`(${projectProjects.userId} = ${userId} OR EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = ${projectProjects.id} AND pm.user_id = ${userId}
  ))`;
}

export async function getRelatedRecords(
  tenantId: string,
  userId: string,
  target: { companyId?: string | null; contactId?: string | null },
  isSuperAdmin = false,
): Promise<RelatedRecords> {
  const empty: RelatedRecords = {
    invoices: [],
    projects: [],
    totals: { invoices: 0, projects: 0 },
    visibility: { invoices: false, projects: false },
  };

  if (!target.companyId && !target.contactId) return empty;

  // Section visibility is tenant app *enablement*, not RBAC: every role
  // (admin/editor/viewer) carries `view`, so a role check here would always
  // pass and the `visibility` flags would be meaningless. A tenant that has
  // not enabled Invoices should see no invoices section at all.
  const [invoicePerm, workPerm, invoicesEnabled, workEnabled] = await Promise.all([
    getAppPermission(tenantId, userId, 'invoices', isSuperAdmin),
    getAppPermission(tenantId, userId, 'work', isSuperAdmin),
    isAppEnabled(tenantId, 'invoices'),
    isAppEnabled(tenantId, 'work'),
  ]);

  const canSeeInvoices = invoicesEnabled;
  const canSeeProjects = workEnabled;

  const invoiceScope = invoiceScopeFor(invoicePerm, userId);
  const projectScope = projectScopeFor(workPerm, userId);

  // Projects carry only a company FK — there is no project.contact_id — so a
  // contact's projects are its company's projects.
  let companyIds: string[] = [];
  if (target.companyId) {
    companyIds = [target.companyId];
  } else if (target.contactId) {
    const [contact] = await db
      .select({ companyId: crmContacts.companyId })
      .from(crmContacts)
      .where(and(eq(crmContacts.id, target.contactId), eq(crmContacts.tenantId, tenantId)))
      .limit(1);
    if (contact?.companyId) companyIds = [contact.companyId];
  }

  // For a contact we match on contact_id only. Widening to the company would
  // pull in every colleague's invoices under that person's name, with nothing
  // in the row to say who they actually belong to.
  const invoiceMatch: SQL | null = target.contactId
    ? eq(invoices.contactId, target.contactId)
    : companyIds.length
      ? inArray(invoices.companyId, companyIds)
      : null;

  const invoiceConditions: SQL[] = invoiceMatch
    ? [eq(invoices.tenantId, tenantId), eq(invoices.isArchived, false), invoiceMatch]
    : [];
  if (invoiceMatch && invoiceScope) invoiceConditions.push(invoiceScope);

  const projectConditions: SQL[] = companyIds.length
    ? [
        eq(projectProjects.tenantId, tenantId),
        eq(projectProjects.isArchived, false),
        inArray(projectProjects.companyId, companyIds),
      ]
    : [];
  if (companyIds.length && projectScope) projectConditions.push(projectScope);

  const runInvoices = canSeeInvoices && invoiceConditions.length > 0;
  const runProjects = canSeeProjects && projectConditions.length > 0;

  const [invoiceRows, invoiceTotal, projectRows, projectTotal] = await Promise.all([
    runInvoices
      ? db
          .select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            status: invoices.status,
            total: invoices.total,
            currency: invoices.currency,
            issueDate: invoices.issueDate,
            dueDate: invoices.dueDate,
          })
          .from(invoices)
          .where(and(...invoiceConditions))
          .orderBy(desc(invoices.issueDate))
          .limit(MAX_ROWS_PER_SECTION)
      : Promise.resolve([]),
    runInvoices
      ? db.select({ n: count() }).from(invoices).where(and(...invoiceConditions))
      : Promise.resolve([{ n: 0 }]),
    runProjects
      ? db
          .select({
            id: projectProjects.id,
            name: projectProjects.name,
            status: projectProjects.status,
            color: projectProjects.color,
            startDate: projectProjects.startDate,
            endDate: projectProjects.endDate,
          })
          .from(projectProjects)
          .where(and(...projectConditions))
          .orderBy(desc(projectProjects.createdAt))
          .limit(MAX_ROWS_PER_SECTION)
      : Promise.resolve([]),
    runProjects
      ? db.select({ n: count() }).from(projectProjects).where(and(...projectConditions))
      : Promise.resolve([{ n: 0 }]),
  ]);

  const iso = (d: Date | null) => (d ? d.toISOString() : null);

  return {
    invoices: invoiceRows.map((r) => ({
      ...r,
      issueDate: iso(r.issueDate),
      dueDate: iso(r.dueDate),
    })),
    projects: projectRows.map((r) => ({
      ...r,
      startDate: iso(r.startDate),
      endDate: iso(r.endDate),
    })),
    totals: {
      invoices: invoiceTotal[0]?.n ?? 0,
      projects: projectTotal[0]?.n ?? 0,
    },
    visibility: { invoices: canSeeInvoices, projects: canSeeProjects },
  };
}

/** Exported for unit tests only — not part of the module's public surface. */
export const __test = { invoiceScopeFor, projectScopeFor };
