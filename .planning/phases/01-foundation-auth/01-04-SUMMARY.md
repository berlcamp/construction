---
phase: 01-foundation-auth
plan: "04"
subsystem: auth
tags: [supabase, nextjs, server-actions, onboarding, invitations, multi-tenant]

requires:
  - phase: 01-03
    provides: Google OAuth flow, Supabase server/browser clients, middleware, auth callback route

provides:
  - Company onboarding form (single-step, D-01/D-02) creating company + owner membership + 14-day trial
  - createCompany server action with proper schema fields (plan_status, contact_phone, slug)
  - Invite link route validating token and redirecting to Google OAuth with invite_token param
  - acceptInvitation function creating company_members record after OAuth callback
  - Updated auth/callback route calling acceptInvitation when invite_token present
  - Updated login page passing invite_token through OAuth redirectTo
  - Invitation error page for not_found, expired, already_used tokens
  - Settings/members page (Server Component) with member list and invite form
  - createInvitation server action (owner/admin only) creating invitation and returning invite URL

affects:
  - phase 05 (app shell/dashboard will use company context)
  - all future phases requiring getCompanyContext

tech-stack:
  added: []
  patterns:
    - Server Action with useActionState (React 19) for form submissions
    - Route handler for invite link validation and redirect
    - Separate profile and member queries instead of join (avoids TypeScript type issues with custom schema)
    - SupabaseClient<Database, 'construction'> for proper TypeScript schema resolution

key-files:
  created:
    - src/app/(app)/onboarding/page.tsx
    - src/app/(app)/onboarding/actions.ts
    - src/app/invite/[token]/route.ts
    - src/lib/auth/acceptInvitation.ts
    - src/app/invite/error/page.tsx
    - src/app/(app)/settings/members/page.tsx
    - src/app/(app)/settings/members/actions.ts
    - src/app/(app)/settings/members/members-client.tsx
  modified:
    - src/app/(auth)/auth/callback/route.ts
    - src/app/(auth)/login/page.tsx
    - src/lib/auth/getCompanyContext.ts
    - src/lib/supabase/server.ts
    - src/types/database.ts

key-decisions:
  - "slug generated client-side using name + 6-char random suffix (no DB unique constraint retry needed for MVP)"
  - "TypeScript: interfaces converted to type aliases in database.ts; Relationships: [] added to all tables; SupabaseClient<Database, 'construction'> used throughout"
  - "getCompanyContext uses two separate queries (members + companies) instead of join — avoids Relationships type issues"
  - "Settings/members page uses separate profiles query (not join) for the same reason"

patterns-established:
  - "Server Action signature: (prevState, formData) => Promise<{error?:..., ...}> for useActionState compatibility"
  - "Supabase client schema: always use SupabaseClient<Database, 'construction'> for typed queries"
  - "Invitation flow: /invite/[token] validates token → redirects to /login?invite_token=X → OAuth → /auth/callback calls acceptInvitation"

requirements-completed: [AUTH-04, AUTH-07, AUTH-08, AUTH-09]

duration: 11min
completed: "2026-03-24"
---

# Phase 1 Plan 4: Onboarding & Invitation System Summary

**Company onboarding with 14-day trial, complete invitation flow via Google OAuth, and settings/members management for multi-tenant user addition**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-24T06:50:23Z
- **Completed:** 2026-03-24T07:01:45Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- Single-step company creation form atomically inserts company (with slug, owner_id, plan_status='trial') and owner membership, then redirects to /dashboard
- Complete invite link flow: token validation → Google OAuth with invite_token param → callback accepts invitation → company_members record created with assigned role
- Settings/members page allows owner/admin to invite team members with role assignment and view current members + pending invitations
- TypeScript fully type-safe with Supabase custom construction schema

## Task Commits

Each task was committed atomically:

