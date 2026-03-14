-- Bias Outcomes: tracks prediction accuracy by comparing bias direction to actual price movement
CREATE TABLE IF NOT EXISTS bias_outcomes (
  id SERIAL PRIMARY KEY,
  bias_id INTEGER NOT NULL UNIQUE REFERENCES biases(id) ON DELETE CASCADE,
  instrument TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  predicted_direction TEXT NOT NULL,
  open_price DECIMAL(18,6) NOT NULL,
  close_price DECIMAL(18,6),
  price_change_pct DECIMAL(8,4),
  actual_direction TEXT,
  is_correct BOOLEAN,
  generated_at TIMESTAMPTZ NOT NULL,
  settles_at TIMESTAMPTZ NOT NULL,
  settled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bias_outcomes_instrument_timeframe ON bias_outcomes (instrument, timeframe);
CREATE INDEX IF NOT EXISTS idx_bias_outcomes_unsettled ON bias_outcomes (settles_at) WHERE settled_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bias_outcomes_correct ON bias_outcomes (is_correct) WHERE is_correct IS NOT NULL;
