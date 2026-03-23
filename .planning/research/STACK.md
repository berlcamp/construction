# Stack Research

**Domain:** Multi-tenant construction management SaaS (Philippines market)
**Researched:** 2026-03-24
**Confidence:** HIGH (core stack decided; supporting libs verified via npm registry)

---

## Recommended Stack

### Core Technologies (Decided — Do Not Change)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.2.1 | Full-stack React framework | App Router + Server Components + Server Actions = server-first data flow without a separate API layer. RSC eliminates client-side data fetching boilerplate. |
| React | 19.2.4 | UI runtime | Ships with Next.js 16. React 19 concurrent features improve perceived performance for data-heavy dashboards. |
| Supabase JS | 2.100.0 | Database, auth, storage, realtime client | Single SDK covers Postgres queries, Google OAuth, file storage, and realtime subscriptions. No separate auth service needed. |
| @supabase/ssr | 0.9.0 | Supabase cookie-based auth for Next.js | Handles session management with Next.js middleware. Required for Server Components to access auth state. Replaces deprecated `auth-helpers-nextjs`. |
| Redux Toolkit | 2.11.2 | UI state only (sidebar, modals, toasts) | Decided. Not used for server data — only transient UI state that doesn't belong in URL params or React local state. |
| react-redux | 9.2.0 | React bindings for Redux | Ships with RTK. Required to connect Redux store to React component tree. |
| Tailwind CSS | 4.2.2 | Utility-first CSS | Tailwind v4 uses CSS-first configuration (no tailwind.config.js). Pairs with shadcn/ui natively. |
| shadcn/ui (CLI) | 4.1.0 | Component library scaffolding | Not a package — a CLI that copies components into your repo. Gives full ownership of component code. Built on Radix UI primitives + Tailwind. |
| TypeScript | 6.0.2 | Type safety | TS 6 ships with improved inference. Required for Supabase generated types and safe Server Action signatures. |

### Supporting Libraries — Form Handling

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-hook-form | 7.72.0 | Client-side form state management | Every form in the app. Minimal re-renders, built for uncontrolled inputs. Works with Server Actions via the `action` prop + `useFormState` (React 19). |
| @hookform/resolvers | 5.2.2 | Bridge between RHF and Zod | Always pair with react-hook-form. Connects Zod schemas to RHF validation. |
| zod | 4.3.6 | Schema definition and validation | Define validation once, use on both client (RHF resolver) and server (Server Action input parsing). Source of truth for all data shapes. |

**Pattern for this project:** Define Zod schema → use as RHF resolver on client → re-parse same schema in Server Action on server. Never trust client input in server actions.

### Supporting Libraries — Data Display

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-table | 8.21.3 | Headless data table | All data tables (inventory, employees, POs, payroll). Handles sorting, filtering, pagination logic headlessly — shadcn/ui DataTable wraps it for styling. |
| recharts | 3.8.0 | Charts | Dashboard KPI charts, budget vs actual, expense trends. Pure React, works in Client Components. Good enough for construction management dashboards — not a business intelligence tool. |
| @tanstack/react-virtual | 3.13.23 | List virtualization | Large inventory lists (500+ materials), audit log tables. Use only when row count exceeds ~200 rows visible at once. |

### Supporting Libraries — Date Handling

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 4.1.0 | Date manipulation and formatting | All date arithmetic (payroll period calculations, attendance ranges, equipment maintenance schedules). Tree-shakeable, no global state, works in Server Components. |
| react-day-picker | 9.14.0 | Date picker UI | shadcn/ui's Calendar and DatePicker components are built on react-day-picker v9. Use shadcn Calendar wrapper, not react-day-picker directly. |

**Do NOT use:** `dayjs` (duplicate of date-fns with worse tree-shaking), `moment.js` (deprecated, 300kb+), `luxon` (overkill for this use case).

### Supporting Libraries — File Upload

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-dropzone | 15.0.0 | Drag-and-drop file upload UI | Expense receipt uploads, document storage (blueprints, permits, contracts). shadcn/ui does not include a file upload component — use react-dropzone with custom styling. Upload to Supabase Storage directly from client using signed URLs, or via Server Action. |

