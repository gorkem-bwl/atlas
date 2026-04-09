// ─── HR types ───────────────────────────────────────────────────────

export type EmployeeStatus = 'active' | 'on-leave' | 'terminated';
export type TimeOffType = string;
export type TimeOffStatus = 'pending' | 'approved' | 'rejected';

export interface Employee {
  id: string;
  tenantId: string;
  userId: string;
  linkedUserId: string | null;
  name: string;
  email: string;
  role: string;
  departmentId: string | null;
  startDate: string | null;
  phone: string | null;
  avatarUrl: string | null;
  status: EmployeeStatus;
  tags: string[];
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  departmentName?: string;
  departmentColor?: string;
}

export interface Department {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  headEmployeeId: string | null;
  color: string;
  description: string | null;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  employeeCount?: number;
  headEmployeeName?: string;
}

export interface TimeOffRequest {
  id: string;
  tenantId: string;
  userId: string;
  employeeId: string;
  type: TimeOffType;
  startDate: string;
  endDate: string;
  status: TimeOffStatus;
  approverId: string | null;
  notes: string | null;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  employeeName?: string;
  approverName?: string;
}

// ─── Create/Update inputs ───────────────────────────────────────────

export interface CreateEmployeeInput {
  name: string;
  email: string;
  role?: string;
  departmentId?: string | null;
  startDate?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  status?: EmployeeStatus;
  linkedUserId?: string | null;
  tags?: string[];
}

export interface UpdateEmployeeInput {
  name?: string;
  email?: string;
  role?: string;
  departmentId?: string | null;
  startDate?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  status?: EmployeeStatus;
  linkedUserId?: string | null;
  tags?: string[];
  sortOrder?: number;
  isArchived?: boolean;
}

export interface CreateDepartmentInput {
  name: string;
  headEmployeeId?: string | null;
  color?: string;
  description?: string | null;
}

export interface UpdateDepartmentInput {
  name?: string;
  headEmployeeId?: string | null;
  color?: string;
  description?: string | null;
  sortOrder?: number;
  isArchived?: boolean;
}

export interface CreateTimeOffRequestInput {
  employeeId: string;
  type: TimeOffType;
  startDate: string;
  endDate: string;
  approverId?: string | null;
  notes?: string | null;
}

export interface UpdateTimeOffRequestInput {
  type?: TimeOffType;
  startDate?: string;
  endDate?: string;
  status?: TimeOffStatus;
  approverId?: string | null;
  notes?: string | null;
  sortOrder?: number;
  isArchived?: boolean;
}

// ─── Expenses ─────────────────────────────────────────────────────

export type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'refused' | 'paid';
export type PaymentMethod = 'personal_card' | 'company_card' | 'cash';

export interface HrExpenseCategory {
  id: string;
  tenantId: string;
  name: string;
  icon: string;
  color: string;
  maxAmount?: number | null;
  receiptRequired: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface HrExpensePolicy {
  id: string;
  tenantId: string;
  name: string;
  monthlyLimit?: number | null;
  requireReceiptAbove?: number | null;
  autoApproveBelow?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HrExpensePolicyAssignment {
  id: string;
  tenantId: string;
  policyId: string;
  employeeId?: string | null;
  departmentId?: string | null;
  createdAt: string;
  // Joined fields
  employeeName?: string;
  departmentName?: string;
}

export interface HrExpenseReport {
  id: string;
  tenantId: string;
  userId: string;
  employeeId: string;
  title: string;
  status: ExpenseStatus;
  totalAmount: number;
  currency: string;
  submittedAt?: string | null;
  approvedAt?: string | null;
  refusedAt?: string | null;
  paidAt?: string | null;
  approverId?: string | null;
  approverComment?: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  employeeName?: string;
  expenseCount?: number;
}

export interface HrExpense {
  id: string;
  tenantId: string;
  userId: string;
  employeeId: string;
  categoryId?: string | null;
  projectId?: string | null;
  reportId?: string | null;
  description: string;
  notes?: string | null;
  amount: number;
  taxAmount: number;
  currency: string;
  quantity: number;
  expenseDate: string;
  merchantName?: string | null;
  paymentMethod: PaymentMethod;
  receiptPath?: string | null;
  status: ExpenseStatus;
  submittedAt?: string | null;
  approvedAt?: string | null;
  refusedAt?: string | null;
  paidAt?: string | null;
  approverId?: string | null;
  approverComment?: string | null;
  policyViolation?: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  projectName?: string;
  employeeName?: string;
  employeeAvatar?: string;
  reportTitle?: string;
}

export interface CreateExpenseInput {
  categoryId?: string;
  projectId?: string;
  reportId?: string;
  description: string;
  notes?: string;
  amount: number;
  taxAmount?: number;
  currency?: string;
  quantity?: number;
  expenseDate: string;
  merchantName?: string;
  paymentMethod?: PaymentMethod;
  receiptPath?: string;
}

export interface UpdateExpenseInput {
  categoryId?: string | null;
  projectId?: string | null;
  reportId?: string | null;
  description?: string;
  notes?: string | null;
  amount?: number;
  taxAmount?: number;
  currency?: string;
  quantity?: number;
  expenseDate?: string;
  merchantName?: string | null;
  paymentMethod?: PaymentMethod;
  receiptPath?: string | null;
}

export interface CreateExpenseReportInput {
  title: string;
  currency?: string;
}

export interface CreateExpenseCategoryInput {
  name: string;
  icon?: string;
  color?: string;
  maxAmount?: number | null;
  receiptRequired?: boolean;
}

export interface CreateExpensePolicyInput {
  name: string;
  monthlyLimit?: number | null;
  requireReceiptAbove?: number | null;
  autoApproveBelow?: number | null;
}

export function getExpenseStatusVariant(
  status: ExpenseStatus
): 'default' | 'primary' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'draft':
      return 'default';
    case 'submitted':
      return 'primary';
    case 'approved':
      return 'success';
    case 'refused':
      return 'error';
    case 'paid':
      return 'success';
    default:
      return 'default';
  }
}
