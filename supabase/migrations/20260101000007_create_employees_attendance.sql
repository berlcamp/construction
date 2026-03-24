CREATE TABLE construction.employees (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES construction.companies(id),
  profile_id    UUID REFERENCES construction.profiles(id),
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  employee_type TEXT NOT NULL CHECK (employee_type IN ('salaried', 'daily_wage', 'contract')),
  job_title     TEXT NOT NULL,
  daily_rate    NUMERIC(10,2),
  monthly_salary NUMERIC(12,2),
  sss_number    TEXT,
  philhealth_number TEXT,
  pagibig_number TEXT,
  tin           TEXT,
  contact_phone TEXT,
  emergency_contact TEXT,
  date_hired    DATE NOT NULL DEFAULT CURRENT_DATE,
  date_terminated DATE,
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive', 'terminated')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_employees_company ON construction.employees(company_id);
CREATE INDEX idx_employees_status ON construction.employees(status);

-- Now add FK constraint to project_members.employee_id
ALTER TABLE construction.project_members
  ADD CONSTRAINT fk_pm_employee
  FOREIGN KEY (employee_id) REFERENCES construction.employees(id) ON DELETE CASCADE;

ALTER TABLE construction.project_members
  ADD CONSTRAINT uq_pm_project_employee UNIQUE (project_id, employee_id);

CREATE TABLE construction.attendance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES construction.employees(id),
  project_id    UUID REFERENCES construction.projects(id),
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  status        TEXT NOT NULL CHECK (status IN ('present', 'absent', 'half_day', 'overtime', 'leave')),
  hours_worked  NUMERIC(4,1) DEFAULT 8,
  overtime_hours NUMERIC(4,1) DEFAULT 0,
  notes         TEXT,
  recorded_by   UUID NOT NULL REFERENCES construction.profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (employee_id, date)
);

CREATE INDEX idx_attendance_date ON construction.attendance(date);
CREATE INDEX idx_attendance_employee ON construction.attendance(employee_id);
