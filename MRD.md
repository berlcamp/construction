# Construction Management System (CMS) — Complete System Plan

> A multi-tenant SaaS platform for small-to-medium construction firms in the Philippines.
> Stack: Next.js 16 (App Router) · Supabase · Redux Toolkit · shadcn/ui · Tailwind CSS

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Multi-Tenancy & Billing](#2-multi-tenancy--billing)
3. [Database Schema](#3-database-schema)
4. [Folder Structure](#4-folder-structure)
5. [Feature Breakdown (MVP → Advanced)](#5-feature-breakdown)
6. [UI/UX Plan](#6-uiux-plan)
7. [Data Flow](#7-data-flow)
8. [Security & Roles](#8-security--roles)
9. [API / Server Actions Design](#9-api--server-actions-design)
10. [Realtime Features](#10-realtime-features)
11. [Deployment Strategy](#11-deployment-strategy)

---

## 1. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VERCEL (Node.js)                             │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              Next.js App (App Router)                         │  │
│  │                                                               │  │
│  │  ┌──────────────────────┐   ┌─────────────────────────────┐  │  │
│  │  │  Server Components   │   │     Server Actions          │  │  │
│  │  │  (Pages/Layouts)     │   │     (src/lib/actions/)      │  │  │
│  │  │  Fetch data via      │   │     Mutations: create,      │  │  │
│  │  │  Supabase server     │   │     update, delete via      │  │  │
│  │  │  client, pass as     │   │     Supabase server client  │  │  │
│  │  │  props to children   │   │     + revalidatePath()      │  │  │
│  │  └──────────┬───────────┘   └──────────┬──────────────────┘  │  │
│  │             │ props                     │ called from         │  │
│  │             ▼                           │ client components   │  │
│  │  ┌──────────────────────┐              │                     │  │
│  │  │  Client Components   │◄─────────────┘                     │  │
│  │  │  ('use client')      │                                    │  │
│  │  │  Interactive UI,     │   ┌─────────────────────────────┐  │  │
│  │  │  forms, shadcn/ui    │──▶│  Redux Toolkit Store        │  │  │
│  │  │                      │   │  (UI state ONLY: sidebar,   │  │  │
│  │  │                      │   │   modals, filters, toasts)  │  │  │
│  │  └──────────────────────┘   └─────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────────────┘
                       │ HTTPS (server-side only for data)
┌──────────────────────▼──────────────────────────────────────────────┐
│                        SUPABASE PLATFORM                            │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │   Auth   │  │ Database │  │ Storage  │  │    Realtime       │  │
│  │ (Google  │  │(Postgres)│  │ (Files/  │  │ (Notifications &  │  │
│  │  OAuth)  │  │          │  │  Docs)   │  │  Inventory only)  │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────────┘  │
│                                                                     │
│  ┌──────────────────┐  ┌────────────────────────────────────────┐  │
│  │  Edge Functions  │  │  Row Level Security (RLS) Policies    │  │
│  │  (Webhooks,      │  │  (Per-table, role + company scoped)   │  │
│  │   Notifications) │  │                                        │  │
│  └──────────────────┘  └────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### How Next.js + Supabase + Redux Interact

| Layer                       | Responsibility                                                                                  | Runs On       |
| --------------------------- | ----------------------------------------------------------------------------------------------- | ------------- |
| **Server Components**       | Fetch data from Supabase via server client, pass as props to Client Components                  | Vercel (Node) |
| **Server Actions**          | Handle all mutations (create/update/delete) via Supabase server client, then `revalidatePath()` | Vercel (Node) |
| **Client Components**       | Interactive UI, forms, call Server Actions for mutations, receive data as props                 | Browser       |
| **Redux Slices**            | UI state ONLY — sidebar, modals, active filters, toasts. **No data fetching or storage.**       | Browser       |
| **Supabase Server Client**  | Used by Server Components and Server Actions for all database operations                        | Vercel (Node) |
| **Supabase Browser Client** | Used ONLY for auth and realtime subscriptions — **never for data queries or mutations**         | Browser       |
| **Supabase RLS**            | Enforces authorization at the database level, scoped by company                                 | Supabase      |

### Data Flow Pattern (Server-First)

```
For reads (Server Components):
1. Page component (Server Component) runs on the server
2. Fetches data from Supabase using server client
3. While data is being fetched, Next.js automatically shows `loading.tsx` for that route segment
4. Once data is ready, it is passed as props to Client Components
5. Client Components render the data — no manual loading state needed for initial load

For navigation (between CRUD pages):
1. User navigates to another route (e.g., /projects → /projects/new)
2. Next.js immediately renders the target route’s `loading.tsx`
3. Server Component for the new page fetches data
4. When ready, the UI replaces the loading state automatically

For mutations (Server Actions):
1. User submits form in Client Component
2. Client Component calls a Server Action (defined in src/lib/actions/)
3. Use `useTransition` or local state to show loading (e.g., "Saving...")
4. Server Action validates input, mutates via Supabase server client
5. Server Action calls revalidatePath() to refresh the page data
6. Next.js automatically re-fetches the Server Component data and updates the UI

For client-side filtering/search (URL search params):
1. User changes a filter or search input
2. Client Component updates URL search params via useRouter/useSearchParams
3. Next.js triggers a new server render for that route
4. `loading.tsx` is shown during fetch
5. Server Component re-runs with new params, fetches filtered data
6. Updated data flows down as props

For partial loading (optional, advanced):
1. Wrap parts of the UI in <Suspense>
2. Provide a fallback (e.g., skeleton loader)
3. Only that section shows loading while the rest of the page remains visible
```

### Google OAuth Authentication Flow

```

User clicks "Sign in with Google"
│
▼
Next.js calls supabase.auth.signInWithOAuth({
provider: 'google',
options: { redirectTo: '/auth/callback' }
})
│
▼
Browser redirects to Supabase Auth → Google Consent Screen
│
▼
User grants consent → Google returns auth code to Supabase
│
▼
Supabase exchanges code for tokens, creates/updates auth.users record
│
▼
Supabase redirects to /auth/callback with code
│
▼
/auth/callback Route Handler exchanges code for session via
supabase.auth.exchangeCodeForSession(code)
│
▼
Session cookies set → redirect to /dashboard
│
▼
Database trigger on auth.users fires → creates profile in construction.profiles
(if first login) with default role = 'staff'
│
▼
Admin later promotes user role via admin panel

```

### Redux Store Structure (UI State Only)

Redux is used **exclusively for client-side UI state**. No data fetching, no async thunks, no server data caching.

```

src/store/
├── store.ts # configureStore — combines UI slices only
├── provider.tsx # ReduxProvider wrapper (client component)
├── hooks.ts # Typed useAppDispatch, useAppSelector
│
└── slices/
├── uiSlice.ts # Sidebar open/closed, active tab, active filters, search query
└── notificationSlice.ts # Toast queue (client-side toasts only, NOT fetched notifications)

```

> **Why no data slices?** All data (projects, employees, inventory, etc.) is fetched by Server Components
> and passed as props. Mutations go through Server Actions + `revalidatePath()`. There is no need to
> cache server data in Redux — Next.js handles caching and revalidation.

### Redux Slice Pattern (UI State Only — No Async Thunks)

```typescript
// src/store/slices/uiSlice.ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface UIState {
  sidebarOpen: boolean;
  activeModal: string | null;
  activeTab: Record<string, string>; // e.g., { projectDetail: 'inventory' }
}

const initialState: UIState = {
  sidebarOpen: true,
  activeModal: null,
  activeTab: {},
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    openModal: (state, action: PayloadAction<string>) => {
      state.activeModal = action.payload;
    },
    closeModal: (state) => {
      state.activeModal = null;
    },
    setActiveTab: (
      state,
      action: PayloadAction<{ key: string; tab: string }>,
    ) => {
      state.activeTab[action.payload.key] = action.payload.tab;
    },
  },
});

export const { toggleSidebar, openModal, closeModal, setActiveTab } =
  uiSlice.actions;
export default uiSlice.reducer;
```

```typescript
// src/store/slices/notificationSlice.ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface NotificationState {
  toasts: Toast[];
}

const notificationSlice = createSlice({
  name: "notifications",
  initialState: { toasts: [] } as NotificationState,
  reducers: {
    addToast: (state, action: PayloadAction<Toast>) => {
      state.toasts.push(action.payload);
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const { addToast, removeToast } = notificationSlice.actions;
export default notificationSlice.reducer;
```

```typescript
// src/store/store.ts
import { configureStore } from "@reduxjs/toolkit";
import uiReducer from "./slices/uiSlice";
import notificationReducer from "./slices/notificationSlice";

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    notifications: notificationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

```typescript
// src/store/hooks.ts
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "./store";

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
```

```typescript
// src/store/provider.tsx
'use client'

import { Provider } from 'react-redux'
import { store } from './store'

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>
}
```

---

## 2. Multi-Tenancy & Billing

### Multi-Tenant Model

Each construction company is a **tenant**. All data is scoped by `company_id`. Users are linked to companies via a `company_members` junction table (NOT directly via `profiles.company_id`). A user belongs to one company (for now).

```
┌──────────────────────────────────────────────────────────┐
│                       SaaS Platform                       │
│                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐           │
│  │ Company A │    │ Company B │    │ Company C │           │
│  │           │    │           │    │           │           │
│  │ Projects  │    │ Projects  │    │ Projects  │           │
│  │ Employees │    │ Employees │    │ Employees │           │
│  │ Inventory │    │ Inventory │    │ Inventory │           │
│  │ Payroll   │    │ Payroll   │    │ Payroll   │           │
│  └─────┬─────┘    └─────┬─────┘    └─────┬─────┘           │
│        │               │               │                 │
│        └───────┬───────┘───────┬───────┘                 │
│                ▼               ▼                          │
│        company_members (role-based membership)            │
│                ▲               ▲                          │
│                │               │                          │
│           ┌────┘               └────┐                    │
│           │  Users (profiles)       │                    │
│           │  No direct company_id   │                    │
│           └─────────────────────────┘                    │
│                                                          │
│  All data isolated via company_id + RLS                  │
│  Membership & roles enforced via company_members          │
└──────────────────────────────────────────────────────────┘
```

### Company & Ownership Rules

- Each company represents a tenant
- Each company can have MANY users
- Each company MUST have EXACTLY ONE owner (enforced via unique constraint on `company_members`)
- The owner is responsible for billing and subscription
- `companies.owner_id` is a denormalized reference for quick lookups

### First-Time Registration Flow (Owner Onboarding)

1. User signs in via Google OAuth
2. Profile is auto-created (no company association)
3. If user has no `company_members` record → redirect to onboarding
4. User creates a company via onboarding form
5. System creates (in a transaction):
   - `companies` record with `owner_id` = user
   - `company_members` record with `role = 'owner'`
   - `subscriptions` record (trial, 14 days)
6. Redirect to dashboard

### User Invitation System

- Owners/Admins can invite users via email
- Invitations stored in `company_invitations` table
- Invite includes: target email, assigned role, unique token, expiry
- Flow:
  1. Owner/Admin creates invitation → system sends email with invite link
  2. Invited user clicks link → signs in via Google OAuth
  3. If token is valid and not expired → system creates `company_members` record
  4. Redirect to dashboard
- Constraints:
  - Cannot invite someone who is already a member of any company
  - Cannot invite with role = 'owner' (only one owner per company)
  - Invitations expire after 7 days

### Subscription Plans

| Plan             | Price/month | Limits                                                  |
| ---------------- | ----------- | ------------------------------------------------------- |
| **Starter**      | ₱1,500      | Up to 3 active projects, 10 employees, 2 users          |
| **Professional** | ₱4,500      | Up to 15 active projects, 50 employees, 10 users        |
| **Business**     | ₱9,500      | Unlimited projects, unlimited employees, 25 users       |
| **Enterprise**   | Custom      | Unlimited everything, priority support, custom features |

### Company & Membership Tables

```sql
CREATE TABLE construction.companies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,          -- URL-friendly identifier
  owner_id      UUID NOT NULL REFERENCES profiles(id),  -- denormalized for quick lookup
  address       TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  tin           TEXT,                          -- Tax Identification Number (PH)
  plan          TEXT NOT NULL DEFAULT 'starter'
                  CHECK (plan IN ('starter', 'professional', 'business', 'enterprise')),
  plan_status   TEXT NOT NULL DEFAULT 'trial'
                  CHECK (plan_status IN ('trial', 'active', 'past_due', 'cancelled')),
  trial_ends_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '14 days'),
  current_period_start DATE,
  current_period_end   DATE,
  max_projects  INTEGER NOT NULL DEFAULT 3,
  max_employees INTEGER NOT NULL DEFAULT 10,
  max_users     INTEGER NOT NULL DEFAULT 2,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Junction table: links users to companies with roles
CREATE TABLE construction.company_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'staff'
                  CHECK (role IN ('owner', 'admin', 'project_manager', 'accountant',
                                  'procurement_officer', 'staff')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each user can only belong to one company (for now)
  UNIQUE (user_id),
  -- Only ONE owner per company
  UNIQUE (company_id, role) WHERE (role = 'owner')  -- partial unique index (see below)
);

-- Enforce exactly one owner per company via partial unique index
CREATE UNIQUE INDEX idx_one_owner_per_company
  ON company_members (company_id)
  WHERE role = 'owner';

CREATE INDEX idx_company_members_company ON company_members(company_id);
CREATE INDEX idx_company_members_user ON company_members(user_id);

-- Invitation system for adding users to companies
CREATE TABLE construction.company_invitations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'staff'
                  CHECK (role IN ('admin', 'project_manager', 'accountant',
                                  'procurement_officer', 'staff')),
                  -- NOTE: 'owner' is NOT allowed in invitations
  token         TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by    UUID NOT NULL REFERENCES profiles(id),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate pending invitations to the same email for the same company
  UNIQUE (company_id, invited_email) WHERE (status = 'pending')  -- partial unique (see below)
);

-- Prevent duplicate pending invitations
CREATE UNIQUE INDEX idx_unique_pending_invitation
  ON company_invitations (company_id, invited_email)
  WHERE status = 'pending';

CREATE INDEX idx_invitations_token ON company_invitations(token);
CREATE INDEX idx_invitations_email ON company_invitations(invited_email);

CREATE TABLE construction.subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan          TEXT NOT NULL,
  amount        NUMERIC(10,2) NOT NULL,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'paid', 'past_due', 'cancelled')),
  payment_method TEXT,                        -- 'gcash', 'bank_transfer', 'credit_card'
  payment_reference TEXT,                     -- Transaction ID / reference number
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_company ON subscriptions(company_id);
```

---

## 3. Database Schema

### Custom Schema: `construction`

All application tables live in a dedicated `construction` schema (not `public`). This provides cleaner namespace isolation, avoids conflicts with Supabase internals, and makes it explicit which objects belong to the app.

**Migration file: `20260101000000_create_schema.sql`**

```sql
-- Create the custom schema
CREATE SCHEMA IF NOT EXISTS construction;

-- Grant access to Supabase roles so PostgREST (API), Auth, and Realtime can operate
GRANT USAGE ON SCHEMA construction TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA construction TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA construction TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA construction TO anon, authenticated, service_role;

-- Ensure future objects in this schema also get the right grants
ALTER DEFAULT PRIVILEGES IN SCHEMA construction GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA construction GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA construction GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
```

**Expose via PostgREST (Supabase API):**

In the Supabase Dashboard → Settings → API → "Exposed schemas", add `construction` alongside `public`. This allows the Supabase JS client to query tables in the `construction` schema.

Alternatively, via SQL:

```sql
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, construction';
NOTIFY pgrst, 'reload config';
```

**Supabase JS Client Configuration:**

Configure the client to default to the `construction` schema:

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";

export async function createClient() {
  // ... cookie handling ...
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: "construction" },
      // ... cookie options ...
    }
  );
}
```

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: "construction" },
    }
  );
}
```

> **Note:** With `db: { schema: "construction" }`, all `.from("table_name")` calls automatically target the `construction` schema. No per-query `.schema()` calls needed. The `auth` module is unaffected — it always uses Supabase's internal `auth` schema.

### Entity Relationship Overview

```
companies ─────┬── company_members ── profiles (users)
               │                      (membership & roles via company_members)
               ├── company_invitations
               ├── subscriptions
               │
projects ──────┼── project_members
               │
materials ─────┼── project_inventory ── inventory_logs
               │                     ── stock_reservations
               │                     ── inventory_transfers
               │
suppliers ─────┼── purchase_orders ── po_items ── deliveries
               │
employees ─────┼── attendance ── payroll ── payroll_items ── payroll_deductions
               │              ── cash_advances
               │              ── employee_loans
               │
               ├── expenses
               ├── equipment ── equipment_assignments
               ├── project_costs
               ├── documents
               ├── notifications
               └── audit_logs
```

### Complete Table Definitions

#### `profiles` — User profiles linked to Supabase Auth

> **Note:** Profiles live in the `construction` schema and reference `auth.users(id)` via foreign key.
> Profiles do NOT store `company_id` or `role`. Company membership and roles
> are managed via the `company_members` table. This enables clean multi-tenant separation.

```sql
CREATE TABLE construction.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  avatar_url    TEXT,
  phone         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION construction.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO construction.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = construction;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION construction.handle_new_user();
```

#### `projects`

```sql
CREATE TABLE construction.projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  name          TEXT NOT NULL,
  description   TEXT,
  location      TEXT,
  client_name   TEXT,
  client_contact TEXT,
  status        TEXT NOT NULL DEFAULT 'planning'
                  CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  start_date    DATE,
  target_end_date DATE,
  actual_end_date DATE,
  budget        NUMERIC(15,2),
  progress      INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  created_by    UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_company ON projects(company_id);
CREATE INDEX idx_projects_status ON projects(status);
```

#### `project_members` — Many-to-many: projects ↔ employees/users

```sql
CREATE TABLE construction.project_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'member'
                  CHECK (role IN ('project_manager', 'engineer', 'foreman', 'member')),
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at    TIMESTAMPTZ,

  UNIQUE (project_id, employee_id)
);

