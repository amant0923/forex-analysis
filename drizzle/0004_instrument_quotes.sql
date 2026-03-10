CREATE TABLE IF NOT EXISTS instrument_quotes (
  id SERIAL PRIMARY KEY,
  instrument TEXT NOT NULL UNIQUE,
  price DECIMAL(18, 6),
  change DECIMAL(18, 6),
  change_pct DECIMAL(8, 4),
  day_high DECIMAL(18, 6),
  day_low DECIMAL(18, 6),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instrument_quotes_instrument ON instrument_quotes(instrument);
