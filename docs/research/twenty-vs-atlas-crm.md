# Twenty CRM vs Atlas CRM — end-user feature comparison

Scope: features an end user (salesperson, SDR, sales manager, ops admin) touches. Excludes data model internals, self-host, and pricing.

Research inputs:
- [twenty-crm-comparison.md](./twenty-crm-comparison.md) — Twenty feature map (v1.23.x)
- Atlas CRM source: `packages/{client,server}/src/apps/crm/`

---

## Feature matrix

| Area | Twenty CRM | Atlas CRM | Gap |
|------|-----------|-----------|-----|
| **Standard objects** | Companies, People, Opportunities, Tasks, Notes, Workflows, Dashboards | Contacts, Companies, Deals, Leads, Proposals, Activities, Notes | Atlas has **Proposals + Leads** natively; Twenty has **Dashboards + Workflows** as objects |
| **Custom objects** | Unlimited via SDK/AI | None — fixed entity set | Twenty wins |
| **Custom fields** | ~20 types incl. multi-select, rich text v2, currency, morph relations | 7–8 types (text, number, date, bool, select, multi-select, url, relation) | Twenty broader |
| **Views** | Table, Kanban, Calendar + view groups, workspace-shared saved views | Saved views (JSONB filters, pinning, sharing) — list/table primary, no kanban UI yet | **Atlas has no Kanban board UI** |
| **Pipeline (drag-drop kanban)** | Yes | Stages + reorder endpoint exist, UI incomplete | Gap |
| **Workflow engine** | Node-graph builder: record/cron/manual/webhook triggers; create/update/delete/find, send email, HTTP, code step, form, **AI agent**; If/Else, iterator loops, delays, logic functions | Engine exists (table + controller + seeds: deal-qualified → task, proposal-sent, etc.); **no visual builder UI** | **Biggest gap** |
| **Email integration** | Full Gmail/Outlook OAuth sync, mailbox view, send-from-CRM, no templates/tracking/sequences | Gmail read-only timeline per contact/deal; no compose, no Outlook | Twenty wins on depth |
| **Calendar integration** | Google + Microsoft 2-way sync, events on record timelines; no meeting booking | 1-way CRM → Calendar app (schedule-event-modal); separate Calendar app | Twenty wins |
| **Tasks & activities** | Tasks is a standard object; timeline per record | Activities logged per deal/contact/company; Work/Tasks is a separate Atlas app (not linked to CRM records) | Minor gap |
| **Notes** | Rich text (BlockNote), mentions, attachments, multi-target links | Notes linked to deal/contact/company; no @mentions, no threaded comments | Twenty wins |
| **Global search / ⌘K** | Prominent command menu, cross-object search, keyboard-driven | **Absent in CRM** — in-view filtering only | Gap |
| **Dashboards & charts** | Chart widgets with filters, sorting, date grouping | None | Gap |
| **AI / agents** | AI chat ("Mythos") scaffolds objects/views/workflows; AI agent step inside workflows | None | Gap |
| **Import/export** | CSV per object + relations + update-existing + API + per-view export, bulk edit | CSV import for contacts/companies/deals with field mapping; export endpoints unclear | Twenty deeper |
| **Notifications** | In-app center + email for mentions/assignments | Notifications table + emit-on-activity; global center not CRM-surfaced | Minor gap |
| **Public API** | REST + GraphQL auto-generated per workspace, webhooks in/out | REST (Express), no GraphQL, no webhooks out | Twenty wins |
| **Native integrations** | Gmail, Google Calendar, Microsoft Graph, Fireflies, LinkedIn extension, Apps SDK + marketplace | Gmail (read), Invoices app (line items), Calendar app (events); cross-app via `record_links` | Twenty wins externally, Atlas wins internally |
| **Mobile** | Responsive web, no native app | Responsive web, no native app | Tie |
| **Lead capture** | DIY via form workflow step | **Public lead form + portal tokens** native in CRM | **Atlas wins** |
| **Proposals / billing** | Not native (custom object or external) | **Native Proposals** with line items, tax, discounts, totals, public view/accept/decline portal | **Atlas wins** |
| **Cross-app record linking** | Morph relations (polymorphic within Twenty) | `record_links` table + SmartButtonBar across CRM/Drive/Invoices/Tasks/Docs | **Atlas wins for suite-level linking** |

