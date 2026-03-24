-- ============================================================
-- updated_at trigger function
-- ============================================================
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

-- ============================================================
-- Enable RLS on all tables in the construction schema
-- ============================================================
ALTER TABLE construction.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.company_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.project_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.stock_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.inventory_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.po_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.delivery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.cash_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.employee_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.project_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.equipment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction.subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper functions (in auth schema for use in policies)
-- ============================================================

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

-- ============================================================
-- PROFILES policies
-- ============================================================
CREATE POLICY "Users view own company profiles"
  ON construction.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR id IN (
      SELECT user_id FROM construction.company_members
      WHERE company_id = auth.user_company_id()
    )
  );

CREATE POLICY "Users update own profile"
  ON construction.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Owner/Admin update any profile in company"
  ON construction.profiles FOR UPDATE
  USING (
    auth.is_company_admin()
    AND id IN (
      SELECT user_id FROM construction.company_members
      WHERE company_id = auth.user_company_id()
    )
  );

-- Allow auth trigger (service role) to insert profiles
CREATE POLICY "Service role can insert profiles"
  ON construction.profiles FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- COMPANIES policies
-- ============================================================
CREATE POLICY "Company members view own company"
  ON construction.companies FOR SELECT
  USING (id = auth.user_company_id());

CREATE POLICY "Owner/Admin update company"
  ON construction.companies FOR UPDATE
  USING (id = auth.user_company_id() AND auth.is_company_admin());

CREATE POLICY "Allow company creation"
  ON construction.companies FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- COMPANY_MEMBERS policies
-- ============================================================
CREATE POLICY "View own company members"
  ON construction.company_members FOR SELECT
  USING (company_id = auth.user_company_id());

CREATE POLICY "Owner/Admin manage members"
  ON construction.company_members FOR ALL
  USING (
    company_id = auth.user_company_id()
    AND auth.is_company_admin()
  );

-- Allow insertion during company creation flow
CREATE POLICY "Allow member creation"
  ON construction.company_members FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- COMPANY_INVITATIONS policies
-- ============================================================
CREATE POLICY "Owner/Admin manage invitations"
  ON construction.company_invitations FOR ALL
  USING (
    company_id = auth.user_company_id()
    AND auth.is_company_admin()
  );

CREATE POLICY "Invited user can view own invitation"
  ON construction.company_invitations FOR SELECT
  USING (
    invited_email = (SELECT email FROM construction.profiles WHERE id = auth.uid())
  );

-- ============================================================
-- PROJECTS policies
-- ============================================================
CREATE POLICY "Company members view projects"
  ON construction.projects FOR SELECT
  USING (
    company_id = auth.user_company_id()
    AND (
      auth.user_role() IN ('owner', 'admin', 'accountant', 'procurement_officer')
      OR id IN (
        SELECT pm.project_id FROM construction.project_members pm
        JOIN construction.employees e ON e.id = pm.employee_id
        WHERE e.profile_id = auth.uid() AND pm.removed_at IS NULL
      )
    )
  );

CREATE POLICY "Company isolation for projects"
  ON construction.projects FOR ALL
  USING (company_id = auth.user_company_id());

-- ============================================================
-- PROJECT_MEMBERS policies
-- ============================================================
CREATE POLICY "Company isolation for project_members"
  ON construction.project_members FOR ALL
  USING (
    project_id IN (
      SELECT id FROM construction.projects WHERE company_id = auth.user_company_id()
    )
  );

-- ============================================================
-- MATERIALS policies
-- ============================================================
CREATE POLICY "Company isolation for materials"
  ON construction.materials FOR ALL
  USING (company_id = auth.user_company_id());

-- ============================================================
-- PROJECT_INVENTORY policies
-- ============================================================
CREATE POLICY "Company isolation for project_inventory"
  ON construction.project_inventory FOR ALL
  USING (
    project_id IN (
      SELECT id FROM construction.projects WHERE company_id = auth.user_company_id()
    )
  );

-- ============================================================
-- STOCK_RESERVATIONS policies
-- ============================================================
CREATE POLICY "Company isolation for stock_reservations"
  ON construction.stock_reservations FOR ALL
  USING (
    project_id IN (
      SELECT id FROM construction.projects WHERE company_id = auth.user_company_id()
    )
  );

-- ============================================================
-- INVENTORY_TRANSFERS policies
-- ============================================================
CREATE POLICY "Company isolation for inventory_transfers"
  ON construction.inventory_transfers FOR ALL
  USING (company_id = auth.user_company_id());

-- ============================================================
-- INVENTORY_LOGS policies
-- ============================================================
CREATE POLICY "Company isolation for inventory_logs"
  ON construction.inventory_logs FOR ALL
  USING (
    project_id IN (
      SELECT id FROM construction.projects WHERE company_id = auth.user_company_id()
    )
  );

-- ============================================================
-- SUPPLIERS policies
-- ============================================================
CREATE POLICY "Company isolation for suppliers"
  ON construction.suppliers FOR ALL
  USING (company_id = auth.user_company_id());

-- ============================================================
-- PURCHASE_ORDERS policies
-- ============================================================
CREATE POLICY "Company isolation for purchase_orders"
  ON construction.purchase_orders FOR SELECT
  USING (company_id = auth.user_company_id());

CREATE POLICY "Create POs"
  ON construction.purchase_orders FOR INSERT
  WITH CHECK (
    company_id = auth.user_company_id()
    AND auth.user_role() IN ('owner', 'admin', 'procurement_officer')
  );

CREATE POLICY "Update POs"
  ON construction.purchase_orders FOR UPDATE
  USING (company_id = auth.user_company_id());

