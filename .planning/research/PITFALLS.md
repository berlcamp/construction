# Pitfalls Research

**Domain:** Multi-tenant Construction Management SaaS (Philippines) — Next.js 16 + Supabase
**Researched:** 2026-03-24
**Confidence:** MEDIUM — Training data (cutoff Aug 2025). WebSearch/WebFetch unavailable. Core Supabase/Next.js/PH statutory specifics are well-established; verify PH statutory rates against current BIR/SSS/PhilHealth/Pag-IBIG circulars before shipping payroll.

---

## Critical Pitfalls

### Pitfall 1: RLS Policies That Never Actually Fire on Custom Schema Tables

**What goes wrong:**
Tables in a custom schema (e.g., `construction.*`) silently bypass RLS when accessed via the Supabase `anon` or `service_role` key if the schema is not exposed in the API settings or if the search path is wrong. Policies written correctly still don't enforce because PostgREST never routes requests through them. Data from all tenants is returned to any authenticated user.

**Why it happens:**
Supabase's PostgREST exposes only schemas listed under "Exposed schemas" in the API settings (default: `public`, `graphql_public`). A `construction` schema created manually is invisible to the REST/JS client unless explicitly added. Developers write RLS policies, test them in the SQL editor (which uses `postgres` role and bypasses RLS by default), see no errors, and assume policies are working.

**How to avoid:**
1. Add `construction` to PostgREST's exposed schemas in Supabase Dashboard > Project Settings > API > "Extra schemas."
2. Never test RLS effectiveness from the SQL editor — always test by impersonating `authenticated` role: `SET ROLE authenticated; SET request.jwt.claims = '{"sub": "user-uuid", ...}'; SELECT * FROM construction.materials;`
3. Write an integration test that attempts cross-tenant reads and asserts empty results.

**Warning signs:**
- `supabase.from('materials')` returns rows when you prefix with schema notation but you haven't added the schema to PostgREST
- Queries return all rows regardless of which company the logged-in user belongs to
- No 403 errors when accessing resources from a different company

**Phase to address:** Foundation / Auth + Multi-tenancy phase (before any data features are built)

---

### Pitfall 2: RLS Policy Joins on `company_members` Cause N+1 Policy Evaluations

**What goes wrong:**
Every RLS policy that does `EXISTS (SELECT 1 FROM construction.company_members WHERE user_id = auth.uid() AND company_id = <table>.company_id)` runs a subquery per row evaluated. On a 10,000-row `inventory_logs` table, a single query triggers 10,000 membership lookups. Page load times become multi-second. This is invisible in dev with small datasets.

**Why it happens:**
RLS policies are row-level by design — the WHERE clause runs once per candidate row. Developers write natural-looking policies and only discover the performance impact when the table has real data volume. The Supabase policy editor gives no performance warnings.

**How to avoid:**
1. Add a composite index on `company_members(user_id, company_id)` — mandatory, not optional.
2. Use a security-definer helper function `get_user_company_ids()` that returns a set of company_ids the current user belongs to, cached in the transaction. Policy becomes: `company_id = ANY(construction.get_user_company_ids())`.
3. Alternatively, store `company_id` in the JWT claims (set via Supabase custom claims or a custom hook) and read it as `(auth.jwt() -> 'company_id')::uuid` — eliminates the join entirely.

**Warning signs:**
- `EXPLAIN ANALYZE` on simple SELECT shows sequential scans on `company_members`
- Page performance degrades linearly with row count in data tables
- Works fast with 100 rows, slow with 5,000

**Phase to address:** Foundation / Database setup phase — add indexes and helper functions before adding features

---

### Pitfall 3: `supabase.auth.getSession()` in Server Components Returns Stale / Unverified Session

**What goes wrong:**
Calling `supabase.auth.getSession()` in a Next.js Server Component returns the session from the cookie without re-verifying with the Supabase Auth server. An expired JWT can still return a session object. Middleware doesn't catch this if not configured correctly. Users get access to pages they should be blocked from.

