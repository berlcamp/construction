# Feature Research

**Domain:** Construction Management SaaS — Philippines small-to-medium firms (5-50 employees)
**Researched:** 2026-03-24
**Confidence:** MEDIUM (training data only — web tools unavailable; based on knowledge of Procore, Buildertrend, CoConstruct, Fieldwire, PlanGrid, Jonas Construction, and Philippine labor law requirements)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Project CRUD with status tracking | Every CMS has this — firms need a project list with budget, timeline, and status | LOW | Status: planning, active, on-hold, completed, cancelled |
| Budget vs actual cost tracking | Projects fail when costs go untracked — clients demand this | MEDIUM | Must compare estimated vs actual across materials, labor, equipment |
| Employee roster with gov't ID numbers | PH labor law requires SSS, PhilHealth, Pag-IBIG, TIN on all payroll records | LOW | PH-specific: incomplete profiles block payroll compliance |
| Attendance recording per project | Construction labor is project-based; foremen record daily presence at each site | LOW | Must support present, absent, half-day, overtime, leave |
| Payroll computation with PH statutory deductions | SSS, PhilHealth, Pag-IBIG, BIR withholding are legally mandated | HIGH | Contribution tables must be accurate for current rates (2024/2025) |
| Purchase order management | Every firm with suppliers needs POs — prevents uncontrolled purchasing | MEDIUM | Draft → approved → ordered → delivered workflow expected |
| Materials/inventory tracking | Construction is material-intensive; stock-outs halt work | MEDIUM | Per-project stock levels, stock in/out, low-stock alerts |
| Supplier directory | Needed for POs and procurement — basic CRM for vendors | LOW | Contact info, notes; not a full vendor portal |
| Document storage per project | Blueprints, permits, contracts — firms are legally required to keep these | LOW | Categorized upload/download; no version control needed for v1 |
| Role-based access control | Foremen should not see payroll; owners need full access | MEDIUM | Minimum roles: owner, manager, accountant, staff |
| Dashboard with KPI overview | Managers need at-a-glance status without drilling into each project | LOW | Active projects, total spend, headcount — basic cards |
| In-app notifications | Approval workflows stall without alerts for pending actions | LOW | Low stock, PO approvals, expense approvals at minimum |
| Expense submission with receipts | Field workers submit receipts; accountants approve — universal workflow | MEDIUM | File upload for receipts; project-level expense view |
| Audit log | For disputes, compliance, and accountability — expected in any financial system | MEDIUM | Who did what, when, old/new values |
| Multi-user with company isolation | SaaS default — one company's data must never leak to another | HIGH | RLS at database level; company_id on all tables |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| PH-accurate statutory payroll computation | Most generic CMS tools don't handle SSS/PhilHealth/Pag-IBIG/BIR correctly — PH firms manually compute or use separate payroll software | HIGH | SSS contribution table, PhilHealth 5% split, Pag-IBIG ₱100/₱100, BIR withholding tax table — replaces manual Excel payroll for PH SMEs |
| Cash advance + loan deductions auto-linked to payroll | Workers regularly take cash advances; manual tracking is error-prone and a source of disputes | HIGH | SSS salary/calamity loans, Pag-IBIG MPL/calamity loans, company loans — monthly amortization auto-deducted |
| Project-level inventory with atomic stock operations | Generic inventory tools don't understand construction's per-project stock model; transfers between sites with approvals is rare in SME tools | HIGH | PostgreSQL transaction functions prevent oversell, partial fulfillment, and split-brain inventory |
| Stock reservations for project phases | Prevents two project managers from claiming the same materials; removes "who got here first" conflicts | MEDIUM | Reserve → fulfill → cancel workflow; visible to all PMs |
| Waste tracking | Construction generates reportable waste; tracking enables cost analysis and supplier accountability | MEDIUM | Waste reports per project, per material category |
| Equipment registry with project assignment and costing | Equipment cost is often ignored in project budgets; tracking daily rates against projects gives real cost-to-complete | MEDIUM | Maintenance status, assignment history, daily rate × days = cost per project |
| Inventory transfers between projects with approval | Materials move between sites constantly in PH construction; no tool tracks this properly for SMEs | MEDIUM | Source project → target project, approval required, atomic stock update |
| Payroll reports with government contribution summaries | BIR Form 2316, SSS R3, PhilHealth RF-1, HDMF MDF are required filings — generating these from the system saves hours monthly | HIGH | Not full BIR e-filing, but printable/exportable summaries in required formats |
| Subscription pricing in PHP with PH-appropriate tiers | USD pricing alienates PH SME market; ₱1,500–₱9,500/month matches local SaaS expectations | LOW | Starter, Professional, Business, Enterprise tiers |
| Realtime inventory and notification updates | Field visibility — foreman at site sees stock changes instantly without refresh | MEDIUM | Supabase Realtime on notifications + project_inventory tables only |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time chat / messaging | "We need to communicate in the platform" | High complexity (WebSocket management, message history, read receipts, push notifications); SMEs already use Messenger/Viber/WhatsApp — won't switch | Use in-app notifications for approval workflows; link to external channels |
| Native mobile app (iOS/Android) | "Our foremen are on phones at the site" | 2x maintenance burden; app store approval cycles; separate auth flows; SMEs can use mobile browser | Responsive web design covers 90% of mobile use cases; PWA if needed later |
| Gantt chart / advanced project scheduling | "We want to see the timeline visually" | CPM/PERT scheduling is complex to implement correctly; SMEs don't use formal scheduling discipline in PH | Simple task list with dates and status; milestone tracking is sufficient for v1 |
| Subcontractor portal | "We use subcontractors for electrical/plumbing" | Separate auth scope, contract management, progress billing — effectively a second product | Track subcontractors as suppliers in procurement; add dedicated module in v2 |
| Client portal / owner reporting | "Our clients want progress reports" | Client-facing UX must be polished separately from internal ops; adds external auth surface | Export PDF reports for clients; dedicated client module in v2 |
| Full accounting (AR/AP/GL) | "Can it replace our accounting software?" | QuickBooks/Xero integration territory; GL, journal entries, COA management — months of development | Track project costs and payroll; export to accounting software; avoid becoming an ERP |
| BIR e-filing integration | "Submit tax forms directly from the platform" | BIR eFPS/eBIRForms has strict integration requirements, API reliability issues, and compliance liability if submission fails | Generate BIR-formatted reports for manual submission; avoids liability for failed e-filings |
| Multi-company per user (v1) | "I manage two companies" | Complicates RLS, session state, role checks, billing — significant architectural complexity for a small segment | One user, one company for v1; multi-company is a v2 enterprise feature |
| Offline mode / sync | "Signal is bad at construction sites" | Conflict resolution for inventory and payroll is extremely complex; partial data is worse than no data | Design for low-bandwidth (small payloads, no video); foremen record offline in paper, sync daily |
| Video/photo feed | "Show project progress with photos" | Storage costs, CDN, compression, moderation — media platform features; not construction management | Document storage (photos per project) covers the legitimate need without social feed complexity |