CREATE INDEX idx_pm_project ON project_members(project_id);
CREATE INDEX idx_pm_employee ON project_members(employee_id);
```

#### `materials` — Global materials catalog (per company)

```sql
CREATE TABLE construction.materials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  name          TEXT NOT NULL,
  description   TEXT,
  unit          TEXT NOT NULL CHECK (unit IN (
                  'pcs', 'bags', 'kg', 'tons', 'liters', 'gallons',
                  'meters', 'feet', 'sq_m', 'sq_ft', 'cu_m', 'cu_ft',
                  'rolls', 'sheets', 'boxes', 'sets'
                )),
  category      TEXT,
  unit_cost     NUMERIC(12,2),
  sku           TEXT,
  min_stock     NUMERIC(12,2) DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (company_id, sku)
);

CREATE INDEX idx_materials_company ON materials(company_id);
CREATE INDEX idx_materials_category ON materials(category);
```

#### `project_inventory` — Stock levels per project

```sql
CREATE TABLE construction.project_inventory (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  material_id   UUID NOT NULL REFERENCES materials(id),
  quantity      NUMERIC(12,2) NOT NULL DEFAULT 0,       -- available stock
  reserved      NUMERIC(12,2) NOT NULL DEFAULT 0,       -- reserved for tasks
  last_updated  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (project_id, material_id)
);

CREATE INDEX idx_pi_project ON project_inventory(project_id);
```

#### `stock_reservations` — Reserve materials for specific tasks/phases

```sql
CREATE TABLE construction.stock_reservations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id),
  material_id   UUID NOT NULL REFERENCES materials(id),
  quantity      NUMERIC(12,2) NOT NULL,
  purpose       TEXT NOT NULL,                 -- e.g., 'Foundation Phase', 'Electrical Wiring'
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'fulfilled', 'cancelled')),
  reserved_by   UUID NOT NULL REFERENCES profiles(id),
  fulfilled_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reservations_project ON stock_reservations(project_id);
```

#### `inventory_transfers` — Transfer stock between projects

```sql
CREATE TABLE construction.inventory_transfers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL REFERENCES companies(id),
  from_project_id  UUID NOT NULL REFERENCES projects(id),
  to_project_id    UUID NOT NULL REFERENCES projects(id),
  material_id      UUID NOT NULL REFERENCES materials(id),
  quantity         NUMERIC(12,2) NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'completed', 'rejected')),
  notes            TEXT,
  requested_by     UUID NOT NULL REFERENCES profiles(id),
  approved_by      UUID REFERENCES profiles(id),
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transfers_company ON inventory_transfers(company_id);
```

#### `inventory_logs` — Every stock movement (including waste)

```sql
CREATE TABLE construction.inventory_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id),
  material_id   UUID NOT NULL REFERENCES materials(id),
  type          TEXT NOT NULL CHECK (type IN (
                  'in', 'out', 'transfer_in', 'transfer_out',
                  'adjustment', 'waste', 'reservation', 'release'
                )),
  quantity      NUMERIC(12,2) NOT NULL,       -- positive for in, negative for out/waste
  reference_type TEXT,                         -- 'purchase_order', 'manual', 'transfer', 'waste_report'
  reference_id  UUID,
  waste_reason  TEXT,                          -- for type='waste': 'damaged', 'expired', 'spillage', 'theft', 'other'
  notes         TEXT,
  performed_by  UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_il_project_material ON inventory_logs(project_id, material_id);
CREATE INDEX idx_il_type ON inventory_logs(type);
CREATE INDEX idx_il_created ON inventory_logs(created_at);
```

#### `suppliers`

```sql
CREATE TABLE construction.suppliers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  name          TEXT NOT NULL,
  contact_person TEXT,
  email         TEXT,
  phone         TEXT,
  address       TEXT,
  notes         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_suppliers_company ON suppliers(company_id);
```

#### `purchase_orders`

```sql
CREATE TABLE construction.purchase_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  po_number     TEXT NOT NULL UNIQUE,
  project_id    UUID NOT NULL REFERENCES projects(id),
  supplier_id   UUID NOT NULL REFERENCES suppliers(id),
  status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'pending_approval', 'approved',
                         'ordered', 'partially_delivered', 'delivered', 'cancelled')),
  total_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes         TEXT,
  requested_by  UUID NOT NULL REFERENCES profiles(id),
  approved_by   UUID REFERENCES profiles(id),
  approved_at   TIMESTAMPTZ,
  order_date    DATE,
  expected_delivery DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_po_company ON purchase_orders(company_id);
