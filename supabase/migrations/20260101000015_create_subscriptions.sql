CREATE TABLE construction.subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES construction.companies(id) ON DELETE CASCADE,
  plan          TEXT NOT NULL,
  amount        NUMERIC(10,2) NOT NULL,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'paid', 'past_due', 'cancelled')),
  payment_method TEXT,
  payment_reference TEXT,
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_company ON construction.subscriptions(company_id);
