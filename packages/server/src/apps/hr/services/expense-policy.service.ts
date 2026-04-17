import { db } from '../../../config/database';
import {
  hrExpensePolicies, hrExpensePolicyAssignments,
  employees, departments,
} from '../../../db/schema';
import { eq, and, desc } from 'drizzle-orm';

// ─── Expense Policies ────────────────────────────────────────────

export async function listExpensePolicies(tenantId: string) {
  return db.select().from(hrExpensePolicies)
    .where(and(
      eq(hrExpensePolicies.tenantId, tenantId),
      eq(hrExpensePolicies.isActive, true),
      eq(hrExpensePolicies.isArchived, false),
    ))
    .orderBy(desc(hrExpensePolicies.createdAt));
}

export async function getExpensePolicy(tenantId: string, id: string) {
  const [policy] = await db.select().from(hrExpensePolicies)
    .where(and(eq(hrExpensePolicies.id, id), eq(hrExpensePolicies.tenantId, tenantId)))
    .limit(1);
  if (!policy) return null;

  const assignments = await db.select({
    id: hrExpensePolicyAssignments.id,
    policyId: hrExpensePolicyAssignments.policyId,
    employeeId: hrExpensePolicyAssignments.employeeId,
    departmentId: hrExpensePolicyAssignments.departmentId,
    createdAt: hrExpensePolicyAssignments.createdAt,
    employeeName: employees.name,
    departmentName: departments.name,
  })
    .from(hrExpensePolicyAssignments)
    .leftJoin(employees, eq(hrExpensePolicyAssignments.employeeId, employees.id))
    .leftJoin(departments, eq(hrExpensePolicyAssignments.departmentId, departments.id))
    .where(eq(hrExpensePolicyAssignments.policyId, id));

  return { ...policy, assignments };
}

export async function createExpensePolicy(tenantId: string, input: {
  name: string;
  monthlyLimit?: number | null;
  requireReceiptAbove?: number | null;
  autoApproveBelow?: number | null;
  isActive?: boolean;
}) {
  const now = new Date();
  const [created] = await db.insert(hrExpensePolicies).values({
    tenantId,
    name: input.name,
    monthlyLimit: input.monthlyLimit ?? null,
    requireReceiptAbove: input.requireReceiptAbove ?? null,
    autoApproveBelow: input.autoApproveBelow ?? null,
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  }).returning();
  return created;
}

export async function updateExpensePolicy(tenantId: string, id: string, input: Partial<{
  name: string;
  monthlyLimit: number | null;
  requireReceiptAbove: number | null;
  autoApproveBelow: number | null;
  isActive: boolean;
}>) {
  const now = new Date();
  const updates: Record<string, unknown> = { updatedAt: now };
  for (const [k, v] of Object.entries(input)) { if (v !== undefined) updates[k] = v; }

  const [updated] = await db.update(hrExpensePolicies).set(updates)
    .where(and(eq(hrExpensePolicies.id, id), eq(hrExpensePolicies.tenantId, tenantId))).returning();
  return updated || null;
}

export async function deleteExpensePolicy(tenantId: string, id: string) {
  const [deleted] = await db.update(hrExpensePolicies)
    .set({ isArchived: true, isActive: false, updatedAt: new Date() })
    .where(and(eq(hrExpensePolicies.id, id), eq(hrExpensePolicies.tenantId, tenantId))).returning();
  return deleted || null;
}

// ─── Policy Assignments ──────────────────────────────────────────

export async function assignPolicy(tenantId: string, policyId: string, input: {
  employeeId?: string | null;
  departmentId?: string | null;
}) {
  const [created] = await db.insert(hrExpensePolicyAssignments).values({
    tenantId,
    policyId,
    employeeId: input.employeeId ?? null,
    departmentId: input.departmentId ?? null,
    createdAt: new Date(),
  }).returning();
  return created;
}

export async function removeAssignment(tenantId: string, assignmentId: string) {
  const [deleted] = await db.delete(hrExpensePolicyAssignments)
    .where(and(
      eq(hrExpensePolicyAssignments.id, assignmentId),
      eq(hrExpensePolicyAssignments.tenantId, tenantId),
    )).returning();
  return deleted || null;
}

// ─── Employee Policy Lookup ──────────────────────────────────────

export async function getEmployeePolicy(tenantId: string, employeeId: string, departmentId?: string | null) {
  // 1. Check for employee-level assignment first
  const [employeeAssignment] = await db.select({
    id: hrExpensePolicyAssignments.id,
    policyId: hrExpensePolicyAssignments.policyId,
  })
    .from(hrExpensePolicyAssignments)
    .where(and(
      eq(hrExpensePolicyAssignments.tenantId, tenantId),
      eq(hrExpensePolicyAssignments.employeeId, employeeId),
    ))
    .limit(1);

  const policyId = employeeAssignment?.policyId
    // 2. Fall back to department-level assignment
    ?? (departmentId
      ? (await db.select({ policyId: hrExpensePolicyAssignments.policyId })
          .from(hrExpensePolicyAssignments)
          .where(and(
            eq(hrExpensePolicyAssignments.tenantId, tenantId),
            eq(hrExpensePolicyAssignments.departmentId, departmentId),
          ))
          .limit(1)
        )[0]?.policyId
      : undefined);

  if (!policyId) return null;

  const [policy] = await db.select().from(hrExpensePolicies)
    .where(and(eq(hrExpensePolicies.id, policyId), eq(hrExpensePolicies.isActive, true)))
    .limit(1);

  return policy || null;
}
