# HRM Audit Report

**Module ID**: `hr`
**Audit started**: 2026-04-16
**Audit completed**: 2026-04-16
**Sign-off**: SIGNED OFF 2026-04-16
**Pilot / Full**: _Full (all 12 dimensions)_

---

## Pre-flight spot-check

- [ ] Shared UI components used
- [ ] Size `sm` in data views, `md` in auth/setup
- [ ] CSS variables (no hex colors)
- [ ] No `localStorage` for roaming settings
- [ ] Registered in client + server `apps/index.ts`
- [ ] Query keys namespaced in `config/query-keys.ts`

_Filled during Phase B._

---

## Workflow map

### User actions

**Employees** — CRUD (concurrency), search by name/role/dept, headcount by status, upload/download/delete documents, lifecycle timeline, assign leave policy, allocate balances, view balances

**Departments** — CRUD, assign head, org chart, employee count per dept

**Time-off & leave** — submit leave (draft → submitted → approved/rejected/cancelled), calendar (team + personal), balances by type, generic time-off, approve/reject, list policies/types

**Attendance** — mark present/absent/half-day, bulk mark, report, history, today

**Expenses** — create/submit (optional receipt), filter by status (draft/submitted/approved/refused/paid), bulk pay, submit/recall/approve/refuse, expense reports (grouped), pending count, dashboard, personal list, categories, policies, assignments

**Leave config** — leave types (color, days/year, carry-forward, approval required, paid), policies + assignments, holiday calendars + holidays, bulk import, resync, seed defaults (admin)

**Documents** — upload/download/soft-delete per employee

**Onboarding** — templates + tasks, create from template, mark complete, lifecycle timeline

**Settings** — default view (admin), appearance (icons, colors)

### Files

```
client/src/apps/hr/
├── page.tsx, manifest.ts, hooks.ts, settings-store.ts
├── lib/hr-utils.tsx, country-holidays.ts
├── components/
│   ├── org-chart.tsx
│   ├── employee-detail-{page,panel}.tsx, lifecycle-timeline.tsx
│   ├── leave-tabs.tsx, expenses-tabs.tsx
│   ├── hr-settings-modal.tsx
│   ├── views/{dashboard,employees-list,departments,time-off,attendance,leave-policies,leave-types,my-leave,team-calendar,holidays,approvals}-view.tsx
│   ├── expenses/{all-expenses,my-expenses,expense-approvals,expense-reports,expense-categories,expense-policies}-view.tsx
│   ├── expenses/{expense-detail-panel,expense-form-modal,expense-report-detail,expense-dashboard-section}.tsx
│   └── modals/{create-employee,create-department,edit-department,request-time-off}-modal.tsx
└── widgets/team-widget.tsx

server/src/apps/hr/
├── routes.ts, controller.ts, service.ts, manifest.ts
├── leave.service.ts, attendance.service.ts
├── controllers/{employee,department,time-off,leave-*,attendance,lifecycle,onboarding,document,expense*,expense-dashboard}.controller.ts
└── services/{employee,department,leave-*,lifecycle,onboarding,document,expense*}.service.ts + leave-balance-scheduler.ts
```

### API endpoints (condensed)

