# CRM workflow builder — multi-step chains (B2)

**Date:** 2026-04-22
**Status:** Approved for planning
**Scope:** Evolve the existing single-trigger/single-action CRM workflow feature into multi-step linear chains with optional per-step skip conditions.

---

## Background

Atlas CRM ships a working workflow feature today:

- `crm_workflows` table with trigger/action/config columns (`schema.ts:1544-1562`)
- Executor in `packages/server/src/apps/crm/services/workflow.service.ts` with 6 triggers and 7 actions, full i18n-key resolution
- List + single-step create modal in `packages/client/src/apps/crm/components/automations-view.tsx`
- 10 seeded example workflows, auto-seeded on first admin visit

The structural limit: one workflow = one trigger → one action. Real use cases want to stack actions on a single trigger (the seeds already work around this: won-welcome-task, won-set-probability, won-tag-customer are three separate workflows because multi-step chaining does not exist).

This spec evolves the feature to multi-step linear chains. **Explicitly out of scope:** branching forks, iterator loops, step-to-step variable passing, code steps, outbound HTTP, new action types. Those belong in future specs.

## Locked design decisions

Decided during brainstorming, not re-opened here:

1. **B2 — linear chain with optional per-step skip condition.** No forks, no else-branches, no trees.
2. **One trigger per workflow.** Unchanged from today.
3. **Trigger-context only** — steps cannot reference prior step outputs. If a future action needs that (e.g. `http_request` response body), a later spec adds it with a schema migration.
4. **Normalized `crm_workflow_steps` table** (not JSONB array on the workflow row).
5. **No new UI libraries.** Reuse `components/ui/*`, the HTML5 DnD pattern from `deal-kanban.tsx`, tiptap editor, `Popover`, etc.
6. **Full-page editor** at `/crm/automations/:id/edit` — not a modal.

---

## Section 1 — Schema

### New table

```ts
// packages/server/src/db/schema.ts
export const crmWorkflowSteps = pgTable('crm_workflow_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').notNull()
    .references(() => crmWorkflows.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  actionConfig: jsonb('action_config').$type<Record<string, unknown>>().notNull().default({}),
  condition: jsonb('condition').$type<StepCondition | null>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  workflowIdx: index('idx_crm_workflow_steps_workflow').on(table.workflowId),
  positionIdx: uniqueIndex('idx_crm_workflow_steps_workflow_position').on(table.workflowId, table.position),
}));
```

### Shared condition type

```ts
// packages/shared/src/types/crm.ts
export type StepConditionOperator =
  | 'eq' | 'neq'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'contains' | 'not_contains'
  | 'is_empty' | 'is_not_empty';

export type StepCondition = {
  field: string;                // allow-listed dotted path, e.g. 'deal.value'
  operator: StepConditionOperator;
  value: string | number | null;
};
```

Single-condition only. No AND/OR chains. Users wanting compound logic stack two steps with the same action.

### Columns removed from `crm_workflows`

- `action` (varchar)
- `actionConfig` (jsonb)

Everything else on the workflow row stays: `id, tenantId, userId, name, trigger, triggerConfig, isActive, executionCount, lastExecutedAt, createdAt, updatedAt`.

### Allow-listed condition fields (v1)

Shared between client and server as a constant in `packages/shared/src/types/crm.ts`:

- `trigger.fromStage`, `trigger.toStage`, `trigger.activityType`
- `deal.value`, `deal.probability`, `deal.stageId`, `deal.tags`, `deal.title`
- `contact.email`, `contact.tags`
- `company.tags`

Each field has a known type (number / string / string[]) driving the operator filter in the UI.

---

## Section 2 — Executor

**File:** `packages/server/src/apps/crm/services/workflow.service.ts` — rewrite the execution half; CRUD half stays.

### Flow

```ts
export async function executeWorkflows(tenantId, userId, trigger, context) {
  const workflows = await db.select().from(crmWorkflows)
    .where(and(
      eq(crmWorkflows.tenantId, tenantId),
      eq(crmWorkflows.trigger, trigger),
      eq(crmWorkflows.isActive, true),
    ));

  for (const workflow of workflows) {
    if (!matchesTriggerConfig(workflow.triggerConfig, trigger, context)) continue;

    const steps = await db.select().from(crmWorkflowSteps)
      .where(eq(crmWorkflowSteps.workflowId, workflow.id))
      .orderBy(asc(crmWorkflowSteps.position));

    for (const step of steps) {
      try {
        if (step.condition && !evaluateCondition(step.condition, context)) continue;
        await executeAction(userId, tenantId, step.action, step.actionConfig, context);
      } catch (error) {
        logger.error({ error, workflowId: workflow.id, stepId: step.id }, 'CRM workflow step failed');
      }
    }

    await db.update(crmWorkflows).set({
      executionCount: sql`${crmWorkflows.executionCount} + 1`,
      lastExecutedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(crmWorkflows.id, workflow.id));
  }
}
```

