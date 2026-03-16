-- Bias translations for multi-language support

CREATE TABLE IF NOT EXISTS bias_translations (
  id SERIAL PRIMARY KEY,
  bias_id INTEGER REFERENCES biases(id) ON DELETE CASCADE,
  locale TEXT NOT NULL DEFAULT 'es',
  summary TEXT NOT NULL,
  key_drivers JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bias_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_bias_translations_bias ON bias_translations(bias_id);
CREATE INDEX IF NOT EXISTS idx_bias_translations_locale ON bias_translations(locale);
