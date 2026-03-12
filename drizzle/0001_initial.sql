CREATE TABLE IF NOT EXISTS instruments (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  url TEXT UNIQUE NOT NULL,
  source TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS article_instruments (
  article_id INT REFERENCES articles(id) ON DELETE CASCADE,
  instrument TEXT REFERENCES instruments(code),
  PRIMARY KEY (article_id, instrument)
);

CREATE TABLE IF NOT EXISTS biases (
  id SERIAL PRIMARY KEY,
  instrument TEXT REFERENCES instruments(code),
  timeframe TEXT NOT NULL,
  direction TEXT NOT NULL,
  summary TEXT,
  key_drivers JSONB,
  supporting_articles JSONB,
  generated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT NOT NULL,
  tier TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed instruments
INSERT INTO instruments (code, name, category) VALUES
  ('DXY', 'US Dollar Index', 'forex'),
  ('EURUSD', 'Euro / US Dollar', 'forex'),
  ('GBPUSD', 'British Pound / US Dollar', 'forex'),
  ('GER40', 'Germany 40 (DAX)', 'index'),
  ('US30', 'Dow Jones Industrial Average', 'index'),
  ('NAS100', 'Nasdaq 100', 'index'),
  ('SP500', 'S&P 500', 'index'),
  ('USDJPY', 'US Dollar / Japanese Yen', 'forex'),
  ('EURJPY', 'Euro / Japanese Yen', 'forex'),
  ('GBPJPY', 'British Pound / Japanese Yen', 'forex'),
  ('EURGBP', 'Euro / British Pound', 'forex'),
  ('XAUUSD', 'Gold / US Dollar', 'commodity'),
  ('XAGUSD', 'Silver / US Dollar', 'commodity')
ON CONFLICT (code) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_biases_instrument_time ON biases(instrument, timeframe, generated_at DESC);
