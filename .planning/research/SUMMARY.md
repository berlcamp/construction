# Project Research Summary

**Project:** Construction Management SaaS — Philippines Market
**Domain:** Multi-tenant B2B SaaS for Philippine small-to-medium construction firms (5-50 employees)
**Researched:** 2026-03-24
**Confidence:** MEDIUM-HIGH

## Executive Summary

This is a multi-tenant construction management SaaS targeting Philippine SME construction firms. The dominant market competitors (Procore, Buildertrend, CoConstruct) are priced in USD and lack Philippine-specific payroll compliance (SSS, PhilHealth, Pag-IBIG, BIR withholding), which is the core differentiator. The product must combine standard construction operations tooling — project management, inventory, procurement, attendance — with a built-in, legally accurate Philippine payroll engine. The right build approach is a server-first Next.js App Router application with Supabase handling auth, database, storage, and realtime, with all multi-tenant isolation enforced through PostgreSQL Row Level Security.

The recommended architecture draws a hard line: Server Components handle all data reads (no client-side Supabase queries), Server Actions handle all writes (with company context re-derived from the authenticated session, never from client input), and Redux manages only transient UI state. Inventory integrity must be enforced with PostgreSQL transaction functions — not application-layer multi-step calls — because race conditions between concurrent stock mutations are unavoidable in multi-site construction operations. Philippine statutory payroll computation (SSS, PhilHealth, Pag-IBIG, BIR) must be stored as database-driven configuration with effective dates, not hardcoded constants, because rates change periodically.

The primary risks are: (1) RLS misconfiguration on the custom `construction` schema leaking cross-tenant data, (2) incorrect Philippine statutory rate tables causing compliance failures, and (3) missing atomicity on inventory operations causing silent stock corruption. All three are avoidable with the right foundation — the mitigation is to build tenant isolation, the correct middleware auth pattern, and PostgreSQL transaction functions before any feature work begins, and to verify payroll rates against official government circulars before shipping the payroll module.

---

## Key Findings

### Recommended Stack

The stack is fully specified and locked. The core is Next.js 16 with React 19, Supabase (Postgres + Auth + Storage + Realtime), Redux Toolkit (UI state only), Tailwind CSS v4, and shadcn/ui. TypeScript 6 with strict mode is required for Supabase generated types and safe Server Action signatures. See `.planning/research/STACK.md` for full version list and rationale.

**Core technologies:**
- **Next.js 16.2.1**: Full-stack framework — App Router + Server Components + Server Actions eliminates a separate API layer
- **Supabase JS 2.100.0 + @supabase/ssr 0.9.0**: Single SDK covers Postgres, Google OAuth, Storage, and Realtime; SSR package is mandatory for cookie-based auth in Server Components
- **Redux Toolkit 2.11.2**: Scoped strictly to transient UI state (sidebar, modals, toasts, realtime notification count) — never holds server data
- **react-hook-form 7.72.0 + Zod 4.3.6**: Define validation schemas once, use as RHF resolver on client and re-parse in Server Actions on server
- **@tanstack/react-table 8.21.3**: Headless tables for inventory, employees, POs, payroll — all data tables use this
- **date-fns 4.1.0**: Date arithmetic for payroll periods, attendance ranges, maintenance schedules
- **Stripe 20.4.1**: Subscription billing in PHP (₱1,500–₱9,500/month tiers) — Maya/GCash lack recurring billing reliability
- **Vitest 4.1.1**: Unit test payroll computation logic — SSS/PhilHealth/Pag-IBIG/BIR tables are the highest-risk business logic

**Critical version constraints:**
- Next.js 16 requires React 19; check peer deps before adding older component libraries
- Tailwind v4 uses CSS-based config (no `tailwind.config.js`) — shadcn/ui CLI 4.x must match
- `@supabase/auth-helpers-nextjs` is deprecated — use `@supabase/ssr` only
- Do NOT add TanStack Query, SWR, or Prisma — they fight the server-first architecture

### Expected Features