**Why it happens:**
The `@supabase/ssr` package's `createServerClient` reads cookies and reconstructs a session locally. `getSession()` trusts the cookie content. `getUser()` makes a network call to verify the JWT against the Auth server — but developers use the cheaper `getSession()` to avoid the extra round-trip.

**How to avoid:**
In Server Components and Server Actions, always use `supabase.auth.getUser()` (not `getSession()`) for any authorization check. `getSession()` is acceptable only for reading non-sensitive display data where stale auth is acceptable. In middleware, call `supabase.auth.getUser()` to refresh the session and rotate cookies.

**Warning signs:**
- Auth checks use `session?.user` instead of a fresh `getUser()` call
- Middleware only reads cookies without calling `getUser()`
- Protected routes accessible after token expiry

**Phase to address:** Auth phase — establish the correct pattern in `lib/supabase/server.ts` before any protected routes are built

---

### Pitfall 4: Server Actions Bypass RLS via Service Role Key

**What goes wrong:**
A Server Action that creates a Supabase client using `SUPABASE_SERVICE_ROLE_KEY` (or `createClient` from `@supabase/supabase-js` without the SSR cookie pattern) bypasses all RLS policies. A user can trigger the action for any `company_id` they supply in the form body, and the service-role client will execute it without restriction.

**Why it happens:**
Developers reach for the service role key in Server Actions to "avoid RLS complexity" or because they copied a pattern from non-SSR Supabase guides. The server action runs server-side so it feels "safe" — but the company_id still comes from untrusted user input.

**How to avoid:**
1. Never use the service role key in Server Actions that handle user-initiated mutations.
2. Use `createServerClient` with cookie-based auth (the `@supabase/ssr` pattern) in Server Actions — RLS then applies normally.
3. If service role is needed for admin operations, explicitly re-verify the user is owner/admin from a separate auth check before calling the service-role client.
4. Never trust `company_id` from form body — derive it from the authenticated session via `company_members` lookup.

**Warning signs:**
- Server Action imports `createClient` from `@supabase/supabase-js` instead of `@supabase/ssr`
- `process.env.SUPABASE_SERVICE_ROLE_KEY` referenced in non-admin server actions
- `company_id` read from `formData.get('company_id')` without server-side membership verification

**Phase to address:** Auth + Foundation phase — establish the correct server action pattern in `lib/supabase/actions.ts`

---

### Pitfall 5: PH SSS Contribution Table Hardcoded with Wrong 2025 Brackets

**What goes wrong:**
The SSS contribution table in the Philippines is updated periodically. The 2025 schedule increased the maximum Monthly Salary Credit (MSC) to ₱35,000 with an 18% combined contribution rate (9.5% employee, 8.5% employer as of Jan 2025 per SSS Circular 2024). Hardcoding the 2024 table produces incorrect deductions for employees earning above the old ceiling, creating legal/compliance risk and employee complaints.

**Why it happens:**
Developers find an SSS table online, implement it, and don't build a mechanism to update it without code changes. The table is treated as static business logic rather than configuration data.

**How to avoid:**
1. Store SSS contribution brackets in a database table (`construction.sss_contribution_table`) with an effective date column.
2. Payroll computation queries the bracket table effective as of the payroll period date — `WHERE effective_from <= payroll_date ORDER BY effective_from DESC LIMIT 1`.
3. Add a seed script with the 2025 table and a mechanism to insert new brackets without code deployment.
4. **VERIFY** current rates against the official SSS circular before shipping: https://www.sss.gov.ph

**Warning signs:**
- SSS brackets defined as TypeScript constants in application code
- No `effective_date` on contribution rate records
- Payroll amounts don't match employee's SSS e-Kontributa portal

**Phase to address:** Payroll phase — build contribution tables as data, not code

---

### Pitfall 6: PhilHealth Rate Applied to Gross Instead of Basic Pay, or Wrong Ceiling

