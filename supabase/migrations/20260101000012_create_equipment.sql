CREATE TABLE construction.equipment (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES construction.companies(id),
  name          TEXT NOT NULL,
  type          TEXT,
  serial_number TEXT,
  status        TEXT NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available', 'in_use', 'maintenance', 'retired')),
  purchase_date DATE,
  purchase_cost NUMERIC(12,2),
  daily_rate    NUMERIC(10,2),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (company_id, serial_number)
);

CREATE INDEX idx_equipment_company ON construction.equipment(company_id);

CREATE TABLE construction.equipment_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id  UUID NOT NULL REFERENCES construction.equipment(id),
  project_id    UUID NOT NULL REFERENCES construction.projects(id),
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  returned_date DATE,
  assigned_by   UUID NOT NULL REFERENCES construction.profiles(id),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