See `.planning/research/FEATURES.md` for the full feature list, dependency map, and competitor analysis.

**Must have (table stakes — P1 launch):**
- Multi-tenant auth with Google OAuth, company creation, and 6-role RBAC — the prerequisite for everything
- Project CRUD with status and budget tracking — the central entity all features attach to
- Employee CRUD with PH government IDs (SSS No., TIN, PhilHealth No., Pag-IBIG No.) — required before payroll
- Daily attendance recording per project — required input for payroll computation
- PH statutory payroll computation (SSS, PhilHealth, Pag-IBIG, BIR withholding) — the #1 differentiator
- Cash advance request/approve/track with payroll deduction — inseparable from payroll in PH construction
- Materials catalog + project inventory (stock in/out, atomic operations, low-stock alerts)
- Supplier CRUD + purchase orders with approval workflow (draft → approved → ordered → delivered)
- Delivery recording with atomic inventory update via PostgreSQL function
- Expense submission with receipts + approval workflow
- Document storage per project (blueprints, permits, contracts)
- In-app notifications (low stock, PO approvals, expense approvals)
- Basic reports (payroll, cost summary, inventory) — minimum output for accountant/owner
- Dashboard with KPI cards — proves value on login

**Should have (competitive differentiators — P2 post-launch):**
- Employee loans (SSS, Pag-IBIG, company) with amortization and auto-deduction
- Stock reservations for project phases
- Inventory transfers between projects with approval
- Waste tracking per project/material
- Equipment registry with project assignment and cost tracking
- Government contribution summary reports (SSS R3, PhilHealth RF-1, HDMF MDF)
- Realtime inventory and notification updates via Supabase Realtime
- Subscription/billing management (Stripe Checkout + webhooks)
- Dashboard v2 with recharts for budget vs. actual trends

**Defer to v2+:**
- Gantt charts / advanced project scheduling
- Subcontractor management portal
- Client/owner portal
- Multi-company per user (architecturally complex; small market segment for v1)
- BIR e-filing integration (liability and reliability concerns)
- Offline mode / PWA

**Anti-features to avoid entirely:**
- Real-time chat (SMEs use Messenger/Viber; high complexity for low adoption)
- Native mobile app (responsive web covers the use case for v1)
- Full accounting (AR/AP/GL) — export to accounting software instead

### Architecture Approach

The architecture follows a strict server-first model: Server Components are the data gateway (all reads via Supabase server client, data passed down as props), Server Actions are the write path (all mutations, with company context re-derived from session, never trusted from form input), and the Supabase browser client is used only for Realtime subscriptions. Multi-tenant isolation is enforced at the PostgreSQL layer via RLS policies that join through the `company_members` junction table. All multi-step inventory operations are encapsulated in PostgreSQL stored functions called via `supabase.rpc()` to guarantee atomicity. See `.planning/research/ARCHITECTURE.md` for diagrams, code patterns, and the full build order dependency graph.