**What goes wrong:**
PhilHealth premium rate is 5% of basic monthly salary (effective 2024 onward per PhilHealth Circular 2023-0014), split 50/50 employee/employer, with a minimum monthly basic salary of ₱10,000 (floor) and maximum of ₱100,000 (ceiling). Applying the 5% to gross pay (including allowances, overtime) instead of basic pay produces over-deductions. Missing the ₱100,000 ceiling over-deducts for high earners.

**Why it happens:**
Documentation conflates "compensation" and "basic pay." The circular language is ambiguous and different online resources define the base differently. Developers implement the first definition they find.

**How to avoid:**
1. Compute PhilHealth on `basic_monthly_salary` only, clamped to `[10000, 100000]`.
2. Employee share = `LEAST(GREATEST(basic_monthly_salary, 10000), 100000) * 0.025`.
3. Store rate and ceiling as database config, not code constants.
4. Cross-check output: employee earning ₱10,000 basic → ₱250 deduction. Employee earning ₱100,000+ → ₱2,500 max deduction.
5. **VERIFY** against current PhilHealth circular before shipping.

**Warning signs:**
- PhilHealth deduction computed on the same `gross_pay` field used for withholding tax
- No ceiling/floor applied to the base
- Employee deduction exceeds ₱2,500 for any pay period

**Phase to address:** Payroll phase — test with salary boundary values (₱10k, ₱50k, ₱100k, ₱200k)

---

### Pitfall 7: BIR Withholding Tax Using Wrong Table or Annual vs Monthly Bracket

**What goes wrong:**
BIR Tax Table 1 (for employees with regular withholding) uses graduated rates applied to monthly taxable income. Using the annual brackets directly on monthly income (instead of the monthly version from RR 10-2008 as amended by TRAIN law) produces wildly incorrect withholding. Additionally, TRAIN Law (RA 10963, effective 2018 amended 2023) changed the brackets — using pre-TRAIN tables causes systematic under-withholding.

**Why it happens:**
The BIR publishes multiple tables (daily, weekly, semi-monthly, monthly, annual) and developers often grab the annual table and divide by 12, which doesn't match the actual monthly graduated brackets due to rounding and threshold differences.

**How to avoid:**
1. Use the Monthly Withholding Tax Table specifically (not annual ÷ 12).
2. Per TRAIN: monthly taxable income ≤ ₱20,833 → 0% (i.e., ≤ ₱250,000 annual exempt). Brackets above that per the monthly graduated table.
3. Taxable income = gross compensation - mandatory deductions (SSS + PhilHealth + Pag-IBIG employee shares) - personal exemptions (₱50,000 annual / ₱4,166.67 monthly for "me").
4. Store tax table as database records with effective date. Re-seed when BIR updates.
5. Test: employee with ₱25,000 monthly basic should have ~₱62.50 monthly withholding at current rates (₱300k annual, 15% on amount over ₱250k = ₱7,500/12).

**Warning signs:**
- Withholding computed from a constant array in TypeScript without effective dates
- Withholding amounts look wrong relative to AnnualIncome × expected rate ÷ 12
- No integration test comparing computed tax to BIR-published examples

**Phase to address:** Payroll phase — treat as a regulated computation requiring test cases from BIR examples

---

### Pitfall 8: Inventory Stock Goes Negative Due to Missing Atomic Transactions

**What goes wrong:**
Two concurrent stock-out requests arrive simultaneously (e.g., two project managers fulfilling reservations at the same time). Both read `current_stock = 50`, both compute `50 - 30 = 20` as the new value, both write 20. Net result: 60 units are consumed but stock shows 20, not -10. This is invisible until a physical count reveals a discrepancy. Construction sites frequently have multiple supervisors working concurrently.

**Why it happens:**
The Supabase JS client does not support multi-statement transactions. Developers issue separate `UPDATE` calls for stock decrement and log insertion. Even with RLS preventing unauthorized access, concurrent legitimate users create race conditions.

**How to avoid:**
1. All multi-step inventory operations MUST use PostgreSQL stored functions called via `supabase.rpc()` — as the project already specifies (`fn_record_delivery`, `fn_reserve_stock`, etc.).
2. Inside each function, use `SELECT ... FOR UPDATE` or advisory locks on the inventory row before reading current stock.
3. Add a `CHECK (quantity >= 0)` constraint on `project_inventory.quantity` — this turns data corruption into an explicit error rather than silent wrong data.
4. Use optimistic locking: include an `updated_at` or `version` column, verify it matches before update, return error if stale.

