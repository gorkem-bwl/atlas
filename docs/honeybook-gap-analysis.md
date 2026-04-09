# HoneyBook vs Atlas — Feature Gap Analysis

> **Context:** HoneyBook targets solo creators / 1-5 person businesses. Atlas targets companies under 20 employees needing CRM + HRM. This analysis identifies HoneyBook features worth adapting for Atlas's audience.

---

## Feature Comparison Matrix

| # | Feature Area | HoneyBook | Atlas | Gap? | Relevance for Atlas (1-5) |
|---|-------------|-----------|-------|------|--------------------------|
| 1 | **Contacts / Companies** | Basic client list | Full CRM: contacts, companies, leads, merge, import/export, custom fields | No gap | — |
| 2 | **Deal Pipeline** | Project pipeline (inquiry → payment) | Deal kanban, stages, won/lost, pipeline value, forecast | No gap | — |
| 3 | **Lead Capture Forms** | Embedded contact forms | Lead forms with public tokens, lead enrichment | No gap | — |
| 4 | **Activities / Timeline** | Basic project notes | Activity types, activity timeline, notes, email timeline | No gap | — |
| 5 | **E-Signatures** | Contracts with e-sign | Sign app: PDF upload, field placement, signer management, audit trail | No gap | — |
| 6 | **Document Creation** | Smart Files (proposals, brochures) | Write app (rich text docs) | No gap | — |
| 7 | **File Storage** | Basic file sharing per project | Drive app with folders, versioning, sharing | No gap | — |
| 8 | **Task Management** | Basic project tasks | Tasks app: projects, statuses, assignments, comments | No gap | — |
| 9 | **HRM** | None | Full HRM: employees, departments, leave, attendance, onboarding | Atlas advantage | — |
| 10 | **Spreadsheets** | None | Tables app | Atlas advantage | — |
| 11 | **Drawing / Whiteboard** | None | Draw app (Excalidraw) | Atlas advantage | — |

---

## Identified Gaps — Features Worth Implementing

### Gap 1: Invoicing & Payments
**HoneyBook:** Create branded invoices, send to clients, accept payments (credit card, ACH, bank transfer, Apple Pay, Google Pay). Automated payment reminders. Payment tracking and overdue alerts.

**Atlas today:** `projectInvoices` and `projectInvoiceLineItems` tables exist in schema but this is limited to the Projects app. No standalone invoicing app, no payment gateway integration, no client-facing payment pages.

**Opportunity:** A dedicated **Invoices** app (or enhanced CRM invoicing) that lets teams create invoices linked to CRM deals/contacts, track payment status, send reminders. Payment gateway integration (Stripe) could come later as a marketplace add-on.

**Relevance: 5/5** — Every small company needs invoicing. This is table-stakes for a business platform.

---

### Gap 2: Client Portal (External-Facing Pages)
**HoneyBook:** Clients get their own login/portal to view contracts, invoices, messages, files — everything in one place.

**Atlas today:** No external-facing portal. Everything is internal team-only. Sign app has public signing links, but no unified client experience.

**Opportunity:** A lightweight **client portal** where external contacts can log in and see their invoices, signed documents, shared files, and project status. Reuses existing data from CRM + Sign + Drive + Projects.

**Relevance: 4/5** — Very valuable for service businesses under 20 people. Reduces back-and-forth emails. Could be a strong differentiator.

---

### Gap 3: Proposals / Quotes (Combined Document)
**HoneyBook:** "Smart Files" combine proposal + contract + invoice into a single interactive document that clients can review, sign, and pay — all in one flow.

**Atlas today:** Sign app handles e-signatures on uploaded PDFs. Write app creates documents. But there's no way to create a structured proposal with line items, pricing, terms, and an accept/sign/pay flow.

**Opportunity:** A **Proposals** feature (within CRM or as its own section) that generates a branded proposal from a deal's data — scope, line items, pricing, terms — with an "accept & sign" flow that links to Sign and optionally generates an invoice.

**Relevance: 4/5** — Teams with 5-20 people often send proposals/quotes. This bridges CRM deals → contracts → invoices into a single workflow.

---

### Gap 4: Workflow Automation (Trigger-Based)
**HoneyBook:** Automation workflows that fire on events — e.g., "when a lead form is submitted, send welcome email + create project + assign questionnaire." Multi-step, visual builder.

**Atlas today:** `crmWorkflows` table exists and there's an `automations-view.tsx` component, suggesting early work. But no evidence of a robust automation engine with triggers, conditions, and actions across apps.