## Feature Dependencies

```
[Multi-tenant company isolation (RLS)]
    └──required by──> [All data features]
                          └──required by──> [Payroll, Inventory, Projects, Employees]

[Employee CRUD]
    └──required by──> [Attendance recording]
                          └──required by──> [Payroll computation]
                                                └──required by──> [Cash advance deductions]
                                                └──required by──> [Loan deductions]
                                                └──required by──> [Payroll reports]

[Materials catalog]
    └──required by──> [Project inventory]
                          └──required by──> [Stock reservations]
                          └──required by──> [Inventory transfers]
                          └──required by──> [Waste tracking]
                          └──required by──> [Delivery recording]

[Supplier CRUD]
    └──required by──> [Purchase orders]
                          └──required by──> [Delivery recording]
                                                └──required by──> [Project inventory (atomic update)]

[Projects CRUD]
    └──required by──> [Project inventory]
    └──required by──> [Attendance recording]
    └──required by──> [Expense tracking]
    └──required by──> [Document storage]
    └──required by──> [Equipment assignment]
    └──required by──> [Project costing]

[Project costing]
    └──aggregates──> [Materials cost (from inventory)]
    └──aggregates──> [Labor cost (from payroll/attendance)]
    └──aggregates──> [Equipment cost (from equipment registry)]

[Role-based access]
    └──gates──> [Approval workflows: PO, expense, transfer, cash advance]

[Cash advance CRUD]
    └──required by──> [Cash advance deductions in payroll]

[Employee loans CRUD]
    └──required by──> [Loan amortization deductions in payroll]

[Notifications]
    └──triggered by──> [Low stock alerts, PO status changes, expense approvals, cash advance approvals]
    └──enhanced by──> [Realtime (Supabase Realtime)]
```

