import { db } from '../../../config/database';
import {
  hrExpenseReports, hrExpenses,
  employees, hrExpenseCategories,
} from '../../../db/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { logger } from '../../../utils/logger';
import { sendEmail } from '../../../services/email.service';
import { getEmployeePolicy } from './expense-policy.service';
import type { CreateExpenseReportInput } from '@atlas-platform/shared';

// ─── Shared select fields ──────────────────────────────────────

const reportSelectFields = {
  id: hrExpenseReports.id,
  tenantId: hrExpenseReports.tenantId,
  userId: hrExpenseReports.userId,
  employeeId: hrExpenseReports.employeeId,
  title: hrExpenseReports.title,
  status: hrExpenseReports.status,
  totalAmount: hrExpenseReports.totalAmount,
  currency: hrExpenseReports.currency,
  submittedAt: hrExpenseReports.submittedAt,
  approvedAt: hrExpenseReports.approvedAt,
  refusedAt: hrExpenseReports.refusedAt,
  paidAt: hrExpenseReports.paidAt,
  approverId: hrExpenseReports.approverId,
  approverComment: hrExpenseReports.approverComment,
  isArchived: hrExpenseReports.isArchived,
  createdAt: hrExpenseReports.createdAt,
  updatedAt: hrExpenseReports.updatedAt,
  // Joined fields
  employeeName: employees.name,
  expenseCount: sql<number>`(SELECT COUNT(*) FROM hr_expenses WHERE hr_expenses.report_id = ${hrExpenseReports.id} AND hr_expenses.is_archived = false)`.as('expense_count'),
};

// ─── List Expense Reports ──────────────────────────────────────

export async function listExpenseReports(tenantId: string, filters?: {
  status?: string;
  employeeId?: string;
}) {
  const conditions = [
    eq(hrExpenseReports.tenantId, tenantId),
    eq(hrExpenseReports.isArchived, false),
  ];

  if (filters?.status) conditions.push(eq(hrExpenseReports.status, filters.status));
  if (filters?.employeeId) conditions.push(eq(hrExpenseReports.employeeId, filters.employeeId));

  return db.select(reportSelectFields)
    .from(hrExpenseReports)
    .leftJoin(employees, eq(hrExpenseReports.employeeId, employees.id))
    .where(and(...conditions))
    .orderBy(desc(hrExpenseReports.createdAt));
}

// ─── List My Expense Reports ───────────────────────────────────

export async function listMyExpenseReports(tenantId: string, userId: string) {
  return db.select(reportSelectFields)
    .from(hrExpenseReports)
    .leftJoin(employees, eq(hrExpenseReports.employeeId, employees.id))
    .where(and(
      eq(hrExpenseReports.tenantId, tenantId),
      eq(hrExpenseReports.userId, userId),
      eq(hrExpenseReports.isArchived, false),
    ))
    .orderBy(desc(hrExpenseReports.createdAt));
}

// ─── Get Expense Report ────────────────────────────────────────

export async function getExpenseReport(tenantId: string, id: string) {
  const [report] = await db.select(reportSelectFields)
    .from(hrExpenseReports)
    .leftJoin(employees, eq(hrExpenseReports.employeeId, employees.id))
    .where(and(eq(hrExpenseReports.id, id), eq(hrExpenseReports.tenantId, tenantId)))
    .limit(1);

  if (!report) return null;

  // Fetch all expenses for this report with category joins
  const expenses = await db.select({
    id: hrExpenses.id,
    tenantId: hrExpenses.tenantId,
    userId: hrExpenses.userId,
    employeeId: hrExpenses.employeeId,
    categoryId: hrExpenses.categoryId,
    projectId: hrExpenses.projectId,
    reportId: hrExpenses.reportId,
    description: hrExpenses.description,
    notes: hrExpenses.notes,
    amount: hrExpenses.amount,
    taxAmount: hrExpenses.taxAmount,
    currency: hrExpenses.currency,
    quantity: hrExpenses.quantity,
    expenseDate: hrExpenses.expenseDate,
    merchantName: hrExpenses.merchantName,
    paymentMethod: hrExpenses.paymentMethod,
    receiptPath: hrExpenses.receiptPath,
    status: hrExpenses.status,
    submittedAt: hrExpenses.submittedAt,
    approvedAt: hrExpenses.approvedAt,
    refusedAt: hrExpenses.refusedAt,
    paidAt: hrExpenses.paidAt,
    approverId: hrExpenses.approverId,
    approverComment: hrExpenses.approverComment,
    policyViolation: hrExpenses.policyViolation,
    isArchived: hrExpenses.isArchived,
    createdAt: hrExpenses.createdAt,
    updatedAt: hrExpenses.updatedAt,
    categoryName: hrExpenseCategories.name,
    categoryIcon: hrExpenseCategories.icon,
    categoryColor: hrExpenseCategories.color,
  }).from(hrExpenses)
    .leftJoin(hrExpenseCategories, eq(hrExpenses.categoryId, hrExpenseCategories.id))
    .where(and(
      eq(hrExpenses.reportId, id),
      eq(hrExpenses.isArchived, false),
    ))
    .orderBy(desc(hrExpenses.expenseDate));

  return { ...report, expenses };
}

