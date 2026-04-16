# Proposal revision history — design spec

**Date:** 2026-04-15
**Scope:** CRM proposals only. V1 = snapshot list + basic restore. No visual diff engine.

---

## Problem

`crmProposals` has no audit trail. When a rep updates a proposal (price cut, line item removal, term changes), the previous state is gone. There is no way to see what was quoted before.

---

## New table: `proposal_revisions`

Add to `packages/server/src/db/schema.ts` after the `crmProposals` block.

```ts
export const crmProposalRevisions = pgTable('crm_proposal_revisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  proposalId: uuid('proposal_id').notNull().references(() => crmProposals.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  revisionNumber: integer('revision_number').notNull(),       // auto-incremented per proposal
  snapshotJson: jsonb('snapshot_json').notNull(),             // full state at that moment
  changedBy: uuid('changed_by').notNull(),                   // userId
  changeReason: varchar('change_reason', { length: 200 }),   // optional free text
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  proposalIdx: index('idx_crm_proposal_revisions_proposal').on(table.proposalId),
}));
```

### `snapshotJson` shape

```ts
interface ProposalSnapshot {
  title: string;
  status: string;
  currency: string;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number; taxRate: number }>;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  notes: string | null;
  validUntil: string | null;   // ISO string
  content: unknown;            // rich-text content block
}
```

`revisionNumber` is derived at insert time via `SELECT COALESCE(MAX(revision_number), 0) + 1 FROM crm_proposal_revisions WHERE proposal_id = $id` inside a transaction.

---

## Snapshot logic — `updateProposal` in `proposal.service.ts`

Before applying the `UPDATE`, read the current row and insert a revision. Wrap both in a transaction.

```ts
export async function updateProposal(...) {
  return db.transaction(async (tx) => {
    // 1. Fetch current state (always — not just when needsRecompute)
    const [existing] = await tx
      .select()
      .from(crmProposals)
      .where(and(...ownershipConditions))
      .limit(1);
    if (!existing) return null;

    // 2. Compute next revision number
    const [{ nextRev }] = await tx
      .select({ nextRev: sql<number>`COALESCE(MAX(revision_number), 0) + 1` })
      .from(crmProposalRevisions)
      .where(eq(crmProposalRevisions.proposalId, existing.id));

    // 3. Snapshot current state before overwriting
    const snapshot: ProposalSnapshot = {
      title: existing.title,
      status: existing.status,
      currency: existing.currency,
      lineItems: existing.lineItems as LineItem[],
      subtotal: existing.subtotal,
      taxPercent: existing.taxPercent,
      taxAmount: existing.taxAmount,
      discountPercent: existing.discountPercent,
      discountAmount: existing.discountAmount,
      total: existing.total,
      notes: existing.notes,
      validUntil: existing.validUntil?.toISOString() ?? null,
      content: existing.content,
    };

    await tx.insert(crmProposalRevisions).values({
      proposalId: existing.id,
      tenantId: existing.tenantId,
      revisionNumber: nextRev,
      snapshotJson: snapshot,
      changedBy: userId!, // caller must pass userId; add to function signature
      changeReason: input.changeReason ?? null,
    });

    // 4. Apply the update (existing logic unchanged)
    // ...recompute totals, build updates map, run UPDATE...
  });
}
```

`changeReason` is an optional new field on `UpdateProposalInput`. The client may omit it; the controller passes it through unchanged.

---

## API

### `GET /crm/proposals/:id/revisions`

- Auth: `authMiddleware` + `requireApp('crm')`
- Scoped to `tenantId` from `req.auth`
- Returns revisions ordered by `revisionNumber DESC`

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "revisionNumber": 3,
      "changedBy": "uuid",
      "changeReason": "price adjustment",
      "createdAt": "2026-04-15T10:00:00Z",
      "snapshot": { ...ProposalSnapshot }
    }
  ]
}
```

No pagination needed in v1 — proposals will rarely exceed 50 revisions.

### `POST /crm/proposals/:id/revisions/:revisionId/restore`

Copies the snapshot fields back onto the live proposal via `updateProposal`, passing `changeReason = "restored from revision #N"`. This naturally creates yet another revision (the pre-restore state), so history is never destructive.

---

## Client — `proposal-detail-panel.tsx`

Add a collapsible "History" section below the `<TotalsBlock>`. It is hidden until the user clicks a "Show history" toggle.

### Data

```ts
// packages/client/src/apps/crm/hooks.ts
export function useProposalRevisions(proposalId: string) {
  return useQuery({
    queryKey: queryKeys.crm.proposalRevisions(proposalId),
    queryFn: async () => {
      const { data } = await api.get(`/crm/proposals/${proposalId}/revisions`);
      return data.data as ProposalRevision[];
    },
    staleTime: 30_000,
  });
}
```

### Layout

```
▼ History (3 revisions)
  ┌─────────────────────────────────────────────────┐
  │ #3  Apr 15 2026  •  gorkem@...  •  price adj.  │
  │   Total: $12,000 → was this revision's snapshot │
  │   [Restore this version]                         │
  ├─────────────────────────────────────────────────┤
  │ #2  Apr 14 2026  •  gorkem@...                  │
  │   ...                                            │
  └─────────────────────────────────────────────────┘
```

Each row is expandable. Expanded view shows:

- Line items table (description, qty, unit price, amount)
- Subtotal / tax / discount / total summary
- Notes and valid-until date
- Status at that point in time

For v1, this is a raw snapshot view — no side-by-side diff. A smart change-summary (e.g. "total decreased by $3,000, 1 line item removed") is a polish item for v2.

### Restore

`[Restore this version]` shows a `<ConfirmDialog>` ("This will overwrite the current proposal with revision #N. A new revision will be saved automatically."). On confirm, calls `POST /crm/proposals/:id/revisions/:revisionId/restore` and invalidates both the proposal query and the revisions list query.

---

## i18n keys (all 5 locales)

```json
"crm": {
  "proposals": {
    "history": "History",
    "revisions": "{{count}} revision",
    "revisions_plural": "{{count}} revisions",
    "showHistory": "Show history",
    "hideHistory": "Hide history",
    "restoredFrom": "Restored from revision #{{number}}",
    "changeReason": "Change reason",
    "restoreVersion": "Restore this version",
    "restoreConfirmTitle": "Restore revision #{{number}}?",
    "restoreConfirmBody": "The current proposal will be overwritten. A new revision will be saved automatically.",
    "noHistory": "No revision history yet."
  }
}
```

---

## Migration

No hand-written SQL needed. Add the table to `schema.ts`, then:

```bash
cd packages/server && npm run db:push
```

---

## Out of scope for v1

- Visual diff (line-by-line red/green highlighting)
- Revision comments / threads
- Per-revision public link sharing
- Webhook events on revision creation
