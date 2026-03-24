CREATE TABLE construction.companies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  owner_id      UUID NOT NULL REFERENCES construction.profiles(id),
  address       TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  tin           TEXT,
  plan          TEXT NOT NULL DEFAULT 'starter'
                  CHECK (plan IN ('starter', 'professional', 'business', 'enterprise')),
  plan_status   TEXT NOT NULL DEFAULT 'trial'
                  CHECK (plan_status IN ('trial', 'active', 'past_due', 'cancelled')),
  trial_ends_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '14 days'),
  current_period_start DATE,
  current_period_end   DATE,
  max_projects  INTEGER NOT NULL DEFAULT 3,
  max_employees INTEGER NOT NULL DEFAULT 10,
  max_users     INTEGER NOT NULL DEFAULT 2,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Junction table: links users to companies with roles
CREATE TABLE construction.company_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES construction.companies(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES construction.profiles(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'staff'
                  CHECK (role IN ('owner', 'admin', 'project_manager', 'accountant',
                                  'procurement_officer', 'staff')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each user can only belong to one company (for now)
  UNIQUE (user_id)
);

-- Enforce exactly one owner per company via partial unique index
CREATE UNIQUE INDEX idx_one_owner_per_company
  ON construction.company_members (company_id)
  WHERE role = 'owner';

CREATE INDEX idx_company_members_company ON construction.company_members(company_id);
CREATE INDEX idx_company_members_user ON construction.company_members(user_id);

-- Composite index for RLS performance (PITFALLS.md Pitfall 2)
CREATE INDEX idx_company_members_user_company ON construction.company_members(user_id, company_id);

-- Invitation system for adding users to companies
CREATE TABLE construction.company_invitations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES construction.companies(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'staff'
                  CHECK (role IN ('admin', 'project_manager', 'accountant',
                                  'procurement_officer', 'staff')),
  token         TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by    UUID NOT NULL REFERENCES construction.profiles(id),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent duplicate pending invitations
CREATE UNIQUE INDEX idx_unique_pending_invitation
  ON construction.company_invitations (company_id, invited_email)
  WHERE status = 'pending';

CREATE INDEX idx_invitations_token ON construction.company_invitations(token);
CREATE INDEX idx_invitations_email ON construction.company_invitations(invited_email);
