CREATE TABLE construction.materials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES construction.companies(id),
  name          TEXT NOT NULL,
  description   TEXT,
  unit          TEXT NOT NULL CHECK (unit IN (
                  'pcs', 'bags', 'kg', 'tons', 'liters', 'gallons',
                  'meters', 'feet', 'sq_m', 'sq_ft', 'cu_m', 'cu_ft',
                  'rolls', 'sheets', 'boxes', 'sets'
                )),
  category      TEXT,
  unit_cost     NUMERIC(12,2),
  sku           TEXT,
  min_stock     NUMERIC(12,2) DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (company_id, sku)
);

CREATE INDEX idx_materials_company ON construction.materials(company_id);
CREATE INDEX idx_materials_category ON construction.materials(category);

CREATE TABLE construction.project_inventory (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES construction.projects(id) ON DELETE CASCADE,
  material_id   UUID NOT NULL REFERENCES construction.materials(id),
  quantity      NUMERIC(12,2) NOT NULL DEFAULT 0,
  reserved      NUMERIC(12,2) NOT NULL DEFAULT 0,
  last_updated  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (project_id, material_id)
);

CREATE INDEX idx_pi_project ON construction.project_inventory(project_id);

CREATE TABLE construction.inventory_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES construction.projects(id),
  material_id   UUID NOT NULL REFERENCES construction.materials(id),
  type          TEXT NOT NULL CHECK (type IN (
                  'in', 'out', 'transfer_in', 'transfer_out',
                  'adjustment', 'waste', 'reservation', 'release'
                )),
  quantity      NUMERIC(12,2) NOT NULL,
  reference_type TEXT,
  reference_id  UUID,
  waste_reason  TEXT,
  notes         TEXT,
  performed_by  UUID NOT NULL REFERENCES construction.profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_il_project_material ON construction.inventory_logs(project_id, material_id);
CREATE INDEX idx_il_type ON construction.inventory_logs(type);
CREATE INDEX idx_il_created ON construction.inventory_logs(created_at);
