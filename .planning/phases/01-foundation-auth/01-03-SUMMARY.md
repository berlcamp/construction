---
phase: 01-foundation-auth
plan: "03"
subsystem: auth
tags: [supabase, oauth, middleware, authentication, session]
dependency_graph:
  requires: ["01-02"]
  provides: ["auth-flow", "session-management", "route-protection", "company-context"]
  affects: ["all subsequent plans"]
tech_stack:
  added: ["@supabase/ssr"]
  patterns: ["server-client pattern", "middleware cookie passthrough", "company membership routing"]
key_files:
  created:
    - src/lib/supabase/server.ts
    - src/lib/supabase/client.ts
    - src/lib/supabase/middleware.ts
    - src/lib/auth/getCompanyContext.ts
    - src/middleware.ts
    - src/app/(auth)/layout.tsx
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/auth/callback/route.ts
  modified: []
decisions:
  - "Used @supabase/ssr (not deprecated auth-helpers) for all client creation per D-11"
  - "Server client uses async cookies() per Next.js 16 App Router requirements"
  - "Middleware uses exact cookie reassignment pattern to prevent session loss (Pitfall 12)"
  - "getUser() used everywhere instead of getSession() to validate against server per Pitfall 3"
  - "Login page has Google OAuth only (no email/password) per D-10"
  - "Callback route checks company_members and routes to /onboarding or /dashboard per AUTH-03"
metrics:
  duration: "~1 minute"
  completed_date: "2026-03-24"
  tasks_completed: 2
  files_created: 8
---

# Phase 01 Plan 03: Google OAuth Auth Flow Summary

Google OAuth authentication flow with Supabase SSR helpers, Next.js middleware session refresh, company membership routing, and protected route gateway.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create Supabase client helpers (server, browser, middleware) | 2e7d2a4 | server.ts, client.ts, middleware.ts, getCompanyContext.ts |
| 2 | Create middleware, login page, auth callback, and auth layout | 9dbf23e | middleware.ts, layout.tsx, login/page.tsx, callback/route.ts |

## What Was Built

**Supabase Client Helpers (Task 1):**

- `src/lib/supabase/server.ts` — Async `createServerClient()` using `@supabase/ssr`, configured with `construction` schema, proper cookie handling for Server Components and Server Actions
- `src/lib/supabase/client.ts` — `createBrowserClient()` for Client Components (Realtime only), configured with `construction` schema
- `src/lib/supabase/middleware.ts` — `refreshSession()` helper implementing exact cookie passthrough pattern from Pitfall 12: response is reassigned in `setAll()` to ensure cookies are propagated
- `src/lib/auth/getCompanyContext.ts` — Resolves company + role by querying `company_members` joined with `companies`; returns `CompanyContext | null`

**Auth Flow (Task 2):**

- `src/middleware.ts` — Protects all routes except `/login`, `/auth/callback`, `/invite`; calls `refreshSession()` on every request for session cookie refresh; redirects unauthenticated users to `/login`
- `src/app/(auth)/layout.tsx` — Centered flex container wrapper for auth pages
- `src/app/(auth)/login/page.tsx` — Google OAuth sign-in only (no email/password per D-10); calls `signInWithOAuth` with `provider: 'google'` and `redirectTo: /auth/callback`
- `src/app/(auth)/auth/callback/route.ts` — Exchanges auth code for session, checks `company_members` for membership; routes to `/onboarding` (no company) or `/dashboard` (has company); handles `invite_token` passthrough

## Verification Results

- `npx tsc --noEmit` — Passed (0 errors)
- `npm run build` — Succeeded (compiled in 1830ms, TypeScript in 1952ms)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all files are fully functional implementations. No placeholder text or hardcoded empty values.

## Self-Check: PASSED

Files exist:
- FOUND: src/lib/supabase/server.ts
- FOUND: src/lib/supabase/client.ts
- FOUND: src/lib/supabase/middleware.ts
- FOUND: src/lib/auth/getCompanyContext.ts
- FOUND: src/middleware.ts
- FOUND: src/app/(auth)/layout.tsx
- FOUND: src/app/(auth)/login/page.tsx
- FOUND: src/app/(auth)/auth/callback/route.ts

Commits exist:
- FOUND: 2e7d2a4 (feat(01-03): create Supabase client helpers and getCompanyContext)
- FOUND: 9dbf23e (feat(01-03): create middleware, login page, auth callback, and auth layout)
