-- Email digest preferences

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_digest_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_digest_time TEXT DEFAULT '07:00';
