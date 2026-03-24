# Requirements: Construction Management System

**Defined:** 2026-03-24
**Core Value:** Construction companies can manage their entire operation — projects, inventory, employees, payroll, and procurement — in one platform with proper multi-tenant isolation and Philippine statutory compliance.

## v1 Requirements

### Foundation & Database

- [x] **FOUND-01**: Custom `construction` PostgreSQL schema created with all 25+ tables, RLS enabled, and exposed via PostgREST
- [x] **FOUND-02**: All RLS policies enforce company isolation via `company_members` junction table (not `profiles.company_id`)
- [x] **FOUND-03**: PostgreSQL transaction functions deployed: `fn_record_delivery`, `fn_reserve_stock`, `fn_fulfill_reservation`, `fn_complete_transfer`, `fn_report_waste`, `fn_cancel_reservation`
- [x] **FOUND-04**: `updated_at` triggers applied to all relevant tables
- [ ] **FOUND-05**: Auto-profile creation trigger fires on `auth.users` INSERT, populating `construction.profiles`
- [x] **FOUND-06**: Supabase JS clients (server + browser) configured with `db: { schema: 'construction' }`

### Authentication & Multi-Tenancy

- [x] **AUTH-01**: User can sign in with Google OAuth via Supabase Auth
- [x] **AUTH-02**: On first login, profile is auto-created in `construction.profiles`
- [x] **AUTH-03**: User with no `company_members` record is redirected to company onboarding flow
- [x] **AUTH-04**: User can create a company; system atomically creates company + owner membership + trial subscription
- [x] **AUTH-05**: Session persists across browser refresh; middleware refreshes cookies on every request
- [x] **AUTH-06**: Unauthenticated requests to protected routes redirect to `/login`
- [x] **AUTH-07**: Owner/Admin can invite users by email with role assignment
- [x] **AUTH-08**: Invited user can accept invitation via token link, resulting in `company_members` record creation
- [x] **AUTH-09**: Invitations expire after 7 days; duplicate pending invitations to same email are rejected
- [x] **AUTH-10**: Exactly one owner per company enforced by partial unique index

### Dashboard

- [ ] **DASH-01**: Dashboard shows KPI cards: active project count, total expenses, active employee count
- [ ] **DASH-02**: Dashboard shows recent activity list (last 10 events)
- [ ] **DASH-03**: Dashboard v2 shows expense trend chart and budget vs actual bar chart (recharts)

### Projects

- [ ] **PROJ-01**: User can create, read, update, delete projects (CRUD) with name, description, location, client, status, budget, dates
- [ ] **PROJ-02**: Project status can be set to: planning, active, on_hold, completed, cancelled
- [ ] **PROJ-03**: Project progress (0–100%) can be updated manually
- [ ] **PROJ-04**: Employees can be assigned to a project with a role (project_manager, engineer, foreman, member)
- [ ] **PROJ-05**: Project detail page shows cost summary: materials / labor / equipment costs vs budget
- [ ] **PROJ-06**: Project-level expense view shows all expenses for that project
- [ ] **PROJ-07**: Project-level document view shows all documents for that project

### Materials & Inventory

- [ ] **INV-01**: User can manage a company-wide materials catalog with name, unit, category, unit cost, SKU, min stock
- [ ] **INV-02**: Project-level inventory shows current stock per material with reserved quantity
- [ ] **INV-03**: Manual stock-in and stock-out adjustments are logged in `inventory_logs`
- [ ] **INV-04**: Waste can be reported with reason (damaged/expired/spillage/theft/other); atomically deducts from inventory
- [ ] **INV-05**: Stock can be reserved for a project phase/task; reservation atomically updates `project_inventory.reserved`
- [ ] **INV-06**: Reservations can be fulfilled (deducts stock) or cancelled (releases reserved quantity) — both atomic
- [ ] **INV-07**: Stock can be transferred between projects; atomic transfer updates both projects' inventory and logs
- [ ] **INV-08**: All inventory movements are traceable via `inventory_logs` (type, quantity, reference, performer, timestamp)
- [ ] **INV-09**: Low-stock alert notification fires when project inventory drops below material's `min_stock`

### Procurement

