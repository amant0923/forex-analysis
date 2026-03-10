-- Trading accounts
CREATE TABLE trading_accounts (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  broker TEXT,
  account_size DECIMAL(18, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  leverage INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_trading_accounts_user ON trading_accounts(user_id);

-- Playbooks
CREATE TABLE playbooks (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  instrument TEXT REFERENCES instruments(code) ON DELETE SET NULL,
  timeframe TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_playbooks_user ON playbooks(user_id);

-- Playbook rules
CREATE TABLE playbook_rules (
  id SERIAL PRIMARY KEY,
  playbook_id INT NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('entry', 'exit', 'risk')),
  rule_text TEXT NOT NULL,
  sort_order INT DEFAULT 0
);
CREATE INDEX idx_playbook_rules_playbook ON playbook_rules(playbook_id, sort_order);

-- Trades
CREATE TABLE trades (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id INT NOT NULL REFERENCES trading_accounts(id) ON DELETE RESTRICT,
  playbook_id INT REFERENCES playbooks(id) ON DELETE SET NULL,
  instrument TEXT NOT NULL REFERENCES instruments(code),
  direction TEXT NOT NULL CHECK (direction IN ('buy', 'sell')),
  entry_price DECIMAL(18, 6) NOT NULL,
  exit_price DECIMAL(18, 6),
  stop_loss DECIMAL(18, 6),
  take_profit DECIMAL(18, 6),
  lot_size DECIMAL(10, 4) NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  pnl_pips DECIMAL(10, 2),
  pnl_ticks DECIMAL(10, 2),
  pnl_dollars DECIMAL(18, 2),
  rr_ratio DECIMAL(6, 2),
  account_pct_impact DECIMAL(8, 4),
  session TEXT CHECK (session IN ('london', 'new_york', 'asia', 'overlap')),
  timeframe_traded TEXT,
  emotion_before TEXT CHECK (emotion_before IN ('confident', 'calm', 'anxious', 'FOMO', 'revenge', 'uncertain')),
  emotion_after TEXT CHECK (emotion_after IN ('satisfied', 'frustrated', 'relieved', 'regretful', 'neutral')),
  rule_adherence_score INT,
  rule_adherence_details JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (pnl_pips IS NULL OR pnl_ticks IS NULL)
);
CREATE INDEX idx_trades_user_opened ON trades(user_id, opened_at DESC);
CREATE INDEX idx_trades_user_instrument ON trades(user_id, instrument);
CREATE INDEX idx_trades_user_playbook ON trades(user_id, playbook_id);
CREATE INDEX idx_trades_user_closed ON trades(user_id, closed_at DESC);

-- Trade screenshots
CREATE TABLE trade_screenshots (
  id SERIAL PRIMARY KEY,
  trade_id INT NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  label TEXT CHECK (label IN ('entry', 'exit', 'setup', 'other')),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_trade_screenshots_trade ON trade_screenshots(trade_id);

-- AI reviews
CREATE TABLE trade_ai_reviews (
  id SERIAL PRIMARY KEY,
  trade_id INT NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  verdict TEXT CHECK (verdict IN ('good', 'acceptable', 'poor')),
  bias_alignment TEXT CHECK (bias_alignment IN ('with', 'against', 'neutral')),
  bias_alignment_explanation TEXT,
  rule_adherence_review TEXT,
  risk_assessment TEXT,
  timing_analysis TEXT,
  psychology_flag TEXT,
  suggestions JSONB,
  bias_snapshot JSONB,
  events_snapshot JSONB,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trade_id)
);

-- Chat messages
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id, created_at DESC);

-- Chat summaries for context windowing
CREATE TABLE chat_summaries (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  messages_covered_up_to INT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);
