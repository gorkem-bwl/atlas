# Invoice Detail Page — Design

**Status:** Approved for implementation planning
**Author:** Atlas team, 2026-04-14
**Supersedes:** `InvoiceDetailPanel` slide-over in the Invoices app

## Problem

Clicking an invoice today opens a 412-line slide-over panel that competes with the list behind it. The invoice PDF and its editable fields are in separate components (`InvoicePreview`, `InvoiceDetailPanel`) never composed into one view. Result: you either see the list + panel, or the PDF preview alone, but never both with enough room to actually work.

CRM solved this for deals with a URL-addressable full-page detail view (`?view=deal-detail&dealId=...`). Invoices should follow the same pattern.

## Goal

Deliver a full-page invoice detail view with the app sidebar intact, a resizable split between PDF preview and editable details, inline editing on every field, and adaptive header actions tied to invoice status.

## Non-goals

- Reworking the PDF template itself. Server-side PDF generation stays unchanged.
- Collabora-style in-PDF editing. Editing lives in the details pane; the PDF is read-only preview.
- Replacing the list view or dashboard. Both stay; only the single-invoice flow changes.
- E-Fatura workflow redesign. Existing actions move into the new page's "More" menu as-is.

## Overview

```
┌──────────────────────────── Invoices app ─────────────────────────────┐
│ Sidebar   │ [breadcrumb · INV-2026-007 · status chip]  [actions]     │
│ · Dash    │ ─────────────────────────────────────────────────────── │
│ · List    │                                    ║                     │
│ · Recur.  │    PDF iframe (60%)               ║   Details (40%)     │
│ · Trash   │                                    ║   · meta            │
│ · …       │    [pdf viewer with browser       ║   · line items      │
│           │     toolbar: zoom/print/download] ║   · totals          │
│           │                                    ║   · notes           │
│           │                                    ║   · payments        │
│           │                                    ║   · activity        │
│           │         ↔ draggable split          ║                     │
└───────────┴────────────────────────────────────╨─────────────────────┘
```

## URL contract

Route: `/invoices?view=invoice-detail&invoiceId=<uuid>`

- Matches CRM's `?view=deal-detail&dealId=...` convention — same hook, same `setSearchParams({...})` pattern.
- Browser back button returns to the list.
- Deep-linkable (email, Slack, etc.).
- Closing the detail returns to the list view (`?view=invoices` or whatever was active before).

## Layout

### Split ratio

- Default: **PDF 60% · Details 40%**.
- A vertical drag handle between them adjusts the split.
- Clamped to `[50% PDF, 70% PDF]` — 10% swing either direction, as requested.
- The split ratio persists in `localStorage` under `atlas_invoice_detail_split` so it sticks across sessions (per-device, like the sidebar width).

### Header

One persistent 44px header row using the shared `<ContentArea headerSlot={...}>` pattern (see `packages/client/src/components/ui/content-area.tsx`), like every other app page.

Contents:
- **Left:** Breadcrumb `Invoices › INV-2026-007` + status chip (draft/sent/viewed/partial/overdue/paid/waived)
- **Right:** Adaptive action buttons (see below) + `⋯ More` menu

### Adaptive action buttons

The primary-action buttons in the header change based on `invoice.status`:

| Status | Visible buttons (left to right) |
|--------|---------------------------------|
| `draft` | **Send** · Download PDF |
| `sent`, `viewed` | **Record payment** · Resend · Download PDF |
| `partial` | **Record payment** · Send reminder · Download PDF |
| `overdue` | **Record payment** · Send reminder · Download PDF |
| `paid`, `waived` | Download PDF |

The `⋯ More` menu always contains the full action set so nothing is unreachable: Duplicate, Mark paid (manual), Waive, Delete, Share link, e-Fatura submit/status, Import time entries.

The leading primary action renders with `variant="primary"`; the rest use `variant="secondary"`.

### Left pane — PDF preview

- Native `<iframe>` sourced from `/api/v1/invoices/:id/pdf?inline=true` (existing endpoint).
- Browser chrome gives zoom, print, download, fit-to-width for free. No custom toolbar.
- Blob URL is revoked on unmount to avoid memory leaks. Blob is re-fetched when the invoice data changes (see "PDF refresh" below).
- Loading state: skeleton while the blob is fetching. Empty state if the invoice has zero line items (iframe would still load but the PDF looks blank).
- No Atlas chrome overlaid on the PDF itself.

