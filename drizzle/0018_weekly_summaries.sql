-- Weekly SEO summaries per instrument

CREATE TABLE IF NOT EXISTS weekly_summaries (
  id SERIAL PRIMARY KEY,
  instrument TEXT NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  summary TEXT NOT NULL,
  key_themes JSONB DEFAULT '[]',
  bias_trajectory JSONB DEFAULT '{}',
  article_count INTEGER DEFAULT 0,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(instrument, week_start)
);

CREATE INDEX idx_weekly_summaries_instrument ON weekly_summaries(instrument, week_start DESC);
