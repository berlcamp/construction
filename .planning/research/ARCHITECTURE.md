# Architecture Research

**Domain:** Multi-tenant construction management SaaS (Philippines market)
**Researched:** 2026-03-24
**Confidence:** HIGH (stack and constraints fully specified in PROJECT.md; patterns drawn from documented Next.js App Router + Supabase conventions)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                              │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Client Components (UI interactions only)                      │ │
│  │  ┌─────────────┐  ┌────────────────┐  ┌──────────────────┐   │ │
│  │  │ Redux Store  │  │ Modal/Sidebar  │  │ Realtime Listener│   │ │
│  │  │ (UI state)   │  │ (open/close)   │  │ (notifications,  │   │ │
│  │  └─────────────┘  └────────────────┘  │  inventory)      │   │ │
│  │                                        └──────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │ HTTP (Server Actions / navigation)
┌──────────────────────────────────▼──────────────────────────────────┐
│                      NEXT.JS SERVER (App Router)                     │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Server Components (primary read path)                        │  │
│  │  app/(dashboard)/[module]/page.tsx                            │  │
│  │  - Fetch data via Supabase server client                      │  │
│  │  - Resolve company context from session                       │  │
│  │  - Pass data as props to Client Components                    │  │
│  └──────────────────────────┬────────────────────────────────────┘  │
│                             │ props                                  │
│  ┌──────────────────────────▼────────────────────────────────────┐  │
│  │  Server Actions (primary write path)                          │  │
│  │  app/(dashboard)/[module]/actions.ts                          │  │
│  │  - Validate input (zod)                                       │  │
│  │  - Verify company membership + role                           │  │
│  │  - Call Supabase (direct or via supabase.rpc())               │  │
│  │  - revalidatePath() to refresh Server Component data          │  │
│  └──────────────────────────┬────────────────────────────────────┘  │
│                             │ Supabase JS (server client)            │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────┐
│                        SUPABASE CLOUD                                │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────────┐ │
│  │  Auth        │  │  Storage     │  │  Realtime                 │ │
│  │  Google OAuth│  │  Documents,  │  │  notifications table      │ │
│  │  Session JWT │  │  receipts,   │  │  project_inventory table  │ │
│  └──────┬───────┘  │  blueprints  │  └───────────────────────────┘ │
│         │          └──────────────┘                                  │
│  ┌──────▼───────────────────────────────────────────────────────┐   │
│  │  PostgreSQL — construction schema                             │   │
│  │                                                               │   │
│  │  ┌────────────────────┐  ┌──────────────────────────────┐   │   │
│  │  │  Tenancy Layer     │  │  RLS Policies                 │   │   │
│  │  │  companies         │  │  auth.uid() → company_members │   │   │
│  │  │  company_members   │  │  → company_id on data tables  │   │   │
│  │  └────────────────────┘  └──────────────────────────────┘   │   │
│  │                                                               │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │   │
│  │  │ Projects │  │Inventory │  │  HR/Pay  │  │ Procure  │    │   │
│  │  │ expenses │  │ materials│  │ employees│  │ suppliers│    │   │
│  │  │ equipment│  │ transfers│  │ payroll  │  │ POs      │    │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │   │
│  │                                                               │   │
│  │  ┌───────────────────────────────────────────────────────┐   │   │
│  │  │  Transaction Functions (PostgreSQL)                    │   │   │
│  │  │  fn_record_delivery  fn_reserve_stock                  │   │   │
│  │  │  fn_fulfill_reservation  fn_complete_transfer          │   │   │
│  │  │  fn_report_waste  fn_cancel_reservation                │   │   │
│  │  └───────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| Server Components (page.tsx) | Fetch + render initial data, no interactivity | Supabase server client (reads), passes props to Client Components |
| Server Actions (actions.ts) | Handle all mutations, authorization check, cache revalidation | Supabase server client, revalidatePath(), zod schemas |
| Client Components | UI interactivity — forms, modals, dropdowns, tables with sort/filter | Redux store (UI state only), calls Server Actions via form action or useTransition |
| Redux Store | UI state only — sidebar open/close, active modal, toast queue, optimistic UI flags | Client Components dispatch/subscribe |
| Supabase Auth | Google OAuth flow, JWT session management, session cookies via SSR helpers | Next.js middleware (session refresh), Server Components (getUser) |
| Supabase RLS | Enforce company_id isolation at the DB layer for all reads and writes | company_members junction table, auth.uid() |
| PostgreSQL Transaction Functions | Atomic multi-step inventory operations that cannot be expressed in single SQL statements | Called via supabase.rpc() from Server Actions |
| Supabase Realtime | Push notifications and inventory changes to subscribed clients | Client Components subscribe to specific channels, scoped by company_id |
| Supabase Storage | File uploads for documents, expense receipts, blueprints | Server Actions generate signed URLs; Client Components use upload client |
| Next.js Middleware | Session refresh on every request, redirect unauthenticated users | Supabase SSR helpers, cookies |

