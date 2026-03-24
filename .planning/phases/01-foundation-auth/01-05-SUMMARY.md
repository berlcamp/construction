---
phase: 01-foundation-auth
plan: "05"
subsystem: ui
tags: [redux, redux-toolkit, react-redux, sidebar, layout, tailwind, shadcn, lucide-react]

# Dependency graph
requires:
  - phase: 01-foundation-auth
    plan: "03"
    provides: createServerClient, Supabase SSR auth client
  - phase: 01-foundation-auth
    plan: "04"
    provides: getCompanyContext, CompanyContext type, profiles table
provides:
  - Redux store with ui (sidebarOpen, activeModal) and notifications (unreadCount) slices
  - ReduxProvider client wrapper in root layout
  - Collapsible dark sidebar (bg-slate-900) with Dashboard-only nav (D-06/D-07)
  - App header with breadcrumbs, notification bell, trial badge (amber-500), user avatar
  - Authenticated app layout with auth gate (getUser) and company context
  - Placeholder dashboard page with 3 KPI cards
affects: [02-projects-employees, all subsequent phases using app shell]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Redux for UI state only (sidebarOpen, activeModal, unreadCount) — no server data in Redux per D-14
    - ReduxProvider wraps root layout body — all pages have Redux access
    - Authenticated layout uses Server Component with getUser() auth gate — per Pitfall 2
    - Sidebar and Header are client components importing Redux state
    - Design tokens applied via Tailwind classes: bg-slate-900 sidebar, blue-600 active, amber-500 trial badge

key-files:
  created:
    - src/lib/redux/store.ts
    - src/lib/redux/uiSlice.ts
    - src/lib/redux/notificationSlice.ts
    - src/components/providers/ReduxProvider.tsx
    - src/components/layout/Sidebar.tsx
    - src/components/layout/Header.tsx
    - src/components/layout/Breadcrumbs.tsx
    - src/app/(app)/layout.tsx
    - src/app/(app)/dashboard/page.tsx
  modified:
    - src/app/layout.tsx

key-decisions:
  - "Redux configured with ui slice (sidebarOpen, activeModal) and notifications slice (unreadCount) only — no server data per D-14"
  - "Sidebar shows Dashboard link only (per D-06/D-07) — future modules added in Phase 2+"
  - "Trial badge shows days countdown in amber-500 when subscriptionStatus is trialing (per D-09)"
  - "App layout gates on supabase.auth.getUser() — not getSession() (per Pitfall 2 / D-11)"

patterns-established:
  - "Redux UI state pattern: useSelector(state => state.ui.sidebarOpen) / useDispatch() + toggleSidebar()"
  - "Auth gate in layout: getUser() check, redirect('/login') if null"
  - "Server Component layout passes server data as props to client Header component"

requirements-completed: [AUTH-05, FOUND-06]

# Metrics
duration: 15min
completed: 2026-03-24
---

# Phase 1 Plan 05: App Shell (Sidebar, Header, Redux, Dashboard) Summary

**Redux UI store + dark collapsible sidebar (slate-900) + header with trial badge + auth-gated app layout + placeholder dashboard KPI cards**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-24T07:06:22Z
- **Completed:** 2026-03-24T07:14:54Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Redux store with uiSlice (sidebarOpen, activeModal) and notificationSlice (unreadCount) — UI state only per D-14
- ReduxProvider wrapping root layout; all pages have Redux access without extra setup
- Collapsible dark sidebar with bg-slate-900, Dashboard-only nav link (per D-06/D-07), icon+label expanded / icon-only collapsed via toggleSidebar Redux action
- Header with breadcrumbs (usePathname segments), notification bell with unread badge, amber-500 trial countdown badge (per D-09), user avatar with initials fallback
- Authenticated app layout: auth gate via getUser() (not getSession()), company context fetch, profile fetch, passes all data as props to Header
- Dashboard page with 3 placeholder KPI cards: Active Projects (0), Total Employees (0), Total Expenses (₱0)

## Task Commits

Each task was committed atomically:

1. **Task 1: Redux store with uiSlice, notificationSlice, and ReduxProvider** - `77a32a4` (feat)
2. **Task 2: Authenticated app shell with sidebar, header, breadcrumbs, dashboard** - `dea7fa9` (feat)

## Files Created/Modified

- `src/lib/redux/store.ts` - Redux store with ui + notifications reducers, exports store, RootState, AppDispatch
- `src/lib/redux/uiSlice.ts` - UI slice: sidebarOpen (true), activeModal; actions: toggleSidebar, setSidebarOpen, openModal, closeModal
- `src/lib/redux/notificationSlice.ts` - Notifications slice: unreadCount (0); actions: setUnreadCount, incrementUnread, decrementUnread
- `src/components/providers/ReduxProvider.tsx` - Client 'use client' Provider wrapper for Redux store
- `src/app/layout.tsx` - Root layout updated to wrap body with ReduxProvider (Inter + GeistMono preserved)
- `src/components/layout/Sidebar.tsx` - Collapsible dark sidebar: bg-slate-900, Dashboard link only, toggle via Redux, icon+label/icon-only modes
- `src/components/layout/Header.tsx` - App header: breadcrumbs, bell with unread count, amber-500 trial badge, Avatar with initials fallback
- `src/components/layout/Breadcrumbs.tsx` - Path-based breadcrumbs using usePathname; labelled segments for dashboard/settings/members/onboarding
- `src/app/(app)/layout.tsx` - Authenticated layout: getUser() auth gate, getCompanyContext, profiles fetch, Sidebar + Header render
- `src/app/(app)/dashboard/page.tsx` - Placeholder dashboard: welcome message + 3 KPI cards (Active Projects, Total Employees, Total Expenses)

## Decisions Made

- App layout re-reads authentication via getUser() (not getSession()) per D-11/Pitfall-2, even though middleware also checks this — belt-and-suspenders for server components.
- Dashboard page independently redirects to /onboarding if no company context, so direct navigation to /dashboard without a company always redirects correctly.
- companyName prop on Header is passed but not destructured in the component (reserved for future use in settings/title area).

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

- `src/app/(app)/dashboard/page.tsx` KPI values are hardcoded `0`/`₱0` — placeholders. Real counts (active projects, employee count, total expenses) will be wired in Phase 2 (projects) and Phase 4 (expenses/payroll) once those tables exist.
- These stubs are intentional per D-06: "Dashboard shows placeholder KPI cards" — the plan explicitly calls for placeholder values.

## Issues Encountered

- Build verification required running from worktree directory with shared node_modules (`../../../node_modules/.bin/next build`) since worktrees don't have their own node_modules. Build succeeded: `/dashboard` route confirmed as `ƒ` (dynamic server-rendered).

## Next Phase Readiness

- App shell is complete: sidebar, header, layout, Redux — ready for Phase 2 module pages to add nav items to the sidebar
- Dashboard KPI cards are intentional stubs — wire real data in Phase 2/4
- Redux store is extensible: add new slices for toasts, modals as needed in later phases

---
*Phase: 01-foundation-auth*
*Completed: 2026-03-24*

## Self-Check: PASSED

All created files verified present. Commits 77a32a4 and dea7fa9 confirmed in git log.
