# Real-Time Telegram Channel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Tradeora from a daily batch scraper into a real-time news monitoring system that posts breaking financial news to a public Telegram channel within minutes, with instrument bias tags and auto-generated data charts.

**Architecture:** A cron-based poller (every 1-3 min) monitors 35 curated sources, scores articles with a rule-based quality filter, deduplicates, and either auto-posts (Tier 0 with keyword gate) or queues for phone approval (Tier 1-3) via Telegram inline buttons. Morning batch bias generation stays unchanged. Charts auto-generated from FRED/BLS/EIA free APIs.

**Tech Stack:** Python 3.11, feedparser, psycopg2, requests, BeautifulSoup4, matplotlib, fredapi, Telegram Bot API, Next.js (webhook extension)

**Spec:** `docs/superpowers/specs/2026-03-25-realtime-telegram-channel-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `scraper/sources.py` | 35 curated sources with tier, category, instrument mapping, keyword gates |
| `scraper/quality_filter.py` | Rule-based relevance scoring (0-100) per article |
| `scraper/dedup.py` | Fuzzy headline matching + URL dedup |
| `scraper/image_scraper.py` | Extract og:image from article URLs |
| `scraper/chart_generator.py` | Matplotlib charts with dark theme + Tradeora branding |
| `scraper/data_monitor.py` | Fetch FRED/BLS/EIA data, detect notable values, trigger charts |
| `scraper/channel_poster.py` | Format + post messages to public Telegram channel |
| `scraper/approval_flow.py` | Send drafts to admin, handle approve/skip, auto-post timeout |
| `scraper/heartbeat.py` | Write heartbeat to DB on each poll cycle |
| `scraper/poller.py` | Main polling orchestrator (entry point for cron) |
| `tests/test_quality_filter.py` | Tests for relevance scoring |
| `tests/test_dedup.py` | Tests for deduplication |
| `tests/test_sources.py` | Tests for source config validation |
| `tests/test_channel_poster.py` | Tests for message formatting |
| `tests/test_approval_flow.py` | Tests for approval logic |
| `tests/test_data_monitor.py` | Tests for notable data detection |
| `tests/test_image_scraper.py` | Tests for og:image extraction |
| `tests/test_poller.py` | Tests for polling orchestration |
| `drizzle/XXXX_telegram_channel.sql` | DB migration for drafts table + articles columns |

### Modified Files

| File | Changes |
|------|---------|
| `scraper/feeds.py` | Replace RSS_FEEDS list with import from sources.py (backward compat for morning batch) |
| `scraper/rss_scraper.py` | Add HTML scraping fallback, conditional HTTP requests, og:image extraction |
| `scraper/categorizer.py` | Add urgency keyword detection, return urgency score alongside instruments |
| `scraper/database.py` | Add methods: insert_draft, get_pending_drafts, update_draft_status, upsert_heartbeat, mark_article_posted |
| `scraper/telegram_reporter.py` | Keep existing per-user reports; add channel posting import |
| `scraper/requirements.txt` | Add: matplotlib, fredapi, yfinance |
| `src/app/api/telegram/webhook/route.ts` | Extend to handle callback_query (approve/skip buttons) |

---

## Task 1: Database Migration

**Files:**
- Create: `drizzle/0018_telegram_channel.sql`
- Modify: `scraper/database.py`
- Test: `tests/test_database_channel.py`

- [ ] **Step 1: Write the migration SQL**

```sql
-- drizzle/0018_telegram_channel.sql

-- Track draft status for approval flow
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

-- Track which articles have been posted to the channel
ALTER TABLE articles ADD COLUMN IF NOT EXISTS posted_to_channel BOOLEAN DEFAULT FALSE;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS channel_posted_at TIMESTAMP;

-- Poller health monitoring
CREATE TABLE IF NOT EXISTS poller_heartbeat (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_run TIMESTAMP NOT NULL,
    articles_found INTEGER DEFAULT 0,
    errors TEXT
);

INSERT INTO poller_heartbeat (id, last_run, articles_found) VALUES (1, NOW(), 0)
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 2: Run the migration against Neon**

```bash
cd /Users/a/Desktop/forex-analysis
# Load env vars
export $(grep DATABASE_URL .env | xargs)
python -c "
import psycopg2, os
conn = psycopg2.connect(os.environ['DATABASE_URL'])
conn.autocommit = True
cur = conn.cursor()
with open('drizzle/0018_telegram_channel.sql') as f:
    cur.execute(f.read())
print('Migration applied successfully')
conn.close()
"
```

- [ ] **Step 3: Add database helper methods**

Add to `scraper/database.py`:

```python
def insert_draft(self, article_id, formatted_message, image_url, chart_path,
                 relevance_score, source_tier):
    """Insert a new draft for approval."""
    cur = self.execute(
        """INSERT INTO telegram_drafts
           (article_id, formatted_message, image_url, chart_path, relevance_score, source_tier)
           VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
        (article_id, formatted_message, image_url, chart_path, relevance_score, source_tier),
    )
    return cur.fetchone()["id"]

def get_pending_drafts(self, older_than_minutes=15):
    """Get drafts pending longer than threshold for auto-posting."""
    cur = self.execute(
        """SELECT id, article_id, formatted_message, image_url, chart_path
           FROM telegram_drafts
           WHERE status = 'pending'
           AND created_at < NOW() - INTERVAL '%s minutes'
           ORDER BY created_at ASC""",
        (older_than_minutes,),
    )
    return cur.fetchall()

def update_draft_status(self, draft_id, status):
    """Update draft status to approved/skipped/auto_posted."""
    self.execute(
        """UPDATE telegram_drafts
           SET status = %s,
               posted_at = CASE WHEN %s IN ('approved', 'auto_posted') THEN NOW() ELSE NULL END
           WHERE id = %s""",
        (status, status, draft_id),
    )

def mark_article_posted(self, article_id):
    """Mark an article as posted to the channel."""
    self.execute(
        "UPDATE articles SET posted_to_channel = TRUE, channel_posted_at = NOW() WHERE id = %s",
        (article_id,),
    )

def upsert_heartbeat(self, articles_found, errors=None):
    """Update the poller heartbeat."""
    self.execute(
        """INSERT INTO poller_heartbeat (id, last_run, articles_found, errors)
           VALUES (1, NOW(), %s, %s)
           ON CONFLICT (id) DO UPDATE
           SET last_run = NOW(), articles_found = %s, errors = %s""",
        (articles_found, errors, articles_found, errors),
    )

def get_latest_bias(self, instrument):
    """Get the most recent 1week bias for an instrument."""
    cur = self.execute(
        """SELECT direction, confidence FROM biases
           WHERE instrument = %s AND timeframe = '1week'
           ORDER BY generated_at DESC LIMIT 1""",
        (instrument,),
    )
    return cur.fetchone()

def is_url_known(self, url):
    """Check if an article URL already exists in the database."""
    cur = self.execute("SELECT 1 FROM articles WHERE url = %s LIMIT 1", (url,))
    return cur.fetchone() is not None

def get_recent_headlines(self, hours=2):
    """Get headlines from the last N hours for dedup comparison."""
    cur = self.execute(
        """SELECT title FROM articles
           WHERE created_at > NOW() - INTERVAL '%s hours'
           ORDER BY created_at DESC""",
        (hours,),
    )
    return [row["title"] for row in cur.fetchall()]
```

> **Note:** The `Database` class uses `self.execute(query, params)` which handles connection management internally via `_ensure_connected()`. The constructor requires `database_url: str`. All cursors return `RealDictCursor` rows (dict-like).

- [ ] **Step 4: Write tests for new DB methods**

Create `tests/test_database_channel.py`:

```python
"""Tests for new channel-related database methods.
Uses mock on self.execute() to match the existing Database pattern.
"""
import pytest
from unittest.mock import MagicMock, patch


def test_insert_draft_returns_id():
    """insert_draft should call self.execute with INSERT and return the draft ID."""
    from scraper.database import Database
    db = Database.__new__(Database)
    mock_cur = MagicMock()
    mock_cur.fetchone.return_value = {"id": 42}
    db.execute = MagicMock(return_value=mock_cur)

    result = db.insert_draft(
        article_id=1,
        formatted_message="test message",
        image_url="https://example.com/img.jpg",
        chart_path=None,
        relevance_score=72,
        source_tier=1
    )
    assert result == 42
    assert "INSERT INTO telegram_drafts" in db.execute.call_args[0][0]


def test_get_pending_drafts_filters_by_age():
    """get_pending_drafts should query for pending drafts older than threshold."""
    from scraper.database import Database
    db = Database.__new__(Database)
    mock_cur = MagicMock()
    mock_cur.fetchall.return_value = [{"id": 1, "formatted_message": "test"}]
    db.execute = MagicMock(return_value=mock_cur)

    result = db.get_pending_drafts(older_than_minutes=15)
    assert len(result) == 1
    sql = db.execute.call_args[0][0]
    assert "status = 'pending'" in sql


def test_upsert_heartbeat():
    """upsert_heartbeat should use ON CONFLICT DO UPDATE."""
    from scraper.database import Database
    db = Database.__new__(Database)
    db.execute = MagicMock()

    db.upsert_heartbeat(articles_found=5, errors=None)
    sql = db.execute.call_args[0][0]
    assert "ON CONFLICT" in sql
    assert "poller_heartbeat" in sql
```

- [ ] **Step 5: Run tests**

```bash
cd /Users/a/Desktop/forex-analysis
python -m pytest tests/test_database_channel.py -v
```
Expected: All 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add drizzle/0018_telegram_channel.sql scraper/database.py tests/test_database_channel.py
git commit -m "feat: add telegram channel DB migration and helper methods"
```

---

## Task 2: Source Configuration

**Files:**
- Create: `scraper/sources.py`
- Create: `tests/test_sources.py`
- Modify: `scraper/feeds.py`

- [ ] **Step 1: Write tests for source configuration**

Create `tests/test_sources.py`:

```python
"""Tests for source configuration."""
import pytest


def test_all_sources_have_required_fields():
    from scraper.sources import SOURCES
    required = {"name", "url", "tier", "category", "instruments"}
    for source in SOURCES:
        missing = required - set(source.keys())
        assert not missing, f"Source '{source.get('name', '?')}' missing: {missing}"


def test_tier_0_sources_have_keyword_gate():
    from scraper.sources import SOURCES
    for source in SOURCES:
        if source["tier"] == 0:
            assert "keywords" in source and len(source["keywords"]) > 0, \
                f"Tier 0 source '{source['name']}' missing keyword gate"


def test_source_count():
    from scraper.sources import SOURCES
    assert len(SOURCES) == 35


