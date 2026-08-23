# Field-service gap analysis — Housecall Pro user feedback

**Date:** 2026-08-23 · **Version reviewed:** 2.10.0 · **Trigger:** unsolicited customer feedback

> "i just started using this and it seems pretty nice but i would like to have more
> documentation on this. I came from house call pro and found this a little confusing as
> projects, leads / pipeline and invoices feel scattered and separated to me. contacts have no
> address slot so you have to create companies for every contact. There is no way to create
> jobs per contact or records per contact (that I can see). it is a very nice platform .. way
> better than dolibarr. It doesnt feel intuitive though like housecallpro does"

**Verdict: every claim checks out.** Three of four are structural (data model), not
discoverability. One is worse than the customer realized.

This is the first analysis of Atlas from a **field-service** angle. The five existing
competitive docs (HoneyBook, Twenty ×2, InvoiceNinja, Miru) all evaluate Atlas as a B2B
company-centric tool, so none of them asked these questions.

---

## Why this feedback is worth acting on

Housecall Pro serves home-services businesses — plumbers, HVAC, cleaners, electricians. Its
customers are **individuals at physical service addresses**, and its core object is a **job**:
a scheduled visit to an address for a customer, which carries its own estimate, invoice, crew,
and history.

Atlas is built on the opposite assumption: **the company is the customer.** Every commercial
object anchors to `crm_companies`. For B2B that is correct. For field service it means the
customer must fabricate a company per household — exactly what they reported.

---

## Claim 1 — "contacts have no address slot" → **TRUE**

`crm_contacts` (`packages/server/src/db/schema.ts:1416-1435`) columns in full:

```
id, tenantId, userId, name, email, phone, companyId, teamId,
position, source, tags, isArchived, sortOrder, createdAt, updatedAt
```

**No street, city, state, postal code, or country.** `crm_companies`
(`schema.ts:1387-1413`) has all of them: `address`, `postalCode`, `state`, `country`.

The UI matches exactly. `create-contact-modal.tsx` exposes five fields — name, email, phone,
company, position. `contact-detail-page.tsx:145-180` renders the same five. A search for
address/city/zip across the CRM client hits company components only.

### It is worse than reported

The forced-company problem is not really about addresses — it is about **billing**:

- `invoices.companyId` is **`NOT NULL`** (`schema.ts:1885`)
- `CreateInvoiceInput.companyId` is required (`packages/shared/src/types/invoices.ts:64`)
- The builder gates saving: `const canSave = !!companyId && ...`
  (`invoice-builder-modal.tsx:214`), and the contact select is `disabled={!companyId}` (:286)
- The `invoices` client manifest declares `dependencies: ['crm']` — the only app with one

**You cannot invoice an individual.** For a plumber billing a homeowner, a company row is
mandatory. That is the real forcing function.

### Partial mitigation that exists

Custom fields **do** work on contacts — `contact-detail-page.tsx:206` renders
`<CustomFieldsRenderer appId="crm" recordType="contacts" />`, and `custom_field_definitions`
is generic over `appId` + `recordType`. A user can add an address field via Settings → Data
model. It is undiscoverable, unstructured (no geocoding, no map, no "directions" affordance),
and does nothing about the invoice constraint.

---

## Claim 2 — "no way to create jobs or records per contact" → **PARTLY TRUE**

### Jobs: absolutely correct

**No job or work-order concept exists anywhere.** Zero occurrences of "job" as an entity in
`schema.ts` or `packages/shared/src/types/`. A repo-wide search for
`work.?order|dispatch|job.?site|service.?call` returns only false positives
(`React.Dispatch`, "email dispatch", "Workflow dispatch failed").

There is no scheduled visit, no service address, no crew assignment, no dispatch board, no
arrival window. The nearest primitives are Work tasks (with `startAt`/`endAt`) and calendar
events — neither is customer-anchored.

### Records per contact: they exist but are barely surfaced

**Direct FKs to `crm_contacts.id`:** `crm_deals.contactId`, `invoices.contactId` (optional),
`crm_activities.contactId`, `crm_notes`, calendar events.

**Conspicuously absent:**
- `tasks` has `projectId` but **no** `contactId` or `companyId` (`schema.ts:330-375`)
- `project_projects` has `companyId` but **no `contactId`** (`schema.ts:1728-1750`)

So a project attaches to a *company*, never a person; a task attaches to neither.

**What the contact detail page actually renders** (`contact-detail-page.tsx:102-307`):
back/nav bar, `SmartButtonBar`, email composer, name, editable email/phone/position/company,
source chip, **linked deals**, custom fields, calendar events, notes, delete, and an activity
timeline (last 20).

**No invoices section. No projects section. No tasks section.** Verified by count:
`grep -c "invoice|project"` on both `contact-detail-page.tsx` and `company-detail-page.tsx`
returns **0** — even though `invoices.companyId` and `project_projects.companyId` both exist.