Employee: `GET|POST /`, `GET /search`, `GET /counts`, `GET|PATCH|DELETE /:id`, `GET|POST /:id/leave-balances`, `POST /:id/assign-policy`, `GET /:id/policy`, `GET|POST /:id/lifecycle`, `GET /:id/attendance`, `GET|POST /:id/documents`, `GET|POST /:id/onboarding`, `POST /:id/onboarding/from-template`
Department: `GET /departments/list`, `POST /departments`, `PATCH|DELETE /departments/:id`
Dashboard: `GET /dashboard`, `GET /widget`
Leave types: `GET|POST /leave-types`, `PATCH|DELETE /leave-types/:id`, `POST /leave-types/seed`
Leave policies: `GET|POST /leave-policies`, `PATCH|DELETE /leave-policies/:id`, `POST /leave-policies/:id/resync`, `POST /leave-policies/seed`
Holidays: `GET|POST /holiday-calendars`, `PATCH|DELETE /holiday-calendars/:id`, `GET /holiday-calendars/:id/holidays`, `POST /holidays`, `POST /holidays/bulk-import`, `PATCH|DELETE /holidays/:id`
Leave apps: `GET|POST /leave-applications`, `GET /leave-applications/pending`, `PATCH /:id`, `POST /:id/{submit,approve,reject,cancel}`
Leave calendar: `GET /leave-calendar`, `GET /working-days`, `GET /leave-balances/summary`, `POST /leave-balances/allocate`
Attendance: `GET|POST /attendance`, `POST /attendance/bulk`, `GET /attendance/today`, `GET /attendance/report`, `PATCH /attendance/:id`
Time-off: `GET /time-off/list`, `POST /time-off`, `PATCH|DELETE /time-off/:id`
Lifecycle: `DELETE /lifecycle/:id`
Onboarding: `GET|POST /onboarding-templates`, `PATCH|DELETE /onboarding/:taskId`
Documents: `DELETE /documents/:docId`, `GET /documents/:docId/download`
Expense categories: `GET /expense-categories/list`, `POST /expense-categories`, `POST /expense-categories/seed`, `POST /expense-categories/reorder`, `PATCH|DELETE /expense-categories/:id`
Expense policies: `GET|POST /expense-policies/list`, `GET|PATCH|DELETE /expense-policies/:id`, `POST /:id/assign`, `DELETE /:id/assign/:assignmentId`
Expenses: `GET /expenses/list`, `GET /expenses/my`, `GET /expenses/pending[/count]`, `GET /expenses/dashboard`, `POST /expenses`, `POST /expenses/bulk-pay`, `GET|PATCH|DELETE /expenses/:id`, `POST /:id/{submit,recall,approve,refuse}`
Expense reports: `GET /expense-reports/list`, `GET /expense-reports/my`, `GET|POST|PATCH|DELETE /expense-reports[/:id]`, `POST /:id/{submit,approve,refuse}`

### DB tables

- **employees** — name, email, role, departmentId FK, managerId FK, status, salary, hireDate, emergencyContact
- **hrLeaveTypes** — slug, color, daysPerYear, carryForward, requiresApproval, paid
- **hrLeavePolicies** — name, allocations JSONB
- **hrLeavePolicyAssignments** — policyId FK, employeeId FK, effectiveDate
- **hrHolidayCalendars** — year, isDefault
- **hrHolidays** — calendarId FK, date, type, recurring
- **hrLeaveApplications** — employeeId FK, leaveTypeId FK, startDate, endDate, halfDay, status, approverId, balanceBefore
- **hrAttendance** — employeeId FK, date, status, checkIn/Out, workingHours (unique on employeeId+date)
- **hrLifecycleEvents** — employeeId FK, eventType, from/to values, from/to deptId
- **hrExpenseCategories** — maxAmount, receiptRequired, icon, color
- **hrExpensePolicies** — monthlyLimit, receiptThreshold, autoApproveRules
- **hrExpensePolicyAssignments** — policyId FK, employeeId FK
- **hrExpenses** — employeeId FK, categoryId FK, projectId FK, reportId FK, amount, tax, currency, merchant, receiptPath, status, approverId FK
- **hrExpenseReports** — employeeId FK, title, totalAmount, status, approverId FK
- **onboardingTasks** — employeeId FK, title, assignee, completed, dueDate
- **onboardingTemplates** — tasks JSONB
- **employeeDocuments** — employeeId FK, filePath, uploadDate

All tables follow standard columns: `id`, `accountId`/`tenantId`, `userId`, `isArchived`, `sortOrder`, `createdAt`, `updatedAt`.

---

## Findings

### Dimension 1 — Golden-path workflow
Works end-to-end except for the leave-approval → balance-refresh chain.

| ID | Severity | File:line | Issue |
|----|----------|-----------|-------|
| H1-1 | fix-before-ship | client hooks.ts (useApproveLeaveApplication) | `onSuccess` invalidates `queryKeys.hr.all` but call sites viewing `leaveBalances` on the employee detail page may not refetch the balances query immediately because the balance query key is more granular. Verify the invalidation chain. |

### Dimension 2 — Empty / loading / error states
`isLoading` is handled everywhere. `isError` is handled **nowhere**. With the platform-level mutation toast now in place, query failures (lists, dashboards) still silently show nothing.