### Right pane — Details (inline-editable, single scroll column)

The entire 40% pane is one vertical scroll container. Sections, top to bottom:

1. **Meta block** — 2-column grid of key/value rows:
   - Invoice number (editable, text)
   - Status (dropdown)
   - Issue date (date picker)
   - Due date (date picker)
   - Company (combobox tied to CRM companies)
   - Contact (combobox filtered by the selected company)
   - Currency (dropdown)
   - Deal (optional combobox for linking to a CRM deal)

2. **Line items** — full-width table, always-editable rows:
   - Columns: ⠿ drag handle, Description, Quantity, Unit price, Tax rate (%), Row total (computed)
   - Every cell is an `<input>` that saves on blur per the inline-save contract.
   - Row total = `qty × unitPrice × (1 + taxRate/100)` — computed client-side, never stored separately.
   - `✕` button at the row's right edge to delete.
   - Drag-handle at the row's left edge for reordering (same pattern as Drive's folder drag).
   - "+ Add line" button as the table's last row.

3. **Totals block** — subtotal, total tax, total discount, grand total. Derived from line items; read-only. Uses the existing `<TotalsBlock>` component.

4. **Notes** — multi-line text area. Full-width. Inline-saves on blur.

5. **Payments** — existing `<InvoicePaymentsList>` component. "+ Record payment" button opens the existing `<RecordPaymentModal>`.

6. **Activity** — status timeline (existing `<StatusTimeline>` component). Shows `created`, `sent`, `viewed`, `paid`, `waived` events with dates.

## Inline editing contract

Per Q5 decisions:

- **Text inputs** — click → becomes a focused `<input>` → blur triggers a `useUpdateInvoice` mutation with just that field → the mutation body carries `updatedAt` for optimistic-concurrency (see `packages/server/src/middleware/concurrency-check.ts`).
- **Dates** — click the formatted date → opens a date picker → selecting a date saves immediately.
- **Selects** — click → dropdown opens → selecting saves.
- **Line item rows** — each cell behaves like a text input. Adding a line fires `useAddInvoiceLineItem`; deleting fires `useDeleteInvoiceLineItem`; reordering fires `useReorderInvoiceLineItems` with the new order.
- **Concurrency** — every mutation passes `updatedAt` via `ifUnmodifiedSince()`. Stale writes surface through the existing global `ConflictDialog` (mounted in `App.tsx`). No custom error handling per-field.

### PDF refresh cadence

- After any field save returns successfully, a 1.5-second debounce waits for further edits.
- When the debounce settles, the PDF blob is re-fetched and the iframe `src` swaps to the new blob URL.
- The old blob URL is revoked on swap.
- If another edit lands inside the debounce window, the timer resets.
- The debounce is per-invoice (keyed on invoice id); navigating away cancels the pending refresh.

This keeps the preview fresh without flooding the server on bursty edits.

## Components

### New files

- `packages/client/src/apps/invoices/components/invoice-detail-page.tsx` — page shell, split handle, fetch the invoice, compose the left and right panes.
- `packages/client/src/apps/invoices/components/invoice-pdf-viewer.tsx` — iframe + blob lifecycle + debounced refresh.
- `packages/client/src/apps/invoices/components/invoice-meta-block.tsx` — the 2-column editable metadata grid.
- `packages/client/src/apps/invoices/components/invoice-line-items-table.tsx` — editable table with add/delete/reorder.
- `packages/client/src/apps/invoices/components/invoice-detail-header.tsx` — adaptive header actions + status chip + breadcrumb.

### Modified files

- `packages/client/src/apps/invoices/page.tsx` — route `?view=invoice-detail&invoiceId=...` to the new page, otherwise render the existing dashboard/list/recurring views.
- `packages/client/src/apps/invoices/components/invoices-list-view.tsx` — clicking an invoice now calls `setSearchParams({ view: 'invoice-detail', invoiceId: id })` instead of setting `selectedInvoiceId`.
- `packages/client/src/apps/invoices/components/invoices-sidebar.tsx` — no change (sidebar stays identical; the full-page view slots into the existing `<ContentArea>` layout).
- `packages/client/src/apps/invoices/hooks.ts` — add `useInvoice(id)`, `useUpdateInvoice`, `useAddInvoiceLineItem`, `useDeleteInvoiceLineItem`, `useReorderInvoiceLineItems` if they don't exist in a usable shape already. Reuse existing mutations where possible.

