# Construction Management System (CMS)

## What This Is

A multi-tenant SaaS platform for small-to-medium construction firms in the Philippines. It provides project management, inventory tracking, procurement, payroll with PH statutory deductions (SSS, PhilHealth, Pag-IBIG, BIR withholding tax), employee management, attendance, expense tracking, equipment management, and document storage — all scoped per company with role-based access control.

## Core Value

Construction companies can manage their entire operation — projects, inventory, employees, payroll, and procurement — in one platform with proper multi-tenant isolation and Philippine statutory compliance.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Google OAuth sign-in with auto profile creation and session management
- [ ] Multi-tenant company creation, membership via company_members junction table, 6 roles (owner, admin, project_manager, accountant, procurement_officer, staff)
- [ ] User invitation system with email-based invites, role assignment, token expiry
- [ ] Dashboard with KPI cards (active projects, total expenses, employee count), recent activity
- [ ] Project CRUD with status management, progress tracking, member assignment, budget tracking
- [ ] Materials catalog CRUD (per company) with units, categories, SKU, min stock levels
- [ ] Project-level inventory with stock in/out, inventory logs, waste tracking
- [ ] Stock reservations for project phases/tasks with fulfill/cancel workflow
- [ ] Inventory transfers between projects with approval workflow
- [ ] Supplier CRUD with contact info
- [ ] Purchase orders with line items, approval workflow (draft → pending → approved → ordered → delivered)
- [ ] Delivery recording against POs with atomic inventory updates via PostgreSQL transaction functions
- [ ] Employee CRUD with PH government ID numbers (SSS, PhilHealth, Pag-IBIG, TIN), daily/salaried/contract types
- [ ] Daily attendance recording per project (present, absent, half_day, overtime, leave)
- [ ] Payroll computation with PH statutory deductions (SSS, PhilHealth, Pag-IBIG, withholding tax), cash advance deductions, loan deductions
- [ ] Cash advance request/approve/track with auto-deduction from payroll
- [ ] Employee loans (SSS salary/calamity, Pag-IBIG MPL/calamity, company) with monthly amortization tracking
- [ ] Expense submission with receipts (file upload), approval workflow, project-level view
- [ ] Project costing: materials + labor + equipment costs tracked against budget
- [ ] Equipment registry with assignment to projects, maintenance status, daily rate for costing
- [ ] Document upload/download per project, categorized (blueprints, permits, contracts, photos)
- [ ] In-app notifications for approvals, low stock alerts, PO status changes
- [ ] Reports: project cost summary, payroll reports with government contribution summaries, inventory reports, waste reports
- [ ] Audit logs tracking all CRUD actions with user, timestamp, old/new data
- [ ] Dashboard v2 with charts (recharts), expense trends, budget vs actual
- [ ] Subscription/billing management with PH-priced plans (Starter ₱1,500, Professional ₱4,500, Business ₱9,500, Enterprise custom)
- [ ] Realtime notifications and inventory updates via Supabase Realtime
- [ ] RLS policies enforcing company isolation on all tables

### Out of Scope

- Real-time chat — High complexity, not core to construction management
- Video posts/media sharing — Not relevant to the domain
- OAuth providers beyond Google — Google OAuth sufficient for PH market
- Native mobile app — Web-first, responsive design covers mobile
- Gantt charts / advanced project scheduling — Defer to future milestone
- Subcontractor management — Defer to future milestone
- Multi-company per user — Users belong to one company for v1

## Context

- **Target market**: Small-to-medium construction firms in the Philippines (5-50 employees)
- **Tech stack**: Next.js 16 (App Router), Supabase (Postgres + Auth + Storage + Realtime), Redux Toolkit (UI state only), shadcn/ui, Tailwind CSS, deployed on Vercel
- **Architecture**: Server-first data flow — Server Components fetch via Supabase server client, pass as props. Mutations via Server Actions + revalidatePath(). Redux for UI state only (sidebar, modals, toasts). No client-side data fetching for CRUD.
- **Database**: Custom `construction` schema (not public), all tables scoped by company_id, RLS policies derive company/role from company_members junction table
- **Multi-tenancy**: company_members junction table links users to companies with roles. One owner per company enforced via partial unique index. company_id on all data tables.
- **Inventory**: PostgreSQL transaction functions (fn_record_delivery, fn_reserve_stock, fn_fulfill_reservation, fn_complete_transfer, fn_report_waste, fn_cancel_reservation) ensure atomic multi-step operations via supabase.rpc()
- **Payroll**: PH statutory deductions — SSS contribution table, PhilHealth 5% split, Pag-IBIG ₱100/₱100, BIR withholding tax table. Cash advance and loan auto-deduction.
- **Realtime**: Only on notifications and project_inventory tables
- **Design**: Dark sidebar (Slate-900), white content area, Blue-600 primary, Amber-500 accent, Inter font, 0.5rem border radius

## Constraints

- **Tech Stack**: Next.js 16 + Supabase + Redux Toolkit + shadcn/ui + Tailwind CSS — decided by user
- **Database Schema**: Custom `construction` schema with specific table definitions provided — follow exactly
- **Authentication**: Google OAuth only via Supabase Auth — no email/password
- **Data Flow**: Server-first pattern — no client-side Supabase queries for CRUD data
- **Redux**: UI state only — no data slices, no async thunks
- **Multi-Tenancy**: company_members junction table, not profiles.company_id
- **PH Compliance**: SSS, PhilHealth, Pag-IBIG, BIR withholding tax tables must be accurate for 2024/2025 rates
- **Deployment**: Vercel + Supabase cloud

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Custom `construction` schema | Cleaner namespace, avoids Supabase internals conflicts | — Pending |
| company_members junction table (not profiles.company_id) | Clean multi-tenant separation, supports future multi-company | — Pending |
| Server-first data flow (no client Supabase queries for CRUD) | Leverages Next.js App Router strengths, simpler mental model | — Pending |
| Redux for UI state only | Next.js handles data caching/revalidation, Redux unnecessary for data | — Pending |
| PostgreSQL transaction functions for inventory ops | Supabase JS client lacks multi-statement transactions, need atomicity | — Pending |
| Google OAuth only (no email/password) | Simplicity for PH market where Google accounts are prevalent | — Pending |
| Realtime only for notifications + inventory | Avoid unnecessary Supabase Realtime overhead | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-24 after initialization*
