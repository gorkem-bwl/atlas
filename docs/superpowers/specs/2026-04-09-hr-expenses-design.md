# HR Expenses — Design Spec

**Date:** 2026-04-09
**Status:** Draft

---

## 1. Overview

Add expense management to the HR app as a new sidebar section. Employees submit expenses for approval, managers approve/refuse, admins process payments. Expenses can optionally be grouped into reports and linked to projects.

Follows the same patterns as the existing leave management system: status machine with dedicated action endpoints, auto-assigned approver (manager), pending approvals queue with badge count, and the card-based approve/refuse UI.

---

## 2. Workflow & Statuses

```
Draft → Submitted → Approved → Paid → Done
  ↑         ↓           ↓
  └── Refused ←── Refused
```

| Status | Who sets it | What happens |
|--------|------------|--------------|
| `draft` | Employee (create) | Expense is editable. Not visible to manager. |
| `submitted` | Employee (submit action) | Sent to manager. Employee can recall to Draft. Policy violations flagged. |
| `approved` | Manager (approve action) | Manager accepted. Ready for finance to process. |
| `refused` | Manager (refuse action) | Rejected with comment. Returns to Draft for employee to fix and resubmit. |
| `paid` | Admin (mark paid action) | Reimbursement processed. Terminal state. Bulk action supported. |

**Approver assignment:** Auto-set to `employees.managerId` on submit (same as leave applications).

**Expense reports:** When expenses are grouped into a report, the report has its own status. Submitting the report submits all its draft expenses. Approving the report approves all. Individual expenses within a report cannot be approved/refused separately — the report is the unit of approval.

---

## 3. Schema

### 3.1 `hr_expense_categories`

Admin-managed expense categories.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, defaultRandom |
| `tenantId` | uuid | FK → tenants, NOT NULL |
| `name` | varchar(255) | NOT NULL |
| `icon` | varchar(50) | NOT NULL, default `'receipt'` |
| `color` | varchar(20) | NOT NULL, default `'#6b7280'` |
| `maxAmount` | real | nullable — per-expense limit |
| `receiptRequired` | boolean | NOT NULL, default false |
| `isActive` | boolean | NOT NULL, default true |
| `sortOrder` | integer | NOT NULL, default 0 |
| `createdAt` | timestamp | NOT NULL, defaultNow |

Default categories seeded on first use: Travel, Accommodation, Meals, Transportation, Office Supplies, Software, Client Entertainment, Training, Phone/Internet, Miscellaneous.

### 3.2 `hr_expense_policies`

Spending limit rules.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, defaultRandom |
| `tenantId` | uuid | FK → tenants, NOT NULL |
| `name` | varchar(255) | NOT NULL |
| `monthlyLimit` | real | nullable — total monthly budget per employee |
| `requireReceiptAbove` | real | nullable — receipt required above this amount |
| `autoApproveBelow` | real | nullable — auto-approve under this amount |
| `isActive` | boolean | NOT NULL, default true |
| `createdAt` | timestamp | NOT NULL, defaultNow |
| `updatedAt` | timestamp | NOT NULL, defaultNow |

### 3.3 `hr_expense_policy_assignments`

Links policies to employees or departments.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, defaultRandom |
| `tenantId` | uuid | FK → tenants, NOT NULL |
| `policyId` | uuid | FK → hr_expense_policies, NOT NULL, cascade |
| `employeeId` | uuid | nullable FK → employees, cascade |
| `departmentId` | uuid | nullable FK → departments, cascade |
| `createdAt` | timestamp | NOT NULL, defaultNow |

One of `employeeId` or `departmentId` must be set. Employee-level assignment takes precedence over department-level.

### 3.4 `hr_expense_reports`

Optional grouping of expenses.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, defaultRandom |
| `tenantId` | uuid | FK → tenants, NOT NULL |
| `userId` | uuid | NOT NULL |
| `employeeId` | uuid | FK → employees, NOT NULL |
| `title` | varchar(500) | NOT NULL |
| `status` | varchar(20) | NOT NULL, default `'draft'` |
| `totalAmount` | real | NOT NULL, default 0 (computed on submit) |
| `currency` | varchar(10) | NOT NULL, default `'USD'` |
| `submittedAt` | timestamp | nullable |
| `approvedAt` | timestamp | nullable |
| `refusedAt` | timestamp | nullable |
| `paidAt` | timestamp | nullable |
| `approverId` | uuid | nullable |
| `approverComment` | text | nullable |
| `isArchived` | boolean | NOT NULL, default false |
| `createdAt` | timestamp | NOT NULL, defaultNow |
| `updatedAt` | timestamp | NOT NULL, defaultNow |

