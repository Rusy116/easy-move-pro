# Phase 5 — Moving Company Portal

The full spec is ~12 pages plus 6 new domain tables (invoices, messages, scheduled_jobs, crew, trucks, attachments) and features like drag-and-drop calendar and messaging that each need their own build. Delivering all of it in one pass would either be shallow stubs everywhere or destabilize the working `/company` leads screen.

Proposal: keep the current `/company` (leads) working untouched, add a new `CompanyShell` navigation, and ship in three sub-phases you approve one at a time.

## Sub-phase 5A — Foundation + Core (this turn)

Ship the pieces movers use every day, backed by the existing engine (`quote_assignments`, `mover_lead_view`, `estimate_revisions`, `moving_companies`).

Routes under `/company/*`:
- `dashboard` — 8 KPI stat cards (Total, Exclusive, Open Market, Scheduled, Completed, Revenue, Acceptance Rate, Avg Response Time) computed from `quote_assignments` + `estimate_revisions`
- `leads` — tabbed My Leads (New / Contacted / Estimate Sent / Won / Lost / Completed) with the card fields you listed + SLA countdown for exclusive
- `exclusive` — filtered view (assignments where `is_exclusive` and non-terminal)
- `marketplace` — open-market discovery + Claim
- `estimates` — list of `estimate_revisions` this company submitted, with the Estimate Builder (Labor / Truck / Travel / Packing / Supplies / Storage / Fuel / Additional / Tax / Discount → Total)
- `lead/$id` — detail with tabs Profile · Inventory · Estimate · Notes · Timeline (Attachments deferred to 5C)
- `profile` — company profile edit (logo, DOT, MC, insurance, licenses, service areas) against `moving_companies`
- `settings` — notifications, business hours, working radius, quote preferences (stored on `moving_companies.settings jsonb`)

Redirect `/company` → `/company/leads` so the current working screen stays intact under its new URL.

New shell: `CompanyShell` sidebar with the 10 nav items (Schedule / Customers / Messages / Invoices marked "Coming soon" until 5B/5C).

## Sub-phase 5B — Operations (next approval)

Requires new tables. I'll present a migration plan before running it.
- `scheduled_jobs`, `crews`, `trucks`, `crew_assignments` → Schedule page with calendar (month/week/day) + drag-and-drop + crew/truck assignment
- `customers` view derived from won/completed quotes → Customers page with search, history, LTV

## Sub-phase 5C — Communications & Billing

- `mover_messages` (broker↔company, and customer↔company when broker permits) → Messages with unread counter + notifications
- `invoices` + `invoice_items` → Invoices (Paid / Unpaid / Overdue) with PDF export via existing `estimate-pdf.ts` pattern
- `attachments` (Supabase Storage bucket `company-attachments`) → Attachments tab on Lead Details

## Guardrails (all sub-phases)

- Reuse existing RPCs (`fn_mover_*`, `mover_lead_view`) — no new RLS on `quotes`.
- Every new table gets GRANTs + RLS scoped to `company_id = fn_current_mover_company()`.
- No changes to `/admin/*`, `/dashboard`, or the calculator.
- PII masking stays enforced by `mover_lead_view` — the portal never queries `quotes` directly.

## Technical notes

- Estimate Builder writes to existing `estimate_revisions` (already has labor/truck/travel/packing/supplies/storage/fuel/additional/tax/discount/total columns from Phase 1). No schema change needed for 5A.
- Dashboard KPIs computed client-side from a single `mover_lead_view` fetch + `estimate_revisions` aggregate — cheap, one query per card group.
- Countdown reuses `<SlaCountdown/>` already built.
- Nav uses the same `RoleShell` primitives as Admin/Customer for visual parity.

Confirm and I'll build 5A now, then wait for approval before 5B and 5C.