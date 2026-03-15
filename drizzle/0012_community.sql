CREATE TABLE IF NOT EXISTS community_bias_votes (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  instrument TEXT NOT NULL,
  timeframe TEXT NOT NULL CHECK (timeframe IN ('daily', '1week', '1month', '3month')),
  direction TEXT NOT NULL CHECK (direction IN ('bullish', 'bearish', 'neutral')),
  voted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, instrument, timeframe)
);
CREATE INDEX IF NOT EXISTS idx_community_votes_instrument ON community_bias_votes(instrument, timeframe);

CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  total_trades INT NOT NULL,
  win_rate DECIMAL(5,2) NOT NULL,
  consistency_score DECIMAL(5,2),
  avg_rr DECIMAL(6,2),
  rank INT,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(user_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_leaderboard_date ON leaderboard_snapshots(snapshot_date, rank);

ALTER TABLE users ADD COLUMN IF NOT EXISTS leaderboard_opt_in BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