// ─── Create Expense Report ─────────────────────────────────────

export async function createExpenseReport(
  userId: string,
  tenantId: string,
  employeeId: string,
  input: CreateExpenseReportInput,
) {
  const now = new Date();
  const [created] = await db.insert(hrExpenseReports).values({
    tenantId,
    userId,
    employeeId,
    title: input.title,
    currency: input.currency ?? 'USD',
    status: 'draft',
    totalAmount: 0,
    createdAt: now,
    updatedAt: now,
  }).returning();

  return created;
}

// ─── Update Expense Report ─────────────────────────────────────

export async function updateExpenseReport(tenantId: string, id: string, input: { title?: string }) {
  // Only allow editing if status is draft
  const [existing] = await db.select({ status: hrExpenseReports.status })
    .from(hrExpenseReports)
    .where(and(eq(hrExpenseReports.id, id), eq(hrExpenseReports.tenantId, tenantId)))
    .limit(1);

  if (!existing || existing.status !== 'draft') return null;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (input.title !== undefined) updates.title = input.title;

  const [updated] = await db.update(hrExpenseReports).set(updates)
    .where(and(eq(hrExpenseReports.id, id), eq(hrExpenseReports.tenantId, tenantId)))
    .returning();

  return updated || null;
}

// ─── Delete Expense Report (soft) ──────────────────────────────

export async function deleteExpenseReport(tenantId: string, id: string) {
  const now = new Date();

  // Soft-delete the report (draft only)
  const [deleted] = await db.update(hrExpenseReports).set({
    isArchived: true,
    updatedAt: now,
  }).where(and(
    eq(hrExpenseReports.id, id),
    eq(hrExpenseReports.tenantId, tenantId),
    eq(hrExpenseReports.status, 'draft'),
  )).returning();

  if (!deleted) return null;

  // Unlink expenses from this report
  await db.update(hrExpenses).set({
    reportId: null,
    updatedAt: now,
  }).where(eq(hrExpenses.reportId, id));

  return deleted;
}

// ─── Submit Expense Report ─────────────────────────────────────

export async function submitExpenseReport(tenantId: string, id: string, employeeId: string) {
  const now = new Date();

  return db.transaction(async (tx) => {
    // 1. Fetch all expenses for this report that are draft or refused
    const reportExpenses = await tx.select().from(hrExpenses)
      .where(and(
        eq(hrExpenses.reportId, id),
        eq(hrExpenses.isArchived, false),
        sql`${hrExpenses.status} IN ('draft', 'refused')`,
      ));

    if (reportExpenses.length === 0) {
      throw new Error('No submittable expenses in this report');
    }

    // 2. Compute totalAmount
    const totalAmount = reportExpenses.reduce((sum, e) => sum + e.amount, 0);

    // 3. Get managerId from employee
    const [employee] = await tx.select().from(employees)
      .where(eq(employees.id, employeeId)).limit(1);
    if (!employee) throw new Error('Employee not found');

    const managerId = employee.managerId ?? null;

    // 4. Batch-update all expenses
    const expenseIds = reportExpenses.map(e => e.id);
    await tx.update(hrExpenses).set({
      status: 'submitted',
      approverId: managerId,
      submittedAt: now,
      updatedAt: now,
    }).where(inArray(hrExpenses.id, expenseIds));

    // 5. Update report
    const [updated] = await tx.update(hrExpenseReports).set({
      status: 'submitted',
      totalAmount,
      approverId: managerId,
      submittedAt: now,
      updatedAt: now,
    }).where(and(eq(hrExpenseReports.id, id), eq(hrExpenseReports.tenantId, tenantId)))
      .returning();

    // 6. Send email to approver
    if (managerId) {
      try {
        const [approverEmployee] = await tx.select({
          email: employees.email,
          name: employees.name,
        }).from(employees)
          .where(eq(employees.id, managerId))
          .limit(1);

        if (approverEmployee?.email) {
          await sendEmail({
            to: approverEmployee.email,
            subject: `Expense report to review: ${updated.title}`,
            text: `${employee.name} submitted an expense report "${updated.title}" totalling ${totalAmount} ${updated.currency}. Please review it in Atlas.`,
          });
        }
      } catch (err) {
        logger.error({ err }, 'Failed to send expense report submission email to approver');
      }
    }

    return updated;
  });
}

