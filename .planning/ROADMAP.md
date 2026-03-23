# Roadmap: Construction Management System

**Created:** 2026-03-24
**Milestone:** v1.0 — Full-featured multi-tenant construction management SaaS for PH market
**Granularity:** Coarse (5 phases)

---

## Phase Overview

| # | Phase | Goal | Requirements |
|---|-------|------|-------------|
| 1 | Foundation & Auth | Secure multi-tenant base with Google OAuth, company onboarding, RLS, and app shell | FOUND-01–06, AUTH-01–10 |
| 2 | Projects, Employees & Attendance | Core operational entities — the dependency root for payroll, inventory, and costing | DASH-01–02, PROJ-01–07, EMP-01–04, ATT-01–04, SETT-01–03 |
| 3 | Inventory & Procurement | Materials catalog, project stock, atomic inventory ops, suppliers, purchase orders, and deliveries | INV-01–09, PROC-01–06 |
| 4 | Payroll & HR Finance | PH statutory payroll engine (SSS/PhilHealth/Pag-IBIG/BIR), cash advances, and employee loans | PAY-01–12, FIN-01–05 |
| 5 | Operations, Reports & Launch | Expenses, equipment, documents, notifications, reports, billing, realtime, and dashboard v2 | EXP-01–04, EQUIP-01–03, DOC-01–03, NOTF-01–03, REP-01–04, SETT-04, BILL-01–03, RT-01–02, DASH-03 |

---

## Phase 1: Foundation & Auth

**Goal:** Working Next.js app with Google OAuth, company creation, RLS-enforced multi-tenancy, and authenticated app shell. Nothing else is safe to build until this is solid.

**Why first:** Every other phase depends on: (a) a user being authenticated, (b) their company being resolved, (c) RLS enforcing company isolation. Skipping this creates security debt that's expensive to retrofit.

**Success criteria:**
- [ ] New user signs in via Google, profile auto-created, redirected to company onboarding
- [ ] Company is created; owner `company_members` record exists; 14-day trial subscription active
- [ ] Owner can invite a user; invited user accepts and gains company access with assigned role
- [ ] Authenticated user session persists across browser refresh
- [ ] Unauthenticated request to `/dashboard` redirects to `/login`
- [ ] All `construction` schema tables have RLS enabled with company isolation policies
- [ ] All 6 PostgreSQL transaction functions deployed and callable via `supabase.rpc()`
- [ ] App shell renders: dark sidebar, header with notification bell, breadcrumbs
- [ ] `supabase gen types typescript --schema construction` produces typed DB client

**Plans:**
1. Database foundation — migrations 000–016: schema, all tables, RLS policies, triggers, helper functions
2. Auth flow — Google OAuth, callback route, middleware, profile trigger, onboarding, invitation system
3. App shell — Next.js route structure, Redux setup, sidebar, header, layout, loading states
4. Transaction functions — migration 017: all 6 atomic inventory/stock PL/pgSQL functions

**Key risks:**
- PostgREST not picking up `construction` schema — test with `supabase.from('profiles').select()` immediately after migration
- RLS blocking own profile on first login — profile INSERT trigger runs as SECURITY DEFINER; verify anon user cannot read others
- Middleware session refresh breaking SSR — test with `getUser()` not `getSession()`

---

## Phase 2: Projects, Employees & Attendance

**Goal:** Core operational entities. Projects are the central organizing unit. Employees and attendance are the prerequisite for payroll. Dashboard gives immediate value on first login.

**Why second:** These are the dependency roots — payroll needs employees + attendance, costing needs projects, inventory belongs to projects. Build these before the modules that depend on them.

**Success criteria:**
- [ ] Dashboard shows correct KPI counts (active projects, employees, expense total)
- [ ] Project can be created, edited, deleted, status changed; project list filterable by status
- [ ] Employee can be created with all PH gov ID fields; employee list shows active employees
- [ ] Attendance can be recorded for a date range; half-day and overtime correctly stored
- [ ] Employees can be assigned to projects with roles; assignment visible on project detail
- [ ] Project costing page shows ₱0 for materials/labor/equipment (will populate in later phases)
- [ ] Role-based access enforced: Staff can only view assigned projects; Accountant cannot create projects

