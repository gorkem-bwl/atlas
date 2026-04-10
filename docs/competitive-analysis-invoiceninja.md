# Atlas vs Invoice Ninja — Gap Analysis

**Scope:** Invoices, Expenses, Projects, Time Tracking (plus tightly-coupled areas: Clients, Payments, PDF templates, Client portal).
**Source baseline:** Atlas v1.9.5 (commit 1160b9a) vs Invoice Ninja v5 (self-hosted free tier).
**Research date:** 2026-04-10.

---

## Executive summary

Atlas covers the **basic happy path** of invoicing (draft → sent → paid), has a very solid **HR Expenses workflow engine** (policies, approvals, auto-approve thresholds), and has a **more modern technical foundation** than Invoice Ninja (React + TypeScript, tenant-isolated uploads, React-PDF server rendering, per-tenant branding, Turkish e-Fatura compliance out of the box).

But Invoice Ninja has been maturing invoicing for 10+ years, and they beat Atlas in **four areas that are fundamental to running a billing business**:

1. **The money lifecycle doesn't close.** Atlas invoices go to "paid" via a single status flip — no payments table, no partial payments, no refunds, no credits, no gateway, no online payment. An invoice is a status field, not an accounting record. Invoice Ninja has a full Payments entity with split/refund/credit apply.

2. **Invoices never reach the customer automatically.** `POST /:id/send` flips the invoice status to "sent" and stamps `sentAt`, but **doesn't actually email anything**. No SMTP send, no PDF attachment, no reminders, no dunning. The customer never receives anything unless a human downloads the PDF and emails it. Invoice Ninja has configurable reminders (1st/2nd/3rd/endless) + late fees + scheduled sending.

3. **Time-to-invoice pipeline is 90% built but invisible.** Atlas has full server-side support for populating invoice line items from unbilled time entries, including per-member rate resolution, atomic billing, and entry locking — but there is **literally no UI button** anywhere to trigger it. `usePopulateFromTimeEntries` exists in the code and has zero consumers. The largest functional gap vs Invoice Ninja is also the smallest implementation effort.

4. **No recurring invoices.** Monthly subscriptions / retainers / SaaS-style billing are impossible without manual duplication every cycle. Invoice Ninja has 12 frequency options, auto-bill via stored payment methods, and a scheduler panel.