1. **Task 1: Company onboarding form and createCompany server action** - `9b956c2` (feat)
2. **Task 2: Invitation flow (invite route, accept logic, error page) and settings/members page** - `7b438ec` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/app/(app)/onboarding/actions.ts` - createCompany server action with 14-day trial and owner membership
- `src/app/(app)/onboarding/page.tsx` - Single-step onboarding form using useActionState (React 19)
- `src/app/invite/[token]/route.ts` - Validates invite token, redirects to Google OAuth with invite_token
- `src/lib/auth/acceptInvitation.ts` - Creates company_members record after OAuth with assigned role
- `src/app/invite/error/page.tsx` - Error page for not_found, expired, already_used tokens
- `src/app/(app)/settings/members/page.tsx` - Server Component fetching members and invitations
- `src/app/(app)/settings/members/actions.ts` - createInvitation server action (owner/admin only)
- `src/app/(app)/settings/members/members-client.tsx` - Client component with invite form and copy-link button
- `src/app/(auth)/auth/callback/route.ts` - Updated to call acceptInvitation when invite_token present
- `src/app/(auth)/login/page.tsx` - Updated to pass invite_token through OAuth redirectTo (Suspense boundary)
- `src/lib/auth/getCompanyContext.ts` - Fixed to use plan_status (not subscription_status), two-query approach
- `src/lib/supabase/server.ts` - Added 'construction' schema generic for TypeScript resolution
- `src/types/database.ts` - Converted interfaces to types, added Relationships: [] to all tables

## Decisions Made

- Generated company slug client-side (name slugified + 6-char random suffix) — no DB-level collision retry needed for MVP scale
- Used two separate queries in `getCompanyContext` and members page (rather than joins) to avoid TypeScript's `SelectQueryError` on custom schema without Relationships definitions
- Invitation email sending deferred to future plan (TODO comment in createInvitation) — invite URL is returned to owner for manual sharing

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed wrong field names in createCompany (subscription_status, phone)**
- **Found during:** Task 1 (Company onboarding)
- **Issue:** Plan used `subscription_status: 'trialing'` and `phone` but actual schema has `plan_status: 'trial'` and `contact_phone`. Also missing required `slug` and `owner_id` fields.
- **Fix:** Used correct field names from database.ts schema; added slug generation and owner_id assignment
- **Files modified:** src/app/(app)/onboarding/actions.ts
- **Committed in:** 9b956c2 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed getCompanyContext.ts wrong field name and join type error**
- **Found during:** Task 1 (build verification)
- **Issue:** Used `subscription_status` in select (field doesn't exist, should be `plan_status`), causing `never` type on join result
- **Fix:** Switched to two separate queries; corrected field name to `plan_status`
- **Files modified:** src/lib/auth/getCompanyContext.ts
- **Committed in:** 9b956c2 (Task 1 commit)

**3. [Rule 1 - Bug] Fixed TypeScript database types causing `never` Insert types**
- **Found during:** Task 1 (build verification)
- **Issue:** `export interface` declarations in database.ts are not assignable to `Record<string, unknown>` required by Supabase's `GenericTable.Row`, causing all `.insert()` calls to fail TypeScript with `never` argument type
- **Fix:** Converted all `export interface X {` to `export type X = {` in database.ts; added `Relationships: []` to all table definitions (required by GenericTable); added `'construction'` schema generic to createServerClient
- **Files modified:** src/types/database.ts, src/lib/supabase/server.ts
- **Committed in:** 9b956c2 (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 - Bug)
**Impact on plan:** All fixes required for correctness. Schema field corrections prevent runtime errors; TypeScript fixes enable type safety across all Supabase queries in this and future phases.

## Issues Encountered

- Supabase TypeScript's `GenericSchema` requires table Row types to satisfy `Record<string, unknown>`. TypeScript `interface` declarations do not satisfy this constraint (unlike `type` aliases). This is a known TypeScript subtlety — interfaces can be merged/augmented so they don't have implicit index signatures. Converting to `type` aliases resolved this for all 32 type definitions.

## Next Phase Readiness

- Onboarding and invitation flows are complete and buildable
- `getCompanyContext` now uses correct schema fields (`plan_status`) and is properly typed
- TypeScript compilation fully passes — no errors
- Plan 05 (app shell/dashboard) can use `getCompanyContext` to display company info and trial badge

## Self-Check: PASSED

- FOUND: src/app/(app)/onboarding/page.tsx
- FOUND: src/app/(app)/onboarding/actions.ts
- FOUND: src/app/invite/[token]/route.ts
- FOUND: src/lib/auth/acceptInvitation.ts
- FOUND: src/app/invite/error/page.tsx
- FOUND: src/app/(app)/settings/members/page.tsx
- FOUND: src/app/(app)/settings/members/actions.ts
- FOUND: src/app/(app)/settings/members/members-client.tsx
- Commit 9b956c2 exists: feat(01-04): company onboarding form and createCompany server action
- Commit 7b438ec exists: feat(01-04): invitation flow, settings/members page, and auth callback update
- Build: `npm run build` passes with TypeScript type checking

---
*Phase: 01-foundation-auth*
*Completed: 2026-03-24*
