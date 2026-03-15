CREATE TABLE IF NOT EXISTS trader_insights (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('pattern', 'dna_profile')),
  insights JSONB NOT NULL,
  trade_count INT NOT NULL,
  period_start DATE,
  period_end DATE,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trader_insights_user ON trader_insights(user_id, type, generated_at DESC);
