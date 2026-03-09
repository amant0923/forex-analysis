-- Add summary column to articles
ALTER TABLE articles ADD COLUMN IF NOT EXISTS summary TEXT;

-- Per-article impact analysis (one row per article-instrument pair)
CREATE TABLE IF NOT EXISTS article_analyses (
  id SERIAL PRIMARY KEY,
  article_id INT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  instrument TEXT NOT NULL REFERENCES instruments(code),
  event TEXT NOT NULL,
  mechanism TEXT NOT NULL,
  impact_direction TEXT NOT NULL,
  impact_timeframes JSONB,
  confidence TEXT NOT NULL,
  commentary TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (article_id, instrument)
);

CREATE INDEX IF NOT EXISTS idx_article_analyses_article ON article_analyses(article_id);
CREATE INDEX IF NOT EXISTS idx_article_analyses_instrument ON article_analyses(instrument, generated_at DESC);
