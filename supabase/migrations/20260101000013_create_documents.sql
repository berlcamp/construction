CREATE TABLE construction.documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES construction.companies(id),
  project_id    UUID REFERENCES construction.projects(id),
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN (
                  'blueprint', 'permit', 'contract', 'report',
                  'photo', 'invoice', 'receipt', 'other'
                )),
  file_path     TEXT NOT NULL,
  file_size     INTEGER,
  uploaded_by   UUID NOT NULL REFERENCES construction.profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_company ON construction.documents(company_id);
CREATE INDEX idx_documents_project ON construction.documents(project_id);