### 3.5 `hr_expenses`

Individual expense records.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, defaultRandom |
| `tenantId` | uuid | FK → tenants, NOT NULL |
| `userId` | uuid | NOT NULL |
| `employeeId` | uuid | FK → employees, NOT NULL |
| `categoryId` | uuid | FK → hr_expense_categories, set null on delete |
| `projectId` | uuid | nullable FK → projectProjects, set null on delete |
| `reportId` | uuid | nullable FK → hr_expense_reports, set null on delete |
| `description` | text | NOT NULL |
| `notes` | text | nullable |
| `amount` | real | NOT NULL |
| `taxAmount` | real | NOT NULL, default 0 |
| `currency` | varchar(10) | NOT NULL, default `'USD'` |
| `quantity` | real | NOT NULL, default 1 |
| `expenseDate` | timestamp | NOT NULL |
| `merchantName` | varchar(255) | nullable |
| `paymentMethod` | varchar(20) | NOT NULL, default `'personal_card'` |
| `receiptPath` | text | nullable — server file path |
| `status` | varchar(20) | NOT NULL, default `'draft'` |
| `submittedAt` | timestamp | nullable |
| `approvedAt` | timestamp | nullable |
| `refusedAt` | timestamp | nullable |
| `paidAt` | timestamp | nullable |
| `approverId` | uuid | nullable |
| `approverComment` | text | nullable (refusal reason) |
| `policyViolation` | text | nullable — auto-set on submit if policy violated |
| `isArchived` | boolean | NOT NULL, default false |
| `createdAt` | timestamp | NOT NULL, defaultNow |
| `updatedAt` | timestamp | NOT NULL, defaultNow |

Indexes: `tenantId`, `employeeId`, `categoryId`, `status`, `reportId`, `projectId`, `expenseDate`.

---

## 4. API Routes

All under `/api/hr`, auth required.

### Expense Categories (admin)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/expense-categories/list` | List categories |
| POST | `/expense-categories` | Create category |
| POST | `/expense-categories/seed` | Seed default categories |
| PATCH | `/expense-categories/:id` | Update category |
| DELETE | `/expense-categories/:id` | Delete category (soft) |
| POST | `/expense-categories/reorder` | Reorder categories |

### Expense Policies (admin)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/expense-policies/list` | List policies |
| POST | `/expense-policies` | Create policy |
| GET | `/expense-policies/:id` | Get policy with assignments |
| PATCH | `/expense-policies/:id` | Update policy |
| DELETE | `/expense-policies/:id` | Delete policy |
| POST | `/expense-policies/:id/assign` | Assign to employee/department |
| DELETE | `/expense-policies/:id/assign/:assignmentId` | Remove assignment |

### Expenses

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/expenses/list` | List expenses (filters: status, employeeId, categoryId, projectId, dateRange) |
| GET | `/expenses/my` | List current user's expenses |
| POST | `/expenses` | Create expense |
| GET | `/expenses/:id` | Get expense detail |
| PATCH | `/expenses/:id` | Update expense (draft only) |
| DELETE | `/expenses/:id` | Soft delete (draft only) |
| POST | `/expenses/:id/submit` | Submit for approval |
| POST | `/expenses/:id/recall` | Recall to draft (submitted only) |
| POST | `/expenses/:id/approve` | Approve (manager) |
| POST | `/expenses/:id/refuse` | Refuse with comment (manager) |
| POST | `/expenses/bulk-pay` | Mark multiple as paid (admin) |
| GET | `/expenses/pending` | Pending approvals for current manager |
| GET | `/expenses/pending/count` | Count of pending approvals |
| POST | `/expenses/:id/upload-receipt` | Upload receipt file |

### Expense Reports

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/expense-reports/list` | List reports |
| GET | `/expense-reports/my` | List current user's reports |
| POST | `/expense-reports` | Create report |
| GET | `/expense-reports/:id` | Get report with expenses |
| PATCH | `/expense-reports/:id` | Update report (draft only) |
| DELETE | `/expense-reports/:id` | Soft delete (draft only) |
| POST | `/expense-reports/:id/submit` | Submit report (submits all its expenses) |
| POST | `/expense-reports/:id/approve` | Approve report (approves all expenses) |
| POST | `/expense-reports/:id/refuse` | Refuse report (refuses all expenses) |