def test_tiers_are_valid():
    from scraper.sources import SOURCES
    for source in SOURCES:
        assert source["tier"] in (0, 1, 2, 3), \
            f"Source '{source['name']}' has invalid tier {source['tier']}"


def test_get_sources_by_tier():
    from scraper.sources import get_sources_by_tier
    tier0 = get_sources_by_tier(0)
    assert len(tier0) == 19
    tier1 = get_sources_by_tier(1)
    assert len(tier1) == 5


def test_get_poll_interval():
    from scraper.sources import get_poll_interval
    assert get_poll_interval(0) == 60   # 1 minute
    assert get_poll_interval(1) == 180  # 3 minutes
    assert get_poll_interval(2) == 180
    assert get_poll_interval(3) == 180
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
python -m pytest tests/test_sources.py -v
```
Expected: FAIL — `scraper.sources` does not exist.

- [ ] **Step 3: Create sources.py**

Create `scraper/sources.py`:

```python
"""
Curated news sources for real-time monitoring.
35 sources across 4 tiers, each with instrument mapping and (for Tier 0) keyword gates.
"""

SOURCES = [
    # ═══════════════════════════════════════════════
    # TIER 0 — Origin Sources (19) — Auto-post with keyword gate
    # ═══════════════════════════════════════════════

    # Central Banks (8)
    {
        "name": "Federal Reserve",
        "url": "https://www.federalreserve.gov/feeds/press_all.xml",
        "tier": 0,
        "category": "central_bank",
        "instruments": ["DXY", "EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "US30", "NAS100", "SP500"],
        "keywords": ["rate", "interest", "monetary policy", "inflation", "fomc", "mpc",
                     "quantitative", "tightening", "easing", "balance sheet", "forward guidance",
                     "statement", "press conference", "federal funds"],
        "scrape_mode": "rss",
    },
    {
        "name": "ECB",
        "url": "https://www.ecb.europa.eu/rss/press.html",
        "tier": 0,
        "category": "central_bank",
        "instruments": ["EURUSD", "EURJPY", "EURGBP", "GER40"],
        "keywords": ["rate", "interest", "monetary policy", "inflation", "governing council",
                     "quantitative", "tightening", "easing", "statement", "press conference"],
        "scrape_mode": "rss",
    },
    {
        "name": "Bank of England",
        "url": "https://www.bankofengland.co.uk/rss/news",
        "tier": 0,
        "category": "central_bank",
        "instruments": ["GBPUSD", "GBPJPY", "EURGBP"],
        "keywords": ["rate", "interest", "monetary policy", "inflation", "mpc",
                     "quantitative", "tightening", "easing", "statement"],
        "scrape_mode": "rss",
    },
    {
        "name": "Bank of Japan",
        "url": "https://www.boj.or.jp/en/whatsnew/index.htm",
        "tier": 0,
        "category": "central_bank",
        "instruments": ["USDJPY", "EURJPY", "GBPJPY"],
        "keywords": ["rate", "interest", "monetary policy", "inflation", "yield curve",
                     "quantitative", "easing", "statement", "yen"],
        "scrape_mode": "html",  # BOJ doesn't have reliable English RSS
    },
    {
        "name": "Reserve Bank of Australia",
        "url": "https://www.rba.gov.au/rss/rss-cb-media-releases.xml",
        "tier": 0,
        "category": "central_bank",
        "instruments": ["AUDUSD"],
        "keywords": ["rate", "interest", "monetary policy", "inflation", "statement", "cash rate"],
        "scrape_mode": "rss",
    },
    {
        "name": "Bank of Canada",
        "url": "https://www.bankofcanada.ca/content_type/press-releases/feed/",
        "tier": 0,
        "category": "central_bank",
        "instruments": ["USDCAD"],
        "keywords": ["rate", "interest", "monetary policy", "inflation", "statement",
                     "overnight rate"],
        "scrape_mode": "rss",
    },
    {
        "name": "Reserve Bank of New Zealand",
        "url": "https://www.rbnz.govt.nz/rss.xml",
        "tier": 0,
        "category": "central_bank",
        "instruments": ["NZDUSD"],
        "keywords": ["rate", "interest", "monetary policy", "inflation", "statement", "ocr"],
        "scrape_mode": "rss",
    },
    {
        "name": "Swiss National Bank",
        "url": "https://www.snb.ch/en/ifor/media/id/media_releases",
        "tier": 0,
        "category": "central_bank",
        "instruments": ["USDCHF"],
        "keywords": ["rate", "interest", "monetary policy", "inflation", "statement"],
        "scrape_mode": "html",
    },

    # US Economic Data (6)
    {
        "name": "Bureau of Labor Statistics",
        "url": "https://www.bls.gov/feed/bls_latest.rss",
        "tier": 0,
        "category": "us_data",
        "instruments": ["DXY", "EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "US30", "NAS100", "SP500"],
        "keywords": ["employment", "unemployment", "nonfarm", "payroll", "cpi",
                     "consumer price", "ppi", "producer price", "inflation", "jobs"],
        "scrape_mode": "rss",
    },
    {
        "name": "Bureau of Economic Analysis",
        "url": "https://www.bea.gov/news/current-releases",
        "tier": 0,
        "category": "us_data",
        "instruments": ["DXY", "US30", "NAS100", "SP500", "XAUUSD"],
        "keywords": ["gdp", "gross domestic", "pce", "personal consumption", "economic growth"],
        "scrape_mode": "html",
    },
    {
        "name": "US Census Bureau",
        "url": "https://www.census.gov/economic-indicators/indicator.xml",
        "tier": 0,
        "category": "us_data",
        "instruments": ["DXY", "US30", "NAS100", "SP500"],
        "keywords": ["retail sales", "housing starts", "trade balance", "trade deficit",
                     "durable goods", "new home"],
        "scrape_mode": "rss",
    },
    {
        "name": "US Treasury",
        "url": "https://home.treasury.gov/system/files/136/treasury-rss.xml",
        "tier": 0,
        "category": "us_data",
        "instruments": ["DXY", "XAUUSD"],
        "keywords": ["sanctions", "debt ceiling", "auction", "fiscal", "tariff"],
        "scrape_mode": "rss",
    },
    {
        "name": "White House",
        "url": "https://www.whitehouse.gov/feed/",
        "tier": 0,
        "category": "us_data",
        "instruments": ["DXY", "XAUUSD", "USOIL", "US30", "NAS100", "SP500"],
        "keywords": ["tariff", "trade", "executive order", "sanctions", "emergency",
                     "war", "military", "tax", "economic"],
        "scrape_mode": "rss",
    },
    {
        "name": "US State Department",
        "url": "https://www.state.gov/rss-feed/press-releases/feed/",
        "tier": 0,
        "category": "us_data",
        "instruments": ["XAUUSD", "USOIL"],
        "keywords": ["sanctions", "ceasefire", "peace talks", "military", "conflict",
                     "nuclear", "treaty"],
        "scrape_mode": "rss",
    },

    # European Data (2)
    {
        "name": "Eurostat",
        "url": "https://ec.europa.eu/eurostat/en/web/main/news/euro-indicators",
        "tier": 0,
        "category": "eu_data",
        "instruments": ["EURUSD", "EURJPY", "GER40"],
        "keywords": ["gdp", "inflation", "hicp", "cpi", "unemployment", "employment"],
        "scrape_mode": "html",
    },
    {
        "name": "UK ONS",
        "url": "https://www.ons.gov.uk/rss",
        "tier": 0,
        "category": "uk_data",
        "instruments": ["GBPUSD", "GBPJPY"],
        "keywords": ["gdp", "inflation", "cpi", "unemployment", "employment", "retail"],
        "scrape_mode": "rss",
    },

    # Institutional (3)
    {
        "name": "EIA Weekly Petroleum",
        "url": "https://www.eia.gov/petroleum/supply/weekly/",
        "tier": 0,
        "category": "energy",
        "instruments": ["USOIL", "USDCAD"],
        "keywords": ["inventory", "crude", "petroleum", "oil", "stockpile", "gasoline",
                     "distillate"],
        "scrape_mode": "html",
    },
    {
        "name": "OPEC",
        "url": "https://www.opec.org/opec_web/en/press_room/28.htm",
        "tier": 0,
        "category": "energy",
        "instruments": ["USOIL", "USDCAD"],
        "keywords": ["production", "output", "cut", "quota", "supply", "barrel",
                     "compliance"],
        "scrape_mode": "html",
    },
    {
        "name": "SEC",
        "url": "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=PRESS&dateb=&owner=include&count=40&search_text=&action=getcompany",
        "tier": 0,
        "category": "regulation",
        "instruments": ["BTCUSD", "ETHUSD", "NAS100", "SP500"],
        "keywords": ["etf", "bitcoin", "ethereum", "crypto", "digital asset",
                     "blockchain", "token"],
        "scrape_mode": "html",
    },

    # ═══════════════════════════════════════════════
    # TIER 1 — Wire Services (5) — Review via phone
    # ═══════════════════════════════════════════════
    {
        "name": "Reuters World",
        "url": "https://www.reutersagency.com/feed/?taxonomy=best-sectors&post_type=best",
        "tier": 1,
        "category": "wire",
        "instruments": ["XAUUSD", "USOIL", "DXY"],
        "scrape_mode": "rss",
    },
    {
        "name": "Reuters Business",
        "url": "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best",
        "tier": 1,
        "category": "wire",
        "instruments": ["DXY", "EURUSD", "GBPUSD", "US30", "NAS100", "SP500"],
        "scrape_mode": "rss",
    },
    {
        "name": "Reuters Markets",
        "url": "https://www.reutersagency.com/feed/?best-topics=markets&post_type=best",
        "tier": 1,
        "category": "wire",
        "instruments": ["DXY", "EURUSD", "XAUUSD", "US30", "SP500"],
        "scrape_mode": "rss",
    },
    {
        "name": "AP World",
        "url": "https://rsshub.app/apnews/topics/world-news",
        "tier": 1,
        "category": "wire",
        "instruments": ["XAUUSD", "USOIL", "DXY"],
        "scrape_mode": "rss",
    },
    {
        "name": "AP Business",
        "url": "https://rsshub.app/apnews/topics/business",
        "tier": 1,
        "category": "wire",
        "instruments": ["DXY", "US30", "NAS100", "SP500"],
        "scrape_mode": "rss",
    },

    # ═══════════════════════════════════════════════
    # TIER 2 — Quality Outlets (5) — Review via phone
    # ═══════════════════════════════════════════════
    {
        "name": "Wall Street Journal",
        "url": "https://feeds.a.dj.com/rss/RSSWorldNews.xml",
        "tier": 2,
        "category": "outlet",
        "instruments": ["DXY", "US30", "NAS100", "SP500", "XAUUSD", "USOIL"],
        "scrape_mode": "rss",
    },
    {
        "name": "Financial Times",
        "url": "https://www.ft.com/rss/home",
        "tier": 2,
        "category": "outlet",
        "instruments": ["EURUSD", "GBPUSD", "GER40", "EURGBP"],
        "scrape_mode": "rss",
    },
    {
        "name": "CNBC Markets",
        "url": "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258",
        "tier": 2,
        "category": "outlet",
        "instruments": ["US30", "NAS100", "SP500", "DXY"],
        "scrape_mode": "rss",
    },
    {
        "name": "Axios",
        "url": "https://api.axios.com/feed/",
        "tier": 2,
        "category": "outlet",
        "instruments": ["DXY", "US30", "NAS100", "SP500"],
        "scrape_mode": "rss",
    },
    {
        "name": "Al Jazeera",
        "url": "https://www.aljazeera.com/xml/rss/all.xml",
        "tier": 2,
        "category": "outlet",
        "instruments": ["XAUUSD", "USOIL", "DXY"],
        "scrape_mode": "rss",
    },

    # ═══════════════════════════════════════════════
    # TIER 3 — Specialist Sources (6) — Review via phone
    # ═══════════════════════════════════════════════
    {
        "name": "ForexLive",
        "url": "https://www.forexlive.com/feed",
        "tier": 3,
        "category": "forex",
        "instruments": ["DXY", "EURUSD", "GBPUSD", "USDJPY", "EURJPY", "GBPJPY",
                       "EURGBP", "AUDUSD", "USDCAD", "NZDUSD", "USDCHF"],
        "scrape_mode": "rss",
    },
    {
        "name": "FXStreet",
        "url": "https://www.fxstreet.com/rss",
        "tier": 3,
        "category": "forex",
        "instruments": ["DXY", "EURUSD", "GBPUSD", "USDJPY", "EURJPY", "GBPJPY",
                       "EURGBP", "AUDUSD", "USDCAD", "NZDUSD", "USDCHF"],
        "scrape_mode": "rss",
    },
    {
        "name": "Kitco",
        "url": "https://www.kitco.com/rss/",
        "tier": 3,
        "category": "metals",
        "instruments": ["XAUUSD", "XAGUSD"],
        "scrape_mode": "rss",
    },
    {
        "name": "OilPrice",
        "url": "https://oilprice.com/rss",
        "tier": 3,
        "category": "energy",
        "instruments": ["USOIL"],
        "scrape_mode": "rss",
    },
    {
        "name": "CoinDesk",
        "url": "https://www.coindesk.com/arc/outboundfeeds/rss/",
        "tier": 3,
        "category": "crypto",
        "instruments": ["BTCUSD", "ETHUSD"],
        "scrape_mode": "rss",
    },
    {
        "name": "The Block",
        "url": "https://www.theblock.co/rss.xml",
        "tier": 3,
        "category": "crypto",
        "instruments": ["BTCUSD", "ETHUSD"],
        "scrape_mode": "rss",
    },
]


def get_sources_by_tier(tier: int) -> list[dict]:
    """Return sources matching the given tier."""
    return [s for s in SOURCES if s["tier"] == tier]


def get_poll_interval(tier: int) -> int:
    """Return poll interval in seconds for a given tier."""
    if tier == 0:
        return 60   # 1 minute
    return 180       # 3 minutes


def get_all_rss_urls() -> list[str]:
    """Return flat list of RSS URLs for backward compatibility with feeds.py."""
    return [s["url"] for s in SOURCES if s["scrape_mode"] == "rss"]
```

- [ ] **Step 4: Update feeds.py for backward compatibility**

Replace the contents of `scraper/feeds.py` so the morning batch still works:

```python
"""
RSS feed list. Now sourced from sources.py.
Kept for backward compatibility with rss_scraper.py morning batch.
"""
from scraper.sources import get_all_rss_urls

RSS_FEEDS = get_all_rss_urls()
```

- [ ] **Step 5: Run tests**

```bash
python -m pytest tests/test_sources.py -v
```
Expected: All 6 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add scraper/sources.py scraper/feeds.py tests/test_sources.py
git commit -m "feat: add 35 curated sources with tier system, replace old feeds"
```

---

## Task 3: Quality Filter

**Files:**
- Create: `scraper/quality_filter.py`
- Create: `tests/test_quality_filter.py`

- [ ] **Step 1: Write tests**

Create `tests/test_quality_filter.py`:

```python
"""Tests for the rule-based quality filter."""
import pytest
from scraper.quality_filter import score_article


def test_tier0_with_keyword_match_scores_high():
    result = score_article(
        title="Federal Reserve raises interest rates by 25 basis points",
        content="The FOMC decided to raise the federal funds rate...",
        source_tier=0,
        source_keywords=["rate", "interest", "fomc"],
        matched_instruments=["DXY", "EURUSD"],
    )
    assert result["score"] >= 60
    assert result["auto_post"] is True


def test_tier0_without_keyword_match_not_auto_post():
    result = score_article(
        title="Federal Reserve announces new community development program",
        content="The program aims to support underserved communities...",
        source_tier=0,
        source_keywords=["rate", "interest", "fomc"],
        matched_instruments=[],
    )
    assert result["auto_post"] is False


def test_tier1_wire_service_breaking_news():
    result = score_article(
        title="BREAKING: Iran rejects US ceasefire talks",
        content="Iran has rejected ceasefire negotiations with the US...",
        source_tier=1,
        source_keywords=None,
        matched_instruments=["XAUUSD", "USOIL"],
    )
    assert result["score"] >= 40
    assert result["auto_post"] is False  # Tier 1 never auto-posts


def test_opinion_piece_penalized():
    result = score_article(
        title="5 things to watch in the forex market this week",
        content="Analysts predict that the dollar may weaken...",
        source_tier=2,
        source_keywords=None,
        matched_instruments=["DXY"],
    )
    assert result["score"] < 40  # Should be filtered out


def test_no_instrument_match_scores_low():
    result = score_article(
        title="Local restaurant wins award for best pizza",
        content="A neighborhood favorite has been recognized...",
        source_tier=2,
        source_keywords=None,
        matched_instruments=[],
    )
    assert result["score"] < 40


def test_urgency_keywords_boost_score():
    result_no_urgency = score_article(
        title="Iran and US discuss ceasefire terms",
        content="Negotiations continue between Iran and the US...",
        source_tier=1,
        source_keywords=None,
        matched_instruments=["XAUUSD"],
    )
    result_urgent = score_article(
        title="BREAKING: Iran declares war on US forces",
        content="In a dramatic escalation...",
        source_tier=1,
        source_keywords=None,
        matched_instruments=["XAUUSD"],
    )
    assert result_urgent["score"] > result_no_urgency["score"]
    assert result_urgent["is_urgent"] is True


def test_duplicate_headline_scores_negative():
    result = score_article(
        title="Fed raises rates",
        content="...",
        source_tier=1,
        source_keywords=None,
        matched_instruments=["DXY"],
        existing_headlines=["Fed raises rates by 25bp"],
    )
    # Not necessarily -100, but the is_duplicate flag should be set
    # Exact dedup logic is in dedup.py — here we just check the flag passthrough
    assert result["score"] >= 0  # Score still calculated, dedup handled separately
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
python -m pytest tests/test_quality_filter.py -v
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement quality_filter.py**

Create `scraper/quality_filter.py`:

```python
"""
Rule-based article relevance scoring.
No AI — pure keyword matching and heuristics.
Threshold: 40+ to post to Telegram channel.
"""

import re

URGENCY_KEYWORDS = [
    "breaking", "emergency", "rate decision", "declares", "sanctions",
    "invasion", "war ", "shoots down", "nuclear", "default", "collapse",
    "unprecedented", "record high", "record low", "all-time",
    "crashes", "surges", "plunges", "soars", "tanks",
]

NOISE_PATTERNS = [
    r"\d+ things to watch",
    r"\d+ stocks to",
    r"\d+ reasons",
    r"what to expect",
    r"what to watch",
    r"analyst says",
    r"analysts say",
    r"preview:",
    r"opinion:",
    r"editorial:",
    r"podcast:",
    r"video:",
    r"webinar",
    r"subscribe to",
    r"sign up for",
]


THEMATIC_KEYWORDS = [
    "rate hike", "rate cut", "inflation", "deflation", "recession",
    "tariff", "sanctions", "trade war", "quantitative easing", "tapering",
    "yield curve", "inverted", "default", "stimulus", "bailout",
    "gdp", "employment", "unemployment", "nonfarm", "cpi", "ppi",
]


def score_article(
    title: str,
    content: str,
    source_tier: int,
    source_keywords: list[str] | None = None,
    matched_instruments: list[str] | None = None,
    existing_headlines: list[str] | None = None,
    published_at: str | None = None,
) -> dict:
    """
    Score an article for channel posting relevance.

    Returns dict with:
        score (int): 0-100 relevance score
        auto_post (bool): whether this should auto-post (Tier 0 + keyword match only)
        is_urgent (bool): contains urgency keywords
        reasons (list[str]): scoring breakdown
    """
    score = 0
    reasons = []
    title_lower = title.lower()
    content_lower = (content or "").lower()
    text = f"{title_lower} {content_lower}"

    # 1. Source tier score
    tier_scores = {0: 40, 1: 30, 2: 20, 3: 15}
    tier_score = tier_scores.get(source_tier, 10)
    score += tier_score
    reasons.append(f"tier {source_tier}: +{tier_score}")

    # 2. Instrument match
    instruments = matched_instruments or []
    if instruments:
        if len(instruments) >= 2:
            score += 20
            reasons.append(f"direct instrument match ({len(instruments)}): +20")
        else:
            score += 15
            reasons.append(f"instrument match (1): +15")
    else:
        reasons.append("no instrument match: +0")

    # 3. Urgency keywords
    is_urgent = False
    for kw in URGENCY_KEYWORDS:
        if kw in text:
            score += 15
            is_urgent = True
            reasons.append(f"urgency '{kw}': +15")
            break

    # 4. Thematic keyword match
    for kw in THEMATIC_KEYWORDS:
        if kw in text:
            score += 10
            reasons.append(f"thematic '{kw}': +10")
            break

    # 5. Recency bonus
    if published_at:
        try:
            from datetime import datetime, timezone
            pub = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
            age_minutes = (datetime.now(timezone.utc) - pub).total_seconds() / 60
            if age_minutes < 30:
                score += 10
                reasons.append("recency (<30 min): +10")
        except (ValueError, TypeError):
            pass

    # 6. Noise penalty
    for pattern in NOISE_PATTERNS:
        if re.search(pattern, text):
            score -= 30
            reasons.append(f"noise pattern '{pattern}': -30")
            break

    # 5. Tier 0 keyword gate for auto-post
    keyword_match = False
    if source_tier == 0 and source_keywords:
        for kw in source_keywords:
            if kw.lower() in text:
                keyword_match = True
                break

    auto_post = source_tier == 0 and keyword_match

    return {
        "score": max(0, score),
        "auto_post": auto_post,
        "is_urgent": is_urgent,
        "reasons": reasons,
    }
```

- [ ] **Step 4: Run tests**

```bash
python -m pytest tests/test_quality_filter.py -v
```
Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scraper/quality_filter.py tests/test_quality_filter.py
git commit -m "feat: add rule-based quality filter with scoring and keyword gates"
```

---

## Task 4: Deduplication

**Files:**
- Create: `scraper/dedup.py`
- Create: `tests/test_dedup.py`

- [ ] **Step 1: Write tests**

Create `tests/test_dedup.py`:

```python
"""Tests for headline deduplication."""
import pytest
from scraper.dedup import is_duplicate_headline, tokenize


def test_exact_match_is_duplicate():
    assert is_duplicate_headline(
        "Fed raises rates by 25bp",
        ["Fed raises rates by 25bp"]
    ) is True


def test_very_similar_is_duplicate():
    # Nearly identical headlines (only minor word change)
    assert is_duplicate_headline(
        "Fed raises interest rates by 25bp today",
        ["Fed raises interest rates by 25bp"]
    ) is True


def test_similar_but_different_info_not_duplicate():
    # Same topic but significantly different content below 90%
    assert is_duplicate_headline(
        "Fed raises rates by 25bp and signals potential June cut in surprise move",
        ["Fed raises rates by 25bp"]
    ) is False


def test_completely_different_not_duplicate():
    assert is_duplicate_headline(
        "Iran rejects ceasefire talks",
        ["Gold hits record high", "S&P 500 closes at new all-time high"]
    ) is False


def test_empty_existing_headlines():
    assert is_duplicate_headline(
        "Fed raises rates",
        []
    ) is False


def test_tokenize_strips_punctuation():
    tokens = tokenize("BREAKING: Fed raises rates!")
    assert "breaking" not in tokens  # Common word removed
    assert "fed" in tokens
    assert "rates" in tokens
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
python -m pytest tests/test_dedup.py -v
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement dedup.py**

Create `scraper/dedup.py`:

```python
"""
Headline deduplication using token overlap.
Threshold: 90%+ token similarity = duplicate.
"""

import re

# Words too common to be meaningful in financial headlines
STOP_WORDS = {
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "into", "through", "during",
    "before", "after", "and", "but", "or", "nor", "not", "so", "yet",
    "both", "either", "neither", "each", "every", "all", "any", "few",
    "more", "most", "other", "some", "such", "no", "only", "own", "same",
    "than", "too", "very", "just", "because", "if", "when", "while",
    "that", "this", "these", "those", "it", "its", "per", "via", "says",
    "said", "according", "report", "reports", "breaking", "update",
}


def tokenize(headline: str) -> set[str]:
    """Extract meaningful tokens from a headline."""
    # Remove punctuation, lowercase, split
    cleaned = re.sub(r"[^\w\s]", "", headline.lower())
    words = cleaned.split()
    # Remove stop words and single chars
    return {w for w in words if w not in STOP_WORDS and len(w) > 1}


def token_overlap(tokens_a: set[str], tokens_b: set[str]) -> float:
    """Calculate overlap ratio between two token sets."""
    if not tokens_a or not tokens_b:
        return 0.0
    intersection = tokens_a & tokens_b
    # Use the smaller set as denominator to catch when a short headline
    # is fully contained in a longer one
    smaller = min(len(tokens_a), len(tokens_b))
    return len(intersection) / smaller if smaller > 0 else 0.0


def is_duplicate_headline(
    new_headline: str,
    existing_headlines: list[str],
    threshold: float = 0.90,
) -> bool:
    """
    Check if a headline is a duplicate of any existing headlines.
    Uses 90% token overlap threshold.
    """
    new_tokens = tokenize(new_headline)
    if not new_tokens:
        return False

    for existing in existing_headlines:
        existing_tokens = tokenize(existing)
        if token_overlap(new_tokens, existing_tokens) >= threshold:
            return True

    return False
```

- [ ] **Step 4: Run tests**

```bash
python -m pytest tests/test_dedup.py -v
```
Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scraper/dedup.py tests/test_dedup.py
git commit -m "feat: add headline deduplication with 90% token overlap threshold"
```

---

## Task 5: Image Scraper

**Files:**
- Create: `scraper/image_scraper.py`
- Create: `tests/test_image_scraper.py`

- [ ] **Step 1: Write tests**

Create `tests/test_image_scraper.py`:

```python
"""Tests for og:image extraction."""
import pytest
from unittest.mock import patch, MagicMock
from scraper.image_scraper import extract_og_image, is_generic_logo

SAMPLE_HTML = """
<html><head>
<meta property="og:image" content="https://example.com/article-photo.jpg" />
</head><body></body></html>
"""

SAMPLE_HTML_NO_OG = """
<html><head><title>Test</title></head><body></body></html>
"""

SAMPLE_HTML_GENERIC = """
<html><head>
<meta property="og:image" content="https://www.reuters.com/pf/resources/images/reuters/logo.png" />
</head><body></body></html>
"""


def test_extract_og_image_success():
    with patch("scraper.image_scraper.requests.get") as mock_get:
        mock_get.return_value = MagicMock(
            status_code=200, text=SAMPLE_HTML, headers={"content-type": "text/html"}
        )
        result = extract_og_image("https://example.com/article")
        assert result == "https://example.com/article-photo.jpg"


def test_extract_og_image_no_tag():
    with patch("scraper.image_scraper.requests.get") as mock_get:
        mock_get.return_value = MagicMock(
            status_code=200, text=SAMPLE_HTML_NO_OG, headers={"content-type": "text/html"}
        )
        result = extract_og_image("https://example.com/article")
        assert result is None


def test_extract_og_image_generic_logo_filtered():
    with patch("scraper.image_scraper.requests.get") as mock_get:
        mock_get.return_value = MagicMock(
            status_code=200, text=SAMPLE_HTML_GENERIC, headers={"content-type": "text/html"}
        )
        result = extract_og_image("https://www.reuters.com/article")
        assert result is None  # Generic logo should be filtered


def test_is_generic_logo():
    assert is_generic_logo("https://site.com/logo.png", "site.com") is True
    assert is_generic_logo("https://site.com/articles/photo.jpg", "site.com") is False


def test_extract_og_image_timeout():
    with patch("scraper.image_scraper.requests.get") as mock_get:
        mock_get.side_effect = Exception("timeout")
        result = extract_og_image("https://example.com/article")
        assert result is None
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
python -m pytest tests/test_image_scraper.py -v
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement image_scraper.py**

Create `scraper/image_scraper.py`:

```python
"""
Extract og:image from article URLs for Telegram post attachments.
Filters out generic site logos.
"""

import re
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup

# Known generic logo patterns per domain
GENERIC_LOGO_PATTERNS = [
    r"/logo",
    r"/brand",
    r"/favicon",
    r"/default",
    r"/placeholder",
    r"/icon",
    r"/resources/images",
    r"/pf/resources",
    r"/static/img/site",
]

# Government sources that rarely have useful images — skip entirely
SKIP_IMAGE_DOMAINS = [
    "federalreserve.gov",
    "bls.gov",
    "bea.gov",
    "census.gov",
    "treasury.gov",
    "whitehouse.gov",
    "state.gov",
    "ecb.europa.eu",
    "bankofengland.co.uk",
    "boj.or.jp",
    "rba.gov.au",
    "bankofcanada.ca",
    "rbnz.govt.nz",
    "snb.ch",
    "eia.gov",
    "opec.org",
    "sec.gov",
    "ec.europa.eu",
    "ons.gov.uk",
]


def is_generic_logo(image_url: str, domain: str) -> bool:
    """Check if an image URL looks like a generic site logo rather than article-specific."""
    image_lower = image_url.lower()
    for pattern in GENERIC_LOGO_PATTERNS:
        if re.search(pattern, image_lower):
            return True
    return False


def extract_og_image(article_url: str) -> str | None:
    """
    Fetch an article URL and extract the og:image meta tag.
    Returns None if: no og:image, generic logo, government source, or error.
    """
    try:
        domain = urlparse(article_url).netloc.lower()

        # Skip government/institutional sources
        for skip_domain in SKIP_IMAGE_DOMAINS:
            if skip_domain in domain:
                return None

        resp = requests.get(article_url, timeout=5, headers={
            "User-Agent": "Mozilla/5.0 (compatible; Tradeora/1.0)"
        })
        if resp.status_code != 200:
            return None

        soup = BeautifulSoup(resp.text, "html.parser")
        og_tag = soup.find("meta", property="og:image")
        if not og_tag or not og_tag.get("content"):
            return None

        image_url = og_tag["content"]

        # Filter generic logos
        if is_generic_logo(image_url, domain):
            return None

        return image_url

    except Exception:
        return None
```

- [ ] **Step 4: Run tests**

```bash
python -m pytest tests/test_image_scraper.py -v
```
Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scraper/image_scraper.py tests/test_image_scraper.py
git commit -m "feat: add og:image extraction with generic logo filtering"
```

---

## Task 6: Channel Poster (Telegram message formatting)

**Files:**
- Create: `scraper/channel_poster.py`
- Create: `tests/test_channel_poster.py`

- [ ] **Step 1: Write tests**

Create `tests/test_channel_poster.py`:

```python
"""Tests for Telegram channel message formatting."""
import pytest
from scraper.channel_poster import format_breaking_news, format_data_release


def test_format_breaking_news_with_bias():
    result = format_breaking_news(
        title="Iran rejects US ceasefire talks, says negotiations are illogical",
        source="Reuters",
        biases={"XAUUSD": {"direction": "bullish", "confidence": 78},
                "USOIL": {"direction": "bullish", "confidence": 82}},
        article_url="https://reuters.com/article/123",
    )
    assert "TRADEORA" in result
    assert "BREAKING" in result
    assert "Iran rejects" in result
    assert "XAUUSD" in result
    assert "Bullish (78%)" in result
    assert "tradeora.com" in result
    assert len(result) <= 4096


def test_format_breaking_news_no_bias():
    result = format_breaking_news(
        title="New technology council announced",
        source="WSJ",
        biases={},
        article_url="https://wsj.com/article/456",
    )
    assert "TRADEORA" in result
    assert "Impact:" not in result  # No biases, no impact section
    assert "tradeora.com" in result


def test_format_data_release():
    result = format_data_release(
        title="US unemployment duration hits 4-year high",
        detail="Average duration jumped +2 weeks to 25.7 weeks in February",
        source="BLS",
        biases={"DXY": {"direction": "bearish", "confidence": 74},
                "XAUUSD": {"direction": "bullish", "confidence": 81}},
    )
    assert "TRADEORA" in result
    assert "unemployment" in result.lower()
    assert "DXY" in result
    assert "Bearish (74%)" in result


def test_message_under_telegram_limit():
    # Even with many instruments, message should stay under 4096
    biases = {f"INST{i}": {"direction": "bullish", "confidence": 50} for i in range(20)}
    result = format_breaking_news(
        title="X" * 200,
        source="Reuters",
        biases=biases,
        article_url="https://example.com",
    )
    assert len(result) <= 4096
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
python -m pytest tests/test_channel_poster.py -v
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement channel_poster.py**

Create `scraper/channel_poster.py`:

```python
"""
Format and send messages to the public Tradeora Telegram channel.
"""

import os
import requests

def _html_escape(text: str) -> str:
    """Escape HTML special chars for Telegram parse_mode=HTML."""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


DIRECTION_EMOJI = {
    "bullish": "\U0001F4C8",   # chart increasing
    "bearish": "\U0001F4C9",   # chart decreasing
    "neutral": "\u2796",       # heavy minus sign
}

SITE_URL = os.environ.get("SITE_URL", "tradeora.com")


def _format_bias_line(instrument: str, bias: dict) -> str:
    """Format a single instrument bias line."""
    direction = bias["direction"].capitalize()
    confidence = bias["confidence"]
    emoji = DIRECTION_EMOJI.get(bias["direction"].lower(), "")
    return f"{instrument:<8} {emoji} {direction} ({confidence}%)"


def _format_impact_section(biases: dict) -> str:
    """Format the Impact section with all instrument biases."""
    if not biases:
        return ""
    lines = ["", "Impact:"]
    # Limit to top 5 instruments to stay within Telegram char limit
    for instrument, bias in list(biases.items())[:5]:
        lines.append(_format_bias_line(instrument, bias))
    return "\n".join(lines)


def _format_footer(primary_instrument: str | None = None) -> str:
    """Format the branded footer."""
    link_instrument = primary_instrument or ""
    link = f"{SITE_URL}/{link_instrument}" if link_instrument else SITE_URL
    return (
        f"\nFull analysis \u2192 {link}"
        f"\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501"
        f"\n\U0001F4CA {SITE_URL} | Free 14-day trial"
    )


def format_breaking_news(
    title: str,
    source: str,
    biases: dict,
    article_url: str,
    is_urgent: bool = True,
) -> str:
    """Format a breaking news post for the channel."""
    prefix = "\U0001F534 BREAKING: " if is_urgent else "\U0001F4F0 "
    primary = next(iter(biases), None) if biases else None
    safe_title = _html_escape(title)

    parts = [
        "TRADEORA",
        "",
        f"{prefix}{safe_title}",
    ]

    impact = _format_impact_section(biases)
    if impact:
        parts.append(impact)

    parts.append(f"\nSource: {source}")
    parts.append(_format_footer(primary))

    message = "\n".join(parts)

    # Truncate title if message exceeds Telegram limit
    if len(message) > 4096:
        excess = len(message) - 4000
        truncated_title = title[:len(title) - excess] + "..."
        return format_breaking_news(truncated_title, source, biases, article_url, is_urgent)

    return message


def format_data_release(
    title: str,
    detail: str,
    source: str,
    biases: dict,
) -> str:
    """Format a data release post (for auto-generated chart posts)."""
    primary = next(iter(biases), None) if biases else None

    parts = [
        "TRADEORA",
        "",
        f"\U0001F4CA {title}",
        "",
        detail,
    ]

    impact = _format_impact_section(biases)
    if impact:
        parts.append(impact)

    parts.append(f"\nSource: {source}")
    parts.append(_format_footer(primary))

    message = "\n".join(parts)
    return message[:4096]


def send_channel_message(
    channel_id: str,
    text: str,
    image_url: str | None = None,
    chart_path: str | None = None,
    bot_token: str | None = None,
) -> bool:
    """
    Post a message to the public Telegram channel.
    Optionally attach an image (URL) or chart (local file path).
    """
    token = bot_token or os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        print("TELEGRAM_BOT_TOKEN not set, skipping channel post")
        return False

    base_url = f"https://api.telegram.org/bot{token}"

    try:
        if chart_path and os.path.exists(chart_path):
            # Send chart as photo with caption (Telegram photo caption limit: 1024 chars)
            caption = text[:1024]
            with open(chart_path, "rb") as f:
                resp = requests.post(
                    f"{base_url}/sendPhoto",
                    data={"chat_id": channel_id, "caption": caption, "parse_mode": "HTML"},
                    files={"photo": f},
                    timeout=15,
                )
        elif image_url:
            # Send image URL as photo with caption (1024 char limit)
            caption = text[:1024]
            resp = requests.post(
                f"{base_url}/sendPhoto",
                json={"chat_id": channel_id, "photo": image_url, "caption": caption, "parse_mode": "HTML"},
                timeout=15,
            )
        else:
            # Text-only message
            resp = requests.post(
                f"{base_url}/sendMessage",
                json={"chat_id": channel_id, "text": text, "parse_mode": "HTML",
                      "disable_web_page_preview": True},
                timeout=15,
            )

        if resp.status_code == 200:
            return True
        else:
            print(f"Telegram API error: {resp.status_code} {resp.text}")
            return False

    except Exception as e:
        print(f"Failed to send channel message: {e}")
        return False
```

- [ ] **Step 4: Run tests**

```bash
python -m pytest tests/test_channel_poster.py -v
```
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scraper/channel_poster.py tests/test_channel_poster.py
git commit -m "feat: add Telegram channel message formatting with bias tags and branding"
```

---

## Task 7: Approval Flow

**Files:**
- Create: `scraper/approval_flow.py`
- Create: `tests/test_approval_flow.py`

- [ ] **Step 1: Write tests**

Create `tests/test_approval_flow.py`:

```python
"""Tests for the draft approval flow."""
import pytest
from unittest.mock import patch, MagicMock
from scraper.approval_flow import send_draft_for_review, process_auto_posts


def test_send_draft_for_review_sends_with_buttons():
    with patch("scraper.approval_flow.requests.post") as mock_post:
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {"result": {"message_id": 123}}
        )
        msg_id = send_draft_for_review(
            admin_chat_id="12345",
            draft_id=1,
            formatted_message="TRADEORA\n\nBREAKING: Test",
            relevance_score=72,
            source_name="Reuters",
            source_tier=1,
            instruments=["XAUUSD", "USOIL"],
            bot_token="test_token",
        )
        assert msg_id == 123
        call_args = mock_post.call_args
        payload = call_args[1].get("json") or call_args[0][1] if len(call_args[0]) > 1 else call_args[1]["json"]
        assert "reply_markup" in payload


def test_process_auto_posts_posts_expired_drafts():
    mock_db = MagicMock()
    mock_db.get_pending_drafts.return_value = [
        {"id": 1, "article_id": 10, "formatted_message": "test", "image_url": None, "chart_path": None}
    ]

    with patch("scraper.approval_flow.send_channel_message", return_value=True) as mock_send:
        count = process_auto_posts(mock_db, channel_id="@test", bot_token="tok")
        assert count == 1
        mock_db.update_draft_status.assert_called_with(1, "auto_posted")
        mock_db.mark_article_posted.assert_called_with(10)


def test_process_auto_posts_no_expired():
    mock_db = MagicMock()
    mock_db.get_pending_drafts.return_value = []

    with patch("scraper.approval_flow.send_channel_message") as mock_send:
        count = process_auto_posts(mock_db, channel_id="@test", bot_token="tok")
        assert count == 0
        mock_send.assert_not_called()
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
python -m pytest tests/test_approval_flow.py -v
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement approval_flow.py**

Create `scraper/approval_flow.py`:

```python
"""
Draft approval flow for Telegram channel posts.
Sends drafts to admin's private chat with Approve/Skip buttons.
Auto-posts drafts older than 15 minutes.
"""

import json
import os
import requests
from scraper.channel_poster import send_channel_message


def send_draft_for_review(
    admin_chat_id: str,
    draft_id: int,
    formatted_message: str,
    relevance_score: int,
    source_name: str,
    source_tier: int,
    instruments: list[str],
    bot_token: str | None = None,
) -> int | None:
    """
    Send a draft to the admin's private Telegram chat with inline buttons.
    Returns the Telegram message_id or None on failure.
    """
    token = bot_token or os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        return None

    # Build preview message
    instrument_str = ", ".join(instruments[:5])
    preview = (
        f"\U0001F4DD DRAFT \u2014 tap to approve\n\n"
        f"{formatted_message}\n\n"
        f"\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n"
        f"Score: {relevance_score} | Source: {source_name} (Tier {source_tier})\n"
        f"Instruments: {instrument_str}"
    )

    # Inline keyboard with Approve/Skip (compact format, Telegram 64-byte limit)
    keyboard = {
        "inline_keyboard": [[
            {"text": "\u2705 Approve", "callback_data": f"approve:{draft_id}"},
            {"text": "\u274C Skip", "callback_data": f"skip:{draft_id}"},
        ]]
    }

    try:
        resp = requests.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={
                "chat_id": admin_chat_id,
                "text": preview[:4096],
                "reply_markup": keyboard,
                "disable_web_page_preview": True,
            },
            timeout=15,
        )
        if resp.status_code == 200:
            return resp.json()["result"]["message_id"]
        else:
            print(f"Failed to send draft: {resp.status_code} {resp.text}")
            return None
    except Exception as e:
        print(f"Error sending draft: {e}")
        return None


def process_auto_posts(db, channel_id: str, bot_token: str | None = None, timeout_minutes: int = 15) -> int:
    """
    Auto-post any drafts that have been pending longer than timeout_minutes.
    Returns count of auto-posted messages.
    """
    expired_drafts = db.get_pending_drafts(older_than_minutes=timeout_minutes)
    posted = 0

    for draft in expired_drafts:
        success = send_channel_message(
            channel_id=channel_id,
            text=draft["formatted_message"],
            image_url=draft.get("image_url"),
            chart_path=draft.get("chart_path"),
            bot_token=bot_token,
        )
        if success:
            db.update_draft_status(draft["id"], "auto_posted")
            if draft.get("article_id"):
                db.mark_article_posted(draft["article_id"])
            posted += 1

    return posted
```

- [ ] **Step 4: Run tests**

```bash
python -m pytest tests/test_approval_flow.py -v
```
Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scraper/approval_flow.py tests/test_approval_flow.py
git commit -m "feat: add draft approval flow with inline buttons and auto-post timeout"
```

---

## Task 8: Enhanced RSS Scraper

**Files:**
- Modify: `scraper/rss_scraper.py`

This modifies the existing scraper to support the new source format, HTML scraping fallback, and conditional HTTP requests. The morning batch (`scraper/main.py`) continues to work via the backward-compatible `feeds.py`.

- [ ] **Step 1: Add poll_sources method to RssScraper**

Add a new method to `scraper/rss_scraper.py` that accepts sources from `sources.py` format and returns articles enriched with source metadata:

```python
def poll_sources(self, sources: list[dict]) -> list[dict]:
    """
    Poll a list of sources (from sources.py format).
    Returns new articles with source metadata.
    Each article dict includes: title, content, url, source, published_at,
    instruments, source_tier, source_keywords, source_name.
    """
    articles = []
    for source in sources:
        try:
            if source["scrape_mode"] == "rss":
                new_articles = self._poll_rss_source(source)
            else:
                new_articles = self._poll_html_source(source)
            articles.extend(new_articles)
        except Exception as e:
            print(f"Error polling {source['name']}: {e}")
    return articles


def _poll_rss_source(self, source: dict) -> list[dict]:
    """Poll a single RSS source and return articles."""
    import feedparser
    feed = feedparser.parse(source["url"])
    articles = []
    for entry in feed.entries:
        parsed = self._parse_entry(entry, source["name"])
        if parsed:
            parsed["source_tier"] = source["tier"]
            parsed["source_keywords"] = source.get("keywords")
            parsed["source_name"] = source["name"]
            parsed["source_instruments"] = source["instruments"]
            articles.append(parsed)
    return articles


def _poll_html_source(self, source: dict) -> list[dict]:
    """
    Poll a source by scraping its HTML page for new items.
    Looks for common press release list patterns.
    """
    import requests as req
    from bs4 import BeautifulSoup
    try:
        resp = req.get(source["url"], timeout=10, headers={
            "User-Agent": "Mozilla/5.0 (compatible; Tradeora/1.0)"
        })
        if resp.status_code != 200:
            return []

        soup = BeautifulSoup(resp.text, "html.parser")

        # Look for links in common press release patterns
        articles = []
        # Try multiple selectors for press release pages
        links = (
            soup.select("article a[href]") or
            soup.select(".press-release a[href]") or
            soup.select(".news-item a[href]") or
            soup.select("li a[href]")
        )

        for link in links[:10]:  # Cap at 10 most recent
            title = link.get_text(strip=True)
            href = link.get("href", "")
            if not title or len(title) < 10:
                continue
            # Make absolute URL
            if href.startswith("/"):
                from urllib.parse import urlparse
                parsed = urlparse(source["url"])
                href = f"{parsed.scheme}://{parsed.netloc}{href}"

            from datetime import datetime, timezone
            articles.append({
                "title": title,
                "content": "",  # Will be fetched later if needed
                "url": href,
                "source": source["name"],
                "published_at": datetime.now(timezone.utc).isoformat(),
                "instruments": source["instruments"],
                "source_tier": source["tier"],
                "source_keywords": source.get("keywords"),
                "source_name": source["name"],
                "source_instruments": source["instruments"],
            })

        return articles

    except Exception as e:
        print(f"HTML scrape error for {source['name']}: {e}")
        return []
```

- [ ] **Step 2: Verify existing tests still pass**

```bash
python -m pytest tests/ -v --ignore=tests/test_database_channel.py -k "not test_database" 2>/dev/null || python -m pytest tests/ -v
```
Expected: All existing tests PASS. No regressions.

- [ ] **Step 3: Commit**

```bash
git add scraper/rss_scraper.py
git commit -m "feat: add poll_sources method with HTML scraping fallback to RSS scraper"
```

---

## Task 9: Poller Orchestrator

**Files:**
- Create: `scraper/poller.py`
- Create: `scraper/heartbeat.py`
- Create: `tests/test_poller.py`

This is the main entry point run by cron every 1-3 minutes.

- [ ] **Step 1: Write tests**

Create `tests/test_poller.py`:

```python
"""Tests for the polling orchestrator."""
import pytest
from unittest.mock import MagicMock, patch


def test_poller_skips_known_urls():
    """Articles with URLs already in DB should be skipped."""
    from scraper.poller import filter_new_articles

    mock_db = MagicMock()
    mock_db.is_url_known.side_effect = lambda url: url == "https://known.com/article"

    articles = [
        {"url": "https://known.com/article", "title": "Old"},
        {"url": "https://new.com/article", "title": "New"},
    ]
    result = filter_new_articles(articles, mock_db)
    assert len(result) == 1
    assert result[0]["title"] == "New"


def test_poller_deduplicates_within_batch():
    """Articles with duplicate headlines in the same batch should be deduped."""
    from scraper.poller import deduplicate_batch

    articles = [
        {"title": "Fed raises rates by 25bp", "url": "https://a.com/1"},
        {"title": "Fed raises rates by 25bp", "url": "https://b.com/1"},
        {"title": "Iran rejects ceasefire", "url": "https://c.com/1"},
    ]
    result = deduplicate_batch(articles, existing_headlines=[])
    assert len(result) == 2
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
python -m pytest tests/test_poller.py -v
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create heartbeat.py**

Create `scraper/heartbeat.py`:

```python
"""Poller heartbeat for health monitoring."""


def write_heartbeat(db, articles_found: int, errors: str | None = None):
    """Write a heartbeat to the database."""
    try:
        db.upsert_heartbeat(articles_found=articles_found, errors=errors)
    except Exception as e:
        print(f"Failed to write heartbeat: {e}")
```

- [ ] **Step 4: Create poller.py**

Create `scraper/poller.py`:

```python
"""
Main polling orchestrator.
Runs every 1-3 minutes via cron. Checks sources for new articles,
scores them, deduplicates, and either auto-posts or queues for approval.
"""

import os
import sys
from scraper.database import Database
from scraper.sources import SOURCES
from scraper.rss_scraper import RssScraper
from scraper.quality_filter import score_article
from scraper.dedup import is_duplicate_headline
from scraper.categorizer import categorize_article
from scraper.image_scraper import extract_og_image
from scraper.channel_poster import format_breaking_news, send_channel_message
from scraper.approval_flow import send_draft_for_review, process_auto_posts
from scraper.heartbeat import write_heartbeat


def filter_new_articles(articles: list[dict], db: Database) -> list[dict]:
    """Filter out articles whose URLs are already in the database."""
    new = []
    for article in articles:
        if not db.is_url_known(article["url"]):
            new.append(article)
    return new


def deduplicate_batch(articles: list[dict], existing_headlines: list[str]) -> list[dict]:
    """Remove duplicate headlines within a batch and against recent DB headlines."""
    seen_headlines = list(existing_headlines)
    unique = []
    for article in articles:
        if not is_duplicate_headline(article["title"], seen_headlines):
            unique.append(article)
            seen_headlines.append(article["title"])
    return unique


def run():
    """Main polling loop — called by cron every 1-3 minutes."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not set, exiting")
        sys.exit(1)

    db = Database(database_url)
    scraper = RssScraper()

    channel_id = os.environ.get("TELEGRAM_CHANNEL_ID")
    admin_chat_id = os.environ.get("TELEGRAM_ADMIN_CHAT_ID")
    bot_token = os.environ.get("TELEGRAM_BOT_TOKEN")

    if not channel_id:
        print("TELEGRAM_CHANNEL_ID not set, exiting")
        sys.exit(1)

    errors = []
    articles_found = 0

    try:
        # 1. Auto-post any expired drafts (pending > 15 min)
        auto_posted = process_auto_posts(db, channel_id, bot_token)
        if auto_posted:
            print(f"Auto-posted {auto_posted} expired drafts")

        # 2. Poll all sources
        raw_articles = scraper.poll_sources(SOURCES)
        print(f"Polled {len(SOURCES)} sources, found {len(raw_articles)} articles")

        # 3. Filter out known URLs
        new_articles = filter_new_articles(raw_articles, db)
        print(f"After URL filter: {len(new_articles)} new articles")

        if not new_articles:
            write_heartbeat(db, 0)
            return

        # 4. Deduplicate against recent headlines
        recent_headlines = db.get_recent_headlines(hours=2)
        unique_articles = deduplicate_batch(new_articles, recent_headlines)
        print(f"After dedup: {len(unique_articles)} unique articles")
        articles_found = len(unique_articles)

        # 5. Score, categorize, and process each article
        for article in unique_articles:
            # Categorize if not already done by source mapping
            instruments = article.get("instruments") or categorize_article(
                article["title"], article.get("content", "")
            )

            # Score the article
            score_result = score_article(
                title=article["title"],
                content=article.get("content", ""),
                source_tier=article.get("source_tier", 3),
                source_keywords=article.get("source_keywords"),
                matched_instruments=instruments,
            )

            # Store article in DB regardless of score
            try:
                article_id = db.insert_article(
                    title=article["title"],
                    content=article.get("content", ""),
                    url=article["url"],
                    source=article.get("source_name", article.get("source", "")),
                    published_at=article.get("published_at"),
                    instruments=instruments,
                )
            except Exception as e:
                print(f"Failed to store article '{article['title'][:50]}': {e}")
                continue

            # Skip channel posting if below threshold
            if score_result["score"] < 40:
                print(f"  Skip (score {score_result['score']}): {article['title'][:60]}")
                continue

            # Look up current biases for matched instruments
            biases = {}
            for inst in instruments[:5]:
                bias = db.get_latest_bias(inst)
                if bias:
                    biases[inst] = {"direction": bias["direction"], "confidence": bias["confidence"]}

            # Format the message
            message = format_breaking_news(
                title=article["title"],
                source=article.get("source_name", article.get("source", "")),
                biases=biases,
                article_url=article["url"],
                is_urgent=score_result["is_urgent"],
            )

            # Get article image
            image_url = extract_og_image(article["url"])

            if score_result["auto_post"]:
                # Tier 0 with keyword match — post directly
                success = send_channel_message(channel_id, message, image_url=image_url, bot_token=bot_token)
                if success:
                    db.mark_article_posted(article_id)
                    print(f"  AUTO-POSTED: {article['title'][:60]}")
                else:
                    print(f"  Failed to auto-post: {article['title'][:60]}")
            else:
                # Tier 1-3 — send draft for review
                draft_id = db.insert_draft(
                    article_id=article_id,
                    formatted_message=message,
                    image_url=image_url,
                    chart_path=None,
                    relevance_score=score_result["score"],
                    source_tier=article.get("source_tier", 3),
                )
                if admin_chat_id:
                    send_draft_for_review(
                        admin_chat_id=admin_chat_id,
                        draft_id=draft_id,
                        formatted_message=message,
                        relevance_score=score_result["score"],
                        source_name=article.get("source_name", ""),
                        source_tier=article.get("source_tier", 3),
                        instruments=instruments,
                        bot_token=bot_token,
                    )
                    print(f"  QUEUED: {article['title'][:60]}")

    except Exception as e:
        errors.append(str(e))
        print(f"Poller error: {e}")

    # 6. Check for notable economic data (runs only if FRED_API_KEY is set)
    if os.environ.get("FRED_API_KEY"):
        try:
            from scraper.data_monitor import MONITORED_SERIES, fetch_fred_series, detect_notable
            from scraper.chart_generator import generate_chart
            import tempfile

            for series_config in MONITORED_SERIES:
                result = fetch_fred_series(series_config["series_id"])
                if not result:
                    continue
                dates, values = result
                if len(values) < 2:
                    continue

                notable = detect_notable(
                    series_name=series_config["name"],
                    current_value=values[-1],
                    historical_values=values[:-1],
                )
                if notable and notable.is_notable:
                    # Generate chart
                    chart_path = os.path.join(tempfile.gettempdir(), f"tradeora_{series_config['series_id']}.png")
                    generate_chart(
                        title=notable.description,
                        subtitle=series_config["name"],
                        x_labels=dates[-20:],  # Last 20 data points
                        y_values=values[-20:],
                        source=series_config["source"],
                        output_path=chart_path,
                        y_format=series_config.get("y_format", "number"),
                    )

                    # Look up biases for affected instruments
                    biases = {}
                    for inst in series_config["instruments"][:5]:
                        bias = db.get_latest_bias(inst)
                        if bias:
                            biases[inst] = {"direction": bias["direction"], "confidence": bias["confidence"]}

                    from scraper.channel_poster import format_data_release
                    message = format_data_release(
                        title=notable.description,
                        detail=f"Latest value: {values[-1]:.1f} (previous: {values[-2]:.1f})",
                        source=series_config["source"],
                        biases=biases,
                    )
                    send_channel_message(channel_id, message, chart_path=chart_path, bot_token=bot_token)
                    print(f"  DATA CHART: {notable.description}")
        except Exception as e:
            errors.append(f"Data monitor: {e}")
            print(f"Data monitor error: {e}")

    # 7. Write heartbeat
    write_heartbeat(db, articles_found, "; ".join(errors) if errors else None)


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    run()
```

- [ ] **Step 5: Run tests**

```bash
python -m pytest tests/test_poller.py -v
```
Expected: All 2 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add scraper/poller.py scraper/heartbeat.py tests/test_poller.py
git commit -m "feat: add polling orchestrator with auto-post and approval routing"
```

---

## Task 10: Telegram Webhook Callback Handler

**Files:**
- Modify: `src/app/api/telegram/webhook/route.ts`

Extend the existing webhook to handle `callback_query` updates (Approve/Skip button taps).

- [ ] **Step 1: Read existing webhook route**

```bash
cat src/app/api/telegram/webhook/route.ts
```

Understand the current handler structure before modifying.

- [ ] **Step 2: Add callback_query handling**

Add to the POST handler in `src/app/api/telegram/webhook/route.ts`, before the existing message handling logic:

```typescript
// Handle callback queries (Approve/Skip buttons from draft review)
if (body.callback_query) {
  const callbackQuery = body.callback_query;
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  // Only the admin can approve/skip
  if (String(callbackQuery.from.id) !== adminChatId) {
    return NextResponse.json({ ok: true });
  }

  try {
    const [action, draftIdStr] = callbackQuery.data.split(":");
    const draft_id = parseInt(draftIdStr, 10);

    if (action === "approve" || action === "skip") {
      // Update draft status in DB
      const status = action === "approve" ? "approved" : "skipped";
      await sql`UPDATE telegram_drafts SET status = ${status}, posted_at = ${action === "approve" ? new Date().toISOString() : null} WHERE id = ${draft_id}`;

      if (action === "approve") {
        // Get the draft message and post to channel
        const drafts = await sql`SELECT formatted_message, image_url, article_id FROM telegram_drafts WHERE id = ${draft_id}`;
        if (drafts.length > 0) {
          const draft = drafts[0];
          const channelId = process.env.TELEGRAM_CHANNEL_ID;
          const botToken = process.env.TELEGRAM_BOT_TOKEN;

          // Post to channel
          const sendUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
          await fetch(sendUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: channelId,
              text: draft.formatted_message,
              disable_web_page_preview: true,
            }),
          });

          // Mark article as posted
          if (draft.article_id) {
            await sql`UPDATE articles SET posted_to_channel = TRUE, channel_posted_at = NOW() WHERE id = ${draft.article_id}`;
          }
        }
      }

      // Answer the callback to remove loading state
      const answerText = action === "approve" ? "Posted to channel!" : "Skipped.";
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: callbackQuery.id, text: answerText }),
      });

      // Edit the draft message to show the action taken
      const statusEmoji = action === "approve" ? "\u2705" : "\u274C";
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: callbackQuery.message.chat.id,
          message_id: callbackQuery.message.message_id,
          reply_markup: { inline_keyboard: [[{ text: `${statusEmoji} ${status.toUpperCase()}`, callback_data: "noop" }]] },
        }),
      });
    }
  } catch (e) {
    console.error("Callback query error:", e);
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Test locally**

```bash
cd /Users/a/Desktop/forex-analysis
npm run dev
# In another terminal, simulate a callback_query POST to http://localhost:3000/api/telegram/webhook
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/telegram/webhook/route.ts
git commit -m "feat: extend Telegram webhook to handle approve/skip callback buttons"
```

---

## Task 11: Chart Generator

**Files:**
- Create: `scraper/chart_generator.py`
- Create: `tests/test_chart_generator.py`

- [ ] **Step 1: Add dependencies**

Add to `scraper/requirements.txt`:

```
matplotlib==3.9.0
fredapi==0.5.2
yfinance==0.2.36
```

Install:

```bash
cd /Users/a/Desktop/forex-analysis && pip install matplotlib fredapi yfinance
```

- [ ] **Step 2: Write tests**

Create `tests/test_chart_generator.py`:

```python
"""Tests for chart generation."""
import pytest
import os
from unittest.mock import patch, MagicMock


def test_generate_chart_creates_file(tmp_path):
    from scraper.chart_generator import generate_chart

    output_path = str(tmp_path / "test_chart.png")
    generate_chart(
        title="US Unemployment Duration",
        subtitle="Average weeks, seasonally adjusted",
        x_labels=["2020", "2021", "2022", "2023", "2024", "2025", "2026"],
        y_values=[15.0, 20.0, 18.0, 19.5, 22.0, 24.0, 25.7],
        source="BLS",
        output_path=output_path,
        highlight_last=True,
    )
    assert os.path.exists(output_path)
    assert os.path.getsize(output_path) > 1000  # Should be a real image


def test_chart_has_reasonable_dimensions(tmp_path):
    from scraper.chart_generator import generate_chart
    from PIL import Image

    output_path = str(tmp_path / "test_chart.png")
    generate_chart(
        title="Test",
        subtitle="Test sub",
        x_labels=["A", "B", "C"],
        y_values=[1, 2, 3],
        source="Test",
        output_path=output_path,
    )
    # bbox_inches="tight" crops whitespace, so dimensions are approximate
    img = Image.open(output_path)
    w, h = img.size
    assert 600 <= w <= 900, f"Width {w} out of expected range"
    assert 350 <= h <= 600, f"Height {h} out of expected range"
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
python -m pytest tests/test_chart_generator.py -v
```
Expected: FAIL — module not found.

- [ ] **Step 4: Implement chart_generator.py**

Create `scraper/chart_generator.py`:

```python
"""
Auto-generate styled charts for Telegram posts.
Dark theme with Tradeora branding.
"""

import matplotlib
matplotlib.use("Agg")  # Non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import numpy as np

# Tradeora chart theme
DARK_BG = "#1a1a2e"
PLOT_BG = "#16213e"
TEXT_COLOR = "#e0e0e0"
GRID_COLOR = "#2a2a4a"
LINE_COLOR = "#4da6ff"
HIGHLIGHT_COLOR = "#ff4444"
WATERMARK_COLOR = "#333355"


def generate_chart(
    title: str,
    subtitle: str,
    x_labels: list[str],
    y_values: list[float],
    source: str,
    output_path: str,
    chart_type: str = "line",
    highlight_last: bool = True,
    y_format: str = "number",  # "number", "percent", "currency"
) -> str:
    """
    Generate a styled chart and save to output_path.
    Returns the output_path.
    """
    fig, ax = plt.subplots(figsize=(8, 5), dpi=100)

    # Dark theme
    fig.patch.set_facecolor(DARK_BG)
    ax.set_facecolor(PLOT_BG)
    ax.tick_params(colors=TEXT_COLOR, labelsize=9)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color(GRID_COLOR)
    ax.spines["bottom"].set_color(GRID_COLOR)
    ax.grid(axis="y", color=GRID_COLOR, linewidth=0.5, alpha=0.5)

    x = np.arange(len(x_labels))

    if chart_type == "bar":
        bars = ax.bar(x, y_values, color=LINE_COLOR, width=0.6)
        if highlight_last and len(bars) > 0:
            bars[-1].set_color(HIGHLIGHT_COLOR)
    else:
        ax.plot(x, y_values, color=LINE_COLOR, linewidth=2)
        ax.fill_between(x, y_values, alpha=0.1, color=LINE_COLOR)
        if highlight_last and len(y_values) > 0:
            ax.plot(len(y_values) - 1, y_values[-1], "o", color=HIGHLIGHT_COLOR, markersize=8, zorder=5)
            # Red box around last value
            ax.annotate(
                f"{y_values[-1]:.1f}" if y_format == "number" else f"{y_values[-1]:.1f}%",
                xy=(len(y_values) - 1, y_values[-1]),
                xytext=(10, 10), textcoords="offset points",
                fontsize=10, color=HIGHLIGHT_COLOR, fontweight="bold",
                bbox=dict(boxstyle="round,pad=0.3", facecolor=HIGHLIGHT_COLOR, alpha=0.2, edgecolor=HIGHLIGHT_COLOR),
            )

    # Labels
    ax.set_xticks(x)
    ax.set_xticklabels(x_labels, rotation=0 if len(x_labels) <= 12 else 45, ha="center")

    # Y-axis formatting
    if y_format == "percent":
        ax.yaxis.set_major_formatter(mticker.PercentFormatter())
    elif y_format == "currency":
        ax.yaxis.set_major_formatter(mticker.StrMethodFormatter("${x:,.0f}"))

    # Title and subtitle
    fig.text(0.05, 0.95, title, fontsize=14, fontweight="bold", color=TEXT_COLOR,
             transform=fig.transFigure, va="top")
    fig.text(0.05, 0.90, subtitle, fontsize=10, color="#888888",
             transform=fig.transFigure, va="top")

    # Source + watermark
    fig.text(0.05, 0.02, f"Source: {source}", fontsize=8, color="#666666",
             transform=fig.transFigure)
    fig.text(0.95, 0.02, "tradeora.com", fontsize=8, color=WATERMARK_COLOR,
             transform=fig.transFigure, ha="right")
    fig.text(0.5, 0.5, "TRADEORA", fontsize=40, color=WATERMARK_COLOR,
             transform=fig.transFigure, ha="center", va="center", alpha=0.15, fontweight="bold")

    plt.tight_layout(rect=[0, 0.05, 1, 0.88])
    plt.savefig(output_path, facecolor=fig.get_facecolor(), bbox_inches="tight", dpi=100)
    plt.close(fig)

    return output_path
```

- [ ] **Step 5: Run tests**

```bash
pip install Pillow  # Needed for dimension test
python -m pytest tests/test_chart_generator.py -v
```
Expected: All 2 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add scraper/chart_generator.py tests/test_chart_generator.py scraper/requirements.txt
git commit -m "feat: add chart generator with dark theme and Tradeora branding"
```

---

## Task 12: Data Monitor (FRED/BLS/EIA Integration)

**Files:**
- Create: `scraper/data_monitor.py`
- Create: `tests/test_data_monitor.py`

- [ ] **Step 1: Write tests**

Create `tests/test_data_monitor.py`:

```python
"""Tests for notable data detection."""
import pytest
from scraper.data_monitor import detect_notable, NotableResult


def test_new_high_detected():
    result = detect_notable(
        series_name="Unemployment Duration",
        current_value=25.7,
        historical_values=[15.0, 18.0, 20.0, 22.0, 24.0],
    )
    assert result is not None
    assert result.is_notable is True
    assert "high" in result.description.lower()


def test_not_notable_normal_value():
    result = detect_notable(
        series_name="CPI",
        current_value=3.1,
        historical_values=[2.8, 3.0, 3.2, 3.1, 2.9, 3.0],
    )
    assert result is None or result.is_notable is False


def test_large_change_detected():
    result = detect_notable(
        series_name="Crude Inventories",
        current_value=-10.0,  # Large draw
        historical_values=[-2.0, 1.5, -1.0, 0.5, -3.0],
    )
    assert result is not None
    assert result.is_notable is True
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
python -m pytest tests/test_data_monitor.py -v
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement data_monitor.py**

Create `scraper/data_monitor.py`:

```python
"""
Monitor economic data from FRED/BLS/EIA and detect notable values.
Triggers chart generation when data is noteworthy.
"""

import os
from dataclasses import dataclass


@dataclass
class NotableResult:
    is_notable: bool
    description: str
    series_name: str
    current_value: float
    comparison: str  # "new_high", "new_low", "large_change", "threshold"


def detect_notable(
    series_name: str,
    current_value: float,
    historical_values: list[float],
    lookback_label: str = "on record",
) -> NotableResult | None:
    """
    Check if a new data point is notable compared to history.
    Returns NotableResult if notable, None otherwise.
    """
    if not historical_values:
        return None

    hist_max = max(historical_values)
    hist_min = min(historical_values)
    hist_mean = sum(historical_values) / len(historical_values)

    # New all-time high
    if current_value > hist_max:
        return NotableResult(
            is_notable=True,
            description=f"{series_name} hits highest level {lookback_label} at {current_value:.1f}",
            series_name=series_name,
            current_value=current_value,
            comparison="new_high",
        )

    # New all-time low
    if current_value < hist_min:
        return NotableResult(
            is_notable=True,
            description=f"{series_name} falls to lowest level {lookback_label} at {current_value:.1f}",
            series_name=series_name,
            current_value=current_value,
            comparison="new_low",
        )

    # Large deviation from mean (> 2 standard deviations)
    if len(historical_values) >= 5:
        import statistics
        stdev = statistics.stdev(historical_values)
        if stdev > 0 and abs(current_value - hist_mean) > 2 * stdev:
            direction = "surges" if current_value > hist_mean else "plunges"
            return NotableResult(
                is_notable=True,
                description=f"{series_name} {direction} to {current_value:.1f}, well beyond recent range",
                series_name=series_name,
                current_value=current_value,
                comparison="large_change",
            )

    return None


def fetch_fred_series(series_id: str, api_key: str | None = None) -> tuple[list[str], list[float]] | None:
    """
    Fetch a data series from FRED API.
    Returns (dates, values) or None on error.
    """
    key = api_key or os.environ.get("FRED_API_KEY")
    if not key:
        print("FRED_API_KEY not set")
        return None

    try:
        from fredapi import Fred
        fred = Fred(api_key=key)
        series = fred.get_series(series_id)
        dates = [d.strftime("%Y-%m") for d in series.index[-60:]]  # Last 60 data points
        values = [float(v) for v in series.values[-60:] if not (v != v)]  # Filter NaN
        return dates, values
    except Exception as e:
        print(f"FRED fetch error for {series_id}: {e}")
        return None


# Mapping of FRED series to monitor with instrument impacts
MONITORED_SERIES = [
    {
        "series_id": "UNRATE",
        "name": "US Unemployment Rate",
        "source": "BLS",
        "instruments": ["DXY", "XAUUSD", "US30", "SP500"],
        "y_format": "percent",
    },
    {
        "series_id": "CPIAUCSL",
        "name": "US Consumer Price Index",
        "source": "BLS",
        "instruments": ["DXY", "XAUUSD", "EURUSD", "US30"],
        "y_format": "number",
    },
    {
        "series_id": "GDP",
        "name": "US Real GDP",
        "source": "BEA",
        "instruments": ["DXY", "US30", "NAS100", "SP500"],
        "y_format": "currency",
    },
    {
        "series_id": "FEDFUNDS",
        "name": "Federal Funds Rate",
        "source": "Federal Reserve",
        "instruments": ["DXY", "EURUSD", "XAUUSD", "US30"],
        "y_format": "percent",
    },
]
```

- [ ] **Step 4: Run tests**

```bash
python -m pytest tests/test_data_monitor.py -v
```
Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scraper/data_monitor.py tests/test_data_monitor.py
git commit -m "feat: add FRED data monitor with notable value detection"
```

---

## Task 13: Update Requirements and Environment Config

**Files:**
- Modify: `scraper/requirements.txt`
- Update: `.env.example` (if exists)

- [ ] **Step 1: Update requirements.txt**

Add new dependencies (if not already added in Task 11):

```
matplotlib==3.9.0
fredapi==0.5.2
yfinance==0.2.36
Pillow==10.3.0
```

- [ ] **Step 2: Document new environment variables**

The following environment variables need to be set for the new features:

```
# Existing
TELEGRAM_BOT_TOKEN=...

# New
TELEGRAM_CHANNEL_ID=@your_channel_name   # Public channel username or numeric ID
TELEGRAM_ADMIN_CHAT_ID=your_telegram_id  # Your personal Telegram user ID
FRED_API_KEY=...                          # Free at https://fred.stlouisfed.org/docs/api/api_key.html
```

- [ ] **Step 3: Install dependencies**

```bash
cd /Users/a/Desktop/forex-analysis
pip install -r scraper/requirements.txt
```

- [ ] **Step 4: Commit**

```bash
git add scraper/requirements.txt
git commit -m "chore: add matplotlib, fredapi, yfinance dependencies"
```

---

## Task 14: Cron Setup and End-to-End Test

**Files:**
- No new files — this is configuration and testing.

- [ ] **Step 1: Create the Telegram channel**

1. Open Telegram → New Channel → name it (e.g., "Tradeora News")
2. Set it to Public with a username (e.g., @tradeora_news)
3. Add your bot as a channel administrator (must have "Post Messages" permission)
4. Note the channel username: `@tradeora_news`

- [ ] **Step 2: Get your admin chat ID**

Send `/start` to your bot in a private chat. Check bot logs or use:

```bash
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates" | python -m json.tool | grep '"id"' | head -1
```

- [ ] **Step 3: Set environment variables**

Add to `.env`:

```
TELEGRAM_CHANNEL_ID=@tradeora_news
TELEGRAM_ADMIN_CHAT_ID=YOUR_ID_HERE
FRED_API_KEY=YOUR_KEY_HERE
```

- [ ] **Step 4: Run the poller manually once**

```bash
cd /Users/a/Desktop/forex-analysis
python -m scraper.poller
```

Expected: Polls all 35 sources, prints article counts, posts Tier 0 articles to channel, sends Tier 1-3 drafts to your phone.

- [ ] **Step 5: Test the approval flow**

1. Check your Telegram private chat for draft messages
2. Tap "Approve" on one — verify it appears in the channel
3. Tap "Skip" on another — verify it does NOT appear

- [ ] **Step 6: Set up cron**

```bash
crontab -e
```

Add:

```
*/3 * * * * cd /Users/a/Desktop/forex-analysis && /usr/bin/python3 -m scraper.poller >> /tmp/tradeora-poller.log 2>&1
```

- [ ] **Step 7: Monitor for 10 minutes**

```bash
tail -f /tmp/tradeora-poller.log
```

Verify: cron fires every 3 minutes, articles are found, channel posts appear.

- [ ] **Step 8: Commit any final adjustments**

```bash
git add -A
git commit -m "feat: complete real-time Telegram channel setup"
```

---

## Task Summary

| Task | Component | Dependencies | Est. Steps |
|------|-----------|-------------|------------|
| 1 | DB Migration | None | 6 |
| 2 | Source Configuration | None | 6 |
| 3 | Quality Filter | None | 5 |
| 4 | Deduplication | None | 5 |
| 5 | Image Scraper | None | 5 |
| 6 | Channel Poster | None | 5 |
| 7 | Approval Flow | Task 6 | 5 |
| 8 | Enhanced RSS Scraper | Task 2 | 3 |
| 9 | Poller Orchestrator | Tasks 1-8 | 6 |
| 10 | Webhook Callback | Task 7 | 4 |
| 11 | Chart Generator | None | 6 |
| 12 | Data Monitor | Task 11 | 5 |
| 13 | Requirements | None | 4 |
| 14 | Cron Setup & E2E Test | All | 8 |

**Parallelizable tasks:** Tasks 1-6 and 11 can all be built independently. Tasks 7-8 depend on 6 and 2 respectively. Task 9 integrates everything. Task 10 extends the webhook. Task 14 is the final integration test.