### Behavioral decisions

1. **Step failure is non-fatal.** One action throwing does not abort the remaining steps in the chain.
2. **Condition-skip is silent.** Logged at debug level only.
3. **Sequential, not parallel.** Position order. Some actions depend on DB state written by earlier actions (e.g. `change_deal_stage` then `log_activity`).
4. **No transaction around the chain.** Each action is its own DB write. A failed step 3 does not roll back step 1.
5. **`executionCount` = chain runs**, not step runs. Increments once per workflow-trigger match.

### Condition evaluator

```ts
function evaluateCondition(cond: StepCondition, context: RunContext): boolean {
  const actual = resolveFieldPath(cond.field, context);
  return compare(actual, cond.operator, cond.value);
}
```

`resolveFieldPath` reads from a lazily-loaded run-scoped cache. Trigger context fields (`trigger.fromStage`, etc.) are already present; `deal.*`, `contact.*`, `company.*` are loaded on first access per run and cached.

Operator semantics:

- `eq` / `neq` — strict equality (`===`).
- `gt` / `gte` / `lt` / `lte` — numeric only; non-numeric operand → false (skip step).
- `contains` / `not_contains` — array `.includes(value)` for array fields (tags); substring match for string fields.
- `is_empty` / `is_not_empty` — null, undefined, empty string, empty array all count as empty.
- Unknown operator → false + warn log.

### Action switch

The existing 7-case switch in `executeAction()` keeps doing exactly what it does today. No changes to action semantics or action configs. Multi-step is purely a loop layer above it.

---

## Section 3 — API

All routes under `/api/v1/crm`, gated by `authMiddleware` + `requireApp('crm')`.

### Existing workflow routes

| Method | Path | Change |
|---|---|---|
| `GET /workflows` | List | Response now `{ workflows: [{ ...workflow, steps: [...] }] }` — steps embedded, ordered by position, single query (join or grouped select). |
| `POST /workflows` | Create | Body: `{ name, trigger, triggerConfig, steps: [{ action, actionConfig, condition? }] }`. Creates workflow + N steps in one DB transaction. `steps` required, min length 1. |
| `PATCH /workflows/:id` | Update metadata | Body: `{ name?, trigger?, triggerConfig?, isActive? }`. Does NOT touch steps. Guarded by `withConcurrencyCheck(crmWorkflows)`. |
| `DELETE /workflows/:id` | Delete | Cascade handles steps. |
| `POST /workflows/:id/toggle` | Toggle active | Unchanged. |
| `POST /workflows/seed-examples` | Seed 10 examples | Internally creates workflow + 1 step per seed. |

### New step routes

| Method | Path | Purpose |
|---|---|---|
| `POST /workflows/:id/steps` | Append step | Body: `{ action, actionConfig, condition? }`. Assigns `position = max(existing) + 1`. |
| `PATCH /workflows/:id/steps/:stepId` | Edit step | Body: `{ action?, actionConfig?, condition? }`. |
| `DELETE /workflows/:id/steps/:stepId` | Remove step | Positions of subsequent steps close up (position -= 1 for all > deleted) in same transaction. |
| `POST /workflows/:id/steps/reorder` | Reorder all | Body: `{ stepIds: [id1, id2, id3, ...] }` — full ordered list. Rewrites every step's position atomically. Partial list → 400. |

### Validation

- `action` must be one of the 7 known action keys (Zod enum).
- `condition.field` must be in the shared allow-list.
- `condition.operator` must be a known operator.
- Steps min length 1 on create. Last step cannot be deleted — 400 with `LAST_STEP` error code.

### Tenant scoping

Every step endpoint verifies `crm_workflows.tenantId = req.auth!.tenantId` before touching steps. No direct step-by-id access without the workflow-id route parent.

### OpenAPI

New paths registered in `packages/server/src/openapi/paths/` following existing `crm-*` path files. Scalar UI at `/api/v1/reference` picks it up automatically.

---

## Section 4 — UI

### 4a — List view (`automations-view.tsx`)

1. **Remove the create modal.** "New automation" becomes: POST a new workflow with one default step (`create_task` / empty title), then navigate to the editor page.
2. **Row summary format:** `trigger → N steps · [first action label] · +N-1 more` (when N > 1). Clicking the row navigates to `/crm/automations/:id/edit`. Toggle and delete buttons stay on the row.

