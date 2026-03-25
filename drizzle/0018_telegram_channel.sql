CREATE TABLE IF NOT EXISTS telegram_drafts (
    id SERIAL PRIMARY KEY,
    article_id INTEGER REFERENCES articles(id),
    formatted_message TEXT NOT NULL,
    image_url TEXT,
    chart_path TEXT,
    relevance_score INTEGER NOT NULL,
    source_tier INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    posted_at TIMESTAMP,
    telegram_draft_message_id TEXT
);

CREATE INDEX idx_drafts_status ON telegram_drafts(status);
CREATE INDEX idx_drafts_created ON telegram_drafts(created_at);

ALTER TABLE articles ADD COLUMN IF NOT EXISTS posted_to_channel BOOLEAN DEFAULT FALSE;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS channel_posted_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS poller_heartbeat (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_run TIMESTAMP NOT NULL,
    articles_found INTEGER DEFAULT 0,
    errors TEXT
);

INSERT INTO poller_heartbeat (id, last_run, articles_found) VALUES (1, NOW(), 0)
ON CONFLICT (id) DO NOTHING;