**Warning signs:**
- Stock operations issued as sequential `supabase.from().update()` calls outside a stored function
- No `CHECK (quantity >= 0)` constraint on inventory table
- Inventory logs show correct individual transactions but totals don't match current stock

**Phase to address:** Inventory phase — stored functions must be in place before any stock mutation UI is built

---

### Pitfall 9: `revalidatePath()` Too Broad Causes Unnecessary Full-Page Reloads

**What goes wrong:**
Server Actions that call `revalidatePath('/')` or `revalidatePath('/[company]/projects')` invalidate the entire cache for that route tree, causing every Server Component on the page to re-fetch data even when only one small piece changed. With many users, this generates excessive Supabase read traffic and slow perceived performance.

**Why it happens:**
`revalidatePath()` is simple to use and "works." Developers use the broadest path that definitely includes the changed data rather than thinking about the minimal invalidation scope.

**How to avoid:**
1. Use `revalidatePath('/[company]/inventory/[projectId]', 'page')` instead of the parent route.
2. For mutations that affect multiple pages (e.g., a delivery that updates both PO status and inventory), call `revalidatePath()` once per affected specific path, not a parent.
3. Use `revalidateTag()` for cross-cutting data: tag inventory fetches with `inventory-${projectId}` and invalidate by tag on stock changes.

**Warning signs:**
- Every server action revalidates `/` or a top-level route
- Supabase query logs show full data refetch for unrelated tables after a single mutation
- Noticeable page flash on simple form submissions

**Phase to address:** Any phase — establish the minimal-revalidation pattern from Phase 1 mutations

---

### Pitfall 10: Multi-Tenant Row Leakage via Unprotected Storage Bucket Paths

**What goes wrong:**
Supabase Storage files are stored at paths like `receipts/[filename]`. If the bucket is public or the RLS policy on `storage.objects` only checks authentication (not company membership), any authenticated user can download any other company's receipts, blueprints, or permits by guessing or enumerating paths. This is a PDPA (Philippines Data Privacy Act) violation for sensitive construction documents.

**Why it happens:**
Developers focus RLS effort on database tables and treat storage as "just files." Supabase Storage buckets are often left as public for simplicity during development and the setting is never changed for production.

**How to avoid:**
1. Use private buckets for all company documents (receipts, blueprints, permits, contracts).
2. Prefix all storage paths with `company_id/[document_type]/[filename]` — e.g., `abc123/permits/permit.pdf`.
3. Add RLS policy on `storage.objects`: `bucket_id = 'documents' AND (storage.foldername(name))[1] = (SELECT company_id::text FROM construction.company_members WHERE user_id = auth.uid() LIMIT 1)`.
4. Generate signed URLs server-side with short expiry (15 minutes) for document downloads — never expose raw storage paths to clients.

**Warning signs:**
- Storage bucket marked "Public" in Supabase dashboard
- File paths don't include `company_id` as the first path segment
- Download URLs are permanent public URLs rather than short-lived signed URLs

**Phase to address:** Document management phase — but storage path convention must be decided in the foundation phase

---

### Pitfall 11: Cash Advance / Loan Auto-Deduction Creates Incorrect Payroll When Employee Has Multiple Active Loans

**What goes wrong:**
An employee has an SSS salary loan (₱5,000/month amortization) and a company loan (₱3,000/month amortization) active simultaneously. Payroll computation sums all active loan amortizations without checking if total deductions would bring net pay below statutory minimums or create negative pay. Employee receives ₱0 or negative net pay and is confused. In the Philippines, there is no statutory minimum net pay rule for salaried employees, but negative net pay generates BIR computation errors.

**Why it happens:**
Loan deduction logic processes each loan independently and sums them. There is no circuit-breaker to catch cases where deductions exceed gross pay.