Atlas also has no quote/estimate workflow inside Invoices (CRM has Proposals — a separate flow that doesn't convert cleanly), no credit notes, no custom fields on invoice/project/expense entities, and the Projects member management has a server-side API but no UI.

### Top 5 highest-value gaps to ship next

Ranked by **(impact on ability to bill customers) × (effort to ship)**. Smaller number = higher priority.

| # | Feature | Why it matters | Rough effort | Unblocks |
|---|---|---|---|---|
| **1** | **Wire "Populate from time entries" into the invoice create/edit flow** | Server + hook are already built (`time-billing.service.ts`, `hooks.ts:417`). One modal screen in the invoice editor turns all tracked hours into billable line items. This is the feature most consulting/agency customers would miss immediately. | **~1 day** — one React component + one route wire-up | Unblocks the entire Projects → Time → Invoice loop that's currently dead code |
| **2** | **Actually send invoices by email (with PDF attached)** | The `send` button currently only changes a status field. Users assume it emails. Add SMTP send (nodemailer is already in deps), attach the existing React-PDF output, use a template that reads from `invoiceSettings`. | **~2-3 days** — controller change, email template, attachment, i18n | Makes invoices reach customers without manual steps. Prerequisite for everything else in the payment lifecycle. |
| **3** | **Payments entity + partial payments + mark-paid modal** | Right now `markInvoicePaid` is a single boolean flip. Add a `payments` table (amount, date, method, reference, invoice_id), a "Record Payment" modal, and compute invoice `balanceDue` from sum of payments rather than a single flag. This is the foundation for all future finance features. | **~3-4 days** — schema + migration + service + controller + UI modal | Unblocks: refunds, credit notes, partial payments, accurate aging, balance-due reporting |
| **4** | **Recurring invoices (MVP)** | A `recurring_invoices` table with frequency + start/end + next_send_at, a daily cron that generates + optionally emails invoices from templates. No auto-bill in MVP (that needs a payment gateway). Covers the SaaS/retainer/subscription use case which is non-negotiable for most SMBs. | **~3-4 days** — schema + cron job + UI to create recurring + link to a source invoice as template | Unblocks SaaS/retainer billing which Atlas currently cannot do at all |
| **5** | **Invoice email reminders (1st/2nd/endless)** | Once #2 exists, adding a daily scheduler that re-sends reminder emails for overdue invoices is ~200 lines. Configurable delays per stage, stop on paid, one template per stage. | **~2 days** — cron + 3 email templates + settings UI | Directly reduces days-sales-outstanding for users. Also builds the cron infrastructure needed for late fees in a follow-up. |

**Combined effort for all 5: ~2 weeks of focused work.** After these ship, Atlas Invoices goes from "pretty demo" to "can actually run a billing business". Everything below this line (recurring expenses, credit notes, custom fields, payment gateways, client portal signatures, multi-tax) is important but secondary.

### Atlas's existing advantages over Invoice Ninja

Worth protecting and marketing. Don't lose these while closing the gaps above:

- **Turkish e-Fatura** out of the box with UBL-TR XML, 4 document types, and dedicated tax-office/VKN settings. Invoice Ninja requires third-party integrations for TR compliance.
- **Per-company client portal token** (one stable link per customer, shows all their invoices) vs Invoice Ninja's per-invoice sharing.
- **HR Expense policy engine** with category caps, monthly limits, receipt-above thresholds, and auto-approve-below. Most SMB tools force every expense through manual approval. Invoice Ninja's expenses are basic by comparison — no approval workflow at all, just a flag.
- **Three pre-built invoice templates** (Classic/Modern/Compact) with tenant branding (logo, accent color, bank details, footer), server-rendered via `@react-pdf/renderer` with no external service dependency.
- **Dashboard with 4-bucket receivables aging** and today/week/month/quarter/year period summary — richer than Invoice Ninja's default.
- **Unified Projects + Invoices dashboard** — time KPIs (hours this week, unbilled hours) mixed with invoice KPIs (outstanding, overdue) in one view.
- **Live timer with localStorage persistence** — survives browser reload by recomputing elapsed from a stored `startedAt`.
- **"Copy last week" button** on the timesheet grid — one-click duplicates last week's entries.
- **Automatic time-entry locking on invoicing** — `billed=true` and `locked=true` are set atomically in a transaction when time is invoiced, preventing retroactive edits.
- **Tight Projects ↔ Invoices ↔ CRM Companies** schema with real FKs (invoice.companyId, project.companyId, projectTimeEntries.projectId, invoiceLineItems.timeEntryId). The plumbing is there — it just needs UI to expose it.

---

## Detailed feature comparison

Legend: ✅ has it, 🔸 partial / backend-only / hidden, ❌ absent, 🟢 Atlas is better, 🔵 Invoice Ninja is better, ⚪ roughly equivalent.

### Invoices

| Feature | Invoice Ninja | Atlas | Verdict |
|---|---|---|---|
| Create invoice with line items (qty, unit price, tax) | ✅ | ✅ | ⚪ |
| Per-line tax AND per-invoice tax | ✅ (up to 3 rates each, compound, inclusive/exclusive) | 🔸 (single rate per line OR invoice-level, no compound) | 🔵 |
| Discounts (per-line and per-invoice) | ✅ | ✅ (per-invoice only) | 🔵 |
| Multi-currency | ✅ (with auto FX conversion) | 🔸 (currency is a label; no FX conversion) | 🔵 |
| Custom invoice numbering with patterns | ✅ (date tokens + entity variables) | 🔸 (tenant counter + prefix, zero-padded) | 🔵 |
| Statuses (draft/sent/paid/overdue) | ✅ (+ partial, cancelled, reversed) | ✅ (+ viewed, waived) | ⚪ |
| Auto-archive paid invoices | ✅ | ❌ | 🔵 |
| Lock invoice on send/paid | ✅ (configurable) | ❌ (unbills on delete) | 🔵 |
| Duplicate invoice | ✅ | ✅ | ⚪ |
| PDF generation | ✅ (Twig template engine, fully customizable) | ✅ (3 React-PDF templates with branding) | ⚪ |
| e-Invoice (PEPPOL EU) | ✅ | 🔸 (Turkish UBL-TR only) | 🔵 (breadth) / 🟢 (TR depth) |
| Attach files to invoice | ✅ (optionally include in PDF) | ❌ | 🔵 |
| **Send invoice via email with PDF** | ✅ (template engine, variables) | ❌ **(status flip only, no SMTP)** | 🔵 **GAP #2** |
| Email reminders (1st/2nd/3rd/endless) | ✅ | ❌ | 🔵 **GAP #5** |
| Late fees on overdue | ✅ (flat + %, auto-applied) | ❌ | 🔵 |
| Custom fields on invoice | ✅ (4 per entity) | 🔸 (platform supports, not wired) | 🔵 |
| Invoice notes (public + private) | ✅ | ❌ (no notes field) | 🔵 |
| Recurring invoices | ✅ (12 frequencies, auto-bill, schedule, out-of-cycle) | ❌ | 🔵 **GAP #4** |
| Schedule future send | ✅ | ❌ | 🔵 |
| Populate from time entries | ✅ ("Invoice Project" bundles tasks+expenses) | 🔸 **(server built, zero UI)** | 🔵 **GAP #1** |
| Public client portal (per-invoice share) | ✅ | 🔸 (per-company token instead) | 🟢 Atlas pattern is better UX |
| Receivables aging dashboard | 🔸 (report only) | ✅ (4-bucket widget) | 🟢 |
| Period summary dashboard | 🔸 | ✅ | 🟢 |
| Filter chips in list | 🔸 (sidebar filters) | ✅ | 🟢 |
| Convert quote → invoice | ✅ (one-click, auto-archive) | 🔸 (CRM Proposals separate flow) | 🔵 |

### Payments

| Feature | Invoice Ninja | Atlas |
|---|---|---|
| Payments entity (amount, date, method, reference) | ✅ | ❌ **GAP #3** |
| Partial payments | ✅ | ❌ |
| Split payment across multiple invoices | ✅ | ❌ |
| Refunds (full + partial) | ✅ | ❌ |
| Credit notes / credits | ✅ (full entity with apply workflow) | ❌ |
| Manual payment entry | ✅ | 🔸 (single boolean flip on invoice) |
| Payment gateway integrations | ✅ (15+: Stripe, PayPal, Braintree, GoCardless, Square, Authorize.Net, Mollie, BTCPay, etc.) | ❌ |
| Pass-through gateway fees | ✅ ("Adjust Fee Percent") | ❌ |
| Stored payment methods | ✅ (used by auto-bill) | ❌ |

**Entire payments column is basically empty for Atlas.** This is the biggest structural gap.

### Expenses

| Feature | Invoice Ninja | Atlas (HR Expenses) |
|---|---|---|
| Expense CRUD with category + project + currency | ✅ | ✅ |
| Receipt / document attachment | ✅ (optionally include in client invoice PDF) | ✅ (single receipt path) |
| Multi-currency + FX conversion | ✅ | 🔸 (currency label only) |
| **Approval workflow** | ❌ (just a billable flag) | ✅ **(draft → submitted → approved/refused → paid, with comments)** 🟢 |
| **Policy engine (limits, receipt thresholds, auto-approve)** | ❌ | ✅ **(monthlyLimit, requireReceiptAbove, autoApproveBelow)** 🟢 |
| Categories (configurable) | ✅ | ✅ (with icons, colors, maxAmount, receiptRequired flag) |
| Expense reports (group expenses, submit/approve) | ❌ | ✅ 🟢 |
| Billable flag ("should be invoiced") | ✅ | 🔸 (project linkage exists, no billable flag) |
| Convert expense → invoice line item (with markup) | ✅ (one-click) | ❌ |
| Recurring expenses | ✅ (with auto-invoice to client) | ❌ |
| Mark vendor paid (org paid the vendor) | ✅ | 🔸 (`paid` status exists; no vendor entity) |
| Vendor entity | ✅ | ❌ |
| Bank feed / transaction matching | ✅ | ❌ |
| Dashboard (MoM delta, pending count, unpaid amount) | 🔸 (report) | ✅ 🟢 |
| Bulk approve / bulk mark paid | ✅ | ✅ (bulk-pay endpoint) |
| Email notifications on submit/approve/refuse/paid | ❌ | ✅ 🟢 |

**Atlas wins the expense column overall.** The policy engine, approval workflow, reports, and notifications are genuinely better than Invoice Ninja. Atlas loses on billable-to-client conversion and recurring expenses.

### Projects

| Feature | Invoice Ninja | Atlas |
|---|---|---|
| Project CRUD with client linkage | ✅ | ✅ |
| Name, number, color, due date, notes | ✅ (public + private notes) | ✅ (no notes field) |
| Budgeted hours + task rate | ✅ | ✅ (+ estimatedAmount) |
| Budget progress visualization | 🔸 (report) | ✅ (inline progress bar, color-shifted) 🟢 |
| Members / team on a project | ❌ (single user assignment) | 🔸 **(server + schema, no UI)** |
| Per-member hourly rate | ❌ | 🔸 (schema + billing resolver, no UI to set) |
| Status lifecycle (active/paused/done) | 🔸 | ✅ |
| **Invoice Project** (bundle uninvoiced tasks+expenses) | ✅ (one-click) | ❌ |
| Project report PDF (progress with breakdowns) | ✅ (via template engine) | 🔸 (reports view, no PDF export) |
| Profitability report (invoiced vs paid per project) | 🔸 | ✅ (joins paid invoices) 🟢 |
| Custom fields | ✅ | 🔸 (platform supports) |

### Time tracking

| Feature | Invoice Ninja | Atlas |
|---|---|---|
| Live start/stop timer | ✅ | ✅ (with localStorage persistence) 🟢 |
| Multiple time entries per task | ✅ | ✅ |
| Manual duration entry | ✅ | ✅ |
| Start/end time OR duration (auto-compute) | ✅ | 🔸 (stores both, UI is duration-only) |
| **Weekly timesheet grid** | 🔸 | ✅ 🟢 |
| **Copy last week** | ❌ | ✅ 🟢 |
| Bulk save / bulk lock | 🔸 | ✅ |
| Custom task statuses | ✅ | ❌ |
| Kanban view of tasks | ✅ | ❌ |
| Task rate inherited from project | ✅ | ✅ (member rate → default rate fallback) |
| Round-to-nearest time setting | ✅ | ❌ |
| Auto-lock on invoicing | ✅ | ✅ (atomic in transaction) 🟢 |
| Convert tasks/time → invoice | ✅ (one-click bundle, scheduler for auto) | 🔸 **(server built, zero UI)** 🔵 |
| Timesheet submission / approval | ❌ | ❌ |
| PDF timesheet export | 🔸 | ❌ |
| CSV export | ✅ | ✅ |
| Admin "team timesheet" view | ✅ | ❌ (schema supports, no UI) |
| Idle detection | ❌ | ❌ |

### Clients & Client Portal

| Feature | Invoice Ninja | Atlas |
|---|---|---|
| Client (company) entity | ✅ | ✅ (crmCompanies) |
| Multiple contacts per client | ✅ (each with own portal login) | ✅ (crmContacts, no per-contact auth) |
| Per-contact portal login/password | ✅ | ❌ (token is per-company) |
| Client groups (inherit settings) | ✅ | ❌ |
| Per-client currency / language / payment terms | ✅ | ❌ (currency/language on invoice/tenant) |
| Client statements (PDF + scheduled email) | ✅ | ❌ |
| **Public portal to view/pay invoices** | ✅ | 🔸 (view only, no pay) |
| Portal terms checkbox + signature before pay/approve | ✅ | ❌ |
| Portal custom CSS/JS/messages | ✅ | ❌ |
| Self-register via portal | ✅ | ❌ |
| Subscription / one-click buy pages | ✅ | ❌ |

---

## Things Invoice Ninja does that we don't — full list

Beyond the top 5, here's the rest of what they have and we don't, grouped by "likely to matter" → "nice to have":

**Likely to matter for most SMBs:**
- Quotes with client signature + convert to invoice
- Credit notes / refunds
- Tax inclusive vs exclusive, compound tax
- FX conversion on multi-currency
- Client statements (PDF scheduled monthly)
- Notes fields on invoices (public + private)
- File attachments on invoices
- Quote/invoice template engine (user-editable templates vs our 3 hardcoded ones)
- Per-client currency/language defaults
- Client groups
- Custom fields on invoice/quote/expense/project/client

**Nice to have:**
- Payment gateways (Stripe/PayPal/etc.) — huge feature, several weeks of work each
- Bank feeds / transaction matching
- Subscription / one-click buy product pages
- Task kanban with custom statuses
- Round-to-nearest time rules
- Time rounding per project
- Pass-through gateway fees
- BTCPay / crypto payments
- PEPPOL EU e-invoicing (we have Turkish UBL-TR)
- Delivery notes
- Purchase orders
- Vendor entity (for expenses)

**Probably don't matter (paid-only or niche):**
- DocuNinja e-signature add-on
- Subscription webhooks
- Schedule Email Statement cron
- Custom JS injection in portal

---

## Recommended next release plan (30-second version)

Ship as **v1.10.0**:

1. Invoice → "Import time entries" modal (wire existing backend)
2. Invoice → "Send via email" (real SMTP, PDF attached)
3. Payments entity (table + modal to record payments)
4. Recurring invoices MVP (scheduler + cron)
5. Email reminders (daily cron + 3 templates + settings)

**Estimated effort:** ~2 focused weeks.
**Effect:** Atlas transitions from "invoicing demo" to "small business can run their billing here without external tools".

Post-v1.10.0, the next tier would be: **Credit notes** → **Quotes with convert-to-invoice** → **Custom fields on entities** → **Per-client defaults** → eventually **a single payment gateway (Stripe)** as the biggest single-feature effort.

---

## Sources

- Invoice Ninja v5 docs: `invoiceninja.github.io/en/{invoices,recurring_invoices,quotes,credits,expenses,projects,tasks,clients,payments,client_portal,payment_gateways}` (fetched 2026-04-10)
- Invoice Ninja v5 template engine + custom fields: `invoiceninja.github.io/en/advanced-topics/{templates,custom-fields,schedules}`
- Invoice Ninja pricing (free tier limits): `invoiceninja.com/pricing`
- Atlas code audit:
  - Invoices: `packages/server/src/apps/invoices/`, `packages/client/src/apps/invoices/`, `schema.ts:1855-1940`
  - Expenses: `packages/server/src/apps/hr/services/expense*.ts`, `packages/client/src/apps/hr/components/expenses/`, `schema.ts:1351-1460`
  - Projects + Time: `packages/server/src/apps/projects/`, `packages/client/src/apps/projects/`, `schema.ts:1775-1852`
- Key file references cited inline throughout: `invoice.service.ts:189,217,374`, `time-billing.service.ts:85,209`, `expense.service.ts:262-309,423`, `time-entry.service.ts:43,169,304`, `hooks.ts:417`, `project-detail-panel.tsx:67,94-99,104-128`