### Dependency Notes

- **Multi-tenant isolation requires foundation first:** RLS policies and company_members junction table must be built before any data feature — this is the non-negotiable first phase.
- **Employee CRUD blocks payroll:** You cannot compute payroll without employee records with government IDs, employment type, and daily/monthly rate.
- **Attendance blocks payroll computation:** Daily attendance is the input to labor cost and payroll hours — must exist before payroll module.
- **Materials catalog blocks inventory:** Per-project inventory tracks catalog items — catalog is the master reference.
- **Purchase orders require suppliers:** POs reference supplier records — supplier CRUD must precede PO module.
- **Delivery recording requires POs:** Deliveries are recorded against specific PO line items — POs must exist first.
- **Project costing aggregates from three sources:** Materials, labor (payroll/attendance), and equipment costs must all be tracked before project costing dashboard is meaningful.
- **Cash advance and loans must precede final payroll:** Payroll deduction logic depends on open advance/loan balances — these records must exist before payroll runs.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [x] Multi-tenant auth (Google OAuth, company creation, company_members, 6 roles) — without this nothing is isolated
- [x] Project CRUD with status and budget — the core entity everything hangs off
- [x] Employee CRUD with PH government IDs — prerequisite for payroll
- [x] Daily attendance recording per project — prerequisite for payroll computation
- [x] Payroll computation with PH statutory deductions — the single highest-value differentiator; replaces Excel payroll
- [x] Cash advance request/approve/track with payroll deduction — inseparable from payroll in PH construction
- [x] Materials catalog + project inventory (stock in/out, logs) — prevents stock-out disruptions
- [x] Supplier CRUD + purchase orders with approval workflow — controls procurement
- [x] Delivery recording with atomic inventory update — closes the PO → inventory loop
- [x] Expense submission with receipts + approval — tracks field spend
- [x] Document storage per project — blueprints, permits, contracts
- [x] In-app notifications — approval workflows stall without alerts
- [x] Basic reports (payroll, cost summary, inventory) — minimum output for accountant/owner use
- [x] Dashboard with KPI cards — proves value on login

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Employee loans (SSS, Pag-IBIG, company) with amortization — add when payroll deductions are validated working
- [ ] Stock reservations for project phases — add when multiple PMs conflict over materials (real-world feedback)
- [ ] Inventory transfers between projects — add when firms report inter-site stock movement pain
- [ ] Waste tracking — add when firms want cost accountability reports
- [ ] Equipment registry with project assignment and costing — add when firms want full cost-to-complete accuracy
- [ ] Dashboard v2 with charts (recharts), budget vs actual trends — add after core data accumulates
- [ ] Realtime inventory and notification updates — add for firms with active multi-site operations
- [ ] Payroll reports with government contribution summaries (SSS R3, PhilHealth RF-1, HDMF) — add when firms ask for filing assistance
- [ ] Subscription/billing management — add when transitioning from beta to paid

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Gantt charts / advanced project scheduling — complex, not validated as needed by PH SME target
- [ ] Subcontractor management module — effectively a second product; validate demand first
- [ ] Client/owner portal — requires separate UX polish; validate demand first
- [ ] Multi-company per user — enterprise feature; complicates architecture significantly
- [ ] BIR e-filing integration — liability and reliability concerns; validate demand and approach first
- [ ] Offline mode / PWA — complex sync; validate site connectivity is actually a blocker
- [ ] API for third-party integrations (QuickBooks, Xero) — validate accounting handoff pain first

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Multi-tenant auth + RBAC | HIGH | MEDIUM | P1 |
| Project CRUD + budget tracking | HIGH | LOW | P1 |
| Employee CRUD (PH gov't IDs) | HIGH | LOW | P1 |
| Attendance recording | HIGH | LOW | P1 |
| PH statutory payroll computation | HIGH | HIGH | P1 |
| Cash advance + payroll deduction | HIGH | MEDIUM | P1 |
| Materials catalog + project inventory | HIGH | MEDIUM | P1 |
| Purchase orders + approval workflow | HIGH | MEDIUM | P1 |
| Delivery recording (atomic) | HIGH | HIGH | P1 |
| Expense submission + approval | MEDIUM | MEDIUM | P1 |
| Document storage | MEDIUM | LOW | P1 |
| In-app notifications | MEDIUM | LOW | P1 |
| Basic reports (payroll, cost, inventory) | HIGH | MEDIUM | P1 |
| Dashboard KPI cards | MEDIUM | LOW | P1 |
| Employee loans + amortization | HIGH | HIGH | P2 |
| Stock reservations | MEDIUM | MEDIUM | P2 |
| Inventory transfers between projects | MEDIUM | HIGH | P2 |
| Waste tracking | LOW | LOW | P2 |
| Equipment registry + costing | MEDIUM | MEDIUM | P2 |
| Dashboard v2 with charts | MEDIUM | MEDIUM | P2 |
| Realtime updates | MEDIUM | MEDIUM | P2 |
| Subscription/billing management | HIGH | MEDIUM | P2 |
| Gov't contribution summary reports | HIGH | MEDIUM | P2 |
| Gantt / scheduling | LOW | HIGH | P3 |
| Subcontractor portal | MEDIUM | HIGH | P3 |
| Client portal | MEDIUM | HIGH | P3 |
| Multi-company per user | LOW | HIGH | P3 |
| BIR e-filing integration | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

Note: Based on training data knowledge of major platforms. Confidence is MEDIUM — actual current feature sets may vary.

| Feature | Procore (enterprise) | Buildertrend (residential) | CoConstruct (custom homes) | Our Approach |
|---------|----------------------|---------------------------|---------------------------|--------------|
| PH statutory payroll (SSS/PhilHealth/Pag-IBIG/BIR) | Not supported | Not supported | Not supported | Core differentiator — built-in PH compliance |
| Project management | Full (enterprise-grade) | Full | Full | Simplified — right-sized for SME |
| Inventory / materials tracking | Full | Basic | Basic | Full per-project inventory with atomic ops |
| Purchase orders | Full | Full | Full | Full with approval workflow |
| Payroll | Not included | Basic (US only) | Not included | Full PH payroll with statutory deductions |
| Employee management | Basic | Basic | Basic | Full with PH gov't ID tracking |
| Attendance recording | Basic (timesheets) | Timesheets | Timesheets | Daily per-project attendance |
| Document management | Full (BIM/RFI/submittals) | Basic | Basic | Basic per-project document storage |
| Cash advances / loans | Not supported | Not supported | Not supported | Full PH-specific cash advance and loan deduction |
| Pricing | USD $375+/month | USD $99+/month | USD $99+/month | PHP ₱1,500–₱9,500/month (accessible to PH SMEs) |
| Multi-tenant SaaS | Yes | Yes | Yes | Yes — RLS-enforced company isolation |
| Mobile app | Yes (native) | Yes (native) | Yes (native) | Web-first responsive (v1); PWA later |

## Sources

- Knowledge of Procore, Buildertrend, CoConstruct, Fieldwire, PlanGrid, Jonas Construction, Viewpoint feature sets (training data, MEDIUM confidence)
- Philippine labor law requirements: SSS, PhilHealth, Pag-IBIG, BIR withholding (training data cross-referenced with PROJECT.md requirements, HIGH confidence for legal framework)
- PROJECT.md requirements list for scope alignment (HIGH confidence — this is the ground truth for what's planned)
- Philippines construction SME market context: informal labor practices, cash economy, Messenger/Viber communication norms, peso-denominated pricing expectations (MEDIUM confidence — training data)
- Construction domain best practices: inventory atomicity, procurement approval workflows, project-based cost tracking (HIGH confidence — well-established patterns)

---
*Feature research for: Construction Management SaaS — Philippines SME market*
*Researched: 2026-03-24*