**Plans:**
1. Dashboard — KPI queries, recent activity, KPI card components
2. Projects CRUD — project form, list page, detail tabs (overview/members/costing/expenses/documents), status workflow
3. Employees CRUD — employee form, list page, detail page (profile/loans/payslips tabs)
4. Attendance — daily attendance sheet UI, bulk record per project, attendance query for date range

**Key risks:**
- Project detail tabs with sub-routes — use Next.js nested layouts correctly; don't nest too deep
- RLS on projects: staff only see assigned projects (join through `project_members → employees → profiles`) — verify this query works with RLS active
- Attendance upsert (unique per employee+date) — use `onConflict` clause correctly

---

## Phase 3: Inventory & Procurement

**Goal:** Materials catalog, per-project stock, atomic operations (waste/reservation/transfer), suppliers, POs, and delivery recording that atomically updates inventory.

**Why third:** Inventory depends on projects (Phase 2). The procurement flow (PO → delivery → inventory update) is the most complex data flow in the app. Atomic transaction functions (from Phase 1) are pre-built — this phase wires them up.

**Success criteria:**
- [ ] Material created in catalog; appears in inventory list for any project with stock > 0
- [ ] Manual stock-in adds quantity; inventory log records the movement with performer
- [ ] Waste reported via `fn_report_waste`; stock deducted, log entry created
- [ ] Stock reserved via `fn_reserve_stock`; reserved column increments, available = quantity - reserved
- [ ] Reservation fulfilled via `fn_fulfill_reservation`; both quantity and reserved decrement
- [ ] Transfer requested, then completed via `fn_complete_transfer`; source decrements, destination increments
- [ ] Supplier created; PO created against supplier for a project with line items
- [ ] PO approved by Admin/PM; status transitions correctly
- [ ] Delivery recorded via `fn_record_delivery`; inventory updated, cost logged, PO status updated to delivered/partially_delivered
- [ ] Low-stock notification fires when inventory drops below material's `min_stock`

**Plans:**
1. Materials catalog — CRUD, unit/category management, material list page
2. Project inventory — stock view per project, manual stock in/out forms, inventory log table
3. Advanced inventory ops — waste form (fn_report_waste), reservation form (fn_reserve_stock/fulfill/cancel), transfer form (fn_complete_transfer)
4. Suppliers & Purchase Orders — supplier CRUD, PO form with dynamic line items, PO list, detail page, approval workflow
5. Delivery recording — delivery form against PO, calls fn_record_delivery, updates PO detail, low-stock notification trigger

**Key risks:**
- `fn_record_delivery` parameters (JSON array for items) must match TypeScript calling code exactly — test with Vitest unit test before UI
- Concurrent reservations — fn_reserve_stock uses `SELECT FOR UPDATE`; verify deadlock behavior under load
- PO line items (po_items) as dynamic form rows — react-hook-form array fields with zod validation

---

## Phase 4: Payroll & HR Finance

**Goal:** PH statutory payroll engine with accurate SSS/PhilHealth/Pag-IBIG/BIR deductions, cash advance tracking, and employee loan management.

**Why fourth:** Payroll is the #1 differentiator and most complex business logic. Depends on employees (Phase 2) and attendance (Phase 2). Cash advances and loans must exist before payroll computation (they're inputs to the deduction calculation).

**Success criteria:**
- [ ] SSS contribution computed correctly for 3 test cases (min/mid/max salary credit bracket)
- [ ] PhilHealth computed at 5% of basic salary, 50/50 split, with ₱100k cap
- [ ] Pag-IBIG computed at ₱100/₱100 for salaries above ₱1,500
- [ ] BIR withholding tax correct for monthly-paid employee at ₱25,000 gross
- [ ] Payroll period created; items auto-computed from attendance for all active employees
- [ ] Payroll items editable before approval (manual adjustment of allowances, bonuses, deductions)
- [ ] Cash advance deducted up to 20% of gross; remaining balance decrements on approval
- [ ] Loan amortization deducted; remaining balance decrements on approval
- [ ] Net pay = gross - all deductions (computed column matches TypeScript calculation)
- [ ] Approved payroll records labor cost in `project_costs` per project
- [ ] Employee can view own payslip with all line items