---

## Recommended Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx              # Google OAuth entry point
│   │   └── auth/
│   │       └── callback/
│   │           └── route.ts          # Supabase OAuth callback handler
│   ├── (dashboard)/
│   │   ├── layout.tsx                # Auth gate, company resolver, sidebar shell
│   │   ├── page.tsx                  # Dashboard KPI cards, recent activity
│   │   ├── projects/
│   │   │   ├── page.tsx              # Projects list (Server Component)
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx          # Project detail
│   │   │   └── actions.ts            # createProject, updateProject, deleteProject
│   │   ├── inventory/
│   │   │   ├── page.tsx
│   │   │   ├── [projectId]/
│   │   │   │   └── page.tsx
│   │   │   └── actions.ts            # recordDelivery → fn_record_delivery, reserveStock, etc.
│   │   ├── procurement/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   └── actions.ts            # createPO, approvePO, recordDelivery
│   │   ├── employees/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   └── actions.ts
│   │   ├── attendance/
│   │   │   ├── page.tsx
│   │   │   └── actions.ts
│   │   ├── payroll/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   └── actions.ts            # computePayroll (PH statutory deductions)
│   │   ├── expenses/
│   │   │   ├── page.tsx
│   │   │   └── actions.ts
│   │   ├── equipment/
│   │   │   ├── page.tsx
│   │   │   └── actions.ts
│   │   ├── documents/
│   │   │   ├── page.tsx
│   │   │   └── actions.ts            # uploadDocument, getSignedUrl
│   │   ├── reports/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   ├── company/
│   │   │   │   └── page.tsx
│   │   │   ├── members/
│   │   │   │   └── page.tsx
│   │   │   └── billing/
│   │   │       └── page.tsx
│   │   └── notifications/
│   │       └── page.tsx
│   ├── api/
│   │   └── webhooks/
│   │       └── billing/
│   │           └── route.ts          # Subscription billing webhook
│   └── layout.tsx                    # Root layout, Redux Provider, fonts
├── components/
│   ├── ui/                           # shadcn/ui primitives (Button, Input, Dialog, etc.)
│   ├── layout/
│   │   ├── Sidebar.tsx               # Client Component, reads Redux for open state
│   │   ├── Header.tsx
│   │   └── Breadcrumbs.tsx
│   ├── shared/
│   │   ├── DataTable.tsx             # Reusable sortable/filterable table
│   │   ├── StatusBadge.tsx
│   │   ├── CurrencyDisplay.tsx       # Philippine Peso formatting
│   │   ├── FileUpload.tsx
│   │   └── ConfirmDialog.tsx
│   ├── notifications/
│   │   └── NotificationBell.tsx      # Realtime subscriber
│   └── [module]/                     # Module-specific Client Components
│       └── [Feature]Form.tsx
├── lib/
│   ├── supabase/
│   │   ├── server.ts                 # createServerClient (Server Components + Actions)
│   │   ├── client.ts                 # createBrowserClient (Client Components — Realtime only)
│   │   └── middleware.ts             # Session refresh helper
│   ├── auth/
│   │   └── getCompanyContext.ts      # Resolve user → company_id + role from company_members
│   ├── payroll/
│   │   ├── sss.ts                    # SSS contribution table + computation
│   │   ├── philhealth.ts             # PhilHealth 5% split computation
│   │   ├── pagibig.ts                # Pag-IBIG ₱100/₱100 rule
│   │   └── bir.ts                   # BIR withholding tax table
│   ├── validations/
│   │   └── [module].schema.ts        # Zod schemas per module
│   └── utils.ts
├── store/
│   ├── index.ts                      # Redux store setup (RTK)
│   └── slices/
│       ├── uiSlice.ts                # sidebar, modal, toast state
│       └── notificationsSlice.ts     # unread count, realtime feed
├── types/
│   ├── database.ts                   # Supabase-generated types from construction schema
│   └── [module].ts                   # Domain types
└── middleware.ts                     # Next.js middleware — session refresh + auth redirect
```

### Structure Rationale

- **app/(dashboard)/[module]/actions.ts:** Co-locating Server Actions with their route means mutations live next to the pages that use them. Single file per module keeps authorization logic concentrated — every action can call `getCompanyContext()` at the top.
- **lib/supabase/server.ts vs client.ts:** Hard separation prevents accidentally using the browser client for CRUD reads (which would bypass RLS enforcement via the session cookie path). Server client uses cookies; browser client is only for Realtime subscriptions.
- **lib/payroll/:** PH statutory deduction logic is pure computation — isolated here so it can be unit-tested independently of the DB layer. No Supabase calls inside these files.
- **store/slices/:** Redux strictly limited to UI state slices. No data fetching, no async thunks. This is enforced by convention — if a slice would store API data, it should not exist.
- **types/database.ts:** Generated from Supabase CLI (`supabase gen types typescript --schema construction`). Never hand-written. The construction schema alias means the generated type namespace is clean.

---

## Architectural Patterns

### Pattern 1: Server Component as Data Gateway

**What:** A Server Component (page.tsx) acts as the data gateway — it fetches all data needed for a view, then passes it down as props. No child component reaches back to the database.

**When to use:** All primary read paths — project lists, inventory views, payroll summaries, employee directories.

**Trade-offs:** Pro: Single point of control for data access per route; co-located auth check; no client-side loading spinners for page data. Con: Full page re-render on revalidate; no partial streaming for deeply nested data without Suspense boundaries.

**Example:**
```typescript
// app/(dashboard)/inventory/[projectId]/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import { getCompanyContext } from '@/lib/auth/getCompanyContext'