CREATE INDEX idx_po_project ON purchase_orders(project_id);
CREATE INDEX idx_po_status ON purchase_orders(status);

-- Auto-generate PO number
CREATE OR REPLACE FUNCTION construction.generate_po_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(po_number FROM 'PO-\d{4}-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM purchase_orders
  WHERE company_id = NEW.company_id
    AND po_number LIKE 'PO-' || EXTRACT(YEAR FROM now())::TEXT || '-%';

  NEW.po_number := 'PO-' || EXTRACT(YEAR FROM now())::TEXT || '-' ||
                   LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_po_number
  BEFORE INSERT ON construction.purchase_orders
  FOR EACH ROW
  WHEN (NEW.po_number IS NULL OR NEW.po_number = '')
  EXECUTE FUNCTION construction.generate_po_number();
```

#### `po_items` — Line items on a purchase order

```sql
CREATE TABLE construction.po_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  material_id     UUID NOT NULL REFERENCES materials(id),
  quantity        NUMERIC(12,2) NOT NULL,
  unit_cost       NUMERIC(12,2) NOT NULL,
  total_cost      NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  quantity_delivered NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_poi_po ON po_items(purchase_order_id);
```

#### `deliveries`

```sql
CREATE TABLE construction.deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id),
  delivery_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  received_by     UUID NOT NULL REFERENCES profiles(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE construction.delivery_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id     UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  po_item_id      UUID NOT NULL REFERENCES po_items(id),
  quantity_received NUMERIC(12,2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `employees`

```sql
CREATE TABLE construction.employees (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  profile_id    UUID REFERENCES profiles(id),
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  employee_type TEXT NOT NULL CHECK (employee_type IN ('salaried', 'daily_wage', 'contract')),
  job_title     TEXT NOT NULL,
  daily_rate    NUMERIC(10,2),
  monthly_salary NUMERIC(12,2),
  sss_number    TEXT,
  philhealth_number TEXT,
  pagibig_number TEXT,
  tin           TEXT,
  contact_phone TEXT,
  emergency_contact TEXT,
  date_hired    DATE NOT NULL DEFAULT CURRENT_DATE,
  date_terminated DATE,
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive', 'terminated')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_employees_company ON employees(company_id);
CREATE INDEX idx_employees_status ON employees(status);
```

#### `attendance`

```sql
CREATE TABLE construction.attendance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES employees(id),
  project_id    UUID REFERENCES projects(id),
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  status        TEXT NOT NULL CHECK (status IN ('present', 'absent', 'half_day', 'overtime', 'leave')),
  hours_worked  NUMERIC(4,1) DEFAULT 8,
  overtime_hours NUMERIC(4,1) DEFAULT 0,
  notes         TEXT,
  recorded_by   UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (employee_id, date)
);

CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_employee ON attendance(employee_id);
```

#### `cash_advances` — Track employee cash advances

```sql
CREATE TABLE construction.cash_advances (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  employee_id   UUID NOT NULL REFERENCES employees(id),
  amount        NUMERIC(12,2) NOT NULL,
  remaining_balance NUMERIC(12,2) NOT NULL,   -- decreases as deducted from payroll
  reason        TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'paid_out', 'fully_deducted', 'rejected')),
  approved_by   UUID REFERENCES profiles(id),
  date_granted  DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ca_employee ON cash_advances(employee_id);
CREATE INDEX idx_ca_status ON cash_advances(status);
```

#### `employee_loans` — SSS/Pag-IBIG/Company loans

```sql
CREATE TABLE construction.employee_loans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  employee_id   UUID NOT NULL REFERENCES employees(id),
  loan_type     TEXT NOT NULL CHECK (loan_type IN (
                  'sss_salary', 'sss_calamity', 'pagibig_mpl',
                  'pagibig_calamity', 'company'
                )),
  principal     NUMERIC(12,2) NOT NULL,
  remaining_balance NUMERIC(12,2) NOT NULL,
  monthly_amortization NUMERIC(12,2) NOT NULL,
  start_date    DATE NOT NULL,
  end_date      DATE,
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'fully_paid', 'defaulted')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loans_employee ON employee_loans(employee_id);
CREATE INDEX idx_loans_status ON employee_loans(status);
```

#### `payroll` and `payroll_items` — With PH statutory deductions

```sql
CREATE TABLE construction.payroll (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  pay_type      TEXT NOT NULL DEFAULT 'semi_monthly'
                  CHECK (pay_type IN ('weekly', 'semi_monthly', 'monthly')),
  status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'computed', 'approved', 'paid')),
  total_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  processed_by  UUID REFERENCES profiles(id),
  approved_by   UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payroll_company ON payroll(company_id);

CREATE TABLE construction.payroll_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_id      UUID NOT NULL REFERENCES payroll(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES employees(id),
  days_worked     NUMERIC(5,1) NOT NULL DEFAULT 0,
  overtime_hours  NUMERIC(5,1) NOT NULL DEFAULT 0,
  base_pay        NUMERIC(12,2) NOT NULL DEFAULT 0,
  overtime_pay    NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- PH Statutory Deductions
  sss_ee          NUMERIC(10,2) NOT NULL DEFAULT 0,     -- SSS employee share
  sss_er          NUMERIC(10,2) NOT NULL DEFAULT 0,     -- SSS employer share (for records)
  philhealth_ee   NUMERIC(10,2) NOT NULL DEFAULT 0,     -- PhilHealth employee share
  philhealth_er   NUMERIC(10,2) NOT NULL DEFAULT 0,     -- PhilHealth employer share
  pagibig_ee      NUMERIC(10,2) NOT NULL DEFAULT 0,     -- Pag-IBIG employee share
  pagibig_er      NUMERIC(10,2) NOT NULL DEFAULT 0,     -- Pag-IBIG employer share
  withholding_tax NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Other deductions
  cash_advance_deduction NUMERIC(10,2) NOT NULL DEFAULT 0,
  loan_deduction  NUMERIC(10,2) NOT NULL DEFAULT 0,
  other_deductions NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Additions
  allowances      NUMERIC(10,2) NOT NULL DEFAULT 0,
  bonuses         NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Computed
  total_deductions NUMERIC(12,2) GENERATED ALWAYS AS (
    sss_ee + philhealth_ee + pagibig_ee + withholding_tax +
    cash_advance_deduction + loan_deduction + other_deductions
  ) STORED,
  gross_pay       NUMERIC(12,2) GENERATED ALWAYS AS (
    base_pay + overtime_pay + allowances + bonuses
  ) STORED,
  net_pay         NUMERIC(12,2) GENERATED ALWAYS AS (
    base_pay + overtime_pay + allowances + bonuses -
    (sss_ee + philhealth_ee + pagibig_ee + withholding_tax +
     cash_advance_deduction + loan_deduction + other_deductions)
  ) STORED,
  deduction_notes TEXT,
  bonus_notes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (payroll_id, employee_id)
);

CREATE INDEX idx_pi_payroll ON payroll_items(payroll_id);
```

#### `project_costs` — Track materials, labor, equipment costs per project

```sql
CREATE TABLE construction.project_costs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id),
  category      TEXT NOT NULL CHECK (category IN ('materials', 'labor', 'equipment')),
  description   TEXT NOT NULL,
  amount        NUMERIC(12,2) NOT NULL,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_type TEXT,                         -- 'purchase_order', 'payroll', 'equipment_rental', 'manual'
  reference_id  UUID,
  recorded_by   UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pc_project ON project_costs(project_id);
CREATE INDEX idx_pc_category ON project_costs(category);

-- View: Project cost summary vs budget
CREATE OR REPLACE VIEW construction.project_cost_summary AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  p.budget,
  COALESCE(SUM(pc.amount) FILTER (WHERE pc.category = 'materials'), 0) AS materials_cost,
  COALESCE(SUM(pc.amount) FILTER (WHERE pc.category = 'labor'), 0) AS labor_cost,
  COALESCE(SUM(pc.amount) FILTER (WHERE pc.category = 'equipment'), 0) AS equipment_cost,
  COALESCE(SUM(pc.amount), 0) AS total_cost,
  p.budget - COALESCE(SUM(pc.amount), 0) AS remaining_budget
FROM projects p
LEFT JOIN project_costs pc ON pc.project_id = p.id
GROUP BY p.id, p.name, p.budget;
```

#### `expenses`

```sql
CREATE TABLE construction.expenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  project_id    UUID REFERENCES projects(id),
  category      TEXT NOT NULL CHECK (category IN (
                  'materials', 'labor', 'equipment', 'transport',
                  'permits', 'utilities', 'subcontractor', 'misc'
                )),
  description   TEXT NOT NULL,
  amount        NUMERIC(12,2) NOT NULL,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url   TEXT,
  submitted_by  UUID NOT NULL REFERENCES profiles(id),
  approved_by   UUID REFERENCES profiles(id),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_company ON expenses(company_id);
CREATE INDEX idx_expenses_project ON expenses(project_id);
```

#### `equipment`

```sql
CREATE TABLE construction.equipment (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  name          TEXT NOT NULL,
  type          TEXT,
  serial_number TEXT,
  status        TEXT NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available', 'in_use', 'maintenance', 'retired')),
  purchase_date DATE,
  purchase_cost NUMERIC(12,2),
  daily_rate    NUMERIC(10,2),                -- for costing when assigned to projects
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (company_id, serial_number)
);

CREATE INDEX idx_equipment_company ON equipment(company_id);

CREATE TABLE construction.equipment_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id  UUID NOT NULL REFERENCES equipment(id),
  project_id    UUID NOT NULL REFERENCES projects(id),
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  returned_date DATE,
  assigned_by   UUID NOT NULL REFERENCES profiles(id),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `documents`

```sql
CREATE TABLE construction.documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  project_id    UUID REFERENCES projects(id),
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN (
                  'blueprint', 'permit', 'contract', 'report',
                  'photo', 'invoice', 'receipt', 'other'
                )),
  file_path     TEXT NOT NULL,
  file_size     INTEGER,
  uploaded_by   UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_company ON documents(company_id);
CREATE INDEX idx_documents_project ON documents(project_id);
```

#### `notifications`

```sql
CREATE TABLE construction.notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  user_id       UUID NOT NULL REFERENCES profiles(id),
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'info'
                  CHECK (type IN ('info', 'warning', 'success', 'error')),
  link          TEXT,
  is_read       BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
```

#### `audit_logs`

```sql
CREATE TABLE construction.audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  user_id       UUID REFERENCES profiles(id),
  action        TEXT NOT NULL,
  table_name    TEXT NOT NULL,
  record_id     UUID,
  old_data      JSONB,
  new_data      JSONB,
  ip_address    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_company ON audit_logs(company_id);
CREATE INDEX idx_audit_table ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
```

#### Shared: `updated_at` trigger

```sql
CREATE OR REPLACE FUNCTION construction.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON construction.companies
  FOR EACH ROW EXECUTE FUNCTION construction.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON construction.profiles
  FOR EACH ROW EXECUTE FUNCTION construction.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON construction.projects
  FOR EACH ROW EXECUTE FUNCTION construction.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON construction.materials
  FOR EACH ROW EXECUTE FUNCTION construction.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON construction.employees
  FOR EACH ROW EXECUTE FUNCTION construction.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON construction.suppliers
  FOR EACH ROW EXECUTE FUNCTION construction.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON construction.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION construction.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON construction.payroll
  FOR EACH ROW EXECUTE FUNCTION construction.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON construction.equipment
  FOR EACH ROW EXECUTE FUNCTION construction.update_updated_at();
```

#### Database Transaction Functions (Inventory Consistency)

> **Why transactions?** The Supabase JS client doesn't support multi-statement transactions.
> Multi-step operations (delivery → inventory → logs) can fail mid-way, leaving corrupted data.
> PostgreSQL functions run inside an **implicit transaction** — if any step throws an error,
> **everything rolls back automatically**. We call these via `supabase.rpc()`.

**Migration file: `20260101000017_create_transaction_functions.sql`**

```sql
-- ============================================================
-- fn_record_delivery
-- Called when materials are delivered against a purchase order.
-- Atomically: creates delivery + items, updates PO item quantities,
-- upserts project inventory, logs movements, records costs,
-- and updates PO status.
-- ============================================================
CREATE OR REPLACE FUNCTION construction.fn_record_delivery(
  p_purchase_order_id UUID,
  p_received_by UUID,
  p_notes TEXT DEFAULT NULL,
  p_items JSONB  -- [{po_item_id, material_id, quantity_received, unit_cost}]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = construction
AS $$
DECLARE
  v_delivery_id UUID;
  v_item JSONB;
  v_project_id UUID;
  v_company_id UUID;
  v_all_delivered BOOLEAN;
BEGIN
  -- Get project_id and company_id from the purchase order (lock row to prevent concurrent deliveries)
  SELECT po.project_id, p.company_id
  INTO STRICT v_project_id, v_company_id
  FROM purchase_orders po
  JOIN projects p ON p.id = po.project_id
  WHERE po.id = p_purchase_order_id
  FOR UPDATE OF po;

  -- Authorization: verify the user belongs to this company
  PERFORM 1 FROM company_members
  WHERE user_id = p_received_by
    AND company_id = v_company_id
    AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized: user does not belong to this company';
  END IF;

  -- 1. Create delivery record
  INSERT INTO deliveries (purchase_order_id, delivery_date, received_by, notes)
  VALUES (p_purchase_order_id, CURRENT_DATE, p_received_by, p_notes)
  RETURNING id INTO v_delivery_id;

  -- 2. Process each delivered item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- 2a. Insert delivery line item
    INSERT INTO delivery_items (delivery_id, po_item_id, quantity_received)
    VALUES (
      v_delivery_id,
      (v_item->>'po_item_id')::UUID,
      (v_item->>'quantity_received')::NUMERIC
    );

    -- 2b. Update PO item delivered quantity
    UPDATE po_items
    SET quantity_delivered = quantity_delivered + (v_item->>'quantity_received')::NUMERIC
    WHERE id = (v_item->>'po_item_id')::UUID;

    -- 2c. Upsert project inventory (add stock)
    INSERT INTO project_inventory (project_id, material_id, quantity, last_updated)
    VALUES (
      v_project_id,
      (v_item->>'material_id')::UUID,
      (v_item->>'quantity_received')::NUMERIC,
      now()
    )
    ON CONFLICT (project_id, material_id)
    DO UPDATE SET
      quantity = project_inventory.quantity + (v_item->>'quantity_received')::NUMERIC,
      last_updated = now();

    -- 2d. Insert inventory log
    INSERT INTO inventory_logs (project_id, material_id, type, quantity, reference_type, reference_id, performed_by)
    VALUES (
      v_project_id,
      (v_item->>'material_id')::UUID,
      'in',
      (v_item->>'quantity_received')::NUMERIC,
      'purchase_order',
      p_purchase_order_id,
      p_received_by
    );

    -- 2e. Record material cost
    INSERT INTO project_costs (project_id, category, description, amount, reference_type, reference_id, recorded_by)
    VALUES (
      v_project_id,
      'materials',
      'Delivery from PO',
      (v_item->>'quantity_received')::NUMERIC * (v_item->>'unit_cost')::NUMERIC,
      'purchase_order',
      p_purchase_order_id,
      p_received_by
    );
  END LOOP;

  -- 3. Check if all PO items are fully delivered → update PO status
  SELECT NOT EXISTS (
    SELECT 1 FROM po_items
    WHERE purchase_order_id = p_purchase_order_id
      AND quantity_delivered < quantity
  ) INTO v_all_delivered;

  UPDATE purchase_orders
  SET status = CASE WHEN v_all_delivered THEN 'delivered' ELSE 'partially_delivered' END,
      updated_at = now()
  WHERE id = p_purchase_order_id;

  RETURN v_delivery_id;
END;
$$;


-- ============================================================
-- fn_reserve_stock
-- Reserves materials for a specific task/phase.
-- Validates available stock before reserving.
-- ============================================================
CREATE OR REPLACE FUNCTION construction.fn_reserve_stock(
  p_project_id UUID,
  p_material_id UUID,
  p_quantity NUMERIC,
  p_purpose TEXT,
  p_reserved_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = construction
AS $$
DECLARE
  v_reservation_id UUID;
  v_available NUMERIC;
  v_company_id UUID;
BEGIN
  -- Authorization: verify the user belongs to this project's company
  SELECT p.company_id INTO STRICT v_company_id
  FROM projects p
  WHERE p.id = p_project_id;

  PERFORM 1 FROM company_members
  WHERE user_id = p_reserved_by
    AND company_id = v_company_id
    AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized: user does not belong to this company';
  END IF;

  -- Check available stock (lock row to prevent concurrent reservation races)
  SELECT COALESCE(quantity - reserved, 0) INTO v_available
  FROM project_inventory
  WHERE project_id = p_project_id AND material_id = p_material_id
  FOR UPDATE;

  IF v_available IS NULL OR v_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', COALESCE(v_available, 0), p_quantity;
  END IF;

  -- 1. Create reservation
  INSERT INTO stock_reservations (project_id, material_id, quantity, purpose, status, reserved_by)
  VALUES (p_project_id, p_material_id, p_quantity, p_purpose, 'active', p_reserved_by)
  RETURNING id INTO v_reservation_id;

  -- 2. Update reserved quantity
  UPDATE project_inventory
  SET reserved = reserved + p_quantity,
      last_updated = now()
  WHERE project_id = p_project_id AND material_id = p_material_id;

  -- 3. Log the reservation
  INSERT INTO inventory_logs (project_id, material_id, type, quantity, reference_type, reference_id, performed_by)
  VALUES (p_project_id, p_material_id, 'reservation', p_quantity, 'manual', v_reservation_id, p_reserved_by);

  RETURN v_reservation_id;
END;
$$;


-- ============================================================
-- fn_fulfill_reservation
-- Fulfills a stock reservation (materials used).
-- Deducts from both quantity and reserved.
-- ============================================================
CREATE OR REPLACE FUNCTION construction.fn_fulfill_reservation(
  p_reservation_id UUID,
  p_performed_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = construction
AS $$
DECLARE
  v_project_id UUID;
  v_material_id UUID;
  v_quantity NUMERIC;
  v_status TEXT;
  v_company_id UUID;
BEGIN
  -- Get reservation details (lock to prevent concurrent fulfill/cancel)
  SELECT project_id, material_id, quantity, status
  INTO STRICT v_project_id, v_material_id, v_quantity, v_status
  FROM stock_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF v_status != 'active' THEN
    RAISE EXCEPTION 'Reservation is not active. Current status: %', v_status;
  END IF;

  -- Authorization: verify the user belongs to this project's company
  SELECT p.company_id INTO STRICT v_company_id
  FROM projects p WHERE p.id = v_project_id;

  PERFORM 1 FROM company_members
  WHERE user_id = p_performed_by
    AND company_id = v_company_id
    AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized: user does not belong to this company';
  END IF;

  -- 1. Mark reservation as fulfilled
  UPDATE stock_reservations
  SET status = 'fulfilled', fulfilled_at = now()
  WHERE id = p_reservation_id;

  -- 2. Deduct from inventory (lock row, then deduct both quantity and reserved)
  UPDATE project_inventory
  SET quantity = quantity - v_quantity,
      reserved = reserved - v_quantity,
      last_updated = now()
  WHERE project_id = v_project_id AND material_id = v_material_id;

  -- 3. Log the outgoing movement
  INSERT INTO inventory_logs (project_id, material_id, type, quantity, reference_type, reference_id, performed_by)
  VALUES (v_project_id, v_material_id, 'out', -v_quantity, 'manual', p_reservation_id, p_performed_by);
END;
$$;


-- ============================================================
-- fn_complete_transfer
-- Completes an approved inventory transfer between projects.
-- Validates source has enough stock, moves inventory, logs both sides.
-- ============================================================
CREATE OR REPLACE FUNCTION construction.fn_complete_transfer(
  p_transfer_id UUID,
  p_approved_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = construction
AS $$
DECLARE
  v_from_project UUID;
  v_to_project UUID;
  v_material_id UUID;
  v_quantity NUMERIC;
  v_available NUMERIC;
  v_status TEXT;
  v_company_id UUID;
BEGIN
  -- Get transfer details (lock to prevent concurrent approval)
  SELECT from_project_id, to_project_id, material_id, quantity, status
  INTO STRICT v_from_project, v_to_project, v_material_id, v_quantity, v_status
  FROM inventory_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Transfer is not pending. Current status: %', v_status;
  END IF;

  -- Authorization: verify the user belongs to this project's company
  SELECT p.company_id INTO STRICT v_company_id
  FROM projects p WHERE p.id = v_from_project;

  PERFORM 1 FROM company_members
  WHERE user_id = p_approved_by
    AND company_id = v_company_id
    AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized: user does not belong to this company';
  END IF;

  -- Validate source has sufficient stock (lock inventory row to prevent concurrent deductions)
  SELECT COALESCE(quantity - reserved, 0) INTO v_available
  FROM project_inventory
  WHERE project_id = v_from_project AND material_id = v_material_id
  FOR UPDATE;

  IF v_available IS NULL OR v_available < v_quantity THEN
    RAISE EXCEPTION 'Insufficient stock in source project. Available: %, Requested: %', COALESCE(v_available, 0), v_quantity;
  END IF;

  -- 1. Update transfer status
  UPDATE inventory_transfers
  SET status = 'completed',
      approved_by = p_approved_by,
      completed_at = now()
  WHERE id = p_transfer_id;

  -- 2. Deduct from source project
  UPDATE project_inventory
  SET quantity = quantity - v_quantity,
      last_updated = now()
  WHERE project_id = v_from_project AND material_id = v_material_id;

  -- 3. Add to destination project (upsert)
  INSERT INTO project_inventory (project_id, material_id, quantity, last_updated)
  VALUES (v_to_project, v_material_id, v_quantity, now())
  ON CONFLICT (project_id, material_id)
  DO UPDATE SET
    quantity = project_inventory.quantity + v_quantity,
    last_updated = now();

  -- 4. Log transfer_out on source
  INSERT INTO inventory_logs (project_id, material_id, type, quantity, reference_type, reference_id, performed_by)
  VALUES (v_from_project, v_material_id, 'transfer_out', -v_quantity, 'transfer', p_transfer_id, p_approved_by);

  -- 5. Log transfer_in on destination
  INSERT INTO inventory_logs (project_id, material_id, type, quantity, reference_type, reference_id, performed_by)
  VALUES (v_to_project, v_material_id, 'transfer_in', v_quantity, 'transfer', p_transfer_id, p_approved_by);
END;
$$;


-- ============================================================
-- fn_report_waste
-- Records material waste and deducts from inventory atomically.
-- ============================================================
CREATE OR REPLACE FUNCTION construction.fn_report_waste(
  p_project_id UUID,
  p_material_id UUID,
  p_quantity NUMERIC,
  p_waste_reason TEXT,   -- 'damaged', 'expired', 'spillage', 'theft', 'other'
  p_notes TEXT DEFAULT NULL,
  p_performed_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = construction
AS $$
DECLARE
  v_log_id UUID;
  v_available NUMERIC;
  v_company_id UUID;
BEGIN
  -- Authorization: verify the user belongs to this project's company
  SELECT p.company_id INTO STRICT v_company_id
  FROM projects p WHERE p.id = p_project_id;

  PERFORM 1 FROM company_members
  WHERE user_id = p_performed_by
    AND company_id = v_company_id
    AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized: user does not belong to this company';
  END IF;

  -- Validate stock exists (lock row to prevent concurrent waste/deduction race)
  SELECT COALESCE(quantity - reserved, 0) INTO v_available
  FROM project_inventory
  WHERE project_id = p_project_id AND material_id = p_material_id
  FOR UPDATE;

  IF v_available IS NULL OR v_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock to report waste. Available: %, Waste amount: %', COALESCE(v_available, 0), p_quantity;
  END IF;

  -- 1. Deduct from inventory
  UPDATE project_inventory
  SET quantity = quantity - p_quantity,
      last_updated = now()
  WHERE project_id = p_project_id AND material_id = p_material_id;

  -- 2. Log the waste
  INSERT INTO inventory_logs (project_id, material_id, type, quantity, waste_reason, notes, performed_by)
  VALUES (p_project_id, p_material_id, 'waste', -p_quantity, p_waste_reason, p_notes, p_performed_by)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;


-- ============================================================
-- fn_cancel_reservation
-- Cancels an active reservation and releases the reserved quantity.
-- ============================================================
CREATE OR REPLACE FUNCTION construction.fn_cancel_reservation(
  p_reservation_id UUID,
  p_performed_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = construction
AS $$
DECLARE
  v_project_id UUID;
  v_material_id UUID;
  v_quantity NUMERIC;
  v_status TEXT;
BEGIN
  -- Lock reservation row to prevent concurrent cancel/fulfill
  SELECT project_id, material_id, quantity, status
  INTO STRICT v_project_id, v_material_id, v_quantity, v_status
  FROM stock_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF v_status != 'active' THEN
    RAISE EXCEPTION 'Reservation is not active. Current status: %', v_status;
  END IF;

  -- Authorization: verify the user belongs to this project's company
  PERFORM 1 FROM company_members cm
  JOIN projects p ON p.company_id = cm.company_id
  WHERE cm.user_id = p_performed_by
    AND p.id = v_project_id
    AND cm.is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized: user does not belong to this company';
  END IF;

  -- 1. Cancel reservation
  UPDATE stock_reservations
  SET status = 'cancelled'
  WHERE id = p_reservation_id;

  -- 2. Release reserved quantity
  UPDATE project_inventory
  SET reserved = reserved - v_quantity,
      last_updated = now()
  WHERE project_id = v_project_id AND material_id = v_material_id;

  -- 3. Log the release
  INSERT INTO inventory_logs (project_id, material_id, type, quantity, reference_type, reference_id, performed_by)
  VALUES (v_project_id, v_material_id, 'release', v_quantity, 'manual', p_reservation_id, p_performed_by);
END;
$$;
```

### Transaction Function Security & Reliability Notes

**What's implemented above:**

1. **Company authorization** — Every `SECURITY DEFINER` function verifies the calling user belongs to the project's company via `company_members`. This prevents cross-tenant data access even though RLS is bypassed.
2. **Row-level locking (`FOR UPDATE`)** — All inventory reads that precede mutations lock the row for the duration of the transaction. This prevents race conditions where two concurrent operations read the same stock level and both proceed (e.g., double-reserving the same stock).

**Deferred to post-MVP (not critical for launch):**

1. **Idempotency protection** — Currently, a double-click on "Receive Delivery" could create duplicate records. For MVP, handle this in the UI layer (disable button on submit, show loading state, debounce). Post-MVP, consider adding an `idempotency_key UUID` parameter to critical functions and storing it to reject duplicates.
2. **Function modularity** — Functions like `fn_record_delivery` handle multiple steps inline (~80 lines). This is acceptable at current complexity. If functions grow beyond ~120 lines or share repeated logic (e.g., inventory upsert appears in multiple functions), extract shared helpers like `fn_upsert_inventory()` and `fn_log_inventory_movement()`. Sub-functions called within the same transaction still share atomicity guarantees.

---

## 4. Folder Structure

```
construction/
├── .env.local
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
│
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 20260101000000_create_schema.sql              # CREATE SCHEMA construction + grants
│   │   ├── 20260101000001_create_companies.sql
│   │   ├── 20260101000002_create_profiles.sql
│   │   ├── 20260101000003_create_projects.sql
│   │   ├── 20260101000004_create_materials_inventory.sql
│   │   ├── 20260101000005_create_reservations_transfers.sql
│   │   ├── 20260101000006_create_suppliers_procurement.sql
│   │   ├── 20260101000007_create_employees_attendance.sql
│   │   ├── 20260101000008_create_cash_advances_loans.sql
│   │   ├── 20260101000009_create_payroll.sql
│   │   ├── 20260101000010_create_project_costs.sql
│   │   ├── 20260101000011_create_expenses.sql
│   │   ├── 20260101000012_create_equipment.sql
│   │   ├── 20260101000013_create_documents.sql
│   │   ├── 20260101000014_create_notifications_audit.sql
│   │   ├── 20260101000015_create_subscriptions.sql
│   │   ├── 20260101000016_create_rls_policies.sql
│   │   └── 20260101000017_create_transaction_functions.sql
│   └── seed.sql
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout (providers, sidebar)
│   │   ├── page.tsx                    # Redirect to /dashboard
│   │   ├── globals.css
│   │   │
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── auth/
│   │   │       └── callback/
│   │   │           └── route.ts
│   │   │
│   │   ├── (app)/                      # Authenticated layout group
│   │   │   ├── layout.tsx              # Sidebar + header + auth guard
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx        # Detail/overview + cost summary
│   │   │   │       ├── inventory/
│   │   │   │       │   └── page.tsx
│   │   │   │       ├── costing/
│   │   │   │       │   └── page.tsx    # Materials/Labor/Equipment vs Budget
│   │   │   │       ├── members/
│   │   │   │       │   └── page.tsx
│   │   │   │       ├── expenses/
│   │   │   │       │   └── page.tsx
│   │   │   │       └── documents/
│   │   │   │           └── page.tsx
│   │   │   │
│   │   │   ├── inventory/
│   │   │   │   ├── page.tsx            # Global inventory overview
│   │   │   │   ├── materials/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── new/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── transfers/
│   │   │   │   │   └── page.tsx        # Transfer between projects
│   │   │   │   ├── reservations/
│   │   │   │   │   └── page.tsx        # Stock reservations
│   │   │   │   └── waste/
│   │   │   │       └── page.tsx        # Waste tracking
│   │   │   │
│   │   │   ├── procurement/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── suppliers/
│   │   │   │       ├── page.tsx
│   │   │   │       └── new/
│   │   │   │           └── page.tsx
│   │   │   │
│   │   │   ├── employees/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── loans/
│   │   │   │       │   └── page.tsx    # Cash advances & loans
│   │   │   │       └── payslips/
│   │   │   │           └── page.tsx
│   │   │   │
│   │   │   ├── attendance/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── payroll/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx        # Payroll detail with PH deductions
│   │   │   │
│   │   │   ├── expenses/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── equipment/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── documents/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── reports/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   └── settings/
│   │   │       ├── page.tsx            # Profile settings
│   │   │       ├── company/
│   │   │       │   └── page.tsx        # Company settings & billing
│   │   │       └── admin/
│   │   │           └── page.tsx        # User management
│   │   │
│   │   └── api/
│   │       └── webhooks/
│   │           └── route.ts
│   │
│   ├── components/
│   │   ├── ui/                         # shadcn/ui components
│   │   │   └── ...
│   │   │
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   ├── breadcrumbs.tsx
│   │   │   └── mobile-nav.tsx
│   │   │
│   │   ├── shared/
│   │   │   ├── data-table.tsx
│   │   │   ├── status-badge.tsx
│   │   │   ├── confirm-dialog.tsx
│   │   │   ├── file-upload.tsx
│   │   │   ├── search-input.tsx
│   │   │   ├── date-range-picker.tsx
│   │   │   ├── empty-state.tsx
│   │   │   └── loading-skeleton.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── kpi-cards.tsx
│   │   │   ├── project-summary.tsx
│   │   │   ├── recent-activity.tsx
│   │   │   └── expense-chart.tsx
│   │   │
│   │   └── forms/
│   │       ├── project-form.tsx
│   │       ├── material-form.tsx
│   │       ├── po-form.tsx
│   │       ├── employee-form.tsx
│   │       ├── expense-form.tsx
│   │       ├── equipment-form.tsx
│   │       ├── transfer-form.tsx
│   │       ├── reservation-form.tsx
│   │       ├── waste-report-form.tsx
│   │       ├── cash-advance-form.tsx
│   │       └── loan-form.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # Browser client (auth + realtime ONLY) — db.schema: 'construction'
│   │   │   ├── server.ts              # Server client (all data reads + mutations) — db.schema: 'construction'
│   │   │   ├── admin.ts               # Service role client (elevated ops) — db.schema: 'construction'
│   │   │   └── middleware.ts
│   │   │
│   │   ├── actions/                   # Server Actions ('use server')
│   │   │   ├── projects.ts            # createProject, updateProject, deleteProject
│   │   │   ├── inventory.ts           # createMaterial, updateStock, transferStock, reportWaste
│   │   │   ├── procurement.ts         # createPO, updatePO, createSupplier, recordDelivery
│   │   │   ├── employees.ts           # createEmployee, updateEmployee
│   │   │   ├── attendance.ts          # upsertAttendance
│   │   │   ├── payroll.ts             # createPayrollPeriod, computePayroll
│   │   │   ├── expenses.ts            # submitExpense, approveExpense, rejectExpense
│   │   │   ├── equipment.ts           # createEquipment, assignEquipment, returnEquipment
│   │   │   ├── documents.ts           # uploadDocument, deleteDocument
│   │   │   └── settings.ts            # updateProfile, updateCompany, updateUserRole
│   │   │
│   │   ├── queries/                   # Reusable server-side query functions
│   │   │   ├── projects.ts            # getProjects, getProjectById, getProjectMembers
│   │   │   ├── inventory.ts           # getMaterials, getProjectInventory, getTransfers
│   │   │   ├── procurement.ts         # getPurchaseOrders, getSuppliers, getPOById
│   │   │   ├── employees.ts           # getEmployees, getEmployeeById, getLoans
│   │   │   ├── attendance.ts          # getAttendanceByDate
│   │   │   ├── payroll.ts             # getPayrollPeriods, getPayrollById
│   │   │   ├── expenses.ts            # getExpenses
│   │   │   ├── equipment.ts           # getEquipment, getAssignments
│   │   │   ├── documents.ts           # getDocuments
│   │   │   ├── dashboard.ts           # getDashboardKPIs, getRecentActivity
│   │   │   └── reports.ts             # getProjectCostSummary, getPayrollReport
│   │   │
│   │   ├── payroll/
│   │   │   ├── sss-table.ts            # 2024 SSS contribution table
│   │   │   ├── philhealth-table.ts     # PhilHealth premium rate
│   │   │   ├── pagibig-table.ts        # Pag-IBIG contribution table
│   │   │   ├── tax-table.ts            # BIR withholding tax table
│   │   │   └── compute.ts             # Payroll computation logic
│   │   │
│   │   ├── utils.ts
│   │   ├── constants.ts
│   │   └── validators.ts
│   │
│   ├── store/                          # Redux — UI state ONLY
│   │   ├── store.ts
│   │   ├── provider.tsx
│   │   ├── hooks.ts
│   │   └── slices/
│   │       ├── uiSlice.ts             # Sidebar, modals, active tabs, filters
│   │       └── notificationSlice.ts   # Client-side toast queue
│   │
│   ├── hooks/
│   │   ├── use-realtime.ts             # Realtime subscriptions (notifications + inventory only)
│   │   ├── use-user.ts
│   │   └── use-debounce.ts
│   │
│   ├── types/
│   │   ├── database.ts
│   │   └── index.ts
│   │
│   └── middleware.ts
│
├── public/
│   ├── logo.svg
│   └── placeholder.svg
│
└── components.json
```

---

## 5. Feature Breakdown

### Phase 1 — MVP (Weeks 1–4)

| Module            | Features                                                                                |
| ----------------- | --------------------------------------------------------------------------------------- |
| **Auth**          | Google Sign-In, auto profile creation, session management, middleware route protection  |
| **Multi-Tenancy** | Company creation on first login, company_id scoping on all queries                      |
| **Dashboard**     | KPI cards (active projects count, total expenses, employee count), recent activity list |
| **Projects**      | CRUD, status management, progress tracking, assign members                              |
| **Materials**     | Global catalog CRUD, unit handling, categories                                          |
| **Inventory**     | Project-level stock view, manual stock in/out, inventory logs, **waste tracking**       |
| **Employees**     | CRUD, job title, daily rate/salary, SSS/PhilHealth/Pag-IBIG numbers                     |
| **Attendance**    | Daily attendance sheet (per project), mark present/absent/half-day                      |
| **Settings**      | Profile view/edit, admin: user role management (5 roles)                                |

### Phase 2 — Core Operations (Weeks 5–8)

| Module                  | Features                                                                                                                                                                      |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purchase Orders**     | Create POs with line items, supplier selection, approval workflow (draft → pending → approved → ordered)                                                                      |
| **Suppliers**           | CRUD, contact info                                                                                                                                                            |
| **Deliveries**          | Record deliveries against POs, auto-update inventory on delivery confirmation                                                                                                 |
| **Stock Reservations**  | Reserve materials for specific project phases/tasks, fulfill/cancel reservations                                                                                              |
| **Inventory Transfers** | Transfer stock between projects with approval workflow                                                                                                                        |
| **Payroll**             | Create payroll period, auto-compute from attendance, **SSS / PhilHealth / Pag-IBIG / withholding tax** deductions, **cash advance deductions**, **loan deductions**, approval |
| **Cash Advances**       | Request, approve, track balance, auto-deduct from payroll                                                                                                                     |
| **Employee Loans**      | Track SSS salary/calamity loans, Pag-IBIG MPL/calamity loans, company loans — auto-deduct amortization from payroll                                                           |
| **Expenses**            | Submit expenses with receipts (file upload), approval workflow, project-level expense view                                                                                    |
| **Project Costing**     | Track materials cost, labor cost, equipment cost — **total vs budget** dashboard per project                                                                                  |
| **Notifications**       | In-app notifications for approvals, low stock alerts, PO status changes                                                                                                       |

### Phase 3 — Advanced (Weeks 9–12)

| Module                      | Features                                                                                                                                             |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Equipment**               | Equipment registry, assign to projects, maintenance status tracking, daily rate for costing                                                          |
| **Documents**               | Upload/download files per project, categorize (blueprints, permits, contracts)                                                                       |
| **Reports**                 | Project cost summary (materials/labor/equipment vs budget), payroll reports with government contribution summaries, inventory reports, waste reports |
| **Audit Logs**              | Track all create/update/delete actions with user, timestamp, old/new data                                                                            |
| **Dashboard v2**            | Charts (recharts), expense trends, project cost breakdown, budget vs actual                                                                          |
| **Billing / Subscriptions** | Company subscription management, plan upgrades, payment tracking                                                                                     |
| **Realtime**                | Live notifications, live inventory updates                                                                                                           |

---

## 6. UI/UX Plan

### Overall Layout

```
┌────────────────────────────────────────────────────────────────┐
│  HEADER  [ Search ]  [ Notifications ]  [ Company ▾ ] [ Avatar ▾ ] │
├──────────┬─────────────────────────────────────────────────────┤
│          │                                                     │
│ SIDEBAR  │              MAIN CONTENT AREA                      │
│          │                                                     │
│ Dashboard│  ┌─────────────────────────────────────────────┐    │
│ Projects │  │  Breadcrumbs: Dashboard > Projects > #123   │    │
│ Inventory│  ├─────────────────────────────────────────────┤    │
│  -Stock  │  │                                             │    │
│  -Transf.│  │  Page Title        [ + New ] [ Filter ▾ ]   │    │
│  -Waste  │  │                                             │    │
│ Procure  │  │  ┌─────────────────────────────────────┐    │    │
│ Employees│  │  │         DATA TABLE                  │    │    │
│ Attend.  │  │  │  Name | Status | Date | Actions     │    │    │
│ Payroll  │  │  │  ...  | ...    | ...  | View Edit   │    │    │
│ Expenses │  │  │  ...  | ...    | ...  | View Edit   │    │    │
│ Equipment│  │  └─────────────────────────────────────┘    │    │
│ Documents│  │                                             │    │
│ Reports  │  │  [ ← Prev ]  Page 1 of 5  [ Next → ]      │    │
│          │  └─────────────────────────────────────────────┘    │
│ ──────── │                                                     │
│ Settings │                                                     │
│ Company  │                                                     │
└──────────┴─────────────────────────────────────────────────────┘
```

### CRUD Page Patterns

| Page Type       | shadcn Components Used                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| **List page**   | `Card`, `DataTable` (TanStack), `Badge` (status), `DropdownMenu` (actions), `Input` (search), `Select` (filters) |
| **Create/Edit** | `Form` (react-hook-form + zod), `Input`, `Select`, `Textarea`, `DatePicker`, `Button`                            |
| **Detail page** | `Card`, `Tabs` (for sub-sections), `Badge`, `Table` (for line items), `Button` (actions)                         |
| **Delete**      | `AlertDialog` for confirmation                                                                                   |
| **Dashboard**   | `Card` (KPI), custom charts (recharts), `Table` (recent activity)                                                |

### Design Tokens

| Token         | Value                                      |
| ------------- | ------------------------------------------ |
| Primary color | Blue-600                                   |
| Accent        | Amber-500                                  |
| Sidebar       | Slate-900 dark sidebar, white content area |
| Typography    | Inter                                      |
| Border radius | `0.5rem`                                   |

---

## 7. Data Flow

### Flow 1: Purchase Order → Inventory Update

```
1. Procurement officer creates PO (status: draft)
   └─ Supabase insert into purchase_orders + po_items
   └─ Dispatch fetchPurchaseOrders() to refresh Redux

2. Admin/PM approves PO (status: approved → ordered)
   └─ Supabase update purchase_orders.status
   └─ Insert notification for requester
   └─ Dispatch fetchPurchaseOrders()

3. Materials delivered (⚡ ALL steps run inside PostgreSQL transaction via `fn_record_delivery`)
   └─ supabase.rpc('fn_record_delivery', { ... })
   └─ Inside the transaction:
      ├─ Insert deliveries + delivery_items
      ├─ Update po_items.quantity_delivered
      ├─ Upsert project_inventory (add quantity)
      ├─ Insert inventory_logs (type: 'in', reference: PO)
      ├─ Insert project_costs (category: 'materials')
      └─ IF all items fully delivered → update PO status = 'delivered'
   └─ If ANY step fails → entire transaction rolls back automatically
   └─ Dispatch fetchInventory() + fetchPurchaseOrders()
```

### Flow 2: Attendance → Payroll (PH Statutory Deductions)

```
1. Daily: Foreman/PM records attendance
   └─ Supabase upsert attendance (employee_id + date unique)
   └─ Dispatch fetchAttendance()

2. End of period: Admin/Accountant creates payroll
   └─ Supabase insert payroll (status: draft)
   └─ For each active employee:
      ├─ Count attendance days → days_worked
      ├─ Sum overtime_hours
      ├─ Calculate:
      │   base_pay = days_worked × daily_rate (or monthly_salary prorated)
      │   overtime_pay = overtime_hours × (daily_rate / 8 × 1.25)
      │
      ├─ Look up PH statutory contributions:
      │   ├─ SSS: based on Monthly Salary Credit table
      │   ├─ PhilHealth: 5% of basic salary (split 50/50 EE/ER)
      │   ├─ Pag-IBIG: ₱100 EE / ₱100 ER (if salary > ₱1,500)
      │   └─ Withholding Tax: BIR tax table based on taxable income
      │
      ├─ Fetch active cash_advances → compute deduction
      ├─ Fetch active employee_loans → sum monthly amortizations
      │
      └─ Insert payroll_items with all computed values
   └─ Dispatch fetchPayroll()

3. Admin/Accountant reviews, adjusts if needed
   └─ Supabase update payroll_items
   └─ Dispatch fetchPayroll()

4. Admin approves → status = 'approved'
   └─ Sum payroll_items.net_pay → update payroll.total_amount
   └─ Update cash_advance remaining balances
   └─ Update loan remaining balances
   └─ Insert project_costs (category: 'labor') per project
   └─ Dispatch fetchPayroll()
```

### Flow 3: Stock Reservation → Fulfillment

```
1. PM/Engineer creates stock reservation (⚡ transaction via `fn_reserve_stock`)
   └─ supabase.rpc('fn_reserve_stock', { ... })
   └─ Inside the transaction:
      ├─ Validate available quantity >= requested (RAISES EXCEPTION if insufficient)
      ├─ Insert stock_reservations (status: active)
      ├─ Update project_inventory.reserved += quantity
      └─ Insert inventory_logs (type: 'reservation')
   └─ If ANY step fails → entire transaction rolls back automatically
   └─ Dispatch fetchInventory()

2. When materials used / reservation fulfilled (⚡ transaction via `fn_fulfill_reservation`)
   └─ supabase.rpc('fn_fulfill_reservation', { ... })
   └─ Inside the transaction:
      ├─ Update stock_reservations (status: fulfilled)
      ├─ Update project_inventory.quantity -= quantity
      ├─ Update project_inventory.reserved -= quantity
      └─ Insert inventory_logs (type: 'out')
   └─ If ANY step fails → entire transaction rolls back automatically
   └─ Dispatch fetchInventory()
```

### Flow 4: Inventory Transfer Between Projects

```
1. User requests transfer
   └─ Insert inventory_transfers (status: pending)
   └─ Dispatch fetchTransfers()

2. Admin/PM approves transfer (⚡ transaction via `fn_complete_transfer`)
   └─ supabase.rpc('fn_complete_transfer', { ... })
   └─ Inside the transaction:
      ├─ Validate source project has sufficient quantity (RAISES EXCEPTION if insufficient)
      ├─ Update inventory_transfers (status: completed, completed_at: now())
      ├─ Update from_project inventory.quantity -= quantity
      ├─ Upsert to_project inventory.quantity += quantity
      ├─ Insert inventory_logs (type: 'transfer_out') on source
      └─ Insert inventory_logs (type: 'transfer_in') on destination
   └─ If ANY step fails → entire transaction rolls back automatically
   └─ Dispatch fetchInventory()
```

### Flow 5: Waste Tracking

```
1. Foreman/PM reports waste (⚡ transaction via `fn_report_waste`)
   └─ supabase.rpc('fn_report_waste', { ... })
   └─ Inside the transaction:
      ├─ Validate project has sufficient quantity (RAISES EXCEPTION if insufficient)
      ├─ Update project_inventory.quantity -= wasted amount
      └─ Insert inventory_logs (type: 'waste', waste_reason, notes)
   └─ If ANY step fails → entire transaction rolls back automatically
   └─ Dispatch fetchInventory()

2. Waste reports viewable in /inventory/waste
   └─ Filter inventory_logs WHERE type = 'waste'
   └─ Group by material, project, reason
```

### Flow 6: Project Costing Summary

```
Dashboard at /projects/[id]/costing shows:

┌────────────────────────────────────────────┐
│  Project: Building A                        │
│  Budget: ₱5,000,000                        │
│                                            │
│  Materials Cost:   ₱1,200,000   (24%)      │
│  Labor Cost:       ₱800,000     (16%)      │
│  Equipment Cost:   ₱300,000     (6%)       │
│  ──────────────────────────────            │
│  Total Cost:       ₱2,300,000   (46%)      │
│  Remaining Budget: ₱2,700,000   (54%)      │
│                                            │
│  [Bar chart: cost breakdown by category]   │
└────────────────────────────────────────────┘

Data sources:
- Materials cost: from purchase_orders delivered to this project
- Labor cost: from payroll_items for employees assigned to this project
- Equipment cost: from equipment_assignments × equipment.daily_rate × days
```

---

## 8. Security & Roles

### Role Definitions (6 Roles)

> Roles are assigned per company via `company_members.role`, NOT on the `profiles` table.

| Role                    | Access Level                                                                                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Owner**               | Everything Admin can do + manage billing/subscription, transfer ownership, delete company. Exactly ONE per company (enforced by DB constraint).                            |
| **Admin**               | Full access. Manage users, manage company settings, approve payroll, manage all projects, view audit logs. Cannot manage billing or delete company.                        |
| **Project Manager**     | Manage assigned projects, create POs, approve expenses under threshold, manage attendance for their projects, view project reports, approve inventory transfers.           |
| **Accountant**          | Full access to payroll (compute, review, approve). View expenses, approve expenses. View project costing reports. Manage cash advances and loans. View all financial data. |
| **Procurement Officer** | Create and manage purchase orders, manage suppliers, record deliveries, manage materials catalog, view inventory.                                                          |
| **Staff**               | View assigned projects, submit expenses, view own attendance/payroll/payslips, upload documents.                                                                           |

### Route Protection Matrix

| Route                    | Owner | Admin | PM                | Accountant | Procurement | Staff               |
| ------------------------ | ----- | ----- | ----------------- | ---------- | ----------- | ------------------- |
| `/dashboard`             | ✅    | ✅    | ✅                | ✅         | ✅          | ✅                  |
| `/projects` (all)        | ✅    | ✅    | ✅ (assigned)     | ✅ (read)  | ✅ (read)   | ✅ (assigned, read) |
| `/projects/new`          | ✅    | ✅    | ✅                | ❌         | ❌          | ❌                  |
| `/projects/[id]/costing` | ✅    | ✅    | ✅ (own)          | ✅         | ❌          | ❌                  |
| `/inventory`             | ✅    | ✅    | ✅                | ✅ (read)  | ✅          | ✅ (read)           |
| `/inventory/transfers`   | ✅    | ✅    | ✅                | ❌         | ✅          | ❌                  |
| `/inventory/waste`       | ✅    | ✅    | ✅                | ✅ (read)  | ✅ (read)   | ❌                  |
| `/procurement`           | ✅    | ✅    | ✅ (read)         | ✅ (read)  | ✅          | ❌                  |
| `/procurement/new`       | ✅    | ✅    | ❌                | ❌         | ✅          | ❌                  |
| PO approval              | ✅    | ✅    | ✅ (own projects) | ❌         | ❌          | ❌                  |
| `/employees`             | ✅    | ✅    | ✅ (read)         | ✅ (read)  | ❌          | ❌                  |
| `/employees/[id]/loans`  | ✅    | ✅    | ❌                | ✅         | ❌          | ❌                  |
| `/attendance`            | ✅    | ✅    | ✅ (own projects) | ✅ (read)  | ❌          | ✅ (own, read)      |
| `/payroll`               | ✅    | ✅    | ❌                | ✅         | ❌          | ✅ (own, read)      |
| `/expenses`              | ✅    | ✅    | ✅ (own projects) | ✅         | ❌          | ✅ (own)            |
| `/reports`               | ✅    | ✅    | ✅ (own projects) | ✅         | ❌          | ❌                  |
| `/settings/company`      | ✅    | ✅    | ❌                | ❌         | ❌          | ❌                  |
| `/settings/billing`      | ✅    | ❌    | ❌                | ❌         | ❌          | ❌                  |
| `/settings/members`      | ✅    | ✅    | ❌                | ❌         | ❌          | ❌                  |

### Supabase RLS Strategy

> **Key change:** All RLS helpers now derive company and role from `company_members`,
> NOT from `profiles`. This ensures proper multi-tenant isolation via the junction table.

```sql
-- Enable RLS on all tables in the construction schema
ALTER TABLE construction.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.company_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.projects ENABLE ROW LEVEL SECURITY;
-- ... (all tables in construction schema)

-- Helper: get current user's company_id (via company_members)
CREATE OR REPLACE FUNCTION auth.user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM construction.company_members
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = construction;

-- Helper: get current user's role (via company_members)
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  SELECT role FROM construction.company_members
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = construction;

-- Helper: check if user is owner or admin
CREATE OR REPLACE FUNCTION auth.is_company_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM construction.company_members
    WHERE user_id = auth.uid()
      AND is_active = true
      AND role IN ('owner', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = construction;

-- ═══════════════════════════════════════════
-- COMPANY_MEMBERS: users see members of their own company
-- ═══════════════════════════════════════════
CREATE POLICY "View own company members"
  ON company_members FOR SELECT
  USING (company_id = auth.user_company_id());

CREATE POLICY "Owner/Admin manage members"
  ON company_members FOR ALL
  USING (
    company_id = auth.user_company_id()
    AND auth.is_company_admin()
  );

-- ═══════════════════════════════════════════
-- COMPANY_INVITATIONS: owner/admin can manage
-- ═══════════════════════════════════════════
CREATE POLICY "Owner/Admin manage invitations"
  ON company_invitations FOR ALL
  USING (
    company_id = auth.user_company_id()
    AND auth.is_company_admin()
  );

-- Allow invited users to read their own invitation (by email match)
CREATE POLICY "Invited user can view own invitation"
  ON company_invitations FOR SELECT
  USING (
    invited_email = (SELECT email FROM construction.profiles WHERE id = auth.uid())
  );

-- ═══════════════════════════════════════════
-- COMPANY ISOLATION: All tables with company_id use this pattern
-- ═══════════════════════════════════════════
-- Example for projects:
CREATE POLICY "Company isolation for projects"
  ON projects FOR ALL
  USING (company_id = auth.user_company_id());

-- PROFILES: users see own company members + own profile
CREATE POLICY "Users view own company profiles"
  ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR id IN (
      SELECT user_id FROM company_members
      WHERE company_id = auth.user_company_id()
    )
  );

CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Owner/Admin update any profile in company"
  ON profiles FOR UPDATE
  USING (
    auth.is_company_admin()
    AND id IN (
      SELECT user_id FROM company_members
      WHERE company_id = auth.user_company_id()
    )
  );

-- PROJECTS: company-scoped, then role-based within company
CREATE POLICY "Company members view projects"
  ON projects FOR SELECT
  USING (
    company_id = auth.user_company_id()
    AND (
      auth.user_role() IN ('owner', 'admin', 'accountant', 'procurement_officer')
      OR id IN (
        SELECT pm.project_id FROM project_members pm
        JOIN employees e ON e.id = pm.employee_id
        WHERE e.profile_id = auth.uid() AND pm.removed_at IS NULL
      )
    )
  );

-- PAYROLL: owner/admin + accountant full access, staff own only
CREATE POLICY "Admin/Accountant view all payroll"
  ON payroll FOR SELECT
  USING (
    company_id = auth.user_company_id()
    AND auth.user_role() IN ('owner', 'admin', 'accountant')
  );

CREATE POLICY "Staff view own payroll items"
  ON payroll_items FOR SELECT
  USING (
    auth.user_role() IN ('owner', 'admin', 'accountant')
    OR employee_id IN (
      SELECT id FROM employees WHERE profile_id = auth.uid()
    )
  );

-- PURCHASE ORDERS: procurement_officer + admin/owner create
CREATE POLICY "Create POs"
  ON purchase_orders FOR INSERT
  WITH CHECK (
    company_id = auth.user_company_id()
    AND auth.user_role() IN ('owner', 'admin', 'procurement_officer')
  );

-- AUDIT LOGS: owner/admin only
CREATE POLICY "Admin only audit logs"
  ON audit_logs FOR SELECT
  USING (
    company_id = auth.user_company_id()
    AND auth.user_role() = 'admin'
  );
```

### Middleware Auth Guard

```typescript
// src/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = ["/login", "/auth/callback"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const supabase = createServerClient(/* ... */);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg)$).*)",
  ],
};
```

---

## 9. API / Server Actions Design

### Pattern: Server Components for Reads + Server Actions for Mutations

The data flow is server-first:

1. **Fetch**: Server Components call query functions (in `src/lib/queries/`) using Supabase server client → pass data as props
2. **Mutate**: Client Components call Server Actions (in `src/lib/actions/`) → action mutates via Supabase server client → `revalidatePath()` refreshes the page

No Redux for data. No async thunks. No client-side Supabase queries for CRUD.

### Server-Side Query Functions

```typescript
// src/lib/queries/projects.ts
import { createClient } from "@/lib/supabase/server";

export async function getProjects(params: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { status, page = 1, limit = 20 } = params;
  const supabase = await createClient();
  const from = (page - 1) * limit;

  let query = supabase
    .from("projects")
    .select("*, project_members(count)", { count: "exact" })
    .range(from, from + limit - 1)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0 };
}

export async function getProjectById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*, project_members(*, employees(*))")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}
```

### Server Component Page (Fetching Data)

```typescript
// src/app/(app)/projects/page.tsx — Server Component (NO 'use client')
import { getProjects } from '@/lib/queries/projects'
import { ProjectsPageClient } from './projects-page-client'

interface Props {
  searchParams: Promise<{ status?: string; page?: string }>
}

export default async function ProjectsPage({ searchParams }: Props) {
  const params = await searchParams
  const { items, total } = await getProjects({
    status: params.status,
    page: params.page ? parseInt(params.page) : 1,
  })

  return <ProjectsPageClient projects={items} total={total} />
}
```

### Client Component (Receiving Props + Calling Server Actions)

```typescript
// src/app/(app)/projects/projects-page-client.tsx
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createProject } from '@/lib/actions/projects'
import { ProjectsTable } from '@/components/shared/data-table'
import type { Project } from '@/types'

interface Props {
  projects: Project[]
  total: number
}

export function ProjectsPageClient({ projects, total }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function handleCreate(formData: FormData) {
    const result = await createProject(formData)
    if (result?.error) {
      // show error toast
    }
    // No manual refetch needed — revalidatePath() in the Server Action
    // causes the Server Component to re-run and pass fresh props
  }

  function handleFilterChange(status: string) {
    // Update URL search params → triggers Server Component re-fetch
    startTransition(() => {
      router.push(`/projects?status=${status}`)
    })
  }

  return (
    <ProjectsTable
      data={projects}
      total={total}
      onCreate={handleCreate}
      onFilterChange={handleFilterChange}
      loading={isPending}
    />
  )
}
```

### Server Action (Mutation)

```typescript
// src/lib/actions/projects.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { projectSchema } from "@/lib/validators";

export async function createProject(formData: FormData) {
  const supabase = await createClient();

  // Get current user for company_id
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  // Validate input
  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    status: formData.get("status"),
    budget: Number(formData.get("budget")),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
  });

  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { error } = await supabase
    .from("projects")
    .insert({ ...parsed.data, company_id: profile!.company_id });

  if (error) return { error: error.message };

  revalidatePath("/projects");
  return { success: true };
}

export async function updateProject(id: string, formData: FormData) {
  const supabase = await createClient();
  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    status: formData.get("status"),
    budget: Number(formData.get("budget")),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
  });

  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { error } = await supabase
    .from("projects")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  return { success: true };
}

