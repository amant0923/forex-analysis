ALTER TABLE biases ADD COLUMN IF NOT EXISTS model_provider TEXT;
ALTER TABLE biases ADD COLUMN IF NOT EXISTS model_name TEXT;
ALTER TABLE article_analyses ADD COLUMN IF NOT EXISTS model_provider TEXT;
ALTER TABLE article_analyses ADD COLUMN IF NOT EXISTS model_name TEXT;
