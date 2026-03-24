CREATE TABLE construction.expenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES construction.companies(id),
  project_id    UUID REFERENCES construction.projects(id),
  category      TEXT NOT NULL CHECK (category IN (
                  'materials', 'labor', 'equipment', 'transport',
                  'permits', 'utilities', 'subcontractor', 'misc'
                )),
  description   TEXT NOT NULL,
  amount        NUMERIC(12,2) NOT NULL,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url   TEXT,
  submitted_by  UUID NOT NULL REFERENCES construction.profiles(id),
  approved_by   UUID REFERENCES construction.profiles(id),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_company ON construction.expenses(company_id);
CREATE INDEX idx_expenses_project ON construction.expenses(project_id);
