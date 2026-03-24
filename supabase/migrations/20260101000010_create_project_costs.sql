CREATE TABLE construction.project_costs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES construction.projects(id),
  category      TEXT NOT NULL CHECK (category IN ('materials', 'labor', 'equipment')),
  description   TEXT NOT NULL,
  amount        NUMERIC(12,2) NOT NULL,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_type TEXT,
  reference_id  UUID,
  recorded_by   UUID NOT NULL REFERENCES construction.profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pc_project ON construction.project_costs(project_id);
CREATE INDEX idx_pc_category ON construction.project_costs(category);

-- View: Project cost summary vs budget
CREATE OR REPLACE VIEW construction.project_cost_summary AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  p.budget,
  COALESCE(SUM(pc.amount) FILTER (WHERE pc.category = 'materials'), 0) AS materials_cost,
  COALESCE(SUM(pc.amount) FILTER (WHERE pc.category = 'labor'), 0) AS labor_cost,
  COALESCE(SUM(pc.amount) FILTER (WHERE pc.category = 'equipment'), 0) AS equipment_cost,
  COALESCE(SUM(pc.amount), 0) AS total_cost,
  p.budget - COALESCE(SUM(pc.amount), 0) AS remaining_budget
FROM construction.projects p
LEFT JOIN construction.project_costs pc ON pc.project_id = p.id
GROUP BY p.id, p.name, p.budget;
