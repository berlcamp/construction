# Phase 1: Foundation & Auth - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Working Next.js app with Google OAuth, company creation, RLS-enforced multi-tenancy, and authenticated app shell. This phase delivers: Google OAuth sign-in, profile auto-creation, company onboarding wizard, user invitation system (with accept page UX), RLS-enforced multi-tenancy via `company_members`, and the authenticated app shell (collapsible sidebar with full nav, header with notification bell + trial badge, breadcrumbs). Nothing else is safe to build until auth and isolation are solid.

</domain>

<decisions>
## Implementation Decisions

### Company Onboarding

- **D-01:** Single-step form (NOT multi-step wizard).
- **D-02:** Fields:
  - Company name (required)
  - Address (optional)
  - Phone (optional)
- **D-03:** After submit → create company + owner membership + trial.
- **D-04:** Redirect to `/dashboard`. No welcome/checklist page.

### Sidebar Navigation

### Sidebar Navigation

- **D-05:** Minimal navigation in Phase 1.
- **D-06:** Only include:
  - Dashboard
- **D-07:** Do NOT render future modules yet (Projects, Inventory, Payroll, etc.).
- **D-08:** Collapsible sidebar toggle still allowed (Redux UI state).

### Invitation Flow

### Invitation Flow

- **D-07:** Invite link → redirect directly to Google OAuth.
- **D-08:** After login:
  - Validate invitation token
  - Create company_members record
  - Redirect to `/dashboard`
- **D-09:** Invalid/expired token → dedicated error page.
- **D-10:** No pre-accept page for MVP.

### Trial Indicator

- **D-09:** 14-day trial indicated by a small badge chip in the app header (next to notification bell): "Trial — X days left". Countdown derived from `companies.trial_ends_at`. Badge disappears when subscription becomes active. Non-intrusive; no banner or modal.

### Plan Structure (revised 2026-03-24 — replanning for small, safe execution)

- **D-PS-01:** Phase 1 is split into 5 small plans — each focused on a single concern. DO NOT combine into large plans.
- **D-PS-02:** Plan 1: Supabase project setup + `profiles` table + profile auto-creation trigger only.
- **D-PS-03:** Plan 2: `companies` table + `company_members` table only (no RLS yet).
- **D-PS-04:** Plan 3: Google OAuth + auth flow (Supabase clients, middleware, callback route, login page).
- **D-PS-05:** Plan 4: Company onboarding flow (single-step form, create company + membership + trial, redirect to /dashboard).
- **D-PS-06:** Plan 5: Basic dashboard + app layout (sidebar with Dashboard only, header with trial badge, breadcrumbs, Redux UI state).
- **D-PS-07:** RLS policies are OUT of Phase 1 — deferred to a later phase/plan.
- **D-PS-08:** Transaction functions (PL/pgSQL) are OUT of Phase 1 — deferred to a later phase/plan.
- **D-PS-09:** Only create the tables needed for auth/onboarding in Phase 1 (profiles, companies, company_members, company_invitations). All other schema tables are deferred.

### Locked Decisions (from project setup — do not re-discuss)

- **D-10:** Google OAuth only — no email/password sign-in. Supabase Auth handles OAuth.
- **D-11:** `@supabase/ssr` (not deprecated `auth-helpers-nextjs`) for cookie-based session management. Always use `supabase.auth.getUser()` for authorization, never `getSession()`.
- **D-12:** Server-first data flow: Server Components read via Supabase server client, Server Actions handle all writes. No client-side Supabase queries for CRUD.
- **D-13:** `company_members` junction table is the tenancy source of truth (not `profiles.company_id`). RLS policies derive company/role from this table.
- **D-14:** Redux for UI state only — sidebar open/close, active modal, toast queue, realtime notification count. No server data in Redux.
- **D-15:** Design tokens: Dark Slate-900 sidebar, white content area, Blue-600 primary, Amber-500 accent, Inter font, 0.5rem border radius.

### Claude's Discretion

- Exact routing structure for onboarding (`/onboarding`, `/onboarding/step-1`, or single route with step state) — Claude chooses based on Next.js App Router best practices.
- Middleware matcher pattern (which routes are protected vs public) — follow current Supabase SSR docs exactly.
- Zod schema field names and validation messages — follow project conventions once established.
- shadcn/ui component selection for individual UI elements (Button variants, Input styling, etc.) — use standard shadcn defaults unless design tokens override.

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements

- `.planning/REQUIREMENTS.md` §Foundation & Database (FOUND-01–06) — all 25+ tables, RLS, PostgreSQL functions, schema setup
- `.planning/REQUIREMENTS.md` §Authentication & Multi-Tenancy (AUTH-01–10) — complete auth and multi-tenancy requirements

### Architecture & Patterns

- `.planning/research/ARCHITECTURE.md` — middleware pattern, Server Component/Action patterns, RLS policy structure, build order dependency graph
- `.planning/research/STACK.md` — exact library versions, peer dependency constraints, anti-patterns to avoid (TanStack Query, SWR, Prisma, auth-helpers-nextjs)

### Critical Pitfalls (Phase 1 must address all of these)

- `.planning/research/PITFALLS.md` — Pitfall 1 (RLS on custom schema never fires), Pitfall 2 (getSession vs getUser), Pitfall 3 (middleware cookie passthrough), Pitfall 6 (cross-tenant Storage leakage), Pitfall 7 (service role in Server Actions)

### Project Context

- `.planning/research/SUMMARY.md` §Phase 1: Foundation, Auth, and Multi-Tenancy — rationale and deliverables summary
- `.planning/PROJECT.md` — vision, constraints, and key decisions (server-first architecture, company_members design)

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- None — project starts from scratch. Phase 1 establishes all foundational patterns.

### Established Patterns

- None yet — Phase 1 defines: Server Component data fetch pattern, Server Action write pattern, Supabase client instantiation, RLS policy structure, Redux store structure.

### Integration Points

- Phase 1 creates the authentication boundary that every subsequent phase sits behind.
- Sidebar nav structure built in Phase 1 is the shell that Phase 2–5 modules plug into (just enable the disabled nav items).
- `company_members` RLS pattern established here is reused verbatim in every subsequent phase's table policies.
- Redux store UI slices (sidebar, modal, toasts) are created here and imported in later phases.

</code_context>

<specifics>
## Specific Ideas

- Sidebar uses a previewed layout: icon + label in expanded state, icon-only in collapsed state (user confirmed the preview mockup).
- Invitation flow: invite link redirects directly to Google OAuth — no pre-accept display page (D-10 confirmed).
- Header layout confirmed: `[Breadcrumbs] ... [🔔 Notification Bell] [Trial — X days] [👤 User Avatar]`
- No welcome/checklist page after onboarding — straight to `/dashboard`.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

_Phase: 01-foundation-auth_
_Context gathered: 2026-03-24_