**How to avoid:**
1. Order deductions: statutory first (SSS, PhilHealth, Pag-IBIG), then government loans (SSS/Pag-IBIG loans), then company loans, then cash advances.
2. Apply a floor: if deductions would bring net pay below a configurable minimum (e.g., ₱0), defer excess deductions to the next payroll period.
3. When deferring, update the loan's `deferred_amount` and generate a warning in the payroll run log.
4. Surface a payroll preview to the accountant before finalizing — show each deduction line item and flag negative-net-pay cases.

**Warning signs:**
- Payroll computation produces net_pay < 0 for any employee
- Loan deductions applied in arbitrary order without priority logic
- No payroll preview step before finalization

**Phase to address:** Payroll phase — deduction ordering and net-pay floor must be specified before implementation

---

### Pitfall 12: Next.js Middleware Cookie Mutation Breaks Supabase Session Refresh

**What goes wrong:**
Supabase's `@supabase/ssr` library rotates session tokens (refresh token flow) by setting new cookies. If Next.js middleware reads cookies but doesn't correctly pass back the mutated cookie response (missing `response.cookies` passthrough), the refreshed token is lost. Users are silently logged out after token expiry even though they were active.

**Why it happens:**
The `createServerClient` in middleware requires a specific pattern where cookie `set` and `remove` operations write to the `NextResponse` object. Copying the pattern incorrectly (e.g., only reading cookies, not writing back) breaks the refresh loop. This is a common copy-paste error from old Supabase SSR examples.

**How to avoid:**
Use the exact middleware pattern from the current Supabase SSR docs:
```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  await supabase.auth.getUser() // This call refreshes the token
  return supabaseResponse
}
```
Never use `NextResponse.next()` without re-assigning it after `setAll`.

**Warning signs:**
- Users report being logged out after ~1 hour of activity
- Middleware creates a new `NextResponse.next()` after the `createServerClient` call without cookie passthrough
- Auth errors in production logs but not in dev (dev tokens last longer)

**Phase to address:** Auth phase — validate token refresh with a session that has a short expiry

---

### Pitfall 13: Realtime Subscriptions Accumulate and Are Never Cleaned Up

**What goes wrong:**
Supabase Realtime channel subscriptions created in React components (e.g., for live inventory updates or notifications) are not removed when the component unmounts. Each navigation to the page creates a new subscription without removing the old one. After 20+ page visits, the client has dozens of duplicate subscriptions, each firing callbacks and causing double/triple state updates. Supabase has connection limits per project.

**Why it happens:**
`supabase.channel().on().subscribe()` in a `useEffect` without a cleanup function. The `useEffect` cleanup pattern for Supabase Realtime is non-obvious because `supabase.removeChannel()` requires a reference to the channel object, not just the channel name.

**How to avoid:**
```typescript
useEffect(() => {
  const channel = supabase.channel(`inventory-${projectId}`)
    .on('postgres_changes', { event: '*', schema: 'construction', table: 'project_inventory' }, handler)
    .subscribe()

  return () => {
    supabase.removeChannel(channel) // Cleanup on unmount
  }
}, [projectId])
```
Since the project uses server-first data flow, minimize Realtime subscriptions to only notifications and inventory tables as specified — don't add Realtime to features that don't need it.

**Warning signs:**
- `useEffect` with `supabase.channel()` has no return cleanup function
- Supabase dashboard shows an increasing number of active Realtime connections over time
- State updates fire multiple times per event (duplicate subscriptions)