- [ ] **PROC-01**: User can manage suppliers (CRUD) with contact info
- [ ] **PROC-02**: User can create purchase orders with multiple line items (material + quantity + unit cost)
- [ ] **PROC-03**: PO follows approval workflow: draft → pending_approval → approved → ordered → partially_delivered/delivered/cancelled
- [ ] **PROC-04**: PO number is auto-generated in format `PO-YYYY-NNNN` per company
- [ ] **PROC-05**: Delivery against a PO atomically updates inventory, creates delivery record, logs cost, and updates PO status
- [ ] **PROC-06**: PO status changes trigger in-app notifications to the requester

### Employees

- [ ] **EMP-01**: User can create, read, update, delete employees with PH government IDs (SSS, PhilHealth, Pag-IBIG, TIN)
- [ ] **EMP-02**: Employee types: salaried, daily_wage, contract — each with appropriate rate field
- [ ] **EMP-03**: Employee status: active, inactive, terminated
- [ ] **EMP-04**: Employee profile linked to system user profile (optional — for employees who also have user accounts)

### Attendance

- [ ] **ATT-01**: Attendance can be recorded daily per employee per project (present, absent, half_day, overtime, leave)
- [ ] **ATT-02**: Hours worked and overtime hours tracked per attendance record
- [ ] **ATT-03**: Attendance records are unique per employee per date (upsert on duplicate)
- [ ] **ATT-04**: Attendance data feeds payroll computation

### Payroll

- [ ] **PAY-01**: Payroll period can be created for weekly, semi-monthly, or monthly cycles
- [ ] **PAY-02**: Payroll items are auto-computed from attendance: base pay + overtime pay per employee
- [ ] **PAY-03**: SSS contribution deducted using official 2024/2025 contribution table (both EE and ER shares recorded)
- [ ] **PAY-04**: PhilHealth contribution deducted at 5% of basic salary (50/50 split EE/ER) with ₱100k salary ceiling
- [ ] **PAY-05**: Pag-IBIG contribution deducted at ₱100 EE / ₱100 ER for salaries above ₱1,500
- [ ] **PAY-06**: BIR withholding tax computed using TRAIN Act tax table (annualized, then divided by pay periods)
- [ ] **PAY-07**: Active cash advances are deducted from payroll (max 20% of gross per period)
- [ ] **PAY-08**: Active loan amortizations deducted from payroll
- [ ] **PAY-09**: Gross pay, total deductions, and net pay computed and stored as generated columns
- [ ] **PAY-10**: Payroll follows approval workflow: draft → computed → approved → paid
- [ ] **PAY-11**: On approval, cash advance and loan balances are decremented, labor costs recorded in `project_costs`
- [ ] **PAY-12**: Employee can view own payslip

### Cash Advances & Loans

- [ ] **FIN-01**: Admin/Accountant can record a cash advance request for an employee
- [ ] **FIN-02**: Cash advance follows approval workflow: pending → approved → paid_out → fully_deducted
- [ ] **FIN-03**: Cash advance remaining balance tracked; decrements on each payroll deduction
- [ ] **FIN-04**: Employee loans (SSS salary/calamity, Pag-IBIG MPL/calamity, company) recorded with monthly amortization
- [ ] **FIN-05**: Loan remaining balance tracked; decrements on each payroll deduction

### Expenses

- [ ] **EXP-01**: User can submit expense with category, description, amount, date, and optional receipt upload
- [ ] **EXP-02**: Expenses can be project-specific or company-wide
- [ ] **EXP-03**: Expense follows approval workflow: pending → approved/rejected
- [ ] **EXP-04**: Approved expenses appear in project cost summary

### Equipment

- [ ] **EQUIP-01**: Equipment registry with name, type, serial number, status (available/in_use/maintenance/retired), daily rate
- [ ] **EQUIP-02**: Equipment can be assigned to a project with assignment date; returned with returned date
- [ ] **EQUIP-03**: Equipment assignment duration × daily rate contributes to project equipment costs

### Documents

- [ ] **DOC-01**: Files can be uploaded to Supabase Storage and linked to a project or company
- [ ] **DOC-02**: Document categories: blueprint, permit, contract, report, photo, invoice, receipt, other
- [ ] **DOC-03**: Documents can be downloaded by authorized users; cross-tenant access prevented by Storage RLS

### Notifications

- [ ] **NOTF-01**: In-app notifications delivered for: PO approval requests, expense approval requests, low stock alerts, payroll approvals, invitation accepted
- [ ] **NOTF-02**: Notification bell shows unread count, updated via Supabase Realtime (INSERT on notifications table)
- [ ] **NOTF-03**: Notifications can be marked as read