// ─── Approve Expense Report ────────────────────────────────────

export async function approveExpenseReport(tenantId: string, id: string, approverId: string) {
  const now = new Date();

  // Fetch report
  const [report] = await db.select().from(hrExpenseReports)
    .where(and(eq(hrExpenseReports.id, id), eq(hrExpenseReports.tenantId, tenantId), eq(hrExpenseReports.status, 'submitted')))
    .limit(1);
  if (!report) return null;

  // Update report
  const [updated] = await db.update(hrExpenseReports).set({
    status: 'approved',
    approverId,
    approvedAt: now,
    updatedAt: now,
  }).where(eq(hrExpenseReports.id, id)).returning();

  // Update all submitted expenses in this report to approved
  await db.update(hrExpenses).set({
    status: 'approved',
    approverId,
    approvedAt: now,
    updatedAt: now,
  }).where(and(
    eq(hrExpenses.reportId, id),
    eq(hrExpenses.status, 'submitted'),
  ));

  // Send email to employee
  try {
    const [emp] = await db.select({ email: employees.email, name: employees.name })
      .from(employees).where(eq(employees.id, report.employeeId)).limit(1);
    if (emp?.email) {
      await sendEmail({
        to: emp.email,
        subject: `Expense report approved: ${report.title}`,
        text: `Your expense report "${report.title}" totalling ${report.totalAmount} ${report.currency} has been approved.`,
      });
    }
  } catch (err) {
    logger.error({ err }, 'Failed to send expense report approval email');
  }

  return updated;
}

// ─── Refuse Expense Report ─────────────────────────────────────

export async function refuseExpenseReport(tenantId: string, id: string, approverId: string, comment?: string) {
  const now = new Date();

  // Fetch report
  const [report] = await db.select().from(hrExpenseReports)
    .where(and(eq(hrExpenseReports.id, id), eq(hrExpenseReports.tenantId, tenantId), eq(hrExpenseReports.status, 'submitted')))
    .limit(1);
  if (!report) return null;

  // Update report
  const [updated] = await db.update(hrExpenseReports).set({
    status: 'refused',
    approverId,
    approverComment: comment ?? null,
    refusedAt: now,
    updatedAt: now,
  }).where(eq(hrExpenseReports.id, id)).returning();

  // Update all submitted expenses in this report to refused
  await db.update(hrExpenses).set({
    status: 'refused',
    approverId,
    approverComment: comment ?? null,
    refusedAt: now,
    updatedAt: now,
  }).where(and(
    eq(hrExpenses.reportId, id),
    eq(hrExpenses.status, 'submitted'),
  ));

  // Send email to employee
  try {
    const [emp] = await db.select({ email: employees.email, name: employees.name })
      .from(employees).where(eq(employees.id, report.employeeId)).limit(1);
    if (emp?.email) {
      await sendEmail({
        to: emp.email,
        subject: `Expense report refused: ${report.title}`,
        text: `Your expense report "${report.title}" totalling ${report.totalAmount} ${report.currency} has been refused.${comment ? ` Reason: ${comment}` : ''}`,
      });
    }
  } catch (err) {
    logger.error({ err }, 'Failed to send expense report refusal email');
  }

  return updated;
}