export default async function InventoryPage({
  params,
}: {
  params: { projectId: string }
}) {
  const supabase = await createServerClient()
  const { companyId, role } = await getCompanyContext(supabase)

  const { data: inventory } = await supabase
    .schema('construction')
    .from('project_inventory')
    .select('*, materials_catalog(*)')
    .eq('project_id', params.projectId)
    .eq('company_id', companyId)

  return <InventoryTable inventory={inventory} role={role} />
}
```

### Pattern 2: Server Action with Authorization Check

**What:** Every Server Action re-derives company context from the session (never trusts client-supplied company_id) before performing mutations.

**When to use:** All writes — creates, updates, deletes, status transitions, file uploads.

**Trade-offs:** Pro: Defense-in-depth — RLS enforces isolation at DB but the action also validates membership+role explicitly, giving clear error messages. Con: Slightly more boilerplate per action. Accept this cost — the alternative (trusting client input) is a security gap.

**Example:**
```typescript
// app/(dashboard)/inventory/actions.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getCompanyContext } from '@/lib/auth/getCompanyContext'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const ReserveStockSchema = z.object({
  materialId: z.string().uuid(),
  projectId: z.string().uuid(),
  quantity: z.number().positive(),
  phaseLabel: z.string().optional(),
})

export async function reserveStock(formData: FormData) {
  const supabase = await createServerClient()
  const { companyId, role } = await getCompanyContext(supabase)

  if (!['owner', 'admin', 'project_manager'].includes(role)) {
    throw new Error('Insufficient permissions')
  }

  const input = ReserveStockSchema.parse(Object.fromEntries(formData))

  const { error } = await supabase.rpc('fn_reserve_stock', {
    p_company_id: companyId,
    p_material_id: input.materialId,
    p_project_id: input.projectId,
    p_quantity: input.quantity,
    p_phase_label: input.phaseLabel ?? null,
  })

  if (error) throw new Error(error.message)

  revalidatePath(`/inventory/${input.projectId}`)
}
```

### Pattern 3: PostgreSQL Transaction Functions for Inventory Atomicity

**What:** Multi-step inventory operations (record delivery, fulfill reservation, transfer between projects) are encapsulated in PostgreSQL functions. The JS layer calls `supabase.rpc('fn_name', params)` — a single network round-trip that either fully succeeds or rolls back.

**When to use:** Any operation that modifies multiple rows and must be consistent — delivery recording (PO line items + inventory stock + delivery log), stock transfers (debit source project + credit destination project + transfer log), waste reporting (stock reduction + waste log entry).

**Trade-offs:** Pro: True atomicity without Supabase JS transaction emulation hacks. Logic lives in DB where it belongs for inventory consistency. Con: Business logic split across TypeScript and PostgreSQL; function bodies need testing via pgTAP or equivalent. Migrations carry the functions — must keep in sync with application code.

**Example:**
```typescript
// Atomic delivery recording — single RPC call
const { data, error } = await supabase.rpc('fn_record_delivery', {
  p_company_id: companyId,
  p_po_id: poId,
  p_delivery_items: [
    { material_id: 'uuid-1', quantity_delivered: 50, unit_cost: 120.00 },
    { material_id: 'uuid-2', quantity_delivered: 20, unit_cost: 450.00 },
  ],
  p_delivered_by: userId,
  p_delivery_date: new Date().toISOString(),
})
```

### Pattern 4: RLS via Junction Table (company_members)

**What:** All RLS policies check `auth.uid()` against the `construction.company_members` table to resolve company_id and role — not a `company_id` column on the user profile. This means the auth layer is the source of truth for tenancy.

**When to use:** Every table in the construction schema that stores company-scoped data (which is all of them).

**Trade-offs:** Pro: Clean separation — user can theoretically belong to multiple companies in future versions. Pro: Role changes take effect immediately via RLS without touching data rows. Con: Every RLS policy does a subquery against company_members — needs a composite index on `(user_id, company_id)` to stay performant.

**Example:**
```sql
-- RLS policy pattern used on all data tables
CREATE POLICY "company_isolation" ON construction.projects
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM construction.company_members
      WHERE user_id = auth.uid()
    )
  );

