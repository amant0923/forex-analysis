# Tradeora Real-Time Telegram Channel & Enhanced News Pipeline

**Date:** 2026-03-25
**Status:** Design
**Author:** Claude + User

---

## Problem

The current system scrapes 43 RSS feeds once daily at 06:00 UTC, producing a ~24-hour latency from event to delivery. Most scraped articles are low-quality noise (opinion pieces, listicles, delayed reporting). Competing free channels like The Kobeissi Letter deliver breaking news within minutes with curated, market-moving content.

## Goal

Transform Tradeora into a real-time financial news channel that:
1. Delivers breaking news to a public Telegram channel within 2-3 minutes of publication
2. Uses only high-quality, primary sources (government agencies, wire services, quality outlets)
3. Includes instrument bias tags on every post (Tradeora's unique differentiator)
4. Auto-generates data charts from free APIs when economic data is released
5. Drives traffic to the paid Tradeora platform via branded posts
6. Maintains the existing morning batch bias generation (no additional AI cost)

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Speed vs curation | Both | Real-time AND high-quality sources |
| Auto-post vs review | Hybrid | Tier 0 auto-posts; Tier 1-3 go to phone for approval; 15-min auto-post timeout |
| Content style | Kobeissi style + bias tags | Short, punchy posts with instrument impact — differentiator over competitors |
| Telegram structure | Public channel | Anyone can join, acts as marketing funnel for paid platform |
| Branding | Strong | Tradeora header, watermark on charts, CTA + link on every post |
| Posting hours | 24/7 | Markets span all time zones, breaking news doesn't sleep |
| AI cost increase | None | Rule-based filtering, templated posts, no additional AI calls |
| Chart generation | Auto from free data | FRED, BLS, EIA, Yahoo Finance APIs + matplotlib |
| Hosting | Local Mac (cron) → $5 VPS later | Start local for dev/testing, move to VPS for 24/7 reliability |
| X/Twitter | Not using | Free tier unusable for monitoring; primary sources are faster anyway |

---

## Architecture

```
[35 Sources] ──poll every 3 min (cron)──→ [Poller Script]
                                              │
                                     ┌────────┴────────┐
                                     │                  │
                              [New articles?]     [Pending drafts
                                     │              > 15 min?]
                                     │                  │
                                     ▼                  ▼
                             [Dedup + Score]      [Auto-post them]
                                     │
                          ┌──────────┴──────────┐
                          │                      │
                   [Score ≥ 40]           [Score < 40]
                          │                      │
                          ▼                      ▼
                  [Tier 0 source?]        [Store in DB only]
                    │           │         (for morning batch)
                  [YES]       [NO]
                    │           │
                    ▼           ▼
             [Auto-post    [Send draft to
              to channel]   user's private chat]
                    │           │
                    ▼           ▼
             [Store in DB]  [Wait for tap]
                               │
                    ┌──────────┼──────────┐
                    │          │          │
                [Approve]   [Edit]    [Skip]
                    │          │          │
                    ▼          ▼          ▼
                [Post to   [User edits  [Store in DB
                 channel]   then post]   only]

Morning batch (daily, unchanged):
[All articles from past 24h] → [Claude bias generation] → [Site update + email digest]
```

---

## Source Stack (35 sources, $0/month)

### Tier 0 — Origin Sources (19) — Auto-post to channel

These are the original publishers of the information. No journalist is faster.

#### Central Banks (8)

| # | Source | Instruments Affected |
|---|--------|---------------------|
| 1 | Federal Reserve (federalreserve.gov/newsevents/pressreleases.htm) | DXY, all USD pairs, US indices, XAUUSD |
| 2 | ECB (ecb.europa.eu/press/pr/html/index.en.html) | EURUSD, EURJPY, EURGBP, GER40 |
| 3 | Bank of England (bankofengland.co.uk/news) | GBPUSD, GBPJPY, EURGBP |
| 4 | Bank of Japan (boj.or.jp/en/announcements) | USDJPY, EURJPY, GBPJPY |
| 5 | Reserve Bank of Australia (rba.gov.au/media-releases) | AUDUSD |
| 6 | Bank of Canada (bankofcanada.ca/press) | USDCAD |
| 7 | Reserve Bank of New Zealand (rbnz.govt.nz/hub/news) | NZDUSD |
| 8 | Swiss National Bank (snb.ch/en/ifor/media/id/media_releases) | USDCHF |

#### US Economic Data (6)

| # | Source | Instruments Affected |
|---|--------|---------------------|
| 9 | Bureau of Labor Statistics (bls.gov/bls/newsrels.htm) | All — NFP, CPI, PPI, unemployment |
| 10 | Bureau of Economic Analysis (bea.gov/news/current-releases) | DXY, indices, XAUUSD — GDP, PCE |
| 11 | US Census Bureau (census.gov/economic-indicators) | DXY, indices — retail sales, housing, trade balance |
| 12 | US Treasury (home.treasury.gov/news/press-releases) | DXY, XAUUSD — sanctions, fiscal policy, auctions |
| 13 | White House (whitehouse.gov/briefing-room/statements-releases) | All — tariffs, executive orders, trade policy |
| 14 | US State Department (state.gov/press-releases) | XAUUSD, USOIL — diplomacy, sanctions |

#### European Data (2)

| # | Source | Instruments Affected |
|---|--------|---------------------|
| 15 | Eurostat (ec.europa.eu/eurostat/news/news-releases) | EURUSD, EURJPY, GER40 — EU GDP, inflation |
| 16 | UK ONS (ons.gov.uk/releasecalendar) | GBPUSD, GBPJPY — UK GDP, CPI |

#### Institutional (3)

| # | Source | Instruments Affected |
|---|--------|---------------------|
| 17 | EIA (eia.gov/petroleum/supply/weekly) | USOIL, USDCAD — weekly crude inventory |
| 18 | OPEC (opec.org/opec_web/en/press_room/28.htm) | USOIL, USDCAD — production decisions |
| 19 | SEC (sec.gov/news/press-releases) | BTCUSD, ETHUSD, indices — crypto ETF, regulation |

### Tier 1 — Wire Services (5) — Review via phone

| # | Source | Instruments Affected |
|---|--------|---------------------|
| 20 | Reuters World | Geopolitical — XAUUSD, USOIL, safe havens |
| 21 | Reuters Business | All markets |
| 22 | Reuters Markets | All markets |
| 23 | AP World | Geopolitical instruments |
| 24 | AP Business | All markets |

### Tier 2 — Quality Outlets (5) — Review via phone

| # | Source | Why included |
|---|--------|-------------|
| 25 | Wall Street Journal (RSS) | Breaks major exclusives (policy leaks, appointments) |
| 26 | Financial Times (RSS) | Best on European political/economic exclusives |
| 27 | CNBC Markets (RSS) | Fast on US market news, earnings |
| 28 | Axios (RSS) | Clean, fast policy reporting |
| 29 | Al Jazeera (RSS) | Fastest English-language Middle East coverage |

### Tier 3 — Specialist Sources (6) — Review via phone

| # | Source | Domain | Instruments |
|---|--------|--------|-------------|
| 30 | ForexLive | Forex | All forex pairs |
| 31 | FXStreet | Forex | All forex pairs |
| 32 | Kitco | Precious metals | XAUUSD, XAGUSD |
| 33 | OilPrice.com | Energy | USOIL |
| 34 | CoinDesk | Crypto | BTCUSD, ETHUSD |
| 35 | The Block | Crypto | BTCUSD, ETHUSD |

---

## Quality Filter (Rule-Based, No AI)

Each new article receives a relevance score (0-100):

| Factor | Points | Notes |
|--------|--------|-------|
| Source tier 0 | +40 | Government/central bank |
| Source tier 1 | +30 | Wire services |
| Source tier 2 | +20 | Quality outlets |
| Source tier 3 | +15 | Specialist sources |
| Direct instrument keyword match | +20 | Article mentions "EURUSD", "gold price", "crude oil" etc. |
| Thematic keyword match | +10 | Article mentions "rate hike", "inflation", "tariffs" etc. |
| Urgency keywords | +15 | BREAKING, emergency, rate decision, declares, sanctions |
| Recency (< 30 min old) | +10 | Prioritize fresh content |
| Negative: opinion/listicle patterns | -30 | "5 things to watch", "analyst says", "what to expect" |
| Negative: duplicate story | -100 | Same story already posted (fuzzy headline match) |

**Posting threshold: 40+** — articles scoring below 40 are stored in DB for the morning batch but not posted to the channel.

---

## Deduplication

Same event reported by multiple sources (e.g., Fed decision from Reuters, AP, WSJ simultaneously):

1. **Fuzzy headline matching** — compare new headline against articles posted in last 2 hours using token overlap. 80%+ similarity = duplicate.
2. **Entity + event clustering** — extract key entities (country names, people, organizations) and event type. If same entities + same event within 30-min window = cluster. Post only the first article in each cluster.
3. **URL domain dedup** — same domain can only post about the same topic once per 2-hour window.

---

## Telegram Post Formats

### Breaking News (Tier 1-3 sources, with photo)

```
TRADEORA

🔴 BREAKING: Iran rejects US ceasefire talks,
says negotiations are "illogical"

Impact:
XAUUSD  📈 Bullish (78%)
USOIL   📈 Bullish (82%)
DXY     📉 Bearish (61%)

Source: Reuters

Full analysis → tradeora.com/XAUUSD
━━━━━━━━━━━━━━━━
📊 tradeora.com | Free 14-day trial
```

Attached: og:image scraped from article URL.

### Central Bank Decision (Tier 0, auto-post)

```
TRADEORA

🏛️ Federal Reserve holds rates at 5.25-5.50%,
signals potential June cut

Impact:
DXY     📉 Bearish (88%)
EURUSD  📈 Bullish (82%)
XAUUSD  📈 Bullish (85%)
US30    📈 Bullish (79%)
NAS100  📈 Bullish (81%)

Source: Federal Reserve

Full analysis → tradeora.com/DXY
━━━━━━━━━━━━━━━━
📊 tradeora.com | Free 14-day trial
```

### Data Release with Chart (Tier 0, auto-post)

```
TRADEORA

📊 US unemployment duration hits 4-year high

Average duration jumped +2 weeks to 25.7 weeks
in February — fastest pace since 2020-2021

Impact:
DXY     📉 Bearish (74%)
XAUUSD  📈 Bullish (81%)
US30    📉 Bearish (67%)
SP500   📉 Bearish (65%)

Source: BLS

Full analysis → tradeora.com/DXY
━━━━━━━━━━━━━━━━
📊 tradeora.com | Free 14-day trial
```

Attached: auto-generated matplotlib chart with Tradeora watermark.

---

## Data Charts

### Data Sources (all free APIs)

| API | Data Available | Use For |
|-----|---------------|---------|
| FRED API (fred.stlouisfed.org) | Thousands of economic series: unemployment, CPI, GDP, yields, spreads, money supply | Most economic data charts |
| BLS API (bls.gov/developers) | NFP, PPI, employment detail | Labor market charts |
| EIA API (eia.gov/opendata) | Crude inventories, production, prices | Oil/energy charts |
| Yahoo Finance (yfinance) | ETF AUM/prices (GLD, SPY, USO), commodity prices, index prices | ETF and price charts |
| SPDR (spdrgoldshares.com) | GLD daily holdings | Gold ETF AUM |
| CFTC (cftc.gov) | Commitment of Traders positioning | Weekly positioning charts |
| ICI (ici.org) | Weekly fund flows | Fund flow charts |

### Notable Data Detection (rule-based triggers)

When new data arrives, compare against historical series:

| Trigger | Example |
|---------|---------|
| New all-time high or low | "Gold ETF AUM hits record $181B" |
| Multi-year high or low | "Unemployment duration at 4-year high" |
| Largest change in N months | "Biggest weekly crude draw since September" |
| Crosses round-number threshold | "CPI falls below 3% for first time since 2021" |
| Breaks a trend | "First positive NFP surprise in 4 months" |
| Exceeds consensus by wide margin | "GDP 3.2% vs 2.5% expected" |

### Chart Styling

- **Theme:** Dark background (#1a1a2e or similar), matching Telegram dark mode
- **Branding:** "TRADEORA" watermark, "tradeora.com" in footer
- **Highlight:** Latest data point in red box (like Kobeissi style)
- **Font:** Clean sans-serif (Inter or similar)
- **Dimensions:** 800x500px (optimal for Telegram)
- **Format:** PNG

---

## Approval Flow

### For Tier 1-3 Articles (sent to user's private Telegram chat)

```
📝 DRAFT — tap to approve

[Full formatted post preview]

Score: 72 | Source: Reuters (Tier 1)
Instruments: XAUUSD, USOIL

[✅ Approve]  [✏️ Edit]  [❌ Skip]
```

- **Approve** — posts to public channel immediately
- **Edit** — user types changes in reply, bot reformats and posts
- **Skip** — discarded from channel, stored in DB for morning batch
- **No response in 15 min** — auto-posts to channel

### Webhook Handling

Telegram button callbacks are handled by a Vercel API route (`/api/telegram/callback`). When user taps a button:
1. Vercel receives the callback
2. Validates the user (only the admin can approve)
3. Executes the action (post/edit/skip)
4. Updates the draft status in DB

### Auto-post Timeout

Each poller run (every 3 min) also checks for unapproved drafts older than 15 minutes. If found, auto-posts them to the channel and marks them as posted.

---

## Site Integration

### Live Feed

Instrument pages gain a "Live News" section showing articles as they arrive throughout the day, not just from the morning batch.

### Morning Batch (unchanged)

- Runs daily at 06:00 UTC via GitHub Actions
- Uses ALL articles from the past 24 hours (both posted-to-channel and DB-only)
- Generates Claude bias analysis for all 20 instruments
- Updates site with new biases
- Sends email digest to opted-in users

### Bias Tags in Telegram Posts

The instrument bias tags shown in Telegram posts (e.g., "XAUUSD Bullish 78%") come from the **most recent bias stored in the DB** (generated by the morning batch). They are NOT generated in real-time — no additional AI cost.

---

## Compute & Hosting

### Phase 1: Local Mac (development + testing)

Cron job running every 3 minutes:

```
*/3 * * * * cd /Users/a/Desktop/forex-analysis && /usr/bin/python3 -m scraper.poller >> /tmp/tradeora-poller.log 2>&1
```

- Survives reboots
- Requires Mac to stay awake (disable sleep or use `caffeinate`)
- Free

### Phase 2: VPS ($5/month, for 24/7 reliability)

Same cron setup on a Hetzner/DigitalOcean/Railway VPS. Runs 24/7 regardless of whether your Mac is on.

### Telegram Webhook

Handled by existing Vercel deployment — add a new API route `/api/telegram/callback` for button callbacks. No additional hosting cost.

---

## Files Changed / Created

### Modified

| File | Change |
|------|--------|
| `scraper/feeds.py` | Rewritten: 35 curated sources replacing 43 old feeds, organized by tier |
| `scraper/rss_scraper.py` | Enhanced: faster polling, og:image extraction, better HTML parsing |
| `scraper/categorizer.py` | Enhanced: relevance scoring, urgency detection, anti-noise patterns |
| `scraper/telegram_reporter.py` | Rewritten: channel posting, approval flow, draft management |
| `scraper/database.py` | Extended: draft status tracking, auto-post timeout queries |

### New

| File | Purpose |
|------|---------|
| `scraper/poller.py` | Main polling orchestrator — runs every 3 min via cron |
| `scraper/chart_generator.py` | Matplotlib chart generation with Tradeora branding |
| `scraper/data_monitor.py` | Fetches FRED/BLS/EIA data, detects notable values, triggers charts |
| `scraper/dedup.py` | Fuzzy headline matching, entity extraction, story clustering |
| `scraper/quality_filter.py` | Relevance scoring engine (rule-based, no AI) |
| `scraper/image_scraper.py` | Extracts og:image from article URLs for Telegram attachments |
| `src/app/api/telegram/callback/route.ts` | Vercel API route for Telegram button callbacks |

### Database Changes

New columns/tables needed:

```sql
-- Track draft status for approval flow
CREATE TABLE telegram_drafts (
    id SERIAL PRIMARY KEY,
    article_id INTEGER REFERENCES articles(id),
    formatted_message TEXT NOT NULL,
    image_url TEXT,
    chart_path TEXT,
    relevance_score INTEGER NOT NULL,
    source_tier INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',  -- pending, approved, skipped, auto_posted
    created_at TIMESTAMP DEFAULT NOW(),
    posted_at TIMESTAMP,
    telegram_message_id TEXT  -- ID of the draft message sent to admin
);

-- Track which articles have been posted to the channel
ALTER TABLE articles ADD COLUMN posted_to_channel BOOLEAN DEFAULT FALSE;
ALTER TABLE articles ADD COLUMN channel_posted_at TIMESTAMP;
```

---

## What Stays the Same

- Morning bias generation with Claude (daily, same schedule, same cost)
- Email digest system
- Web dashboard (enhanced with live feed section)
- Core database schema (articles, biases, instruments, etc.)
- Trading journal and playbooks
- Economic calendar
- User authentication and tiers
- Stripe payment processing

---

## Cost Summary

| Item | Current | After |
|------|---------|-------|
| AI (Claude/Gemini) | ~$X/day | Same (no change) |
| Vercel hosting | Free/hobby | Same |
| Neon Postgres | Free tier | Same |
| GitHub Actions | Free tier | Same (morning batch only) |
| RSS polling compute | 0 | 0 (local Mac) or $5/mo (VPS) |
| FRED/BLS/EIA APIs | 0 | 0 (all free) |
| X/Twitter API | 0 | 0 (not using) |
| **Total additional cost** | | **$0-5/month** |

---

## Success Criteria

1. Breaking news appears in Telegram channel within 3 minutes of source publication
2. Zero garbage articles posted (no opinion pieces, listicles, or delayed reporting)
3. Every post includes instrument bias tags with confidence percentages
4. Data release posts include auto-generated charts with Tradeora branding
5. Approval flow works on phone — single tap to approve, 15-min auto-post fallback
6. Morning batch uses all 24h articles for better bias generation
7. No increase in AI API costs
8. Channel acts as marketing funnel — every post links to tradeora.com
