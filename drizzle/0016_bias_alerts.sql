-- Bias change alerts: detect when fundamental bias flips direction

CREATE TABLE IF NOT EXISTS bias_alerts (
  id SERIAL PRIMARY KEY,
  instrument TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  previous_direction TEXT NOT NULL,
  new_direction TEXT NOT NULL,
  confidence INTEGER DEFAULT 0,
  previous_confidence INTEGER DEFAULT 0,
  key_articles JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bias_alerts_created ON bias_alerts(created_at DESC);
CREATE INDEX idx_bias_alerts_instrument ON bias_alerts(instrument);
