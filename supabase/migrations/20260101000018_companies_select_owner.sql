-- Allow SELECT on companies the user owns before company_members exists.
-- INSERT ... RETURNING is subject to SELECT policies; onboarding inserts the company
-- before the membership row, so user_company_id() is NULL and the row was invisible.

DROP POLICY IF EXISTS "Company members view own company" ON construction.companies;
CREATE POLICY "Company members view own company"
  ON construction.companies FOR SELECT
  USING (
    id = construction.user_company_id()
    OR owner_id = auth.uid()
  );