---

## Pros of Twenty vs Atlas CRM

1. **Workflow automation is production-grade.** Visual node builder, iterator loops, If/Else, code steps, AI agent steps, cron + webhook triggers. Atlas has the data model and seed examples but no builder UI — users can't create/edit workflows without touching the DB.
2. **Views are richer.** Kanban board with drag-drop grouping, Calendar view, view groups, shared/pinned views. Atlas's saved-view layer exists but the visual variants (kanban, calendar grid over records) aren't shipped.
3. **Email is bidirectional.** Send-from-CRM + full mailbox view vs Atlas's read-only Gmail timeline.
4. **Dashboards + AI agents** are entirely absent in Atlas. For a sales manager who wants "deals won this quarter by rep" without exporting to BI, Twenty ships it.
5. **Custom objects & field breadth.** Twenty lets ops admins model anything; Atlas CRM's entity set is fixed.
6. **Public API surface.** GraphQL + webhooks make Twenty easier to integrate with external tools (Zapier, Make, custom scripts).
7. **Command palette (⌘K)** — fast keyboard navigation across every object. Atlas CRM has no global search.

## Cons of Twenty vs Atlas CRM

1. **Twenty is CRM-only.** Atlas is a platform — a deal in Atlas CRM can link to a proposal, an invoice, a drive folder, a task, and a doc via `record_links`. Replicating that in Twenty requires custom objects + relations per target and still leaves them trapped inside the CRM app.
2. **No native proposals/quoting.** Atlas's Proposals (line items, tax, discounts, public accept/decline portal) is a full feature; in Twenty you'd build it as a custom object with no billing math.
3. **No native lead capture form.** Twenty's form-workflow step is DIY; Atlas ships public lead submission with portal tokens.
4. **No email templates, tracking, sequences, or meeting booking** — Twenty punts to Cal.com and external tools.
5. **No formula/computed fields** — Airtable-level calculations missing on both, but especially notable for a CRM that markets breadth.
6. **Rapid release cadence = churn.** v1.10 → v1.23 in ~6 months with recurring "deploy server before frontend" migration warnings. Real ops cost for self-hosters.
7. **Breadth without glue.** Many standalone features (Apps SDK, AI agents, Dashboards, Page Layouts) shipped fast; some feel early (iterator loop bugs fixed as recently as v1.23).

---

## Recommendation for Atlas

The comparison makes the strategic trade-off clear. Atlas's CRM is shallower **as a standalone CRM** but deeper **as a sales module inside a business suite**. The three gaps that matter most for end users are:

1. **Kanban pipeline view** — stages and drag-drop reorder already exist server-side (`/deals/pipeline-reorder`). This is a UI-only build; highest ROI.
2. **Workflow builder UI** — the engine, triggers, actions, and seeds exist. A visual builder (even a simple form-based one covering record-event trigger + create-task/send-email/update-field actions) would expose the backend that's already there.
3. **Global search / ⌘K** — not CRM-specific; would benefit every Atlas app. Already architecturally supported via `global-search.service.ts`.

Skip (or defer): custom objects, GraphQL, dashboards, AI agents, email send/templates. Each is a large investment that duplicates what Twenty does well without leveraging Atlas's platform advantage. If a customer needs deep CRM automation at the cost of suite integration, Twenty is already the right answer — don't try to out-Twenty Twenty.

**Atlas's moat is cross-app linking (CRM ↔ Proposals ↔ Invoices ↔ Drive ↔ Docs ↔ Tasks).** Every feature decision should reinforce it, not chase Twenty feature-for-feature.
