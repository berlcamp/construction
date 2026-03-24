CREATE TABLE construction.stock_reservations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES construction.projects(id),
  material_id   UUID NOT NULL REFERENCES construction.materials(id),
  quantity      NUMERIC(12,2) NOT NULL,
  purpose       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'fulfilled', 'cancelled')),
  reserved_by   UUID NOT NULL REFERENCES construction.profiles(id),
  fulfilled_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reservations_project ON construction.stock_reservations(project_id);

CREATE TABLE construction.inventory_transfers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL REFERENCES construction.companies(id),
  from_project_id  UUID NOT NULL REFERENCES construction.projects(id),
  to_project_id    UUID NOT NULL REFERENCES construction.projects(id),
  material_id      UUID NOT NULL REFERENCES construction.materials(id),
  quantity         NUMERIC(12,2) NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'completed', 'rejected')),
  notes            TEXT,
  requested_by     UUID NOT NULL REFERENCES construction.profiles(id),
  approved_by      UUID REFERENCES construction.profiles(id),
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transfers_company ON construction.inventory_transfers(company_id);
