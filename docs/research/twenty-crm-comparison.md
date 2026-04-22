# Twenty CRM — end-user feature research (for Atlas CRM comparison)

Sources: [twenty.com](https://twenty.com/), [docs.twenty.com](https://docs.twenty.com/), [github.com/twentyhq/twenty releases](https://github.com/twentyhq/twenty/releases), and doc sitemap (`/sitemap.xml`). Current version line at time of research: **v1.23.x** (the codebase has been shipping a ~weekly minor between v1.10 → v1.23 over the last ~6 months).

## 1. Objects & records
Standard objects visible on the marketing site and user docs: **Companies, People, Opportunities, Tasks, Notes, Workspace Members, Workflows, Dashboards** ([twenty.com](https://twenty.com/)). Opportunities is a first-class object (not generic "deals"). Custom objects are fully supported with a typed SDK (`defineObject`, `FieldType`, `RelationType`) and can be scaffolded from the AI chat ("Mythos"). Relations support `ONE_TO_MANY`, `MANY_TO_ONE`, and since v1.17 **morph relations** (polymorphic joins — one field can target multiple object types), which is unusually flexible for an OSS CRM. Record detail pages use a widget-based "page layout" system (v1.15+): cards, tables, charts, and related-record widgets can be dropped onto a record page, with per-object layouts ([docs](https://docs.twenty.com/user-guide/layout/overview)).

## 2. Views
View types: **Table, Kanban, Calendar** ([docs sitemap confirms `views-pipelines/capabilities/{table,kanban,calendar}-view`](https://docs.twenty.com/)). No explicit Gallery view. Filters include advanced/compound filters, sorting, **view groups** (grouping rows), and view field overrides. Views are saved, can be pinned, and shared at workspace level. No clear personal-vs-shared permission split at the view level — views live on the workspace. Kanban got performance improvements in v1.10 and grouping-by-select fixes through v1.15.

## 3. Pipelines & opportunities
Opportunities have stages with **drag-drop Kanban**, amount/currency, close date, and a pipeline-style board. Multi-pipeline = create multiple saved Kanban views grouped by a stage field. No built-in forecast engine or weighted-pipeline dashboard out of the box — users build those via **Dashboards** (chart widgets filtered on opportunities). Probability per stage is not a first-class standard field; users add it as a custom number field. This is thinner than HubSpot/Salesforce forecasting but matches Atlas CRM's depth.

## 4. Workflows / automations (deep dive)
Workflows are a node-graph builder accessible from the main nav. The engine is the most mature differentiator vs most OSS CRMs.

**Triggers** (from release notes + docs):
- **Record event** — created / updated / deleted on any object (standard or custom)
- **Cron / schedule** — recurring runs
- **Manual** — runnable from a record action button or command menu (v1.23 added "Hide workflow manual trigger from command menu on Select All")
- **Webhook (inbound)** — external systems can POST and trigger a run; test-with-expected-body added v1.23 (PR #16509, #19688)
- **App/route trigger** — logic-function route trigger (v1.23, PR #19698)

**Actions** (confirmed from code, docs, release notes):
- Create record / Update record / Delete record / Find records
- Send email
- HTTP request (webhook out) — with SSRF protection (PR #17403)
- Code step (serverless JS function; edit + throttling shipped in v1.11)
- Form step (human input)
- AI Agent step (run an LLM with tool access — a standout, v1.14+)
- Send notification / in-app

**Control flow:**
- **If/Else branches** (PR #16916 tests, v1.23 polish)
- **Iterator / Loop** over arrays of records (feature-flag removed v1.10, actively hardened — v1.23 fixed "infinite recursion in iterator loop traversal when If/Else branch loops back to enclosing iterator")
- **Logic functions** — filter, formatter, comparisons between steps
- **Delays / waits** — present as a step type
- **Variable passing** — steps expose structured outputs; downstream steps reference via field pickers
- **Error handling** — workflow run history with success/failure, retriable; "silent failures in logic function route trigger" fix v1.23 (PR #19698)

Limitations: the code step's sandbox is JS-only; no native Python. Per-workflow/run quotas exist on Cloud plan. The builder is node-based but moderately dense — learning curve exists.

## 5. Custom fields
Per-object, many types: Text, Number, DateTime, Boolean, Select, **Multi-select** (v1.22+), Rating, Currency (multi-currency with defaults, v1.15 fix), Phone, Email, Link(s), Address, **Rich Text v2** (creatable field type, v1.16), Actor (who/when), UUID, Relation, Raw JSON, Files/Attachments (migrated to morph relations v1.17). Per-field unique constraints, required flag, default values. Validation is type-based; no formula/computed field type surfaced yet (gap vs Airtable/Attio).

## 6. Email integration
OAuth to **Gmail and Microsoft/Outlook** ([docs](https://docs.twenty.com/user-guide/calendar-emails/overview)). Full inbound sync — emails land on matched contact/company records as timeline activity. **Mailbox view** is a first-class inbox inside Twenty. Send-from-CRM: yes (via `send-emails-from-twenty` how-to). Multiple mailboxes per user supported. What's **missing**: no built-in open/click tracking pixels, no email template library with merge tags surfaced in docs, no sequence/cadence tool.

## 7. Calendar integration
Google Calendar & Microsoft Calendar sync (same OAuth scope). Events appear on related contact/company records. **No native meeting-booking page** (docs explicitly have a FAQ "Can I book meetings from Twenty?" — answer is effectively "use Cal.com/Calendly"). Calendar view on objects is for records-by-date, not the connected calendar grid.

## 8. Tasks & activities
**Tasks** is a standard object with due dates, assignee, status. Activities (emails, calendar events, notes, tasks) show on record timelines. Reminders: basic due-date notifications, no snooze/recurrence surfaced in docs.

## 9. Notes / comments / collaboration
**Notes** is a standard object with rich text (BlockNote-style editor, Rich Text v2). Mentions of people/records, file attachments (drag & drop), linking a note to multiple target records via morph relations. Comments per-record thread is implicit via Notes attached to the record. No Slack-style threaded comments on individual fields.

## 10. Search & command palette
**⌘K command menu** is prominent (visible on home page screenshot). Global search across all objects, keyboard navigation, record-creation shortcuts, workflow manual triggers surfaced there. "Fallback command menu items," "pinned items," edit mode — active polish through v1.23.

## 11. Import/export
CSV import per object, CSV import with **relations between objects**, **update existing records via import**, API import, full data export per view, "migrating from other CRMs" guide. UTF-8 BOM fix shipped v1.22. Bulk edit: multi-select in table view → bulk action menu (update field, delete, run workflow manual trigger).

## 12. Notifications & inbox
In-app notification center; email notifications for mentions/assignments. Mailbox view doubles as the activity inbox for synced emails.

## 13. Mobile / responsive
Web app is responsive but **not a dedicated mobile app**. No iOS/Android app listed. Basic mobile web usability only.

## 14. API & integrations
**REST and GraphQL** APIs, auto-generated per workspace schema (custom objects are first-class in the API). Webhooks in/out. Native integrations visible in repo: Gmail, Google Calendar, Microsoft Graph, Fireflies (hacktoberfest v1.11), LinkedIn extension (v1.11). Zapier/Make: community connectors, not first-party highlighted. **Twenty CLI** and **Apps SDK** let developers ship packaged apps to a marketplace (v1.17+, big push in v1.20–v1.23).

## 15. Recent trajectory (last ~6 months, v1.10 → v1.23)
- **AI Agents / Skills system** — chat, tool-use, dashboard tools, workflow agent management (v1.14, v1.16, v1.22)
- **Dashboards** — chart widgets, filters, sorting, date grouping (v1.10–v1.15)
- **Page Layouts** — widget-based record pages (v1.15–v1.22)
- **Apps / Marketplace / CLI** — packaged extensions, version control, publishing (v1.17–v1.23)
- **Iterator + If/Else workflows** feature-flag removed, hardened (v1.10, v1.23)
- **Morph relations** — polymorphic attachments and links (v1.17)
- **Rich Text v2** as creatable field (v1.16); **Multi-select** field (v1.22)
- **Multi-workspace registration**, standalone pages, navbar customization

---

## Standout features Atlas CRM likely lacks
1. **Workflow engine with iterator loops, If/Else, code steps, AI agent steps, and logic functions** — Atlas has seeded workflows but not a visual node builder with this depth.
2. **Dashboards with chart widgets** bound to filtered views — Atlas CRM has no dashboard layer.
3. **Morph/polymorphic relations** — one field targeting multiple object types; Atlas uses explicit `record_links` instead.
4. **Packaged Apps SDK + CLI + marketplace** for versionable customizations.
5. **Native AI agent/chatbot** that can scaffold objects, views, and workflows from natural language ("Mythos").

## Areas where Twenty looks weak or immature
1. **No meeting booking / scheduling page** — punts to Cal.com.
2. **No email tracking, templates with merge tags, or sequences** — thin vs HubSpot/Attio.
3. **No mobile app**, only responsive web.
4. **No formula/computed field type** — Airtable-level calculations are absent.
5. **Forecasting/probability is DIY** — no weighted-pipeline or forecast report out of the box; users build it in Dashboards.
6. **Rapid release cadence = churn** — breaking schema/field migrations land frequently (release notes repeatedly flag "deploy server before frontend"), which is a real ops cost for self-hosters.