CREATE POLICY "Delete POs"
  ON construction.purchase_orders FOR DELETE
  USING (company_id = auth.user_company_id() AND auth.is_company_admin());

-- ============================================================
-- PO_ITEMS policies
-- ============================================================
CREATE POLICY "Company isolation for po_items"
  ON construction.po_items FOR ALL
  USING (
    purchase_order_id IN (
      SELECT id FROM construction.purchase_orders WHERE company_id = auth.user_company_id()
    )
  );

-- ============================================================
-- DELIVERIES policies
-- ============================================================
CREATE POLICY "Company isolation for deliveries"
  ON construction.deliveries FOR ALL
  USING (
    purchase_order_id IN (
      SELECT id FROM construction.purchase_orders WHERE company_id = auth.user_company_id()
    )
  );

-- ============================================================
-- DELIVERY_ITEMS policies
-- ============================================================
CREATE POLICY "Company isolation for delivery_items"
  ON construction.delivery_items FOR ALL
  USING (
    delivery_id IN (
      SELECT d.id FROM construction.deliveries d
      JOIN construction.purchase_orders po ON po.id = d.purchase_order_id
      WHERE po.company_id = auth.user_company_id()
    )
  );

-- ============================================================
-- EMPLOYEES policies
-- ============================================================
CREATE POLICY "Company isolation for employees"
  ON construction.employees FOR ALL
  USING (company_id = auth.user_company_id());

-- ============================================================
-- ATTENDANCE policies
-- ============================================================
CREATE POLICY "Company isolation for attendance"
  ON construction.attendance FOR ALL
  USING (
    employee_id IN (
      SELECT id FROM construction.employees WHERE company_id = auth.user_company_id()
    )
  );

-- ============================================================
-- CASH_ADVANCES policies
-- ============================================================
CREATE POLICY "Company isolation for cash_advances"
  ON construction.cash_advances FOR ALL
  USING (company_id = auth.user_company_id());

-- ============================================================
-- EMPLOYEE_LOANS policies
-- ============================================================
CREATE POLICY "Company isolation for employee_loans"
  ON construction.employee_loans FOR ALL
  USING (company_id = auth.user_company_id());

-- ============================================================
-- PAYROLL policies
-- ============================================================
CREATE POLICY "Admin/Accountant view all payroll"
  ON construction.payroll FOR SELECT
  USING (
    company_id = auth.user_company_id()
    AND auth.user_role() IN ('owner', 'admin', 'accountant')
  );

CREATE POLICY "Admin/Accountant manage payroll"
  ON construction.payroll FOR ALL
  USING (
    company_id = auth.user_company_id()
    AND auth.user_role() IN ('owner', 'admin', 'accountant')
  );

-- ============================================================
-- PAYROLL_ITEMS policies
-- ============================================================
CREATE POLICY "Staff view own payroll items"
  ON construction.payroll_items FOR SELECT
  USING (
    auth.user_role() IN ('owner', 'admin', 'accountant')
    OR employee_id IN (
      SELECT id FROM construction.employees WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Admin/Accountant manage payroll items"
  ON construction.payroll_items FOR ALL
  USING (
    payroll_id IN (
      SELECT id FROM construction.payroll WHERE company_id = auth.user_company_id()
    )
    AND auth.user_role() IN ('owner', 'admin', 'accountant')
  );

-- ============================================================
-- PROJECT_COSTS policies
-- ============================================================
CREATE POLICY "Company isolation for project_costs"
  ON construction.project_costs FOR ALL
  USING (
    project_id IN (
      SELECT id FROM construction.projects WHERE company_id = auth.user_company_id()
    )
  );

-- ============================================================
-- EXPENSES policies
-- ============================================================
CREATE POLICY "Company isolation for expenses"
  ON construction.expenses FOR ALL
  USING (company_id = auth.user_company_id());

-- ============================================================
-- EQUIPMENT policies
-- ============================================================
CREATE POLICY "Company isolation for equipment"
  ON construction.equipment FOR ALL
  USING (company_id = auth.user_company_id());

-- ============================================================
-- EQUIPMENT_ASSIGNMENTS policies
-- ============================================================
CREATE POLICY "Company isolation for equipment_assignments"
  ON construction.equipment_assignments FOR ALL
  USING (
    equipment_id IN (
      SELECT id FROM construction.equipment WHERE company_id = auth.user_company_id()
    )
  );

-- ============================================================
-- DOCUMENTS policies
-- ============================================================
CREATE POLICY "Company isolation for documents"
  ON construction.documents FOR ALL
  USING (company_id = auth.user_company_id());

-- ============================================================
-- NOTIFICATIONS policies
-- ============================================================
CREATE POLICY "Users view own notifications"
  ON construction.notifications FOR SELECT
  USING (user_id = auth.uid() AND company_id = auth.user_company_id());

CREATE POLICY "System can insert notifications"
  ON construction.notifications FOR INSERT
  WITH CHECK (company_id = auth.user_company_id());

CREATE POLICY "Users update own notifications"
  ON construction.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================
-- AUDIT_LOGS policies
-- ============================================================
CREATE POLICY "Admin only audit logs"
  ON construction.audit_logs FOR SELECT
  USING (
    company_id = auth.user_company_id()
    AND auth.user_role() IN ('owner', 'admin')
  );

CREATE POLICY "System can insert audit logs"
  ON construction.audit_logs FOR INSERT
  WITH CHECK (company_id = auth.user_company_id());

-- ============================================================
-- SUBSCRIPTIONS policies
-- ============================================================
CREATE POLICY "Company isolation for subscriptions"
  ON construction.subscriptions FOR ALL
  USING (company_id = auth.user_company_id());
