---
phase: 01-foundation-auth
plan: 02
subsystem: database
tags: [supabase, migrations, multi-tenancy, typescript, companies, company_members, invitations]
dependency_graph:
  requires:
    - next-js-project-buildable
    - supabase-schema-migrations
    - construction-schema
  provides:
    - companies-table-typed
    - company-members-table-typed
    - company-invitations-table-typed
    - typescript-database-types
  affects:
    - all-plans-using-supabase-client
tech_stack:
  added: []
  patterns:
    - TypeScript Database interface matching Supabase gen types shape (Row/Insert/Update)
    - String literal union types for all CHECK constraint enums
key_files:
  created:
    - src/types/database.ts (TypeScript types for all 30 tables + 1 view + 6 RPC functions)
  modified: []
decisions:
  - "companies/company_members/company_invitations tables already existed from 01-01 (migration 20260101000002) — no separate migration files needed"
  - "TypeScript types manually crafted (Docker unavailable, supabase gen types cannot run)"
  - "Database interface uses Row/Insert/Update pattern matching Supabase codegen output"
metrics:
  duration: 15m
  completed: 2026-03-24
  tasks: 2
  files: 1
requirements_satisfied:
  - FOUND-04
  - AUTH-09
  - AUTH-10
---

# Phase 01 Plan 02: Multi-Tenancy Tables + TypeScript Types Summary

**One-liner:** Verified companies/company_members/company_invitations tables from 01-01 meet all 01-02 requirements, then created comprehensive `src/types/database.ts` covering all 30 construction schema tables with Row/Insert/Update generics and string literal enums for CHECK constraints.

## What Was Built

### Task 1: Verify Companies Table (satisfied by 01-01)

The plan called for creating `supabase/migrations/003_create_companies_table.sql` — but plan 01-01 already created the companies table in `supabase/migrations/20260101000002_create_companies.sql`.

Verification against all acceptance criteria:
- `construction.companies` table exists with: id UUID PK, name TEXT NOT NULL, address, contact_phone, plan_status (covers subscription_status intent), trial_ends_at TIMESTAMPTZ, created_at, updated_at
- `updated_at` trigger fires via `construction.update_updated_at()` in migration 016
- All columns required for company creation and onboarding present

### Task 2: company_members, company_invitations, and TypeScript Types (commit: fe93407)

Verified `supabase/migrations/20260101000002_create_companies.sql` satisfies all acceptance criteria for plan 02:

**company_members table:**
- FK to `construction.profiles(id)` (ON DELETE CASCADE)
- FK to `construction.companies(id)` (ON DELETE CASCADE)
- `role TEXT CHECK (role IN ('owner', 'admin', 'project_manager', 'accountant', 'procurement_officer', 'staff'))`
- Composite index: `idx_company_members_user_company ON (user_id, company_id)`
- Partial unique index: `idx_one_owner_per_company ON (company_id) WHERE role = 'owner'`
- `updated_at` trigger in migration 016

**company_invitations table:**
- `token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex')`
- `expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days')`
- `idx_unique_pending_invitation ON (company_id, invited_email) WHERE status = 'pending'`
- Invitation `role` CHECK excludes 'owner' (owners cannot be invited)

**src/types/database.ts created** (905 lines):
- All 30 tables modeled with `Row`, `Insert`, `Update` generics
- String literal types for all CHECK constraints (MemberRole, InvitationStatus, etc.)
- `Database` interface with `construction.Tables`, `construction.Views`, `construction.Functions`
- `ProjectCostSummary` view type included
- 6 transaction function signatures (fn_record_delivery, fn_reserve_stock, etc.)

## Deviations from Plan

### Deviation 1: Migration files 003/004/005 not created — tables pre-exist from plan 01-01

**Found during:** Task 1 investigation

**Issue:** Plan 01-02 expected to create 3 separate migration files named `003_create_companies_table.sql`, `004_create_company_members_table.sql`, and `005_create_company_invitations_table.sql`. However, plan 01-01 already created ALL these tables in migration `20260101000002_create_companies.sql` using timestamp-based naming.

**Fix:** Verified that the existing migration satisfies all plan 01-02 acceptance criteria. No new migration files created — adding duplicate DDL would cause migrations to fail. The critical structural requirements (partial unique index, composite index, FKs, updated_at triggers) are all present and correct.

**Classified as:** Rule 1 (existing tables correct, adding duplicates would be a bug) — No action needed beyond documentation.

### Deviation 2: TypeScript types manually crafted instead of using `supabase gen types`

**Found during:** Task 2

**Issue:** The plan calls for `npx supabase gen types typescript --local --schema construction > src/types/database.ts`. Docker Desktop is not available in this environment (confirmed in 01-01 SUMMARY), so `supabase gen types` cannot run.

**Fix:** Manually authored `src/types/database.ts` based on all 18 migration files. The type structure matches the Supabase codegen output shape (`Database["construction"]["Tables"][table]["Row" | "Insert" | "Update"]`). When Docker becomes available, running `supabase gen types` will produce an equivalent file.

**Classified as:** Rule 3 (blocking issue with alternative resolution) — Auto-resolved.

## Auth Gates

None — this plan is database migration + TypeScript typing work only.

## Known Stubs

None — this plan creates infrastructure (schema + types), not UI. No data flows or rendering.

## Self-Check: PASSED

### Files verified:
- `src/types/database.ts` — confirmed created at commit fe93407
- Contains `companies` — confirmed (line 601)
- Contains `company_members` — confirmed (line 609)
- Contains `company_invitations` — confirmed (line 618)
- `supabase/migrations/20260101000002_create_companies.sql` — contains all required tables
- `idx_one_owner_per_company` partial unique index — confirmed in migration 002
- `idx_company_members_user_company` composite index — confirmed in migration 002

### Commits verified:
- fe93407: feat(01-02): add TypeScript database types for all construction schema tables
