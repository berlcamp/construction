# Construction Management System

A multi-tenant SaaS platform for small-to-medium construction firms in the Philippines. Manage projects, inventory, employees, payroll, and procurement in one place with proper company isolation and Philippine statutory compliance.

## Tech Stack

- **Framework:** Next.js 16 (App Router, React 19)
- **Database:** Supabase (PostgreSQL) with custom `construction` schema
- **Auth:** Supabase Auth (Google OAuth)
- **State:** Redux Toolkit (UI state only)
- **UI:** shadcn/ui, Tailwind CSS, Lucide icons
- **Forms:** React Hook Form + Zod validation
- **Language:** TypeScript

## Features

### Phase 1 — Foundation & Auth (Current)

- Google OAuth sign-in with auto-profile creation
- Company onboarding with 14-day trial subscription
- Role-based invitation system (Owner/Admin can invite with role assignment)
- Session persistence with middleware-based cookie refresh
- Route protection (unauthenticated users redirected to login)
- App shell: collapsible dark sidebar, header with notification bell, breadcrumbs
- Dashboard placeholder with KPI cards

### Database

- 30 tables in a dedicated `construction` schema
- Row Level Security (RLS) on every table with company isolation
- Multi-tenant data isolation via `company_members` junction table
- 6 atomic PostgreSQL transaction functions for inventory operations
- `updated_at` triggers on key tables

### Planned Phases

| Phase | Module | Description |
|-------|--------|-------------|
| 2 | Projects, Employees & Attendance | Core operational entities, CRUD, project assignments, daily attendance |
| 3 | Inventory & Procurement | Materials catalog, stock operations, suppliers, purchase orders, deliveries |
| 4 | Payroll & HR Finance | PH statutory payroll (SSS/PhilHealth/Pag-IBIG/BIR), cash advances, loans |
| 5 | Operations, Reports & Launch | Expenses, equipment, documents, notifications, reports, billing, realtime |

## Project Structure

```
src/
  app/
    (auth)/          # Login, OAuth callback
    (app)/           # Authenticated app shell
      dashboard/     # Dashboard page
      onboarding/    # Company creation
      settings/      # Team member management
    invite/          # Invitation token handling
  components/
    layout/          # Sidebar, Header, Breadcrumbs
    providers/       # ReduxProvider
    ui/              # shadcn/ui components
  lib/
    auth/            # getCompanyContext, acceptInvitation, ensureProfile
    redux/           # store, uiSlice, notificationSlice
    supabase/        # Server client, browser client, middleware helper
  types/             # Database TypeScript types
supabase/
  migrations/        # 19 migration files
  config.toml        # Supabase project config
```

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase CLI
- Docker Desktop (for local Supabase)

### Setup

```bash
# Install dependencies
npm install

# Start local Supabase
supabase start

# Apply migrations
supabase db reset

# Set environment variables
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SITE_URL

# Run dev server
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `NEXT_PUBLIC_SITE_URL` | App URL (e.g. `http://localhost:3000`) |

## Multi-Tenancy

All data is isolated per company using PostgreSQL Row Level Security:

- Every table has RLS enabled
- Policies use `construction.user_company_id()` helper to scope queries
- Users access only their company's data
- Transaction functions validate company membership before executing

## Roles

| Role | Permissions |
|------|------------|
| Owner | Full access, manage members, billing |
| Admin | Full access, manage members |
| Project Manager | Manage assigned projects |
| Accountant | View projects, manage payroll/expenses |
| Procurement Officer | Manage purchase orders, suppliers |
| Staff | View assigned projects only |

## License

Private — All rights reserved.
