-- ============================================================
-- Tighten overly permissive INSERT policies (Phase 1 review)
-- Fixes: companies, company_members, profiles INSERT WITH CHECK (true)
-- Also: payroll_items cross-tenant leak, projects missing project_manager
-- ============================================================

-- ============================================================
-- 1. COMPANIES: only the authenticated user can create a company they own
-- ============================================================
DROP POLICY IF EXISTS "Allow company creation" ON construction.companies;
CREATE POLICY "Allow company creation"
  ON construction.companies FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- ============================================================
-- 2. COMPANY_MEMBERS: you can only insert yourself as a member
--    Role/company assignment is controlled by app layer:
--    - Onboarding: always 'owner' for the company just created
--    - Invitation: role from the invitation record
-- ============================================================
DROP POLICY IF EXISTS "Allow member creation" ON construction.company_members;
CREATE POLICY "Allow member creation"
  ON construction.company_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 3. PROFILES: you can only insert your own profile
--    The auth trigger runs as SECURITY DEFINER (bypasses RLS),
--    but ensureProfile.ts upserts via the user's JWT — needs this.
-- ============================================================
DROP POLICY IF EXISTS "Service role can insert profiles" ON construction.profiles;
CREATE POLICY "Users can insert own profile"
  ON construction.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================================
-- 4. PAYROLL_ITEMS: add company isolation to the staff view policy
--    Previous policy let employees see payroll items without
--    scoping by company (cross-tenant leak if same profile_id
--    had employee records in multiple companies — defense in depth).
-- ============================================================
DROP POLICY IF EXISTS "Staff view own payroll items" ON construction.payroll_items;
CREATE POLICY "Staff view own payroll items"
  ON construction.payroll_items FOR SELECT
  USING (
    payroll_id IN (
      SELECT id FROM construction.payroll
      WHERE company_id = construction.user_company_id()
    )
    AND (
      construction.user_role() IN ('owner', 'admin', 'accountant')
      OR employee_id IN (
        SELECT id FROM construction.employees
        WHERE profile_id = auth.uid()
          AND company_id = construction.user_company_id()
      )
    )
  );

-- ============================================================
-- 5. PROJECTS: add project_manager to the role-based view list
-- ============================================================
DROP POLICY IF EXISTS "Company members view projects" ON construction.projects;
CREATE POLICY "Company members view projects"
  ON construction.projects FOR SELECT
  USING (
    company_id = construction.user_company_id()
    AND (
      construction.user_role() IN ('owner', 'admin', 'accountant', 'procurement_officer', 'project_manager')
      OR id IN (
        SELECT pm.project_id FROM construction.project_members pm
        JOIN construction.employees e ON e.id = pm.employee_id
        WHERE e.profile_id = auth.uid() AND pm.removed_at IS NULL
      )
    )
  );
