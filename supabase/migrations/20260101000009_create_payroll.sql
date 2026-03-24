CREATE TABLE construction.payroll (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES construction.companies(id),
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  pay_type      TEXT NOT NULL DEFAULT 'semi_monthly'
                  CHECK (pay_type IN ('weekly', 'semi_monthly', 'monthly')),
  status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'computed', 'approved', 'paid')),
  total_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  processed_by  UUID REFERENCES construction.profiles(id),
  approved_by   UUID REFERENCES construction.profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payroll_company ON construction.payroll(company_id);

CREATE TABLE construction.payroll_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_id      UUID NOT NULL REFERENCES construction.payroll(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES construction.employees(id),
  days_worked     NUMERIC(5,1) NOT NULL DEFAULT 0,
  overtime_hours  NUMERIC(5,1) NOT NULL DEFAULT 0,
  base_pay        NUMERIC(12,2) NOT NULL DEFAULT 0,
  overtime_pay    NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- PH Statutory Deductions
  sss_ee          NUMERIC(10,2) NOT NULL DEFAULT 0,
  sss_er          NUMERIC(10,2) NOT NULL DEFAULT 0,
  philhealth_ee   NUMERIC(10,2) NOT NULL DEFAULT 0,
  philhealth_er   NUMERIC(10,2) NOT NULL DEFAULT 0,
  pagibig_ee      NUMERIC(10,2) NOT NULL DEFAULT 0,
  pagibig_er      NUMERIC(10,2) NOT NULL DEFAULT 0,
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

CREATE INDEX idx_pi_payroll ON construction.payroll_items(payroll_id);
