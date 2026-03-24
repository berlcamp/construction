CREATE TABLE construction.notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES construction.companies(id),
  user_id       UUID NOT NULL REFERENCES construction.profiles(id),
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'info'
                  CHECK (type IN ('info', 'warning', 'success', 'error')),
  link          TEXT,
  is_read       BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON construction.notifications(user_id, is_read);

CREATE TABLE construction.audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES construction.companies(id),
  user_id       UUID REFERENCES construction.profiles(id),
  action        TEXT NOT NULL,
  table_name    TEXT NOT NULL,
  record_id     UUID,
  old_data      JSONB,
  new_data      JSONB,
  ip_address    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_company ON construction.audit_logs(company_id);
CREATE INDEX idx_audit_table ON construction.audit_logs(table_name, record_id);
CREATE INDEX idx_audit_created ON construction.audit_logs(created_at);