**Pattern:** Client calls Server Action to get a Supabase Storage signed upload URL → client uploads directly to Storage (bypasses Vercel's 4.5MB body limit) → Server Action records the storage path in the database.

### Supporting Libraries — Notifications / Toast

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | 2.0.7 | Toast notifications | Mutation success/error feedback (form submissions, approvals, PO status changes). shadcn/ui's `<Toaster>` component uses sonner under the hood since shadcn v2. Do not add a separate toast library. |

### Supporting Libraries — URL State

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nuqs | 2.8.9 | Type-safe URL search params | Table filters, pagination state, active tab state that should survive page refresh. Use instead of useState for any filter/tab/search state that benefits from shareability. Supports Next.js App Router natively. |

### Supporting Libraries — Email

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| resend | 6.9.4 | Transactional email sending | User invitation emails (the primary email trigger in this project). Supabase Auth handles its own email (magic links) — Resend is for app-level emails like company invites, payroll summaries. |

### Supporting Libraries — PDF / Export

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jspdf | 4.2.1 | PDF generation client-side | Payroll slips, project cost summary reports, purchase order PDFs for printing. Run in Client Component (browser-only API). |
| papaparse | 5.5.3 | CSV parsing and generation | Bulk data import (employee roster, materials catalog) and CSV export for reports. Runs in browser or Node.js. |

**Note:** For complex reports with tables/layouts, consider server-side PDF via `@react-pdf/renderer` (react-pdf 10.4.1). For simple slips, jspdf is sufficient.

### Supporting Libraries — Billing

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| stripe | 20.4.1 | Subscription billing | PH-priced subscription plans (Starter ₱1,500 / Pro ₱4,500 / Business ₱9,500). Stripe supports PHP currency. Use Stripe Checkout + webhooks pattern. Do NOT embed card forms directly — use Stripe-hosted checkout to avoid PCI scope. |

**Philippines-specific note:** Stripe is available in the Philippines. Maya (formerly PayMaya) and GCash are popular alternatives but have worse developer experience and SDK maturity. Stick with Stripe for SaaS billing.

### Development Tools

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| TypeScript | 6.0.2 | Type checking | Enable `strict: true`. Use Supabase CLI to generate DB types: `supabase gen types typescript`. |
| ESLint | 10.1.0 | Linting | Use Next.js built-in ESLint config (`eslint-config-next`). |
| Prettier | 3.8.1 | Code formatting | Add `prettier-plugin-tailwindcss` to auto-sort Tailwind classes. |
| Vitest | 4.1.1 | Unit testing | Test payroll computation logic (SSS/PhilHealth/Pag-IBIG/BIR tables), Zod schemas, utility functions. Do NOT use Jest — Vitest is faster and native ESM. |
| Playwright | 1.58.2 | E2E testing | Critical flow smoke tests: auth, company creation, inventory transactions. Use sparingly — focus on flows that involve Postgres RPC functions. |
| Supabase CLI | — | Database migrations, type gen | `npx supabase gen types typescript --schema construction` for type-safe DB access. Run locally with `supabase start`. |

---

## Installation

```bash
# Core (already in Next.js project)
npm install next@16.2.1 react@19.2.4 react-dom@19.2.4

# Supabase
npm install @supabase/supabase-js@2.100.0 @supabase/ssr@0.9.0

# Redux
npm install @reduxjs/toolkit@2.11.2 react-redux@9.2.0

# Form handling
npm install react-hook-form@7.72.0 @hookform/resolvers@5.2.2 zod@4.3.6

# Data display
npm install @tanstack/react-table@8.21.3 recharts@3.8.0 @tanstack/react-virtual@3.13.23

# Date handling
npm install date-fns@4.1.0

# File upload
npm install react-dropzone@15.0.0

# Notifications
npm install sonner@2.0.7

# URL state
npm install nuqs@2.8.9

# Email
npm install resend@6.9.4

# PDF / export
npm install jspdf@4.2.1 papaparse@5.5.3

# Billing
npm install stripe@20.4.1

# Dev dependencies
npm install -D typescript@6.0.2 eslint@10.1.0 prettier@3.8.1 prettier-plugin-tailwindcss vitest@4.1.1 @playwright/test@1.58.2
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| react-hook-form | Formik | Never for new projects — Formik is larger, slower, and less maintained |
| react-hook-form | Next.js native `useFormState` only | Only for simple 2-3 field forms with no client-side validation needed |
| zod | yup | Never for new projects — Zod has better TS inference and is actively developed; yup types are weaker |
| @tanstack/react-table | AG Grid | AG Grid Community for very large datasets (10k+ rows with complex filtering). Overkill for this project's scale. |
| recharts | Chart.js | Chart.js is fine but has worse React integration. Recharts is React-native. |
| recharts | Victory | Victory has worse performance on dashboards with multiple charts. |
| date-fns | dayjs | dayjs has a smaller bundle but worse TypeScript support and mutability footguns. date-fns v4 is tree-shakeable enough. |
| sonner | react-hot-toast | sonner is the shadcn/ui default. react-hot-toast is a fine library but mixing toast libraries creates style conflicts. |
| nuqs | custom useState | useState doesn't survive navigation or page refresh. nuqs is type-safe and App Router native. |
| resend | SendGrid | Resend has a simpler API, better DX, and React Email support. SendGrid is enterprise-grade overkill. |
| stripe | Maya/PayMaya | Maya has limited recurring billing support, poor webhook reliability, and weak SDK. Stripe is the right choice for SaaS billing in PH. |
| vitest | Jest | Jest requires additional config for ESM. Vitest is zero-config for Next.js/TypeScript projects. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@supabase/auth-helpers-nextjs` | Deprecated. Replaced by `@supabase/ssr`. Old package breaks with App Router cookie handling. | `@supabase/ssr@0.9.0` |
| `next-auth` / `auth.js` | The project uses Supabase Auth for Google OAuth. Adding NextAuth creates two competing auth systems with token conflicts. | Supabase Auth + `@supabase/ssr` |
| `@tanstack/react-query` (TanStack Query) | The project's architecture is server-first Server Components + Server Actions. TanStack Query is a client-side data cache — it fights the architecture. Mixing it in causes "server vs client" data divergence and double-fetching. | Server Components for reads, Server Actions for mutations, `revalidatePath()` for invalidation |
| `axios` / `node-fetch` in Server Actions | Use the Supabase server client directly. Axios adds a dependency for HTTP when Supabase SDK already handles transport. | `@supabase/supabase-js` server client |
| `moment.js` | 300kb+ bundle, deprecated, uses mutable objects. | `date-fns@4` |
| `react-query` / SWR | Same reason as TanStack Query — client-side data layer fights server-first architecture. | Server Components + `revalidatePath()` |
| Prisma / Drizzle | Project uses Supabase SDK + raw SQL via `supabase.rpc()`. Adding an ORM creates a second database client and conflicts with Supabase RLS (Prisma doesn't respect RLS by default). | Supabase JS client + generated types |
| `react-beautiful-dnd` | Archived/unmaintained. | If drag-and-drop is needed later, use `@dnd-kit/core`. |
| `xlsx` (SheetJS community) | The free version (0.18.x) has a license change that restricts commercial SaaS use. | `papaparse` for CSV; buy SheetJS Pro if XLSX export is required |

---

## Stack Patterns by Variant

**For data tables (inventory, employees, POs):**
- Use `@tanstack/react-table` with shadcn/ui DataTable wrapper
- Column definitions in a separate `columns.tsx` file
- Server-side data fetching in Server Component → pass `data` prop to Client Component table
- URL-synced filters via `nuqs`

**For forms (CRUD operations):**
- `react-hook-form` + `zod` resolver for client validation
- Server Action as form action prop
- Re-validate with same Zod schema in Server Action before database write
- `sonner` toast for success/error feedback

**For file uploads (receipts, documents):**
- `react-dropzone` for drag-and-drop UI
- Server Action returns Supabase Storage signed upload URL
- Client uploads directly to Storage (avoids Vercel 4.5MB body limit)
- Server Action then saves storage path to DB

**For realtime (notifications, inventory):**
- Use Supabase Realtime only on `notifications` and `project_inventory` tables (per PROJECT.md)
- Subscribe in Client Components with `useEffect` cleanup
- Keep Redux updated when realtime events arrive (dispatch to notification slice)

**For PH payroll computation:**
- Pure TypeScript functions (no library) — SSS, PhilHealth, Pag-IBIG contribution tables are small lookup tables
- Test these functions with Vitest — they are the most business-critical logic in the app
- Zod schemas for payroll input validation (employee type, gross pay, period)

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `next@16.x` | `react@19.x` | Next.js 16 requires React 19. Check peer deps before adding older component libraries. |
| `tailwindcss@4.x` | shadcn/ui components | Tailwind v4 uses CSS-based config. shadcn/ui CLI 4.x generates v4-compatible components. Confirm shadcn CLI version matches. |
| `@supabase/ssr@0.9.0` | `@supabase/supabase-js@2.x` | Must use together. `@supabase/ssr` is a companion package, not a replacement. |
| `react-hook-form@7.x` | `react@19.x` | RHF 7.72+ supports React 19 concurrent features. |
| `@tanstack/react-table@8.x` | `react@19.x` | TanStack Table v8 is headless and React-version agnostic. |
| `recharts@3.x` | `react@19.x` | Recharts 3.x was rebuilt for React 18/19 with better tree-shaking. |
| `date-fns@4.x` | All | date-fns v4 dropped CommonJS — ESM only. Works fine in Next.js 16 which is ESM-first. |
| `nuqs@2.x` | `next@15+` | nuqs v2 requires Next.js 15+. Confirmed compatible with Next.js 16. |
| `react-redux@9.x` | `@reduxjs/toolkit@2.x` | Always use react-redux and RTK at matching major versions. |
| `jspdf@4.x` | Browser only | jspdf is browser-only. Must run in a Client Component or via `'use client'` boundary. Do not import in Server Components. |
| `stripe@20.x` | Node.js 18+ | Stripe SDK v20 requires Node.js 18+. Vercel's default is Node 20 — compatible. |

---

## Sources

- npm registry (live query, 2026-03-24) — all version numbers verified
- `next@16.2.1` peerDependencies — React 19 requirement confirmed
- PROJECT.md (project context) — stack decisions, constraints, and architecture
- Training data (knowledge cutoff August 2025) — library recommendations, patterns, and rationale | MEDIUM confidence for pattern recommendations
- `@supabase/auth-helpers-nextjs` deprecation — confirmed via package README and Supabase docs history | HIGH confidence
- shadcn/ui sonner integration — shadcn/ui adopted sonner as default toast in 2024 | HIGH confidence
- nuqs v2 Next.js 15+ requirement — confirmed via nuqs changelog and README | HIGH confidence
- Stripe Philippines availability — Stripe has supported PH since 2022 | HIGH confidence
- xlsx license change — SheetJS changed license in 2023 to restrict commercial use of free version | HIGH confidence

---

*Stack research for: Multi-tenant construction management SaaS — Philippines market*
*Researched: 2026-03-24*
