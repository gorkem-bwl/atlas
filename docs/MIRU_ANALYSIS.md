# Miru Feature Analysis — Atlas Implementation Reference

Based on analysis of [Miru](https://github.com/saeloun/miru-web) (Ruby on Rails + React time tracking/invoicing platform).

Scoped to: **Time Tracking, Invoicing, Projects, Client Portal** — no employee benefits/leave management.

---

## 1. Time Tracking

### Data model
- **TimesheetEntry**: user, project, company, duration (minutes), work_date, bill_status (billable/unbilled), billed (boolean), locked (boolean), notes
- Entries linked to projects, projects linked to clients
- Billable/non-billable classification per entry
- Locking mechanism — admin locks entries after review or invoicing

### UI patterns
- Weekly timesheet view (Mon-Sun grid, projects as rows)
- Manual entry: select project → enter hours → add note
- No timer/stopwatch in Miru (manual entry only) — **Atlas should add a running timer**
- Bulk operations: approve, reject, lock entries
- Calendar view for visual time distribution

### Business rules
- Cannot edit locked entries
- Cannot set billable on non-billable projects
- When entry is invoiced, it gets locked automatically
- Duration stored as minutes (integer), displayed as hours:minutes

---

## 2. Invoicing

### Data model
- **Invoice**: client, company, amount, currency, status, invoice_number (auto-generated), issue_date, due_date, notes, tax, discount
- **InvoiceLineItem**: invoice, timesheet_entry (optional), description, quantity, unit_price, amount
- Line items can be tied to timesheet entries OR freeform (manual line items)

### Invoice statuses
```
Draft → Sent → Viewed → Paid
                ↘ Overdue (auto, based on due_date)
                ↘ Waived
```

### Features
- Auto-populate line items from unbilled time entries (select client → select date range → pulls all unbilled entries)
- Manual line items (for fixed-fee work, expenses, etc.)
- PDF generation
- Email sending with payment link
- Tax calculation (percentage-based)
- Discount support
- Multi-currency (invoice in client's currency, convert to company base currency)
- Invoice numbering: auto-increment per company (e.g., INV-001, INV-002)
- Archive functionality
- Cannot modify paid invoices
- Duplicate/clone invoice
- Bulk download as ZIP

### Payment tracking
- **Payment**: invoice, amount, currency, transaction_date, transaction_type (bank_transfer, credit_card, stripe, paypal, cash, etc.), status
- Partial payments supported — invoice stays "partially paid" until full amount received
- Stripe integration for online payment links in emailed invoices

---

## 3. Projects

### Data model
- **Project**: client, name, description, billable (boolean), status
- **ProjectMember**: user, project, hourly_rate
- Each team member can have a different hourly rate per project

### Features
- Project dashboard: total hours logged, total amount billed, outstanding amount
- Billable flag controls whether time entries can be marked as billable
- Team member assignment with per-member rates
- Budget tracking (optional: estimated hours/amount vs actual)
- Project-level reports

### Relationship chain
```
Client → Project → ProjectMember (with hourly_rate)
                 → TimesheetEntry → InvoiceLineItem → Invoice → Payment
```

---

## 4. Client Portal

### Data model
- **Client**: name, email, phone, currency, address, logo, stripe_id
- **ClientMember**: client contacts who can log in to the portal
- Clients are separate from team members — they have their own auth

### Portal features
- Client-facing dashboard showing:
  - All invoices (filterable by status)
  - Total outstanding amount
  - Payment history
  - Invoice PDF download
- Client receives email with invoice → clicks link → views in portal → pays via Stripe
- No access to internal time tracking data or project details

### Auth
- Invitation-based: admin invites client contact by email
- Client gets a separate login (not the same as team login)
- Scoped access: can only see their own invoices and payments

---

## 5. Reports

### Report types
- **Time tracking report**: hours by project, client, team member, date range
- **Revenue report**: invoiced amount, paid, outstanding, overdue — by client or project
- **Utilization report**: hours worked vs capacity per team member
- **Project profitability**: revenue vs cost (hours × rate) per project

### Export
- PDF and CSV export
- Date range filtering
- Group by: client, project, team member
- Bulk invoice download (ZIP)

---

## 6. Stripe Integration

### How it works
- Company connects Stripe account (OAuth)
- Client gets a `stripe_id` when first invoice is sent
- Invoice email includes a Stripe payment link
- On payment: webhook creates Payment record, updates invoice status
- Supports: credit card, bank transfer (ACH), etc.

---

## Recommended Atlas Implementation

### What to build (4 entities + portal)

| Entity | Table | Key fields |
|--------|-------|------------|
| **Client** | `billing_clients` | name, email, phone, currency, address, stripe_customer_id |
| **Project** | `billing_projects` | client_id, name, description, billable, status |
| **Time Entry** | `time_entries` | user_id, project_id, duration_minutes, work_date, billable, billed, locked, notes |
| **Invoice** | `invoices` | client_id, number, status, amount, tax, discount, currency, issue_date, due_date, notes |
| **Invoice Line Item** | `invoice_line_items` | invoice_id, time_entry_id (nullable), description, quantity, unit_price, amount |
| **Payment** | `payments` | invoice_id, amount, currency, transaction_date, method, status |
| **Project Member** | `project_members` | user_id, project_id, hourly_rate |

### Atlas app structure
```
packages/server/src/apps/billing/
  manifest.ts
  routes.ts
  controller.ts
  service.ts

packages/client/src/apps/billing/
  manifest.ts
  page.tsx
  hooks.ts
  components/
    time-tracker.tsx      — weekly view + running timer
    invoice-builder.tsx   — create/edit invoice
    invoice-pdf.tsx       — PDF template
    project-dashboard.tsx — project overview
    client-portal.tsx     — client-facing view
    reports.tsx           — reports page
```

### Sidebar views
- Dashboard (overview: hours this week, outstanding invoices, recent activity)
- Time tracking (weekly timesheet + timer)
- Projects (list + detail)
- Clients (list + detail)
- Invoices (list + detail + builder)
- Reports
- Settings

### Key differences from Miru
1. **Running timer** — Miru only has manual entry. Atlas should have a start/stop timer that creates entries automatically.
2. **Integrated with Atlas apps** — time entries can link to CRM deals, HRM employees, Tasks, etc. via record_links
3. **No multi-currency initially** — start with single currency from global settings (currencySymbol)
4. **No Stripe initially** — mark payments manually. Stripe can be added later.
5. **Client portal** — simple public page (like Sign's public signing page) where clients view their invoices
