CREATE TABLE construction.suppliers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES construction.companies(id),
  name          TEXT NOT NULL,
  contact_person TEXT,
  email         TEXT,
  phone         TEXT,
  address       TEXT,
  notes         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_suppliers_company ON construction.suppliers(company_id);

CREATE TABLE construction.purchase_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES construction.companies(id),
  po_number     TEXT NOT NULL UNIQUE,
  project_id    UUID NOT NULL REFERENCES construction.projects(id),
  supplier_id   UUID NOT NULL REFERENCES construction.suppliers(id),
  status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'pending_approval', 'approved',
                         'ordered', 'partially_delivered', 'delivered', 'cancelled')),
  total_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes         TEXT,
  requested_by  UUID NOT NULL REFERENCES construction.profiles(id),
  approved_by   UUID REFERENCES construction.profiles(id),
  approved_at   TIMESTAMPTZ,
  order_date    DATE,
  expected_delivery DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_po_company ON construction.purchase_orders(company_id);
CREATE INDEX idx_po_project ON construction.purchase_orders(project_id);
CREATE INDEX idx_po_status ON construction.purchase_orders(status);

-- Auto-generate PO number
CREATE OR REPLACE FUNCTION construction.generate_po_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(po_number FROM 'PO-\d{4}-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM construction.purchase_orders
  WHERE company_id = NEW.company_id
    AND po_number LIKE 'PO-' || EXTRACT(YEAR FROM now())::TEXT || '-%';

  NEW.po_number := 'PO-' || EXTRACT(YEAR FROM now())::TEXT || '-' ||
                   LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_po_number
  BEFORE INSERT ON construction.purchase_orders
  FOR EACH ROW
  WHEN (NEW.po_number IS NULL OR NEW.po_number = '')
  EXECUTE FUNCTION construction.generate_po_number();

CREATE TABLE construction.po_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES construction.purchase_orders(id) ON DELETE CASCADE,
  material_id     UUID NOT NULL REFERENCES construction.materials(id),
  quantity        NUMERIC(12,2) NOT NULL,
  unit_cost       NUMERIC(12,2) NOT NULL,
  total_cost      NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  quantity_delivered NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_poi_po ON construction.po_items(purchase_order_id);

CREATE TABLE construction.deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES construction.purchase_orders(id),
  delivery_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  received_by     UUID NOT NULL REFERENCES construction.profiles(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE construction.delivery_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id     UUID NOT NULL REFERENCES construction.deliveries(id) ON DELETE CASCADE,
  po_item_id      UUID NOT NULL REFERENCES construction.po_items(id),
  quantity_received NUMERIC(12,2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