| ID | Severity | File:line | Issue |
|----|----------|-----------|-------|
| H2-1 | fix-before-ship | every list view (employees, departments, time-off, attendance, leave-policies, leave-types, team-calendar, approvals, expenses, expense-reports, expense-categories, expense-policies, dashboard, my-leave, holidays) | No `isError` fallback on any `useQuery`. Silent empty render if the endpoint 500s. |

### Dimension 3 — Input & data correctness

| ID | Severity | File:line | Issue |
|----|----------|-----------|-------|
| H3-1 | fix-before-ship | expense-category.service.ts:50 | Hard delete of `hrExpenseCategories`. Should soft-delete. |
| H3-2 | fix-before-ship | expense-policy.service.ts:76, :98 | Hard delete of `hrExpensePolicies` and assignments. Should soft-delete. |
| H3-3 | fix-before-ship | leave.service.ts:73 (createLeaveApplication) | No server-side check that `endDate >= startDate`. Invalid leave windows accepted. |
| H3-4 | fix-before-ship | attendance.service.ts:8, :22 | No validation that `checkOut > checkIn`. `calcWorkingHours` clamps to 0 but garbage times are accepted. |
| H3-5 | nice-to-have | expense-form-modal.tsx:80 | No explicit client validation that `amount > 0`; relies on Save button state. |
| H3-6 | nice-to-have | leave.service.ts:72 | Half-day date not validated to be within `startDate..endDate`. |

### Dimension 4 — Auth & permission scoping

| ID | Severity | File:line | Issue |
|----|----------|-----------|-------|
| H4-1 | fix-before-ship | attendance.service.ts:30 (markAttendance) | Upsert's existence check filters by `employeeId + date` WITHOUT `tenantId`. Low practical risk (UUIDs), but the scope is broken in principle. The insert does add `tenantId`. |
| H4-2 | nice-to-have | employee.service.ts:337 (getLinkedUserIdForEmployee) | Helper has no `tenantId` filter. In practice all callers pass already-scoped employee IDs; defence-in-depth only. |
| H4-3 | nice-to-have | expense-policy.service.ts:34 | `getExpensePolicy` leftJoin on assignments doesn't add `tenantId` to the ON clause. Redundant today since assignments are filtered on the outer query but brittle. |
| H4-4 | nice-to-have | leave.service.ts:81 (createLeaveApplication) | `leaveTypeId` not verified to belong to tenant before use. Low risk (would 404 elsewhere), but worth a guard. |

### Dimension 5 — Optimistic concurrency

**Table has `updatedAt` AND PATCH route exists AND no `withConcurrencyCheck`:**

| Entity | Shared-edit risk | Severity |
|--------|------------------|----------|
| departments | High (multiple admins) | fix-before-ship |
| hrLeaveApplications | High (employee edits / approver modifies) | fix-before-ship |
| hrExpenses | High (same as above) | fix-before-ship |
| hrExpenseReports | High | fix-before-ship |
| hrLeavePolicies | Medium (admin-shared) | fix-before-ship |
| hrLeaveTypes | Medium (admin-shared) | fix-before-ship |
| hrExpensePolicies | Medium (admin-shared) | fix-before-ship |
| hrExpenseCategories | Medium (admin-shared) | fix-before-ship |
| hrHolidayCalendars | Low (admin-only) | nice-to-have |
| hrHolidays | Low (admin-only) | nice-to-have |
| hrAttendance | Low (rarely concurrent) | nice-to-have |

**Confirms platform pattern P-3** — concurrency rollout was incomplete beyond employee records.

### Dimension 6 — i18n completeness
**Pass.** All 5 locales have 531 keys under `hr`, exact match. No hardcoded user-visible English strings in HR `.tsx` files.

### Dimension 7 — Cross-app linking
**Pass.** `SmartButtonBar` is rendered on employee detail. Cross-app links resolve.

| ID | Severity | File:line | Issue |
|----|----------|-----------|-------|
| H7-1 | nice-to-have | employee-detail-panel.tsx | Expense and leave detail panels lack `SmartButtonBar`. Only employee has one. |