### Dashboard

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/expenses/dashboard` | Summary stats, charts data for HR dashboard |

---

## 5. HR Sidebar Additions

New "Expenses" section in the HR sidebar, placed after the "Leave" section:

| Item | Icon | Visible to | Badge |
|------|------|------------|-------|
| My expenses | `Receipt` | All employees | — |
| Expense approvals | `ClipboardCheck` | Managers/admins | Pending count |
| All expenses | `LayoutList` | Admins only | — |
| Expense reports | `FolderOpen` | All employees | — |
| Expense categories | `Tag` | Admins only | — |
| Expense policies | `Shield` | Admins only | — |

---

## 6. Employee Views

### 6.1 My Expenses

DataTable with columns: date, category (icon + name), description, amount (formatted), project name, status badge. Client-side search. Filter tabs by status (All, Draft, Submitted, Approved, Refused, Paid).

"New expense" button opens the expense form modal.

### 6.2 Expense Form (modal)

Fields:
- **Category** — select from active `hr_expense_categories`
- **Expense date** — date picker
- **Description** — text input (required)
- **Merchant** — text input (optional)
- **Amount** — number input (required)
- **Tax** — number input (default 0)
- **Quantity** — number input (default 1)
- **Currency** — select (default from tenant)
- **Payment method** — select: Personal card, Company card, Cash
- **Project** — optional select from `projectProjects`
- **Receipt** — file upload (image/PDF)
- **Add to report** — optional select/create a report
- **Notes** — textarea (optional)

Footer: **Save** (draft) / **Submit** (saves + submits)

Policy violations shown inline: if category has `maxAmount` and entered amount exceeds, show warning "Exceeds category limit of {amount}". If policy `requireReceiptAbove` and no receipt attached, block submit with error.

### 6.3 Expense Reports

List of reports with title, status badge, total amount, expense count, date range.

"Create report" modal: title input. After creation, user can add existing draft expenses to the report or create new ones within it.

Report detail: shows grouped expenses as a list, with total. Submit button submits the entire report.

---

## 7. Admin/Manager Views

### 7.1 Expense Approvals

Follows the leave approvals pattern exactly.

Card list showing: employee avatar + name, category icon + name, description, amount (large), expense date, merchant, policy violation warning (if any), receipt thumbnail (clickable to view full).

Actions: **Approve** (green primary button) / **Refuse** (red, expands inline comment textarea).

Auto-approve: if policy `autoApproveBelow` is set and expense amount is under the threshold, the expense skips the approvals queue and goes directly to `approved`.

### 7.2 All Expenses

Org-wide DataTable: employee name, date, category, description, amount, project, status. Filters by status, employee, category, date range.

**Bulk "Mark as paid"**: checkbox column, bulk action button for approved expenses. Sets status to `paid`, `paidAt` to now, sends email notification.

### 7.3 Expense Categories

CRUD list: name, icon preview, color swatch, max amount, receipt required toggle, active toggle. Add/edit inline or via modal.

Seed button: "Add default categories" — creates the 10 standard categories if none exist.

### 7.4 Expense Policies

CRUD list: policy name, monthly limit, receipt threshold, auto-approve threshold, active toggle.

Policy detail: shows assignments (employees and departments). "Assign" button opens a picker to add employees or departments.

---

## 8. HR Dashboard — Expenses Section

Added to the existing HR Dashboard view as a new section:

### Summary Cards (top row)
- **Total expenses** this month (with % change vs last month)
- **Pending approvals** count
- **Unpaid amount** (approved but not yet paid)
- **Reimbursed** this month total

### Charts
- **Spend by category** — horizontal bar chart, top 5 categories by amount
- **Monthly trend** — line/bar chart, last 6 months of total spend

### Lists
- **Top spenders** — top 5 employees by total this month (avatar, name, amount)
- **Policy violations** — count of violations, top reasons (category, description)
- **Pending payments** — compact list of approved expenses awaiting payment (employee, amount, date)

---

## 9. Email Notifications

Using the existing email service (sends only if SMTP is configured):

| Event | Recipient | Subject |
|-------|-----------|---------|
| Expense submitted | Manager (approver) | "New expense to review from {employeeName}" |
| Expense approved | Employee | "Your expense '{description}' was approved" |
| Expense refused | Employee | "Your expense '{description}' was refused" |
| Expense paid | Employee | "Your expense reimbursement of {amount} has been processed" |
| Report submitted | Manager (approver) | "Expense report '{title}' to review from {employeeName}" |
| Report approved | Employee | "Your expense report '{title}' was approved" |
| Report refused | Employee | "Your expense report '{title}' was refused" |

---

## 10. Policy Enforcement

When an employee submits an expense (or a report):

1. **Find applicable policy**: check `hr_expense_policy_assignments` for the employee's ID first, then their department ID. Employee-level takes precedence.

2. **Category limit check**: if `hr_expense_categories.maxAmount` is set and `expense.amount > maxAmount`, set `policyViolation = "Exceeds {category} limit of {maxAmount}"`. Allow submit but flag.

3. **Receipt requirement**: if policy `requireReceiptAbove` is set and `expense.amount > requireReceiptAbove` and `receiptPath` is null, **block submit** with error "Receipt required for expenses over {amount}".

4. **Auto-approve**: if policy `autoApproveBelow` is set and `expense.amount < autoApproveBelow`, auto-set status to `approved`, skip manager queue.

5. **Monthly limit check**: if policy `monthlyLimit` is set, sum all non-draft expenses for the employee this month. If adding this expense would exceed the limit, set `policyViolation = "Monthly limit of {monthlyLimit} exceeded"`. Allow submit but flag.

Policy violations are informational flags for the approver, NOT blockers (except missing receipt). The approver sees the violation and decides whether to approve anyway.

---

## 11. Shared Components Reused

- **StatusTimeline** — from `components/shared/status-timeline.tsx` for expense detail status progression
- **DataTable** — from existing HR components for list views
- **Badge** — for status badges
- **Modal** — compound Modal for expense form
- **FeatureEmptyState** — for empty state when no expenses

---

## 12. File Structure

### Server
```
packages/server/src/apps/hr/
├── services/
│   ├── expense.service.ts          — expense CRUD, submit, approve, refuse, pay
│   ├── expense-category.service.ts — category CRUD, seed
│   ├── expense-policy.service.ts   — policy CRUD, assignment, enforcement
│   ├── expense-report.service.ts   — report CRUD, submit, approve, refuse
│   └── expense-dashboard.service.ts — dashboard stats
├── controllers/
│   ├── expense.controller.ts
│   ├── expense-category.controller.ts
│   ├── expense-policy.controller.ts
│   ├── expense-report.controller.ts
│   └── expense-dashboard.controller.ts
```

### Client
```
packages/client/src/apps/hr/components/
├── expenses/
│   ├── my-expenses-view.tsx         — employee's expense list
│   ├── expense-form-modal.tsx       — create/edit expense
│   ├── expense-detail-panel.tsx     — expense detail with status timeline
│   ├── expense-approvals-view.tsx   — manager approval queue
│   ├── all-expenses-view.tsx        — admin org-wide view
│   ├── expense-reports-view.tsx     — report list
│   ├── expense-report-detail.tsx    — report with grouped expenses
│   ├── expense-categories-view.tsx  — category management
│   ├── expense-policies-view.tsx    — policy management
│   └── expense-dashboard-section.tsx — dashboard charts/stats
```

---

## 13. Translations

New keys in all 5 locale files under `hr.expenses`:
- Sidebar labels, form field labels, status labels, action buttons, empty states, dashboard labels, policy labels, notification messages, validation messages.

---

## 14. Query Keys

Add to `packages/client/src/config/query-keys.ts` under existing `hr` namespace:

```typescript
expenses: {
  all: ['hr', 'expenses'],
  list: (filters?) => ['hr', 'expenses', 'list', filters],
  my: ['hr', 'expenses', 'my'],
  detail: (id) => ['hr', 'expenses', id],
  pending: ['hr', 'expenses', 'pending'],
  pendingCount: ['hr', 'expenses', 'pending-count'],
  dashboard: ['hr', 'expenses', 'dashboard'],
},
expenseReports: {
  all: ['hr', 'expense-reports'],
  list: (filters?) => ['hr', 'expense-reports', 'list', filters],
  my: ['hr', 'expense-reports', 'my'],
  detail: (id) => ['hr', 'expense-reports', id],
},
expenseCategories: {
  all: ['hr', 'expense-categories'],
  list: ['hr', 'expense-categories', 'list'],
},
expensePolicies: {
  all: ['hr', 'expense-policies'],
  list: ['hr', 'expense-policies', 'list'],
  detail: (id) => ['hr', 'expense-policies', id],
},
```

---

## 15. Out of Scope (Future)

- OCR receipt scanning / AI auto-fill
- Mileage / per diem special expense types with rate calculation
- Multi-level approval chains (VP approval for amounts over $X)
- Recurring expenses (auto-submit monthly subscriptions)
- Payroll integration (sync reimbursements to payroll run)
- Currency conversion (exchange rate lookup)
- Email-to-expense (forward receipt to a special address)
- Mobile-optimized receipt capture
- Duplicate detection (same amount + date + merchant)
- Expense analytics export (CSV/PDF)
- Merchant category restrictions
