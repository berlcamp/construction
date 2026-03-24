CREATE TABLE construction.projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES construction.companies(id),
  name          TEXT NOT NULL,
  description   TEXT,
  location      TEXT,
  client_name   TEXT,
  client_contact TEXT,
  status        TEXT NOT NULL DEFAULT 'planning'
                  CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  start_date    DATE,
  target_end_date DATE,
  actual_end_date DATE,
  budget        NUMERIC(15,2),
  progress      INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  created_by    UUID NOT NULL REFERENCES construction.profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_company ON construction.projects(company_id);
CREATE INDEX idx_projects_status ON construction.projects(status);

-- Note: project_members references employees which is created in migration 007
-- It will be added in a later migration to avoid circular dependency.
-- For now we create a deferred table that gets populated after employees exist.
CREATE TABLE construction.project_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES construction.projects(id) ON DELETE CASCADE,
  employee_id   UUID,  -- Will get FK constraint after employees table is created
  role          TEXT NOT NULL DEFAULT 'member'
                  CHECK (role IN ('project_manager', 'engineer', 'foreman', 'member')),
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at    TIMESTAMPTZ
);

CREATE INDEX idx_pm_project ON construction.project_members(project_id);
CREATE INDEX idx_pm_employee ON construction.project_members(employee_id);