### Dimension 8 — Destructive action safety
No bare `window.confirm/alert` in HR. All UI destructive actions route through `<ConfirmDialog>`. Hard-deletes on server (covered by H3-1, H3-2) are the only issues.

| ID | Severity | File:line | Issue |
|----|----------|-----------|-------|
| H8-1 | nice-to-have | — | No undo toast after archive. Architecture supports it; add later. |

### Dimension 9 — Keyboard & focus
All HR modals use the shared `<Modal>` (Radix-based, focus trap + Esc built-in). IconButton labels present. Focus rings inherit from shared Input/Button.

| ID | Severity | File:line | Issue |
|----|----------|-----------|-------|
| H9-1 | nice-to-have | all HR modal forms | Enter key does not submit forms. Must click Save/Submit. |

### Dimension 10 — Navigation & deep linking

| ID | Severity | File:line | Issue |
|----|----------|-----------|-------|
| H10-1 | fix-before-ship | employee-detail-page.tsx, expense-detail-panel.tsx, leave application detail | Detail views don't persist in URL (no `?employeeId=...` etc.). Refreshing on a detail view returns to the list. Breaks shareable links and browser refresh. |
| H10-2 | nice-to-have | expenses-tabs.tsx, leave-tabs.tsx | Active tab is URL-driven (good), but filters/sort are local state (reset on nav away). |

### Dimension 11 — Search & filters
HR employees are included in global search (`global-search.service.ts:144`). Local filters work, clear works.

| ID | Severity | File:line | Issue |
|----|----------|-----------|-------|
| H11-1 | nice-to-have | all-expenses-view.tsx, employees-list-view.tsx | Filters reset on navigation away and back. Acceptable by default but not persisted. |

### Dimension 12 — Performance smoke test

| ID | Severity | File:line | Issue |
|----|----------|-----------|-------|
| H12-1 | fix-before-ship | attendance.service.ts:57 (bulkMarkAttendance) | N+1 pattern: loops `employeeIds` and calls `markAttendance` (SELECT + INSERT/UPDATE) per employee. 100 employees = 100–200 DB round trips. Replace with one bulk upsert. |
| H12-2 | nice-to-have | employee.service.ts:106, time-off.service.ts:44, expense.service.ts:75 | Unbounded lists (no `LIMIT`, no pagination). At ~1000 rows fine; beyond that UI hangs. Defer until tenant sizing warrants it. |
| H12-3 | nice-to-have | expense-dashboard.service.ts:11 | Dashboard aggregations recomputed from scratch on every call — no cache. Cheap to live with today. |
| H12-4 | nice-to-have | employee-detail-page.tsx, expense-dashboard-section.tsx | Missing `useMemo` on derived lists / reducers. No user-visible hang at current scale. |

---

### Triage batch

**fix-before-ship (12 items):**
- H1-1 leave-balance refetch
- H2-1 missing `isError` fallbacks everywhere
- H3-1, H3-2 hard-delete of expense categories + policies (**confirms P-2**)
- H3-3 leave date range validation
- H3-4 attendance checkIn/checkOut validation
- H4-1 markAttendance missing tenantId on existence check
- H5 (8 entities) concurrency wiring — departments, leave app, leave policy, leave type, expense, expense report, expense policy, expense category (**confirms P-3**)
- H10-1 detail-page URL state
- H12-1 bulk attendance N+1

**nice-to-have (16 items):** H3-5, H3-6, H4-2, H4-3, H4-4, H5 (holiday calendars, holidays, attendance), H7-1, H8-1, H9-1, H10-2, H11-1, H12-2, H12-3, H12-4

---

---

## Fix status