-- Role-gated write policy
CREATE POLICY "manager_can_create_projects" ON construction.projects
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM construction.company_members
      WHERE user_id = auth.uid()
        AND company_id = NEW.company_id
        AND role IN ('owner', 'admin', 'project_manager')
    )
  );
```

---

## Data Flow

### Read Flow (Server Component)

```
User navigates to /inventory/[projectId]
        ↓
middleware.ts  →  refresh session cookie
        ↓
page.tsx (Server Component, runs on server)
        ↓
createServerClient()  →  reads session from cookie
        ↓
getCompanyContext()   →  SELECT FROM company_members WHERE user_id = auth.uid()
        ↓
supabase.from('project_inventory').select(...)  →  RLS enforces company_id
        ↓
<InventoryTable inventory={data} />  (props passed to Client Component)
        ↓
Client renders — no additional data requests
```

### Write Flow (Server Action)

```
User submits form  →  calls Server Action via form action="" or useTransition
        ↓
Server Action (runs on server)
        ↓
createServerClient()  +  getCompanyContext()
        ↓
Zod schema validation  →  throw on invalid input
        ↓
Role check  →  throw on insufficient permissions
        ↓
supabase.rpc('fn_record_delivery', params)  OR  supabase.from(...).insert(...)
        ↓
RLS policy validates (second layer of defense)
        ↓
revalidatePath('/inventory/[projectId]')
        ↓
Next.js re-fetches Server Component  →  fresh data renders
```

### Realtime Flow (Notifications + Inventory)

```
User loads dashboard  →  Client Component mounts
        ↓
createBrowserClient()  →  Supabase Realtime subscription
        ↓
Channel: notifications:company_id={companyId}
Channel: project_inventory:company_id={companyId}
        ↓
Any INSERT/UPDATE triggers Postgres NOTIFY
        ↓
Supabase Realtime delivers event to subscribed clients
        ↓
Client Component updates Redux notificationsSlice (unread count)
OR re-fetches inventory row without full page reload
```

### State Management Boundary

```
Server State (Next.js cache)
  projects, inventory, employees, payroll, POs, expenses
  → Refreshed by revalidatePath() after mutations
  → Never stored in Redux

UI State (Redux)
  sidebar: { isOpen: boolean }
  modal: { activeModal: string | null, modalProps: any }
  toasts: Toast[]
  notifications: { unreadCount: number, items: Notification[] }
  → Never touches the network
  → Never stores API response data