**Opportunity:** Enhance the existing workflow foundation into a real automation system: **"When [trigger] → Then [action]"** across CRM events (deal stage change, lead created, activity due) and potentially cross-app (create task, send email, create invoice).

**Relevance: 4/5** — Huge time-saver for small teams. Even simple automations (email on deal stage change, reminder on overdue activity) add massive value.

---

### Gap 5: Scheduling / Booking Links
**HoneyBook:** Built-in scheduling with shareable booking links, calendar sync (Google/iCloud), auto-generated Zoom links, availability management, double-booking prevention.

**Atlas today:** Calendar app exists but only has a manifest — appears to be a stub with no page or features. CRM has `schedule-event-modal.tsx` and event routes tied to contacts/deals, plus Google calendar sync. But no public booking links or availability management.

**Opportunity:** Build out the **Calendar app** with: (1) internal team calendar synced to Google, (2) shareable booking links that external contacts can use to schedule meetings, (3) availability rules per team member.

**Relevance: 3/5** — Useful but not critical for the 5-20 employee segment. Many already use Calendly/Cal.com. Could be a nice-to-have that reduces tool count.

---

### Gap 6: Questionnaires / Intake Forms
**HoneyBook:** Customizable questionnaires sent to clients for onboarding — collect project requirements, preferences, deadlines, file uploads.

**Atlas today:** Lead forms exist for lead capture, but no post-sale questionnaire/intake form system.

**Opportunity:** A **Forms** feature (extending lead forms) that can be sent to existing contacts/clients to collect structured information. Responses attach to the CRM contact/deal record.

**Relevance: 3/5** — Nice for service businesses doing client onboarding. Less critical than invoicing or proposals but adds polish.

---

### Gap 7: Branded Templates System
**HoneyBook:** All client-facing documents (invoices, proposals, contracts, emails) use branded templates with company logo, colors, and fonts. Template library with categories.

**Atlas today:** No unified branding/template system across apps. Each app handles its own presentation.

**Opportunity:** A **company branding** settings panel (logo, colors, fonts) that feeds into all client-facing outputs — invoices, proposals, email templates, sign documents, client portal.

**Relevance: 3/5** — Professional polish. Small companies care about looking "put together." Low effort, high perception of quality.

---

### Gap 8: Email Templates & Sequences
**HoneyBook:** Pre-built email templates for common scenarios (follow-up, thank you, onboarding). Customizable with smart fields (client name, project details).

**Atlas today:** CRM has `compose-email-modal.tsx` and email sending routes, but no template library or smart field system.

**Opportunity:** Add an **email template** system to CRM: save reusable templates with merge fields (contact name, deal value, company), use them when composing emails from contact/deal pages.

**Relevance: 3/5** — Reduces repetitive email writing. Works well with the existing CRM email infrastructure.

---

## Priority Ranking (Recommended Implementation Order)

| Priority | Feature | Why |
|----------|---------|-----|
| **P1** | Invoicing & Payments | Table-stakes for any business platform. Schema already partially exists. |
| **P2** | Proposals / Quotes | Natural bridge between CRM deals and invoicing. High-value workflow. |
| **P3** | Workflow Automation | Foundation already exists (`crmWorkflows`). Multiplies value of all other features. |
| **P4** | Client Portal | Differentiator. Ties together invoices + sign + files into external experience. |
| **P5** | Email Templates | Quick win. Enhances existing CRM email functionality. |
| **P6** | Company Branding | Low effort, professional polish across all client-facing features. |
| **P7** | Scheduling / Booking Links | Calendar app stub exists. Useful but many free alternatives exist. |
| **P8** | Questionnaires / Intake Forms | Nice-to-have. Extends existing lead forms system. |

---

## What Atlas Already Does Better

- **HRM** — HoneyBook has zero HR features. Atlas has employees, departments, leave management, attendance, onboarding.
- **Spreadsheets / Tables** — No equivalent in HoneyBook.
- **Drawing / Whiteboard** — No equivalent in HoneyBook.
- **Multi-tenancy** — Atlas supports team/org structure. HoneyBook is single-user focused.
- **Self-hosted** — Atlas can be self-hosted (Docker). HoneyBook is SaaS-only.
- **Document editor** — Atlas has a rich text editor (Write app). HoneyBook has simpler "Smart Files."

---

*Sources: [HoneyBook](https://www.honeybook.com/), [Capterra Review](https://www.capterra.com/p/162588/HoneyBook/), [TechRadar Review](https://www.techradar.com/pro/software-services/honeybook-crm-review), [The Digital Project Manager](https://thedigitalprojectmanager.com/tools/honeybook-review/), [Research.com Review](https://research.com/software/reviews/honeybook-review)*