export async function deleteProject(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/projects");
  return { success: true };
}
```

### Server Actions — Transactional Inventory Operations

> These server actions call PostgreSQL transaction functions via `supabase.rpc()`.
> All multi-step inventory operations are atomic — they either fully succeed or fully roll back.

```typescript
// src/lib/actions/procurement.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function recordDelivery(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const items = JSON.parse(formData.get("items") as string);

  // Single RPC call — entire operation is atomic
  const { data: deliveryId, error } = await supabase.rpc("fn_record_delivery", {
    p_purchase_order_id: formData.get("purchase_order_id"),
    p_received_by: user.id,
    p_notes: formData.get("notes") || null,
    p_items: items,
  });

  if (error) return { error: error.message };

  revalidatePath("/inventory");
  revalidatePath("/procurement");
  return { success: true, deliveryId };
}
```

```typescript
// src/lib/actions/inventory.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function reserveStock(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: reservationId, error } = await supabase.rpc(
    "fn_reserve_stock",
    {
      p_project_id: formData.get("project_id"),
      p_material_id: formData.get("material_id"),
      p_quantity: Number(formData.get("quantity")),
      p_purpose: formData.get("purpose"),
      p_reserved_by: user.id,
    },
  );

  if (error) return { error: error.message };

  revalidatePath("/inventory");
  return { success: true, reservationId };
}

