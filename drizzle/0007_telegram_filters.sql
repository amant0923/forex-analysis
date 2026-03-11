ALTER TABLE users ADD COLUMN telegram_confidence_filter TEXT[] DEFAULT '{high,medium,low}';