Everything else — auto-seed, execution badge, admin gating, empty state — unchanged.

### 4b — Full-page editor (`/crm/automations/:id/edit`)

**Files:**

- `packages/client/src/apps/crm/components/automation-editor.tsx` — page shell
- `packages/client/src/apps/crm/components/step-card.tsx`
- `packages/client/src/apps/crm/components/condition-row.tsx`

**Layout:** uses `ContentArea` like every other CRM page. Header (sticky, 44px): back button, inline-editable workflow name, active toggle, overflow menu (delete workflow). Body: trigger section (1 card), "↓", steps section (N cards), "+ Add step" button.

**Step card:**

- Drag handle (left). HTML5 DnD pattern from `deal-kanban.tsx:46-99` — drop fires `POST /workflows/:id/steps/reorder` with the new id list.
- Position badge (1, 2, 3…) — computed from array index, not stored.
- Action `Select` — the same 7 options as today.
- Per-action config fields — lifted verbatim out of the current `CreateWorkflowModal` conditional blocks (`create_task` → task title input, `update_field` → field + value, etc.).
- Condition chip / "+ Add filter" button — expands inline into a `ConditionRow`.
- Overflow menu: Duplicate step, Delete step (disabled for last remaining step).

**Condition row:** three controls — Field `Select`, Operator `Select`, Value `Input`. Field `Select` is scoped to what the current trigger makes available (mapping in shared `TRIGGER_AVAILABLE_FIELDS` constant). Operator options filter by field type: numeric fields → gt/gte/lt/lte; array fields → contains/not_contains; strings → eq/neq/contains; all types get is_empty/is_not_empty. ✕ button clears the condition (sets it to null).

**Save model:** debounced autosave, no explicit save button.

- Every edit fires a debounced PATCH after 500ms idle.
- Header shows "Saved" / "Saving…" / "Save failed" status. Matches pattern in `proposal-editor.tsx`.
- Save errors surface as a `Toast`; success silent.

**Trigger section:** reuses trigger + trigger-config blocks from the current create modal, unchanged. Changing the trigger clears any step conditions whose fields are no longer in the allow-list for the new trigger, with a `Toast`: "Removed N conditions that referenced the old trigger".

**Empty chain protection:** delete disabled on the last remaining step with tooltip "A workflow needs at least one step."

### 4c — Hooks (`packages/client/src/apps/crm/hooks.ts`)

Extend existing workflow hooks:

- `useWorkflow(id)` — new, single workflow with embedded steps.
- `useWorkflows()` — existing, response now includes embedded steps.
- `useUpdateWorkflow()` — existing, metadata-only.
- `useAddStep()`, `useUpdateStep()`, `useDeleteStep()`, `useReorderSteps()` — new. All invalidate `useWorkflow(id)`.

### 4d — Routing

Add route constant in `packages/client/src/config/routes.ts`. Mount in CRM page's route tree: `/crm/automations/:id/edit`. Back navigates to `/crm/automations`.

### 4e — Translations

All 5 locale files (`en`, `tr`, `de`, `fr`, `it`) per CLAUDE.md. New namespace `crm.automations.editor.*`: trigger/steps section labels, "Add step", "Add filter", overflow menu items, delete confirmation, autosave statuses, empty-chain tooltip, all 10 condition operator labels, toast strings.

---

## Section 5 — Migration

Uses `packages/server/src/db/migrate.ts` raw-SQL idempotent pattern.

### 5a — Create table

```sql
CREATE TABLE IF NOT EXISTS crm_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES crm_workflows(id) ON DELETE CASCADE,
  position integer NOT NULL,
  action varchar(100) NOT NULL,
  action_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  condition jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_workflow_steps_workflow
  ON crm_workflow_steps(workflow_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_workflow_steps_workflow_position
  ON crm_workflow_steps(workflow_id, position);
```

### 5b — Backfill

```sql
INSERT INTO crm_workflow_steps (workflow_id, position, action, action_config)
SELECT w.id, 0, w.action, w.action_config
FROM crm_workflows w
WHERE NOT EXISTS (
  SELECT 1 FROM crm_workflow_steps s WHERE s.workflow_id = w.id
)
AND w.action IS NOT NULL;
```

Idempotent via `NOT EXISTS` + `IS NOT NULL` guards.

### 5c — Drop legacy columns

```sql
ALTER TABLE crm_workflows DROP COLUMN IF EXISTS action;
ALTER TABLE crm_workflows DROP COLUMN IF EXISTS action_config;
```

