CREATE TABLE IF NOT EXISTS economic_events (
  id SERIAL PRIMARY KEY,
  event_name TEXT NOT NULL,
  country TEXT NOT NULL,
  currency TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TEXT,
  impact TEXT NOT NULL DEFAULT 'low',
  actual TEXT,
  forecast TEXT,
  previous TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_name, event_date, currency)
);

CREATE INDEX IF NOT EXISTS idx_economic_events_date ON economic_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_economic_events_currency ON economic_events(currency, event_date DESC);