The generic escape hatch is `record_links` + `SmartButtonBar` (`contact-detail-page.tsx:121`),
which can link a contact to a project or invoice. But it is a small `+` chip requiring a manual
search per record — an archival affordance, not "create a job for this customer."

**The customer said "that I can see" — and they were looking in the right place.**

---

## Claim 3 — "projects, leads/pipeline and invoices feel scattered" → **TRUE**

One customer's lifecycle spans three top-level apps:

| Stage | App | Sidebar |
|---|---|---|
| Lead → pipeline → deal → proposal | **CRM** (order 10) | Dashboard, Leads, Pipeline, Deals, Contacts, Companies, Proposals, Forecast, Activities, Automations, Lead forms |
| Delivery: projects, tasks, time | **Work** (order 25) | Dashboard, Projects, Board, My tasks, Calendar, Reports |
| Billing | **Invoices** (order 35) | Dashboard, Invoices, Recurring, Paraşüt |

**The data model already joins them.** `invoices` FKs to company, contact, deal, project, and
proposal; `project_projects.companyId → crm_companies`;
`invoice_line_items.timeEntryId → project_time_entries` (time-to-invoice);
`project-financials-tab.tsx:33-38` deep-links to a prefilled invoice.

**The UI never renders the join back at the customer.** No screen anywhere shows one
customer's pipeline + projects + invoices together. The Work financials tab is per-project.
The Invoices dashboard is global. Both CRM detail pages render zero invoices and zero projects.

This is the most fixable of the four: **the joins exist and are unused.** A "Customer 360"
tab on the company and contact detail pages is presentational work over existing FKs.

---

## Claim 4 — "doesn't feel intuitive" → **PARTLY TRUE**

More onboarding exists than the customer implies:

- A full **product tour** system (`components/tour/`), gated on `tourCompletedAt`, replayable
  from the user menu; **all 10 apps declare a `tour`** with illustrations and copy in all 5 locales.
- First-run `setup.tsx` and `onboarding.tsx` (language, currency, date format, theme).
- `FeatureEmptyState` used across 29 app files.

**The real gap:** the tour is one card per app — dock-level orientation ("here is what CRM
is"). There is **no help center, no knowledge base, no contextual/task-level guidance**. A
search for `help ?cent(er|re)|knowledge ?base|documentation` in the client returns nothing;
the only `help` key is Draw's shortcut overlay.

Users are told *that* CRM, Work, and Invoices exist — never *how they connect*. Which is
precisely Claim 3. The customer's opening line — "i would like to have more documentation" —
is the same complaint from the other side.

---

## Recommendations

Ordered by value ÷ effort.

### 1. Customer 360 tab — *low effort, high value*
Add a "Related" tab to `company-detail-page.tsx` and `contact-detail-page.tsx` showing
invoices, projects, deals, and proposals. Every FK already exists; the queries are trivial.
**Directly answers Claims 2 and 3.**

### 2. Address fields on `crm_contacts` — *low effort*
Add `address`, `postalCode`, `state`, `country` mirroring `crm_companies`. One migration, one
form section. **Answers Claim 1's literal ask.**

### 3. Allow invoicing a contact without a company — *medium effort, unblocks the segment*
Make `invoices.companyId` nullable with a `CHECK (company_id IS NOT NULL OR contact_id IS NOT
NULL)`, and relax the builder gate. This is the difference between "usable" and "unusable" for
any B2C service business. Touches billing, so it needs care — but nothing else on the list
matters if a plumber still cannot bill a homeowner.

### 4. Onboarding that explains the *flow* — *low effort*
One tour step, or a home-screen card, showing lead → deal → project → invoice and where each
lives. Cheapest fix for Claim 4.

### 5. A Job entity — *large, strategic; decide deliberately*
A `job` = customer + service address + scheduled window + assignee + status, with estimate and
invoice attached. This is the actual Housecall Pro primitive and would open the field-service
segment.

**Do not build this on the strength of one data point.** Recommend: ship 1–4 (all of which
help every user, not just this segment), then decide whether field service is a market Atlas
wants. Items 1–3 are prerequisites for a job entity regardless.

---

## What to tell the customer

They found four real issues, and their instinct on all four was correct. Worth saying plainly:

- Contacts genuinely have no address field. A custom field is a workaround today
  (Settings → Data model); proper fields are a small change.
- There is genuinely no job concept. Projects and tasks are the nearest tools.
- Contacts and companies *can* be linked to projects and invoices via the `+` button in the
  detail header — that discoverability problem is on us, not them.
- Documentation is thin for end users; `docs/` is developer-facing.

They also gave a favorable comparison against Dolibarr and called the platform "very nice."
This is engaged, high-quality feedback from someone actively evaluating — worth a direct reply.