```

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–100 companies | Current architecture is sufficient. Single Supabase project, Vercel hobby/pro. Focus on correctness, not optimization. |
| 100–1,000 companies | Add DB indexes on `company_id` (all data tables), `(user_id, company_id)` on company_members. Enable Supabase connection pooling (PgBouncer). Add ISR / `revalidate` intervals on high-read pages. Monitor slow query log. |
| 1,000–10,000 companies | Consider Supabase read replicas for reporting queries. Cache payroll computation results (PhilHealth/SSS tables don't change mid-year). Add Redis (Upstash) for rate-limiting invitation flows. Split inventory transaction functions into dedicated schema for easier auditing. |
| 10,000+ companies | Evaluate Supabase Enterprise (dedicated DB compute). Consider extracting payroll computation into a separate service. Add CDN caching for document downloads. Partition audit_logs table by company_id + created_at range. |

### Scaling Priorities

1. **First bottleneck — RLS subquery on company_members:** Every query does a subquery join through company_members. Add a composite index `CREATE INDEX idx_company_members_user_company ON construction.company_members(user_id, company_id)` from day one. Without it, performance degrades linearly with member table size.

2. **Second bottleneck — inventory transaction function contention:** Under high write concurrency (multiple deliveries recording simultaneously for the same project), `fn_record_delivery` may lock inventory rows. Mitigate with advisory locks or row-level locking within the function body. For v1, this is not a concern (SMB construction firms process few concurrent deliveries).

---

## Anti-Patterns

### Anti-Pattern 1: Client-Side Supabase CRUD Queries

**What people do:** Create a `useProjects()` hook that calls `supabase.from('projects').select()` inside a `useEffect` on the client.

**Why it's wrong:** Breaks the server-first data contract. Doubles the code paths for auth. Creates loading flickers. Bypasses Next.js caching. Exposes Supabase URL/anon key usage in client bundles in ways that make RLS the only defense (RLS is correct, but defense in depth is better).

**Do this instead:** Fetch in Server Component (page.tsx), pass as props. The browser client (createBrowserClient) is only for Supabase Realtime subscriptions.

### Anti-Pattern 2: Storing Server Data in Redux

**What people do:** Dispatch `setProjects(data)` after fetching, store the full projects list in a Redux slice, and read it in components via `useSelector`.

**Why it's wrong:** Creates a second source of truth that diverges from the database. After a mutation + revalidatePath(), the Server Component re-renders with fresh data, but Redux still holds stale data. Components that read from Redux show stale state.

**Do this instead:** Redux holds only UI state (sidebar, modals, toasts, realtime notification count). Page data lives in Next.js cache, refreshed by revalidatePath().

### Anti-Pattern 3: Trusting client-supplied company_id in Server Actions

**What people do:** Accept `company_id` as a form field and use it directly in the INSERT statement — `supabase.from('projects').insert({ company_id: formData.get('company_id'), ... })`.

**Why it's wrong:** A malicious user can submit any company_id and insert data into another tenant's namespace. RLS will catch this if policies are written correctly, but it creates confusion and makes authorization logic implicit.

**Do this instead:** Always call `getCompanyContext(supabase)` inside the Server Action. This function reads the session's `auth.uid()`, queries company_members, and returns the authoritative company_id and role. Never trust the client.

### Anti-Pattern 4: Direct Multi-Statement Inventory Updates in JS

**What people do:** Write a Server Action that does `update inventory set quantity = quantity - X`, then `insert into inventory_logs`, then `update po_line_items set received = received + X` — three separate awaited calls.

**Why it's wrong:** If the second or third call fails, the inventory is left in an inconsistent state. Supabase JS client has no multi-statement transaction primitive.

**Do this instead:** Wrap the full operation in a PostgreSQL function (`fn_record_delivery`) called via `supabase.rpc()`. The function runs inside a single DB transaction with `EXCEPTION` handling for rollback.

### Anti-Pattern 5: Custom Schema Without Explicit Type Generation

**What people do:** Use the `construction` schema but forget to pass `--schema construction` to `supabase gen types`. End up with no TypeScript types, or types that only cover the public schema.

**Why it's wrong:** Loses all type safety across the app. Errors surface at runtime instead of compile time.

**Do this instead:** Configure `supabase gen types typescript --schema construction > src/types/database.ts` in package.json scripts. Run on every migration. Commit the generated file.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Auth (Google OAuth) | Next.js middleware refreshes session on every request via `@supabase/ssr`; callback route handles OAuth exchange | Use `@supabase/ssr` package, not deprecated `@supabase/auth-helpers-nextjs` |
| Supabase Storage | Server Actions generate signed upload URLs; Client Components POST directly to Storage; Server Actions record the path in DB | Never proxy file bytes through Next.js server — upload direct to Supabase Storage |
| Supabase Realtime | Browser client subscribes to channel per company_id; presence not used; only POSTGRES_CHANGES events on notifications + project_inventory | Scope channels with filters to avoid cross-tenant leakage: `filter: 'company_id=eq.{companyId}'` |
| Billing provider (subscription) | Webhook route `/api/webhooks/billing` updates subscription status in DB; Server Actions check subscription tier before allowing feature access | Implement as separate phase — not part of core data flow |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Server Component → Client Component | Props (one direction only) | No callbacks from child to parent that fetch data |
| Client Component → Server Action | `form action=""` attribute or `useTransition(() => serverAction(formData))` | Never call Server Actions from inside `useEffect` |
| Server Action → Supabase | Supabase server client (cookie-based session) | Always create fresh client per request, not module-level singleton |
| Server Action → PostgreSQL functions | `supabase.rpc('fn_name', params)` | Params are typed — use generated types or explicit interface |
| Realtime listener → Redux | Dispatch to `notificationsSlice` for unread count updates | Do not dispatch full data payloads — realtime triggers revalidatePath or local state update only |
| Payroll computation → DB | Server Action reads employee + attendance data, calls PH computation functions in `lib/payroll/`, then writes payroll record | PH computation functions are pure TypeScript — no DB calls inside lib/payroll/ |

---

## Build Order Implications

The dependency graph below determines which components must exist before others can be built:

```
1. Foundation (no dependencies)
   └── Supabase schema + migrations (construction schema, company_members, RLS)
   └── Next.js middleware (session refresh)
   └── lib/supabase/server.ts + client.ts
   └── lib/auth/getCompanyContext.ts