**Phase to address:** Any phase using Realtime (notifications, inventory live updates)

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode SSS/PhilHealth/Pag-IBIG/BIR rates as constants | Faster initial implementation | Rate updates require code deployment + redeployment downtime | Never — store in DB with effective dates from day one |
| Use `supabase.service_role` in all server actions | Skip writing RLS policies | Complete bypass of tenant isolation; any user accesses any data | Only for admin/maintenance scripts, never user-facing server actions |
| Use `revalidatePath('/')` everywhere | Works without thinking about what changed | Excessive Supabase read traffic, slow UX on large datasets | Never — always use the most specific path |
| Skip `CHECK (quantity >= 0)` constraint | Simpler migration | Silent negative inventory; data corruption undetected until manual audit | Never — this is a data integrity guarantee |
| Public Supabase Storage buckets | Simpler upload/download code | Cross-tenant document leakage; PDPA violation | Never for company documents |
| Single `payroll_runs` table with JSON blob for deduction details | Simpler schema | Can't query/report individual deduction types; no audit trail per line | Never — normalize deduction line items |
| Derive company_id from URL params in server actions | Simple form submission | Allows cross-tenant mutations if user manipulates params | Never — always derive from authenticated session |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Auth (Google OAuth) | Calling `auth.getSession()` for authorization checks | Use `auth.getUser()` which verifies with Auth server; getSession trusts cookie locally |
| Supabase RLS + custom schema | Schema not added to PostgREST exposed schemas, policies never fire | Add `construction` schema to API > Extra Schemas in Supabase dashboard |
| Supabase Storage | Using permanent public URLs for company documents | Use signed URLs with short TTL generated server-side via `supabase.storage.from().createSignedUrl()` |
| Supabase Realtime | Not calling `supabase.removeChannel()` on component unmount | Always return cleanup function from useEffect; reference channel object not name |
| Next.js Server Actions + Supabase | Using `createClient` (admin) instead of `createServerClient` (SSR) | Import from `@supabase/ssr` and use cookie-based client in all server actions |
| Supabase RPC (stored functions) | Calling `supabase.rpc()` without schema prefix for non-public functions | Use `supabase.rpc('construction.fn_reserve_stock', params)` or set `search_path` in function definition |
| BIR / SSS / PhilHealth API | No official API exists — developers scrape or hardcode | Store contribution tables in DB; build an admin UI to update rates without code changes |
| Vercel + Supabase | `SUPABASE_SERVICE_ROLE_KEY` committed to `.env` checked into git | Use Vercel environment variables; never commit service role key |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| RLS policy with `EXISTS (SELECT FROM company_members)` per row, no index | Inventory pages take 3-10s to load | Composite index on `company_members(user_id, company_id)` + security-definer helper function | ~1,000+ rows in any data table |
| Fetching all inventory logs to compute current stock in application code | Dashboard KPI "current stock" is slow | Always maintain a `current_quantity` denormalized column updated by stored functions | ~500+ log entries per material |
| Loading all projects with all members eagerly for dashboard | Dashboard slow; unnecessary data transfer | Paginate; use server component per KPI card with independent fetch | ~50+ projects per company |
| Payroll computation iterating employees in application code with per-employee DB queries | Payroll run page times out for companies with 30+ employees | Compute payroll in a single SQL function using set operations, not per-employee application loops | ~20+ employees |
| `revalidatePath()` on every inventory update including read-heavy audit log | Every stock check triggers full route cache invalidation | Use `revalidateTag()` scoped to specific inventory items | Any usage with active users |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting `company_id` from client-submitted form data | Cross-tenant data mutation — user A modifies company B's data | Always derive company_id server-side from `company_members` where `user_id = auth.uid()` |
| Service role key used in user-facing server actions | Complete RLS bypass; any user can access any tenant's data | Service role only for administrative/migration scripts |
| Storing PH government ID numbers (SSS No., TIN, Pag-IBIG No.) unencrypted | PDPA violation; high-value PII for identity theft | Encrypt at rest using `pgcrypto`; limit access to owner/admin/accountant roles via RLS |
| No rate limiting on payroll finalization endpoint | Malicious actor could trigger thousands of payroll runs generating fraudulent records | Implement server-side rate limiting via middleware; payroll finalization requires accountant/admin role check |
| Invitation tokens that don't expire | Stale invitations become permanent backdoors | Set token expiry at creation; cron job to purge expired invitations |
| Supabase Storage paths without company_id prefix | Cross-tenant document access by path enumeration | Enforce `company_id/` prefix in all storage uploads; RLS on `storage.objects` by folder |
| Audit logs writable by application user | Audit trail can be tampered with | Insert-only audit log via security-definer function; no UPDATE/DELETE permission for application role |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No payroll preview before finalization | Accountant discovers wrong deductions after employees are notified | Show line-item preview per employee before "Finalize Payroll" action; require explicit confirmation |
| Low stock alert fires too frequently (e.g., every page load) | Notification fatigue; alerts ignored | Debounce: send alert once per item per day maximum; store `last_alerted_at` per item |
| Inventory stock adjustments with no reason field | Unexplained stock discrepancies at audit time | Require a `reason` field on all manual stock adjustments; choices: damage, theft, return, correction, waste |
| PO approval email links that expire or go to wrong tenant | Procurement officers can't approve POs from email | In-app notification is primary; email links must include validation and redirect to correct company context |
| Attendance recorded as "absent" by default requiring daily opt-in | Supervisors miss marking attendance; payroll incorrect | Default to "not recorded" not "absent"; flag unrecorded attendance with warning before payroll run |
| Document upload without type/category validation | Blueprint files uploaded as "receipts"; search and audit fails | Require category selection (blueprint/permit/contract/photo) before upload; validate file type matches category |

