CREATE TABLE construction.cash_advances (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES construction.companies(id),
  employee_id   UUID NOT NULL REFERENCES construction.employees(id),
  amount        NUMERIC(12,2) NOT NULL,
  remaining_balance NUMERIC(12,2) NOT NULL,
  reason        TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'paid_out', 'fully_deducted', 'rejected')),
  approved_by   UUID REFERENCES construction.profiles(id),
  date_granted  DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ca_employee ON construction.cash_advances(employee_id);
CREATE INDEX idx_ca_status ON construction.cash_advances(status);

CREATE TABLE construction.employee_loans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES construction.companies(id),
  employee_id   UUID NOT NULL REFERENCES construction.employees(id),
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

CREATE INDEX idx_loans_employee ON construction.employee_loans(employee_id);
CREATE INDEX idx_loans_status ON construction.employee_loans(status);