2. Auth + Tenancy (depends on: Foundation)
   └── Google OAuth flow (login page, callback route)
   └── Company creation + company_members insertion
   └── User invitation system

3. Core Layout (depends on: Auth + Tenancy)
   └── Dashboard layout.tsx with auth gate
   └── Sidebar (Redux UI state)
   └── Redux store setup (uiSlice)

4. Project Management (depends on: Core Layout)
   └── Projects CRUD + status management
   └── Project member assignment

5. Inventory + Procurement (depends on: Project Management)
   └── Materials catalog CRUD
   └── PostgreSQL transaction functions (fn_reserve_stock, fn_record_delivery, etc.)
   └── Suppliers CRUD
   └── Purchase orders with approval workflow
   └── Delivery recording via fn_record_delivery

6. HR + Payroll (depends on: Project Management)
   └── Employee CRUD
   └── Attendance recording
   └── lib/payroll/ (SSS, PhilHealth, Pag-IBIG, BIR tables)
   └── Payroll computation + cash advances + loans

7. Expenses + Equipment (depends on: Project Management)
   └── Expense submission + approval
   └── Equipment registry + project assignment

8. Documents + Notifications (depends on: Auth + Tenancy)
   └── Supabase Storage integration
   └── Supabase Realtime setup
   └── In-app notification system

9. Reporting + Audit (depends on: all above)
   └── Project cost summary
   └── Payroll reports with government contribution summaries
   └── Audit logs

10. Billing + Subscription (can be built in parallel with 4–9)
    └── Subscription plans + webhook handler
    └── Feature gating by plan tier
```

---

## Sources

- Architecture derived from: Next.js App Router documentation (data fetching patterns, Server Actions), Supabase documentation (RLS, SSR helpers, Realtime, Storage), PROJECT.md constraints (stack and patterns fully specified by project owner)
- Multi-tenant RLS pattern (company_members junction): Standard Supabase multi-tenant approach documented in Supabase guides; junction table variant chosen for future multi-company support
- PostgreSQL transaction function pattern: Required by Supabase JS client's inability to execute multi-statement transactions natively (supabase-js v2 does not expose BEGIN/COMMIT)
- Confidence: HIGH for patterns directly specified in PROJECT.md constraints; HIGH for Next.js/Supabase patterns from documentation knowledge through August 2025; MEDIUM for scaling thresholds (based on general SaaS patterns, not construction-specific benchmarks)

---
*Architecture research for: Multi-tenant construction management SaaS (Philippines market)*
*Researched: 2026-03-24*