---

## "Looks Done But Isn't" Checklist

- [ ] **RLS policies:** Are they actually enforcing? Test by impersonating `authenticated` role in SQL editor with a user who is NOT a member of the target company. Assert 0 rows returned, not an error.
- [ ] **Payroll computation:** Does it produce correct amounts for boundary salary values (₱10k, ₱25k, ₱66,667 where tax bracket changes, ₱100k, ₱166,667)? Compare against BIR published withholding examples.
- [ ] **Inventory stored functions:** Do they correctly rollback on partial failure? Test by injecting an error mid-function (e.g., invalid log entry) and verify stock level is unchanged.
- [ ] **Session refresh:** Does user session survive past JWT expiry (1 hour) without re-login? Test by setting a short JWT expiry in Supabase config and staying active past it.
- [ ] **Multi-tenant isolation:** Can user from Company A access any resource from Company B via direct API call (bypassing UI)? Test with `curl` or Postman using Company A's JWT.
- [ ] **Storage isolation:** Can authenticated user from Company A download Company B's documents by guessing the file path?
- [ ] **Negative inventory:** Can stock go below 0? Attempt to fulfill a reservation exceeding available stock and verify the CHECK constraint triggers.
- [ ] **Loan deduction overflow:** Does payroll handle an employee with total deductions > gross pay? Verify net_pay never goes below 0 and excess is deferred, not ignored.
- [ ] **PO delivery atomic update:** Does a failed delivery recording (e.g., invalid lot number) leave the PO in a partially-delivered state? Test with a transaction that fails mid-way.
- [ ] **Subscription billing:** Does a Starter plan company see features only available to Professional+ plans? Test by changing a company's plan in DB and verifying feature gates enforce correctly.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Cross-tenant data leakage (RLS policy bug) | HIGH | 1. Emergency: rotate Supabase anon key immediately. 2. Identify affected rows via audit logs. 3. Fix RLS policy. 4. Notify affected companies per PDPA requirements (72-hour window). 5. Audit all queries in Supabase logs for the exposure window. |
| Incorrect payroll calculations already paid to employees | HIGH | 1. Identify affected payroll runs and employees. 2. Compute delta (over/under). 3. Adjust next payroll run with corrections. 4. File BIR correction (alphalist amendment) if withholding was wrong. 5. SSS/PhilHealth/Pag-IBIG may require amended transmittals. |
| Negative inventory discovered after physical count | MEDIUM | 1. Identify the transaction where stock went negative (audit logs). 2. Add CHECK constraint immediately. 3. Manually adjust stock to correct level with reason "correction". 4. Add integration test for concurrent stock mutations. |
| Realtime subscription leak causing connection exhaustion | MEDIUM | 1. Deploy fix with cleanup functions immediately. 2. Restart Supabase Realtime connections via dashboard. 3. Monitor connection count post-deploy. |
| Stored function not atomic (partial delivery recorded) | MEDIUM | 1. Identify affected delivery records. 2. Write a one-time correction script wrapped in a transaction. 3. Add rollback test to the stored function test suite. |
| PH statutory rate table out of date | LOW-MEDIUM | 1. Update database table with correct rates effective from correct date. 2. Re-run payroll computation for affected periods (generate corrected payslips). 3. No code deployment needed if rates stored in DB. |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| RLS on custom schema never fires (PostgREST not configured) | Phase 1: Foundation/Database | Integration test: cross-tenant read attempt returns 0 rows |
| RLS N+1 on `company_members` (missing index) | Phase 1: Foundation/Database | `EXPLAIN ANALYZE` on table scan shows index used; load test with 5,000 rows |
| `getSession()` vs `getUser()` in Server Components | Phase 1: Auth | Code review checklist: grep for `getSession` in auth-gated code |
| Service role key in user-facing Server Actions | Phase 1: Auth + Foundation | Grep: `SUPABASE_SERVICE_ROLE_KEY` never in server actions; only admin scripts |
| Middleware cookie passthrough (token refresh) | Phase 1: Auth | Functional test: stay active past JWT expiry, verify no re-login required |
| Storage bucket not isolated per tenant | Phase 1: Foundation (path convention) + Document phase (RLS) | Attempt cross-tenant document access with wrong-company JWT |
| SSS contribution table wrong/outdated | Phase X: Payroll | Test with published SSS contribution examples; verify boundary salaries |
| PhilHealth wrong base or ceiling | Phase X: Payroll | Test: ₱10k basic → ₱250 deduction; ₱100k+ → ₱2,500 max |
| BIR withholding tax wrong table | Phase X: Payroll | Compare output against BIR Alphalist validation scenarios |
| Inventory race condition (no atomic transactions) | Phase X: Inventory | Concurrent load test: two simultaneous stock-out requests; verify no negative stock |
| Loan deduction overflow (net pay negative) | Phase X: Payroll | Test: employee with deductions > gross; verify deferral, not negative net pay |
| `revalidatePath()` too broad | Every phase | Performance test: mutation triggers only expected DB queries, not full cache bust |
| Realtime channel leak | Phase X: Notifications + Inventory Realtime | Unmount/remount component 20x; verify Supabase connection count stays flat |
| PO delivery not atomic | Phase X: Procurement/Inventory | Inject failure mid-delivery; verify PO and inventory state unchanged |