### 5d — schema.ts update

Remove `action` and `actionConfig` from `crmWorkflows` Drizzle table definition. Add `crmWorkflowSteps` definition. Drift detector (commit `dc72cda`) confirms live DB matches.

### 5e — Seed function rewrite

`seedExampleWorkflows()` rewritten: create workflow row, then insert one step (position=0) with the action + actionConfig that used to live on the workflow. Existing `migrateSeedWorkflowsToKeys` redirected to read/write `crm_workflow_steps.action_config` instead of `crm_workflows.action_config`. Same SEED_* maps, same idempotency.

### 5f — Environment coverage

- **Dev:** migrations run on server boot against local Postgres (`docker compose up`). Verified via `cd packages/server && npm run dev` — logs CREATE/INSERT/ALTER once, silent on re-runs.
- **Prod (Dokploy):** same migration on container boot. Atlas is pre-launch; no external user data risk. Idempotent.
- **Rollback path (documented, not coded):** re-add `action`/`action_config` columns, copy `step.position=0` values back, redeploy prior server. Drop-column is reversible because data is preserved in the steps table.

### 5g — Migration tests

`packages/server/__tests__/crm-workflow-migration.test.ts` — runs the migration twice against a test DB and asserts:

1. Second run is a no-op (no errors, no duplicate step rows).
2. A pre-existing workflow (single-action row pre-migration) produces exactly one step at position 0 with the correct action/config.
3. A workflow already migrated (has steps, no legacy columns) is untouched.

---

## Section 6 — Testing

### 6a — Executor tests (`packages/server/__tests__/crm-workflow-executor.test.ts`)

1. Single-step chain executes its step.
2. Multi-step chain (3 steps) — all three side effects visible.
3. Step position ordering — B@0, A@1 → B runs first.
4. Skip condition true — step skipped, other steps still run.
5. Skip condition false — step runs.
6. Condition on unavailable field (no dealId in context) — step skipped, others run.
7. Step failure isolation — step 2 throws, step 1 and step 3 effects both persist, `executionCount` still incremented.
8. No-transaction — step 3 fails after 1 + 2 succeed; 1 + 2 not rolled back.
9. Trigger-config filter — non-matching `toStage` → workflow skipped entirely.
10. Inactive workflow — `isActive=false` → not executed.
11. Operator coverage — one test per operator × true/false case.
12. Numeric operator on non-numeric value — returns false (step skipped).

### 6b — API tests (`packages/server/__tests__/crm-workflow-api.test.ts`)

1. Create workflow with 3-step chain — GET returns them ordered.
2. `steps: []` → 400.
3. Unknown action → 400.
4. Condition field not in allow-list → 400.
5. Reorder full-list → atomic update; partial list → 400.
6. Tenant isolation — user A can't touch user B's steps.
7. Cascade delete — DELETE workflow removes all steps.
8. Stale `updatedAt` PATCH → 409 STALE_RESOURCE.
9. GET `/workflows` response shape — steps embedded, one DB roundtrip.

### 6c — Migration tests

See 5g above.

### 6d — UI tests

Atlas does not run Playwright/Cypress today. Automated UI tests are out of scope for this feature. Manual QA checklist:

- Create workflow → lands on editor page.
- Add 3 steps, reorder via drag — positions persist on reload.
- Add condition to step 2, save — condition persists and renders correctly.
- Change trigger — conditions referencing now-unavailable fields are cleared with a toast.
- Delete last step — button disabled with tooltip.
- Autosave indicator: Saving → Saved within 1s of last edit.
- Toggle active from list view and editor — both reflect immediately.
- Admin-only auto-seed still works on a fresh account.
- All 5 locales render the editor without layout breaks (esp. long German strings).

### 6e — Out of scope (not tested)

- Run history (no feature yet).
- Retries (sequential best-effort is the spec).
- Parallel execution (explicitly rejected in section 2).
- Performance / load testing (~10 workflows × ~3 steps × few fires/day — not a concern).

---

## Open questions

None at spec time.

## Dependencies

- Existing `withConcurrencyCheck` middleware.
- Existing `Modal`, `Select`, `Input`, `Button`, `Popover`, `Toast`, `ContentArea`, `ConfirmDialog` UI components.
- HTML5 DnD pattern from `deal-kanban.tsx`.
- Autosave pattern from `proposal-editor.tsx`.
- i18n key resolution (`i18nKey`, `resolveMaybeKey` in `packages/server/src/utils/i18n.ts`).
- Drift detector from commit `dc72cda`.
