-- B2B API clients for prop firms

CREATE TABLE IF NOT EXISTS b2b_clients (
  id SERIAL PRIMARY KEY,
  company_name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  api_key_prefix TEXT NOT NULL,
  webhook_url TEXT,
  instruments JSONB DEFAULT '[]',
  rate_limit INTEGER DEFAULT 1000,
  monthly_fee_cents INTEGER DEFAULT 50000,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_b2b_clients_key ON b2b_clients(api_key_hash);