---

## Sources

- Supabase official documentation on RLS, custom schemas, and SSR — training data (Aug 2025 cutoff). Verify current patterns at https://supabase.com/docs/guides/auth/row-level-security and https://supabase.com/docs/guides/auth/server-side/nextjs
- Next.js App Router + Server Actions documentation — training data (Aug 2025). Verify at https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
- SSS Contribution Schedule — **LOW confidence for exact 2025 rates.** Verify against current circular at https://www.sss.gov.ph before shipping payroll.
- PhilHealth Premium Rate — **LOW confidence for exact 2025 rates.** Verify against current circular at https://www.philhealth.gov.ph/circulars/
- BIR Withholding Tax Tables — **LOW confidence for exact 2025 brackets.** Verify TRAIN Law implementation at https://www.bir.gov.ph. Cross-check with RR 11-2018 (TRAIN implementing rules).
- Pag-IBIG contribution rates — ₱100 employee / ₱100 employer for monthly basic ≤ ₱5,000; 2% each (capped at ₱200/₱200) for > ₱5,000. **LOW confidence** — verify at https://www.pagibigfund.gov.ph
- PostgreSQL row-level locking (`SELECT FOR UPDATE`) — HIGH confidence, well-established behavior.
- Multi-tenant SaaS patterns (junction table, company_id scoping) — HIGH confidence, widely established pattern.
- PDPA (Republic Act 10173, Philippines) compliance for PII storage — MEDIUM confidence. Consult legal for specifics.

---
*Pitfalls research for: Construction Management SaaS — Philippines market (Next.js 16 + Supabase multi-tenant)*
*Researched: 2026-03-24*