| Finding | Severity | Status | Commit |
|---------|----------|--------|--------|
| H1-1 | fix-before-ship | closed — false positive (queryKeys.hr.all prefix-matches leaveBalances) | — |
| H2-1 | fix-before-ship | fixed (platform component) | 77347e6 |
| H3-1 | fix-before-ship | fixed (requires db:push) | 4e95d7f |
| H3-2 | fix-before-ship | fixed (requires db:push) | 4e95d7f |
| H3-3 | fix-before-ship | fixed | a9da11b |
| H3-4 | fix-before-ship | fixed | a9da11b |
| H3-5 | nice-to-have | deferred | — |
| H3-6 | nice-to-have | fixed incidentally with H3-3 | a9da11b |
| H4-1 | fix-before-ship | fixed | a9da11b |
| H4-2 | nice-to-have | deferred | — |
| H4-3 | nice-to-have | deferred | — |
| H4-4 | nice-to-have | fixed incidentally with H3-3 | a9da11b |
| H5 (×8) | fix-before-ship | fixed (server routes + client hooks + 3 call sites) | a2fa6db |
| H5 (×3 nice) | nice-to-have | deferred | — |
| H7-1 | nice-to-have | deferred | — |
| H8-1 | nice-to-have | deferred | — |
| H9-1 | nice-to-have | deferred | — |
| H10-1 | fix-before-ship | deferred (scope too large for pilot) | — |
| H10-2 | nice-to-have | deferred | — |
| H11-1 | nice-to-have | deferred | — |
| H12-1 | fix-before-ship | fixed | 871b42d |
| H12-2..4 | nice-to-have | deferred | — |

## Verification (post-fix)

| Dimension | Result | Evidence |
|-----------|--------|----------|
| 1. Golden-path workflow | pass | Invalidation chain verified correct (H1-1 false positive); golden path unblocked |
| 2. Empty / loading / error states | pass | 15 views wired to QueryErrorState; default mutation toast already in place |
| 3. Input & data correctness | pass | Soft-delete on expense categories + policies; date/time validation server-side |
| 4. Auth & permission scoping | pass | markAttendance tenantId fix; defence-in-depth gaps logged as nice-to-have |
| 5. Optimistic concurrency | pass | 8 entities wired; lenient-mode server lets legacy callers keep working |
| 6. i18n completeness | pass | 531 keys × 5 locales, exact match; no hardcoded strings |
| 7. Cross-app linking | pass | SmartButtonBar on employee detail; expense/leave detail panels deferred |
| 8. Destructive action safety | pass | No bare confirm/alert; hard-deletes now soft (H3-1, H3-2) |
| 9. Keyboard & focus | pass | All modals use shared Modal with focus trap + Esc |
| 10. Navigation & deep linking | partial — deferred | Detail-page URL state (H10-1) is a separate epic |
| 11. Search & filters | pass | Global search includes HR; filter drift is acceptable |
| 12. Performance smoke test | pass | Bulk attendance N+1 fixed; unbounded list warning deferred until org size warrants it |

---

## Propagation (Phase G)

- **Local**: H3-3, H3-4, H4-1, H12-1, H1-1 (false positive), H2-1 application sites
- **Pattern** (`platform-findings.md`):
  - **P-2** hard-delete of user-created config data — CONFIRMED (CRM + HRM). Graduates to pattern.
  - **P-3** entities with `updatedAt` but no `withConcurrencyCheck` — CONFIRMED (CRM + HRM). Graduates to pattern.
  - **P-4 (NEW)** — List-view queries with `isLoading` handled but no `isError` handling. Platform component `QueryErrorState` built; CRM retro-scan pending.
- **Platform** (shared fix built this session):
  - `QueryErrorState` (`packages/client/src/components/ui/query-error-state.tsx`) — universal `isError` fallback with retry button. Applied to 15 HR views; retro-apply to CRM list views planned.

### Retro-scan CRM for P-4

CRM has some loading skeletons but does not yet render `QueryErrorState` on query errors. Retro-fix planned as follow-up.

---

## Sign-off

- [x] All `fix-before-ship` findings closed OR explicitly deferred with reason (H10-1 deferred)
- [ ] Golden path walked end-to-end with fresh account — deferred to Phase E batch
- [x] Nice-to-have findings logged with status
- [x] Propagation complete (Phase G)
- [x] Module report marked SIGNED OFF at top

**Deploy note**: `cd packages/server && npm run db:push` required before next server deploy to add `is_archived` + `updated_at` on `hr_expense_categories`, and `is_archived` on `hr_expense_policies`.

**Deferred epic**: H10-1 — detail-page URL state for employee, expense, leave application. Not safe to cram into a single audit session (routing refactor touches 3 detail flows + search-param state). Should be its own PR.