### Reports

- [ ] **REP-01**: Project cost summary report: materials / labor / equipment costs vs budget, by project
- [ ] **REP-02**: Payroll report: gross pay, statutory deductions (SSS/PhilHealth/Pag-IBIG/tax), net pay per period
- [ ] **REP-03**: Inventory report: stock levels, movements, waste summary per project
- [ ] **REP-04**: Audit log viewable by admin: all CRUD actions with user, timestamp, old/new data

### Settings & Administration

- [ ] **SETT-01**: User can edit own profile (name, phone, avatar)
- [ ] **SETT-02**: Owner/Admin can update company settings (name, address, contact, TIN)
- [ ] **SETT-03**: Owner/Admin can view and manage team members (assign roles, deactivate users)
- [ ] **SETT-04**: Owner can view subscription status and manage billing (plan, payment method, history)

### Billing & Subscriptions

- [ ] **BILL-01**: Subscription plans enforced: Starter (3 projects, 10 employees, 2 users), Professional (15 projects, 50 employees, 10 users), Business (unlimited, 25 users), Enterprise (custom)
- [ ] **BILL-02**: Stripe-powered billing with PHP currency; webhook handler updates subscription status
- [ ] **BILL-03**: Trial period of 14 days with access to Professional-tier limits

### Realtime

- [ ] **RT-01**: Notification bell updates in real time when new notifications arrive (Supabase Realtime on `notifications`)
- [ ] **RT-02**: Project inventory page reflects live stock changes when multiple users work simultaneously (Supabase Realtime on `project_inventory`)

---

## v2 Requirements

### BIR E-Filing

- **BIR-01**: Export payroll data in BIR alphalist format
- **BIR-02**: Generate BIR Form 1601C (monthly remittance return)

### Advanced Scheduling

- **SCHED-01**: Gantt chart view for project phases
- **SCHED-02**: Task dependencies and critical path

### Multi-Company

- **MULTI-01**: User can belong to multiple companies with separate roles
- **MULTI-02**: Switch between company contexts without re-login

### Subcontractor Management

- **SUB-01**: Subcontractor registry with contract amounts and payment tracking
- **SUB-02**: Subcontractor payments integrated with project costing

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time chat / messaging | High complexity, not core; construction teams use Messenger/Viber for chat |
| Native mobile app | Web-first with responsive design; mobile browser sufficient for v1 |
| OAuth providers beyond Google | Google accounts widespread in PH; complexity not justified for v1 |
| Video posts / media streaming | Storage/bandwidth costs, not a construction workflow need |
| Gantt charts / advanced project scheduling | Significant complexity; defer to v2 |
| BIR e-filing / alphalist export | Specialized compliance tooling; defer to v2 |
| Subcontractor management | Out of scope for 5-50 employee target segment v1 |
| Multi-currency | PH market is PHP only |
| Offline mode / PWA | Supabase Realtime requires connectivity; full offline support is a separate product investment |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 to FOUND-06 | Phase 1 | Pending |
| AUTH-01 to AUTH-10 | Phase 1 | Pending |
| DASH-01 to DASH-02 | Phase 2 | Pending |
| PROJ-01 to PROJ-07 | Phase 2 | Pending |
| EMP-01 to EMP-04 | Phase 2 | Pending |
| ATT-01 to ATT-04 | Phase 2 | Pending |
| SETT-01 to SETT-03 | Phase 2 | Pending |
| INV-01 to INV-09 | Phase 3 | Pending |
| PROC-01 to PROC-06 | Phase 3 | Pending |
| PAY-01 to PAY-12 | Phase 4 | Pending |
| FIN-01 to FIN-05 | Phase 4 | Pending |
| EXP-01 to EXP-04 | Phase 5 | Pending |
| EQUIP-01 to EQUIP-03 | Phase 5 | Pending |
| DOC-01 to DOC-03 | Phase 5 | Pending |
| NOTF-01 to NOTF-03 | Phase 5 | Pending |
| REP-01 to REP-04 | Phase 5 | Pending |
| SETT-04 | Phase 5 | Pending |
| BILL-01 to BILL-03 | Phase 5 | Pending |
| RT-01 to RT-02 | Phase 5 | Pending |
| DASH-03 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 72 total
- Mapped to phases: 72
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-24*
*Last updated: 2026-03-24 after initial definition*
