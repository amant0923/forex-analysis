-- Telegram integration
ALTER TABLE users ADD COLUMN telegram_chat_id TEXT;
ALTER TABLE users ADD COLUMN telegram_instruments TEXT[] DEFAULT '{}';

CREATE TABLE telegram_link_codes (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_telegram_link_codes_code ON telegram_link_codes(code);
CREATE INDEX idx_telegram_link_codes_user ON telegram_link_codes(user_id);