**Plans:**
1. PH statutory tables — SSS (lib/payroll/sss.ts), PhilHealth (philhealth.ts), Pag-IBIG (pagibig.ts), BIR (bir.ts) with Vitest tests
2. Cash advances & loans — cash advance CRUD + approval, loan CRUD, employee loans tab
3. Payroll computation — payroll period creation, auto-compute server action, payroll items table UI
4. Payroll approval & payslips — review/edit flow, approval action (updates advances/loans/project costs), payslip view

**Key risks:**
- BIR withholding tax table: TRAIN Act effective January 2023 — verify current brackets; do NOT use pre-2023 table
- Payroll computation for semi-monthly salaried employees: divide monthly salary by 2, not by working days
- Negative net pay if deductions exceed gross — add guard: cap deductions at gross, carry remainder to next period
- Payroll approval transaction: multiple updates (advance balances, loan balances, project costs) — wrap in Server Action that calls a PL/pgSQL function for atomicity

---

## Phase 5: Operations, Reports & Launch

**Goal:** Complete the product: expenses, equipment, documents, in-app notifications, reports, billing, realtime, and dashboard v2. Everything needed to ship to first paying customers.

**Why fifth:** These modules depend on the data created in Phases 1–4. Reports cannot summarize what doesn't exist. Billing gates are meaningless before the core product works. Realtime requires the notification infrastructure from Phase 1.

**Success criteria:**
- [ ] Expense submitted with receipt image (uploaded to Supabase Storage); appears in approval queue
- [ ] Approved expense visible in project cost summary
- [ ] Equipment assigned to project; assignment duration × daily rate adds to equipment costs
- [ ] Document uploaded and downloadable; cross-tenant download rejected (Supabase Storage RLS)
- [ ] Notification bell increments count in real time when new notification arrives
- [ ] Project inventory page reflects another user's stock update within 3 seconds
- [ ] Project cost summary report correct: materials (from POs) + labor (from payroll) + equipment (from assignments)
- [ ] Payroll report shows gross/deductions/net with government contribution subtotals
- [ ] Audit log shows last 50 CRUD events for admin
- [ ] Subscription enforced: Starter plan cannot create 4th active project
- [ ] Stripe checkout flow works; webhook updates `companies.plan_status` to `active`
- [ ] Dashboard v2 shows expense trend chart and cost breakdown bar chart

**Plans:**
1. Expenses — expense form with receipt upload (signed URL → Supabase Storage), list with approval workflow, project-level view
2. Equipment — registry CRUD, assignment form, return flow, equipment cost contribution to project_costs
3. Documents — file upload component, document list per project, Supabase Storage bucket RLS
4. Notifications & Realtime — notification bell component, notification list page, Supabase Realtime hooks (useNotificationRealtime, useInventoryRealtime), Redux notification slice integration
5. Reports — project cost summary query + UI, payroll report, inventory report, audit log view
6. Billing & Subscription — Stripe checkout, webhook handler (`/api/webhooks/billing`), plan enforcement middleware, settings/billing page

---

## Milestone Completion

**v1.0 is complete when:**
- [ ] All 5 phases verified (VERIFICATIONs pass)
- [ ] First company can sign up, create project, record employees/attendance, run payroll, create PO, receive delivery, and generate cost summary report — end-to-end
- [ ] Billing subscription enforced (Starter plan limits respected)
- [ ] No cross-tenant data leakage (RLS audit: attempt to access another company's data → 0 rows returned)

---

## Dependencies

```
Phase 1 (Foundation)
    └── Phase 2 (Projects/Employees/Attendance)
              └── Phase 3 (Inventory/Procurement)
              └── Phase 4 (Payroll/HR Finance)
              └── Phase 5 (depends on 1+2+3+4)
```

Phase 3 and Phase 4 are independent of each other (can be executed in any order after Phase 2).

---
*Roadmap created: 2026-03-24*
*Milestone: v1.0 — Construction Management SaaS (PH)*