### Deleted files

- `packages/client/src/apps/invoices/components/invoice-detail-panel.tsx` — retired; its responsibilities move into the new components.
- `packages/client/src/apps/invoices/components/invoice-preview.tsx` — superseded by `invoice-pdf-viewer.tsx`.

## Data flow

```
user edits field
       │
       ▼
useUpdateInvoice.mutate({ id, updatedAt, field: newValue })
       │
       ▼ (server responds 200 with fresh row)
queryClient.setQueryData(invoices.detail(id), freshRow)
       │
       ▼
debounced 1.5s: blob fetch /invoices/:id/pdf?inline=true
       │
       ▼
iframe src = URL.createObjectURL(blob)
       │
       ▼ (on unmount or next swap)
URL.revokeObjectURL(oldUrl)
```

Line items go through the same contract but with specialized mutations (`useAddInvoiceLineItem`, `useDeleteInvoiceLineItem`, `useReorderInvoiceLineItems`). Each one invalidates `invoices.detail(id)` on success.

## Server changes

**Minimal.** The existing endpoints carry the new page without schema changes:

- `GET /invoices/:id` — already returns the invoice + line items.
- `PATCH /invoices/:id` — already accepts partial updates and the `If-Unmodified-Since` header for optimistic concurrency.
- `GET /invoices/:id/pdf?inline=true` — already returns the PDF blob.
- `POST /invoices/:id/line-items` / `PATCH /invoices/:id/line-items/:itemId` / `DELETE /invoices/:id/line-items/:itemId` / `PATCH /invoices/:id/line-items/reorder` — confirm these exist via a grep; if any is missing, add it behind the same concurrency middleware.

## Error handling

- Invoice not found — render a "This invoice doesn't exist" empty state with a "Back to invoices" button.
- PDF fetch fails — show a "Couldn't load preview" placeholder in the left pane; the right pane still works.
- Field save fails (non-conflict) — toast the error; the field snaps back to the previous value (TanStack Query's `onError` rollback).
- Field save fails (409 conflict) — handled by the global `ConflictDialog`, nothing page-specific.

## Testing

- Unit: the totals math in `invoice-line-items-table` for row-total and grand-total computation.
- Integration (Playwright): open an invoice from the list, edit a line-item quantity, confirm the PDF refreshes within 2 seconds, verify the new total renders in the PDF.
- Concurrency: open the same invoice in two tabs, edit in one, save from the other — confirm `ConflictDialog` appears.

## Accessibility

- PDF iframe gets `title="Invoice preview"` for screen readers.
- Drag handles use `aria-label="Reorder line item"`.
- Every inline-editable field has a visible label or header that matches its role.
- Status chip colors meet WCAG AA contrast (existing `<Badge>` component already handles this).

## Open questions

None at design time — all seven clarifying questions (layout, editability, header actions, details layout, save cadence, panel retirement, PDF rendering, line items UI) are resolved.

## Migration

1. Build the new page behind the `?view=invoice-detail` URL state.
2. Flip the list row click to navigate to that URL.
3. Delete `invoice-detail-panel.tsx` and its import sites.
4. No server migration, no schema change, no data migration.

## Risks

- **PDF regeneration cost** — if the server PDF pipeline is expensive, the 1.5s debounce could still overwhelm under rapid typing on the notes field. Mitigation: raise debounce to 3s if benchmarks show it; keep the current 1.5s as a starting value.
- **iframe focus trap** — some browsers trap Tab inside an iframe with a PDF viewer. Mitigation: the details pane is to the right of the PDF so keyboard users Tab into the PDF area, the browser handles its own controls, then Tab continues into the details. If this is flaky, swap to a click-to-enter-iframe pattern.
- **Draggable split with iframe** — dragging over an iframe doesn't emit pointer events to the parent. Mitigation: overlay a transparent capture div during drag operations (standard technique used by react-resizable-panels).

## References

- `packages/client/src/apps/crm/components/deal-detail-page.tsx` — reference implementation of the URL-state pattern.
- `packages/client/src/apps/invoices/components/invoice-detail-panel.tsx` — current slide-over to be retired.
- `packages/client/src/apps/invoices/components/invoice-preview.tsx` — current PDF fetch logic to migrate.
- `CLAUDE.md` — optimistic-concurrency pattern requirements.
- `packages/client/src/components/ui/content-area.tsx` — app shell primitive used for the header frame.
