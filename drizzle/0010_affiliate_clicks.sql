CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id SERIAL PRIMARY KEY,
  broker TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id),
  referrer_page TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_broker ON affiliate_clicks (broker);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_date ON affiliate_clicks (clicked_at);