**Major components:**
1. **Next.js Middleware** — session refresh on every request via `@supabase/ssr`; redirects unauthenticated users
2. **Server Components (page.tsx)** — primary read path; fetch data via Supabase server client; resolve company context; pass props to Client Components
3. **Server Actions (actions.ts)** — all mutations; re-derive `company_id` + `role` from session; validate with Zod; call Supabase direct or via `supabase.rpc()`; call `revalidatePath()` on specific routes
4. **Supabase PostgreSQL (construction schema)** — all persistent data with RLS policies; `company_members` junction table is the tenancy source of truth
5. **PostgreSQL Transaction Functions** — atomic inventory operations: `fn_record_delivery`, `fn_reserve_stock`, `fn_fulfill_reservation`, `fn_complete_transfer`, `fn_report_waste`
6. **lib/payroll/** — pure TypeScript functions for SSS, PhilHealth, Pag-IBIG, BIR computation; no DB calls; fully unit-testable
7. **Redux Store** — UI state only: sidebar open/close, active modal, toast queue, realtime notification unread count
8. **Supabase Realtime** — scoped to `notifications` and `project_inventory` tables only; channels filtered by `company_id`
9. **Supabase Storage** — private buckets; paths prefixed with `company_id/`; downloads via short-lived signed URLs

### Critical Pitfalls

See `.planning/research/PITFALLS.md` for the full list with code examples, warning signs, and recovery strategies.

1. **RLS on custom schema never fires** — The `construction` schema must be added to PostgREST's "Extra Schemas" in Supabase settings, or all RLS policies are silently bypassed. Test by impersonating `authenticated` role in SQL editor, not as `postgres`. Address in Phase 1 before any data features.

2. **`getSession()` vs `getUser()` in Server Components** — `getSession()` trusts the cookie locally without verifying with the Auth server; expired JWTs still return session objects. Always use `supabase.auth.getUser()` for authorization checks. Address in Phase 1 auth setup.

3. **Middleware cookie passthrough breaks session refresh** — Supabase `@supabase/ssr` rotates session tokens; if `setAll` in middleware doesn't correctly write cookies back to `NextResponse`, users are silently logged out after token expiry. Use the exact pattern from current Supabase SSR docs. Address in Phase 1.

4. **Inventory stock goes negative without atomic transactions** — Concurrent stock-out requests can both read the same stock level and both succeed, creating phantom stock. All inventory mutations must use PostgreSQL stored functions with `SELECT ... FOR UPDATE`. Add `CHECK (quantity >= 0)` constraint. Address in inventory phase before any stock mutation UI.

5. **PH statutory rate tables hardcoded** — SSS, PhilHealth, Pag-IBIG, and BIR rates change periodically. Hardcoding produces incorrect deductions and creates compliance liability. Store all tables in the database with `effective_from` dates; never as TypeScript constants. Verify current rates against official circulars before shipping payroll.

6. **Cross-tenant document leakage via Storage** — Storage buckets left public or without `company_id`-prefixed paths allow any authenticated user to access any company's documents (PDPA violation). Use private buckets, `company_id/` path prefix, and RLS on `storage.objects`. Storage path convention must be decided in Phase 1.

7. **Service role key in user-facing Server Actions** — Using `createClient` with the service role bypasses all RLS. Only use `@supabase/ssr`'s `createServerClient` (cookie-based) in Server Actions. The service role is for admin/migration scripts only.

---

## Implications for Roadmap

Based on the dependency graph from ARCHITECTURE.md, the feature dependencies from FEATURES.md, and the phase-mapped pitfalls from PITFALLS.md, the following phase structure is recommended:

### Phase 1: Foundation, Auth, and Multi-Tenancy
**Rationale:** Every feature in this product is gated behind multi-tenant company isolation. RLS policies, the `company_members` junction table, and correct auth patterns must exist before any data feature can be built safely. Critical security pitfalls (Pitfalls 1, 3, 4, 7) are all in this phase and are essentially unrecoverable if discovered late.
**Delivers:** Google OAuth login, company creation flow, user invitations, RBAC (6 roles), Next.js middleware with correct session refresh, Supabase `construction` schema with RLS, composite index on `company_members(user_id, company_id)`, private Storage buckets with `company_id` path convention, Redux store with UI slices, core layout (sidebar, header).
**Addresses:** Multi-tenant auth + RBAC (P1), dashboard shell
**Avoids:** RLS bypass via wrong schema exposure, `getSession()` auth hole, middleware cookie passthrough bug, service role in server actions, storage tenant leakage

### Phase 2: Project Management Core
**Rationale:** Projects are the central entity that every other module (inventory, attendance, expenses, documents, equipment) attaches to. Building this second establishes the data model anchor and the CRUD/approval workflow pattern that all subsequent modules will follow.
**Delivers:** Projects CRUD (status: planning/active/on-hold/completed/cancelled), budget tracking, project member assignment, basic project detail view.
**Addresses:** Project CRUD + budget (P1)
**Uses:** Server Component as data gateway pattern, Server Action with authorization check pattern, shadcn/ui DataTable + TanStack Table, nuqs for URL-synced filters
**Avoids:** Broad `revalidatePath()` — establish specific path revalidation pattern here

### Phase 3: Inventory and Procurement
**Rationale:** Procurement and inventory are tightly coupled (PO → delivery → stock update) and both depend on Projects. The PostgreSQL transaction functions (`fn_record_delivery`, `fn_reserve_stock`) must be built here before any stock mutation UI exists. This is the highest-complexity phase architecturally.
**Delivers:** Materials catalog CRUD, suppliers CRUD, purchase orders with approval workflow, delivery recording via `fn_record_delivery` (atomic), project inventory views with stock in/out logs, low-stock alerts.
**Addresses:** Materials catalog (P1), suppliers (P1), purchase orders (P1), delivery recording (P1), project inventory (P1)
**Uses:** PostgreSQL transaction functions via `supabase.rpc()`, react-dropzone for delivery photo/docs, Zod schemas for all PO/inventory inputs
**Avoids:** Direct multi-statement JS inventory updates (Pitfall 8), missing `CHECK (quantity >= 0)` constraint, non-atomic PO delivery

### Phase 4: HR and Payroll
**Rationale:** Employee CRUD must precede attendance, which must precede payroll computation. Payroll is the product's core differentiator and has the highest compliance risk (PH statutory law). Cash advances are operationally inseparable from payroll in Philippine construction. This phase requires Vitest coverage before shipping.
**Delivers:** Employee CRUD with PH government IDs (SSS No., TIN, PhilHealth No., Pag-IBIG No.), daily attendance recording per project, `lib/payroll/` pure computation functions (SSS, PhilHealth, Pag-IBIG, BIR), payroll run computation with line-item preview, cash advance request/approve/track with auto-deduction, payroll finalization and basic payslip PDF.
**Addresses:** Employee CRUD (P1), attendance (P1), payroll computation (P1), cash advances (P1)
**Uses:** date-fns for payroll period date arithmetic, Vitest for statutory deduction unit tests, jspdf for payslip PDF, Zod schemas for payroll inputs
**Avoids:** Hardcoded statutory rate tables (store in DB with effective_from), PhilHealth wrong base/ceiling, BIR annual-vs-monthly bracket error, loan deduction overflow (net pay < 0), no payroll preview before finalization

### Phase 5: Expenses, Documents, and Notifications
**Rationale:** These features depend on Projects and Auth but are independent of each other. Grouping them into one phase delivers the full "project operations" experience and completes the core feature set needed for accountant and owner daily workflows.
**Delivers:** Expense submission with receipt upload + approval workflow, document storage per project (blueprints, permits, contracts, photos with category), in-app notification system with bell icon, Supabase Realtime subscription for notifications.
**Addresses:** Expense submission (P1), document storage (P1), in-app notifications (P1)
**Uses:** react-dropzone for receipt/document upload, Supabase Storage signed URLs pattern (Server Action generates signed upload URL → client uploads directly → Server Action saves path), Supabase Realtime for notification push
**Avoids:** Storage paths without company_id prefix, public Storage buckets, Realtime channel leak (always return `supabase.removeChannel(channel)` in useEffect cleanup)

### Phase 6: Reports and Dashboard
**Rationale:** Reporting aggregates data from all prior phases — it is only meaningful once Inventory, Payroll, and Expenses have real data. The dashboard KPI cards are a lighter version of this that should be built earlier (in Phase 2 as a stub), fleshed out here.
**Delivers:** Dashboard with KPI cards (active projects, total headcount, total spend, low-stock alerts), project cost summary (materials + labor + equipment), payroll summary report, inventory status report, basic CSV exports via papaparse.
**Addresses:** Basic reports (P1), dashboard KPI cards (P1)
**Uses:** recharts for budget vs. actual trend charts, @tanstack/react-virtual for large audit log tables, papaparse for CSV export
**Avoids:** Fetching all data eagerly for dashboard — paginate; use independent Server Component fetches per KPI card

### Phase 7: Extended HR (Loans) and Inventory Enhancements
**Rationale:** These P2 features extend Phase 3 and 4 capabilities. Employee loans with amortization auto-deduction extends payroll. Stock reservations and inter-project transfers extend inventory. Waste tracking is low-complexity. Deliver after core is validated in production.
**Delivers:** Employee loans (SSS/Pag-IBIG/company) with monthly amortization auto-deduction in payroll, stock reservations for project phases (reserve → fulfill → cancel), inventory transfers between projects with approval, waste tracking per project.
**Addresses:** Employee loans (P2), stock reservations (P2), inventory transfers (P2), waste tracking (P2)
**Uses:** Extends existing `fn_reserve_stock`, `fn_complete_transfer`, `fn_report_waste` PostgreSQL functions
**Avoids:** Loan deduction overflow — deduction ordering (statutory first, then government loans, then company loans, then cash advances) and net-pay floor must be enforced

### Phase 8: Equipment, Government Reports, and Realtime
**Rationale:** Equipment registry and costing fills the last gap in project cost-to-complete accuracy. Government contribution summary reports (SSS R3, PhilHealth RF-1, HDMF) are high-value for accountants but depend on validated payroll data from Phase 4. Realtime inventory updates add field visibility for active multi-site operations.
**Delivers:** Equipment registry with project assignment, daily rate costing, maintenance status, government contribution summary reports (printable/exportable), Supabase Realtime subscription for `project_inventory` table, recharts dashboard enhancements.
**Addresses:** Equipment registry (P2), government reports (P2), realtime inventory (P2), dashboard v2 (P2)

### Phase 9: Billing and Subscription Management
**Rationale:** Billing can be developed in parallel with Phases 4–8 but should be integrated and tested as a dedicated phase before public launch. Stripe Checkout + webhooks pattern is well-documented; feature gating by plan tier is the main complexity.
**Delivers:** Stripe Checkout integration, subscription webhook handler (`/api/webhooks/billing`), plan tiers (Starter ₱1,500 / Pro ₱4,500 / Business ₱9,500), feature gating by plan, billing management settings page.
**Addresses:** Subscription/billing (P2)
**Uses:** Stripe 20.4.1 with Stripe-hosted Checkout (avoids PCI scope), webhook signature verification

---

### Phase Ordering Rationale

- **Security before features:** Phases 1 is non-negotiable first — cross-tenant data leakage and auth vulnerabilities discovered after features are built are expensive to fix and potentially catastrophic (PDPA liability).
- **Dependency chain enforced:** Projects (Phase 2) → Inventory/Procurement (Phase 3) and HR (Phase 4) are the correct order because all data modules attach to projects. Payroll cannot exist without employees and attendance.
- **Compliance risk isolated:** Payroll's statutory deduction logic is the highest legal risk and is grouped in Phase 4 with explicit Vitest coverage requirements. Billing (Phase 9) is separate from core operations.
- **Defer realtime until stable:** Supabase Realtime subscriptions add complexity (channel lifecycle management, connection limits). Introduced in Phase 5 for notifications, extended in Phase 8 for inventory — after the data models are stable.
- **Reports last:** Aggregated reporting is only useful when there is real data; building it before data exists produces empty, unvalidatable screens.

### Research Flags

Phases likely needing deeper research or careful verification during planning:

- **Phase 1:** RLS policy patterns for the `construction` custom schema need integration test validation early. The exact `@supabase/ssr` middleware pattern must be copied precisely from current Supabase docs (training data cutoff Aug 2025 — verify).
- **Phase 4 (Payroll):** Philippine statutory rates (SSS, PhilHealth, Pag-IBIG, BIR) MUST be verified against official government circulars before implementation. PITFALLS.md marks these as LOW confidence for exact 2025+ rates. This is a legal compliance requirement, not just a code correctness issue.
- **Phase 3 (PostgreSQL transaction functions):** `fn_record_delivery`, `fn_reserve_stock`, etc. are custom stored functions — they need careful testing for rollback behavior. Consider pgTAP or SQL-based integration tests.

Phases with standard, well-documented patterns (skip additional research):

- **Phase 2 (Project Management CRUD):** Standard Server Component + Server Action CRUD pattern. Well-documented in Next.js + Supabase ecosystem.
- **Phase 5 (Documents/Expenses):** Supabase Storage signed URL pattern + react-dropzone is thoroughly documented.
- **Phase 9 (Billing):** Stripe Checkout + webhook pattern is the standard SaaS billing approach with extensive documentation.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against npm registry on 2026-03-24; version compatibility confirmed via peer dependency inspection |
| Features | MEDIUM | Table stakes and dependency ordering are HIGH confidence; competitor feature set analysis is MEDIUM (training data); Philippine labor law framework is HIGH |
| Architecture | HIGH | Core patterns are directly specified in PROJECT.md constraints; Next.js App Router + Supabase patterns are well-documented; scaling thresholds are MEDIUM |
| Pitfalls | MEDIUM | Supabase/Next.js specific pitfalls are HIGH confidence; Philippine statutory rate accuracy is LOW — must verify against current government circulars |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **PH statutory rates (LOW confidence):** SSS, PhilHealth, Pag-IBIG, and BIR withholding rate tables from training data may not reflect current 2025/2026 circulars. **Action:** Before implementing Phase 4 payroll computation, verify rates at:
  - SSS: https://www.sss.gov.ph
  - PhilHealth: https://www.philhealth.gov.ph/circulars/
  - BIR TRAIN tables: https://www.bir.gov.ph (RR 11-2018)
  - Pag-IBIG: https://www.pagibigfund.gov.ph

- **`@supabase/ssr` middleware exact pattern:** Supabase SSR helper patterns may have been updated since Aug 2025 training cutoff. **Action:** During Phase 1, pull the current middleware pattern from https://supabase.com/docs/guides/auth/server-side/nextjs before writing `middleware.ts`.

- **PDPA compliance for PH government ID storage:** Research flagged that SSS No., TIN, and Pag-IBIG numbers should be encrypted at rest via `pgcrypto`. Exact PDPA compliance requirements for software vendors are MEDIUM confidence. **Action:** Consult with a Philippine data privacy lawyer or the NPC (National Privacy Commission) guidance before launch.

- **Supabase Realtime channel limits:** Connection count limits for Supabase plans (Pro vs Enterprise) were not verified for this project's expected usage pattern. **Action:** Check current Supabase plan limits before designing the Realtime subscription strategy in Phase 8.

---

## Sources

### Primary (HIGH confidence)
- `npm` registry (live query, 2026-03-24) — all library versions and peer dependencies
- PROJECT.md (project constraints) — stack decisions, architecture patterns, schema design
- Next.js App Router documentation (training data, Aug 2025) — Server Components, Server Actions, revalidatePath patterns
- Supabase documentation (training data, Aug 2025) — RLS, SSR helpers, Realtime, Storage patterns
- PostgreSQL documentation — transaction functions, row-level locking, CHECK constraints

### Secondary (MEDIUM confidence)
- Training data knowledge of Procore, Buildertrend, CoConstruct, Fieldwire feature sets — competitor analysis
- General SaaS multi-tenant architecture patterns — scaling thresholds
- Philippines construction SME market context — pricing, communication tools, workflow norms

### Tertiary (LOW confidence — must verify before shipping)
- SSS contribution schedule (2025) — https://www.sss.gov.ph
- PhilHealth premium rate circular 2023-0014 — https://www.philhealth.gov.ph/circulars/
- BIR TRAIN Law withholding tax tables (RR 11-2018) — https://www.bir.gov.ph
- Pag-IBIG contribution rates — https://www.pagibigfund.gov.ph
- PDPA (RA 10173) compliance requirements for PII in construction SaaS — NPC guidance

---

*Research completed: 2026-03-24*
*Ready for roadmap: yes*
