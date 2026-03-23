# Project State

## Project Reference

**What:** Multi-tenant construction management SaaS for PH small-to-medium construction firms (5-50 employees).
**Core Value:** One platform for projects, inventory, procurement, payroll (with PH statutory compliance), employees, and expenses — with company isolation enforced by RLS.
**Stack:** Next.js 16 · Supabase · Redux Toolkit (UI only) · shadcn/ui · Tailwind CSS · Vercel

## Current Position

**Milestone:** v1.0
**Phase:** 0 of 5 — Not started (planning complete)
**Status:** Ready to plan Phase 1

**Progress:** [░░░░░░░░░░] 0%

## Roadmap Summary

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation & Auth | Not started |
| 2 | Projects, Employees & Attendance | Not started |
| 3 | Inventory & Procurement | Not started |
| 4 | Payroll & HR Finance | Not started |
| 5 | Operations, Reports & Launch | Not started |

## Recent Decisions

- **2026-03-24**: Coarse granularity (5 phases), parallel execution, research + plan-check + verifier enabled, balanced model profile
- **2026-03-24**: company_members junction table (not profiles.company_id) for multi-tenant isolation
- **2026-03-24**: PostgreSQL transaction functions for inventory atomicity (fn_record_delivery, fn_reserve_stock, etc.)
- **2026-03-24**: Server-first data flow — Server Components read, Server Actions write, Redux for UI state only
- **2026-03-24**: Google OAuth only; Supabase Auth; `@supabase/ssr` not deprecated auth-helpers
- **2026-03-24**: Realtime on notifications + project_inventory only

## Pending Todos

(none)

## Blockers / Concerns

- **Payroll accuracy**: BIR withholding tax table must match current TRAIN Act brackets (2023+). Verify against official BIR issuances before Phase 4 execution.
- **PhilHealth rate**: Was scheduled to increase progressively; verify current 2025 rate against official PhilHealth circulars before Phase 4.
- **RLS on custom schema**: PostgREST must expose `construction` schema. Test immediately after Phase 1 migrations. Common failure point.

## Session Continuity

Last session: 2026-03-24
Stopped at: New-project flow complete — PROJECT.md, config.json, research (4 files + SUMMARY.md), REQUIREMENTS.md, ROADMAP.md, STATE.md all written. Ready to plan Phase 1.
Resume file: none

Next action: `/gsd:plan-phase 1`