export async function fulfillReservation(reservationId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.rpc("fn_fulfill_reservation", {
    p_reservation_id: reservationId,
    p_performed_by: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/inventory");
  return { success: true };
}

export async function cancelReservation(reservationId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.rpc("fn_cancel_reservation", {
    p_reservation_id: reservationId,
    p_performed_by: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/inventory");
  return { success: true };
}

export async function transferStock(transferId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.rpc("fn_complete_transfer", {
    p_transfer_id: transferId,
    p_approved_by: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/inventory");
  return { success: true };
}

export async function reportWaste(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: logId, error } = await supabase.rpc("fn_report_waste", {
    p_project_id: formData.get("project_id"),
    p_material_id: formData.get("material_id"),
    p_quantity: Number(formData.get("quantity")),
    p_waste_reason: formData.get("waste_reason"),
    p_notes: formData.get("notes") || null,
    p_performed_by: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/inventory");
  return { success: true, logId };
}
```

### Payroll Computation Logic (PH Statutory)

```typescript
// src/lib/payroll/compute.ts

import { getSSSContribution } from "./sss-table";
import { getPhilHealthContribution } from "./philhealth-table";
import { getPagIBIGContribution } from "./pagibig-table";
import { getWithholdingTax } from "./tax-table";

interface PayrollInput {
  employee: Employee;
  daysWorked: number;
  overtimeHours: number;
  cashAdvanceBalance: number;
  loanAmortizations: number;
}

export function computePayrollItem(input: PayrollInput) {
  const {
    employee,
    daysWorked,
    overtimeHours,
    cashAdvanceBalance,
    loanAmortizations,
  } = input;

  // Base pay
  const basePay =
    employee.employee_type === "daily_wage"
      ? daysWorked * (employee.daily_rate ?? 0)
      : (employee.monthly_salary ?? 0); // or prorated for semi-monthly

  // Overtime: 125% of hourly rate
  const hourlyRate =
    employee.employee_type === "daily_wage"
      ? (employee.daily_rate ?? 0) / 8
      : (employee.monthly_salary ?? 0) / 22 / 8;
  const overtimePay = overtimeHours * hourlyRate * 1.25;

  const grossPay = basePay + overtimePay;

  // PH Statutory Deductions
  const sss = getSSSContribution(grossPay); // { ee, er }
  const philhealth = getPhilHealthContribution(grossPay); // { ee, er }
  const pagibig = getPagIBIGContribution(grossPay); // { ee, er }

  // Taxable income = gross - employee statutory contributions
  const taxableIncome = grossPay - sss.ee - philhealth.ee - pagibig.ee;
  const withholdingTax = getWithholdingTax(taxableIncome);

  // Cash advance deduction (partial or full)
  const cashAdvanceDeduction = Math.min(cashAdvanceBalance, grossPay * 0.2); // max 20% of gross

  return {
    basePay,
    overtimePay,
    sss_ee: sss.ee,
    sss_er: sss.er,
    philhealth_ee: philhealth.ee,
    philhealth_er: philhealth.er,
    pagibig_ee: pagibig.ee,
    pagibig_er: pagibig.er,
    withholdingTax,
    cashAdvanceDeduction,
    loanDeduction: loanAmortizations,
    totalDeductions:
      sss.ee +
      philhealth.ee +
      pagibig.ee +
      withholdingTax +
      cashAdvanceDeduction +
      loanAmortizations,
    grossPay,
    netPay:
      grossPay -
      (sss.ee +
        philhealth.ee +
        pagibig.ee +
        withholdingTax +
        cashAdvanceDeduction +
        loanAmortizations),
  };
}
```

### CRUD Operation Summary

| Operation         | Pattern                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| **List**          | Server Component calls query function → passes data as props to Client Component                            |
| **Get by ID**     | Server Component calls `getXById(id)` → passes as props                                                     |
| **Create**        | Client Component calls Server Action → action inserts via Supabase server client → `revalidatePath()`       |
| **Update**        | Client Component calls Server Action → action updates via Supabase server client → `revalidatePath()`       |
| **Delete**        | Confirm dialog → Client Component calls Server Action → action deletes → `revalidatePath()`                 |
| **Search/Filter** | Client Component updates URL search params → Server Component re-runs with new params → fresh data as props |

---

## 10. Realtime Features

### Where to Use Realtime (ONLY these two)

| Feature               | Table               | Event  | Purpose                                                                        |
| --------------------- | ------------------- | ------ | ------------------------------------------------------------------------------ |
| **Notifications**     | `notifications`     | INSERT | Notification bell badge updates instantly when someone gets a new notification |
| **Inventory updates** | `project_inventory` | UPDATE | Live stock levels when multiple users updating inventory on same project       |

### Implementation

```typescript
// src/hooks/use-realtime.ts
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function useNotificationRealtime(userId: string) {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "construction",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Trigger Server Component re-fetch to get fresh notification data
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router]);
}

export function useInventoryRealtime(projectId: string) {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`inventory-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "construction",
          table: "project_inventory",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          // Trigger Server Component re-fetch to get fresh inventory data
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, router]);
}
```

### Supabase Configuration

Only enable realtime on these two tables:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE construction.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE construction.project_inventory;
```

---

## 11. Deployment Strategy

### Vercel + Supabase Setup

```
┌────────────────────────┐     ┌─────────────────────────┐
│       VERCEL            │     │       SUPABASE           │
│                        │     │                         │
│  Next.js App           │────▶│  PostgreSQL Database    │
│  (Auto-deploy from     │     │  Auth (Google OAuth)    │
│   GitHub main branch)  │     │  Storage (documents)    │
│                        │     │  Realtime               │
│  Preview deployments   │     │  Edge Functions         │
│  for PRs               │     │                         │
└────────────────────────┘     └─────────────────────────┘
```

### Environment Variables

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Google OAuth Setup

1. **Google Cloud Console**: Create OAuth 2.0 Client ID, set redirect URI to `https://<project>.supabase.co/auth/v1/callback`
2. **Supabase Dashboard**: Enable Google provider, paste credentials
3. **Vercel**: Set `NEXT_PUBLIC_APP_URL` to production domain

### Deployment Checklist

| Step | Action                                                             |
| ---- | ------------------------------------------------------------------ |
| 1    | Create Supabase project (production)                               |
| 2    | Run all migrations against production database                     |
| 3    | Configure Google OAuth in Google Cloud Console                     |
| 4    | Add Google credentials to Supabase Auth settings                   |
| 5    | Set Supabase redirect URLs for Vercel domain                       |
| 6    | Connect GitHub repo to Vercel                                      |
| 7    | Set environment variables in Vercel dashboard                      |
| 8    | Deploy — Vercel auto-builds from `main`                            |
| 9    | Verify OAuth flow end-to-end                                       |
| 10   | Enable Supabase realtime on notifications + project_inventory only |

---

## Summary

This system is a **multi-tenant SaaS** platform where multiple construction companies subscribe and pay monthly. Key design decisions:

- **Custom `construction` schema**: All application tables live in `construction` (not `public`), configured via `db: { schema: "construction" }` in the Supabase JS client and exposed via PostgREST
- **Server-first data flow**: Server Components fetch data via Supabase server client → pass as props. Mutations via Server Actions + `revalidatePath()`. No client-side data fetching for CRUD.
- **Redux for UI state only**: Sidebar, modals, toasts, active filters. No data slices, no async thunks, no server data cached in Redux.
- **Server Actions for all mutations**: Create/update/delete operations defined in `src/lib/actions/`, validated with Zod, executed server-side.
- **URL-driven filtering**: Search and filter params live in the URL → Server Components re-run with new params → no client-side state management for query params.
- **Multi-tenant**: All data scoped by `company_id`, enforced via RLS policies
- **6 roles**: owner, admin, project_manager, accountant, procurement_officer, staff
- **PH payroll**: SSS, PhilHealth, Pag-IBIG, withholding tax, cash advances, loan deductions
- **Advanced inventory**: Stock reservations, transfers between projects, waste tracking
- **Project costing**: Materials + Labor + Equipment costs tracked against budget
- **Realtime only where needed**: Notifications and inventory updates via `router.refresh()` — nothing else
