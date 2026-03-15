# Tradeora Improvement Plan: Path from 5.8 to 8.2

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the remaining 10 features from the 22-item improvement roadmap that are not yet built, organized into 4 phases over 6 months.

**Architecture:** Next.js 16 App Router (frontend) + Python scraper pipeline (GitHub Actions) + Neon Postgres (database) + Anthropic/OpenAI/Gemini APIs (analysis). All new features extend existing patterns: API routes in `src/app/api/`, components in `src/components/`, scraper extensions in `scraper/`, migrations in `drizzle/`.

**Tech Stack:** Next.js 16, React 19, TypeScript, TailwindCSS 4, Neon Postgres, Drizzle migrations, Python 3 (scraper), Anthropic SDK, Stripe, NextAuth

---

## Current State Audit

**Already built (12 of 22 roadmap items):**

| # | Feature | Status |
|---|---------|--------|
| 1 | Performance track record page | DONE (`/track-record`, `bias_outcomes` table, `settle_outcomes.py`) |
| 4 | Trading journal with AI pattern detection | DONE (journal, insights, DNA profile) |
| 5 | Community sentiment aggregation | DONE (voting, leaderboard) |
| 6 | AI trading coach | DONE (chat, insights, DNA profile) |
| 7 | Economic calendar with AI impact | DONE (`economic_calendar.py`, `/calendar`) |
| 8 | Confidence scoring with calibration | DONE (confidence in biases, track record accuracy) |
| 9 | Cross-instrument correlation | DONE (in `analyzer.py` cross-instrument rules) |
| 13 | TradingView chart embed | DONE (`tradingview-widget.tsx`) |
| 19 | Trader DNA monthly report | DONE (`/api/ai/dna-profile`) |
| 20 | Limit free tier history to 7 days | PARTIAL (trades limited, analysis not limited) |
| 22 | Multi-model AI redundancy | DONE (`ai_provider.py` failover chain) |
| - | Stripe payments | DONE (checkout, webhooks, portal) |
| - | Telegram notifications | DONE (bot, reports) |
| - | Broker affiliate tracking | DONE (`/api/affiliate/click`) |

**Remaining to build (10 features):**

| # | Feature | Priority | Effort |
|---|---------|----------|--------|
| 12 | Expand to 20-25 instruments | Phase 1 | 5-7 days |
| 10 | Bias change alerts | Phase 1 | 3-4 days |
| 11 | PWA push notifications (complete) | Phase 1 | 3-5 days |
| 2 | SEO content flywheel | Phase 2 | 4-6 days |
| 3 | Historical archive with trend visualization | Phase 2 | 3-5 days |
| 14 | Email digest option | Phase 2 | 2-3 days |
| 21 | Backtesting module | Phase 3 | 7-10 days |
| 15 | API for personal use | Phase 4 | 2-3 days |
| 16 | B2B API for prop firms | Phase 4 | 5-7 days |
| 17 | Multi-language support | Phase 4 | 3-4 days |

---

## Chunk 1: Phase 1 — Foundation (Weeks 1-4)

### Task 1: Expand to 20-25 Instruments (#12)

Every missing instrument is a retention leak. Adds AUDUSD, USDCAD, NZDUSD, USDCHF, BTC, ETH, WTI (crude oil) — 7 new instruments bringing total to 20.

**Files:**
- Modify: `drizzle/0015_expand_instruments.sql` (new migration)
- Modify: `scraper/analyzer.py` (add instrument contexts + cross-instrument rules)
- Modify: `scraper/article_analyzer.py` (add new instruments to categorization)
- Modify: `scraper/fmp_quotes.py` (add FMP symbols for new instruments)
- Modify: `src/types/index.ts` (update Instrument type if hardcoded)
- Modify: `src/components/instrument-icon.tsx` (add SVG icons for new instruments)
- Modify: `src/lib/pnl-calc.ts` (add pip/tick calculations for new instruments)
- Modify: `src/lib/queries.ts` (verify queries work with dynamic instrument list)
- Test: `scraper/tests/test_new_instruments.py`

**Steps:**

- [ ] **Step 1: Write migration to seed new instruments**

```sql
-- drizzle/0015_expand_instruments.sql
INSERT INTO instruments (name, display_name, category) VALUES
  ('AUDUSD', 'AUD/USD', 'forex'),
  ('USDCAD', 'USD/CAD', 'forex'),
  ('NZDUSD', 'NZD/USD', 'forex'),
  ('USDCHF', 'USD/CHF', 'forex'),
  ('BTCUSD', 'BTC/USD', 'crypto'),
  ('ETHUSD', 'ETH/USD', 'crypto'),
  ('USOIL', 'WTI Crude Oil', 'commodity')
ON CONFLICT (name) DO NOTHING;
```

- [ ] **Step 2: Run migration against Neon database**

```bash
psql $DATABASE_URL -f drizzle/0015_expand_instruments.sql
```

- [ ] **Step 3: Add instrument contexts to `scraper/analyzer.py`**

Add entries to the `INSTRUMENT_CONTEXTS` dict for each new instrument with:
- Description of what drives the instrument
- Key economic indicators
- Correlation notes

Add cross-instrument rules:
- AUDUSD correlates with commodity prices and China data
- USDCAD inversely correlates with crude oil
- USDCHF is a safe-haven play (inverse to risk-on)
- BTC/ETH correlate with risk appetite and crypto-specific news
- WTI correlates with OPEC decisions, inventories, geopolitical risk

- [ ] **Step 4: Add new instruments to `scraper/article_analyzer.py`**

Add instrument names to the categorization prompt so articles get tagged for the new instruments.

- [ ] **Step 5: Add FMP ticker symbols for new instruments in `scraper/fmp_quotes.py`**

Map instrument names to FMP API symbols:
- AUDUSD → AUDUSD
- USDCAD → USDCAD
- NZDUSD → NZDUSD
- USDCHF → USDCHF
- BTCUSD → BTCUSD
- ETHUSD → ETHUSD
- USOIL → CLUSD (or CL=F depending on FMP)

- [ ] **Step 6: Add SVG icons for new instruments in `instrument-icon.tsx`**

Add icon cases for each new instrument (currency flags, BTC/ETH logos, oil barrel).

- [ ] **Step 7: Add P&L calculations for new instruments in `pnl-calc.ts`**

- AUDUSD, NZDUSD: standard 4-decimal forex (pip = 0.0001)
- USDCAD, USDCHF: standard 4-decimal forex (pip = 0.0001, but quote currency differs)
- BTCUSD: pip = 1.0 (whole dollar)
- ETHUSD: pip = 0.01
- USOIL: pip = 0.01, contract multiplier = 1000 barrels

- [ ] **Step 8: Add RSS feeds for crypto and oil news sources**

Update `scraper/rss_scraper.py` to include:
- CoinDesk, CoinTelegraph, The Block (crypto)
- OilPrice.com, EIA (oil/energy)

- [ ] **Step 9: Test the full pipeline with new instruments**

```bash
cd scraper && python -m pytest tests/ -v
python main.py --dry-run  # if supported, otherwise run full pipeline
```

- [ ] **Step 10: Commit**

```bash
git add drizzle/0015_expand_instruments.sql scraper/ src/
git commit -m "feat: expand to 20 instruments — add AUDUSD, USDCAD, NZDUSD, USDCHF, BTC, ETH, WTI"
```

---

### Task 2: Bias Change Alerts (#10)

Highlight when fundamental bias flips (e.g., XAUUSD went from bullish to bearish) with the specific articles that caused the shift. Deliver via in-app notification badge + Telegram.

**Files:**
- Create: `scraper/bias_alerts.py` (detect bias flips after new biases generated)
- Modify: `drizzle/0016_bias_alerts.sql` (new migration for alerts table)
- Modify: `scraper/main.py` (call bias_alerts after bias generation step)
- Modify: `scraper/telegram_reporter.py` (send flip alerts)
- Create: `src/app/api/alerts/route.ts` (GET recent alerts for user)
- Modify: `src/components/top-nav.tsx` (notification bell with unread count)
- Create: `src/components/alerts-dropdown.tsx` (dropdown showing recent bias flips)

**Steps:**

- [ ] **Step 1: Write migration for bias_alerts table**

```sql
-- drizzle/0016_bias_alerts.sql
CREATE TABLE IF NOT EXISTS bias_alerts (
  id SERIAL PRIMARY KEY,
  instrument TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  previous_direction TEXT NOT NULL,
  new_direction TEXT NOT NULL,
  key_articles JSONB DEFAULT '[]',
  confidence_change INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bias_alerts_created ON bias_alerts(created_at DESC);
CREATE INDEX idx_bias_alerts_instrument ON bias_alerts(instrument);
```

- [ ] **Step 2: Run migration**

- [ ] **Step 3: Create `scraper/bias_alerts.py`**

After new biases are generated in the pipeline:
1. For each instrument + timeframe, compare the new bias direction with the previous day's bias direction
2. If direction changed (e.g., bullish → bearish, or neutral → bullish), insert a row into `bias_alerts`
3. Include the top 3 supporting articles from the new bias as `key_articles`
4. Calculate confidence change (new confidence - old confidence)

- [ ] **Step 4: Integrate into `scraper/main.py`**

Call `detect_bias_changes(db)` after Step 5 (bias generation) but before Step 6 (outcome settlement).

- [ ] **Step 5: Add Telegram alert for bias flips**

Extend `telegram_reporter.py` to send a message when a bias flips:
```
⚠️ BIAS FLIP: XAUUSD 1-Week
Bullish → Bearish (Confidence: 72 → 65)
Key driver: Fed hawkish minutes released
```

- [ ] **Step 6: Create API route `src/app/api/alerts/route.ts`**

GET handler returning recent bias alerts (last 48 hours), sorted by created_at DESC. No auth required (public data).

- [ ] **Step 7: Build `alerts-dropdown.tsx` component**

Bell icon in top-nav that shows a dropdown of recent bias flips. Badge shows count of alerts in last 24 hours.

- [ ] **Step 8: Update `top-nav.tsx` to include alerts dropdown**

- [ ] **Step 9: Test end-to-end**

- [ ] **Step 10: Commit**

```bash
git commit -m "feat: add bias change alerts with in-app notification and Telegram delivery"
```

---

### Task 3: PWA Push Notifications (#11)

Complete the PWA implementation. `pwa-install-prompt.tsx` exists but there's no service worker or push notification setup.

**Files:**
- Create: `public/sw.js` (service worker)
- Create: `public/manifest.json` (PWA manifest — may already exist, check first)
- Modify: `src/components/pwa-register.tsx` (register service worker + request push permission)
- Create: `src/app/api/push/subscribe/route.ts` (store push subscriptions)
- Create: `src/app/api/push/send/route.ts` (internal endpoint for sending pushes)
- Modify: `drizzle/0017_push_subscriptions.sql` (store push endpoints)
- Modify: `scraper/main.py` (trigger push notification after daily analysis completes)

**Steps:**

- [ ] **Step 1: Write migration for push_subscriptions table**

```sql
-- drizzle/0017_push_subscriptions.sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);
```

- [ ] **Step 2: Create `public/manifest.json`**

Standard PWA manifest with app name "Tradeora", theme colors matching the institutional palette, icons.

- [ ] **Step 3: Create `public/sw.js` service worker**

Handle push events — display notification with bias summary. Handle notification click — open the dashboard.

- [ ] **Step 4: Update `pwa-register.tsx`**

Register the service worker on mount. Add a function to request push notification permission and subscribe.

- [ ] **Step 5: Create `/api/push/subscribe` endpoint**

POST handler: receives push subscription object from browser, stores in `push_subscriptions` table linked to authenticated user.

- [ ] **Step 6: Create `/api/push/send` endpoint**

Internal POST handler (protected by API key): sends push notification to all subscribed users using `web-push` library. Install `web-push` package.

- [ ] **Step 7: Generate VAPID keys**

```bash
npx web-push generate-vapid-keys
```
Add to `.env.local`: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.

- [ ] **Step 8: Trigger push after daily pipeline completes**

Add a final step to `scraper/main.py` that calls the `/api/push/send` endpoint with a summary of today's key bias changes.

- [ ] **Step 9: Add push notification opt-in toggle to settings page**

- [ ] **Step 10: Test on mobile (add to home screen, receive push)**

- [ ] **Step 11: Commit**

```bash
git commit -m "feat: complete PWA with service worker and push notifications for daily analysis"
```

---

### Task 4: Limit Free Tier Analysis History to 7 Days (#20)

Free tier currently shows all historical analysis. Gate anything older than 7 days behind free account signup (captures email) and show full history only for Essential+ tiers.

**Files:**
- Modify: `src/lib/queries.ts` (add date filter to bias queries based on user tier)
- Modify: `src/app/(dashboard)/[instrument]/page.tsx` (pass user tier to queries)
- Modify: `src/app/api/instrument-detail/route.ts` (filter biases by tier)
- Modify: `src/components/dashboard.tsx` (show upgrade prompt for gated content)

**Steps:**

- [ ] **Step 1: Update `instrument-detail` API to filter by tier**

If user is on free tier, only return biases from last 7 days. Essential and Premium get full history.

- [ ] **Step 2: Add "Unlock full history" CTA on instrument pages**

When free user scrolls past 7-day boundary, show a card: "Want to see how bias evolved over the past month? Upgrade to Essential."

- [ ] **Step 3: Test that free users see only 7 days, paid users see all**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: limit free tier analysis history to 7 days with upgrade CTA"
```

---

## Chunk 2: Phase 2 — Moat Building (Months 2-3)

### Task 5: SEO Content Flywheel (#2)

Auto-generate weekly analysis pages per instrument. 20 instruments x 52 weeks = 1,040 indexed pages/year. High-intent search traffic that compounds.

**Files:**
- Create: `src/app/analysis/[instrument]/[week]/page.tsx` (public SSG page)
- Create: `src/app/analysis/[instrument]/page.tsx` (instrument archive listing)
- Create: `src/app/analysis/page.tsx` (all-instruments landing)
- Create: `src/lib/seo-queries.ts` (queries for weekly analysis aggregation)
- Create: `scraper/weekly_seo_pages.py` (generate weekly summaries)
- Modify: `drizzle/0018_weekly_summaries.sql` (store weekly summaries)
- Create: `src/app/sitemap.ts` (dynamic sitemap for SEO)

**Steps:**

- [ ] **Step 1: Write migration for weekly_summaries table**

```sql
-- drizzle/0018_weekly_summaries.sql
CREATE TABLE IF NOT EXISTS weekly_summaries (
  id SERIAL PRIMARY KEY,
  instrument TEXT NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  summary TEXT NOT NULL,
  key_themes JSONB DEFAULT '[]',
  bias_trajectory JSONB DEFAULT '{}',
  article_count INTEGER DEFAULT 0,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(instrument, week_start)
);
```

- [ ] **Step 2: Create `scraper/weekly_seo_pages.py`**

Runs weekly (add to GitHub Actions as a separate cron: Sunday at midnight UTC):
1. For each instrument, aggregate all biases from the past week
2. Use Claude to generate a 500-800 word SEO-optimized summary
3. Include: bias trajectory (how it shifted during the week), key themes, notable articles
4. Store in `weekly_summaries` table

- [ ] **Step 3: Add weekly cron job to GitHub Actions**

Add a new workflow or schedule entry for `weekly_seo_pages.py` running every Sunday.

- [ ] **Step 4: Create public pages at `/analysis/[instrument]/[week]`**

SSG page using `generateStaticParams`. Shows:
- H1: "EURUSD Fundamental Analysis — Week of March 15, 2026"
- Bias trajectory chart (how bias shifted Mon-Fri)
- Key themes
- Summary narrative
- Links to related articles
- CTA: "Get daily analysis free — sign up"

- [ ] **Step 5: Create instrument archive at `/analysis/[instrument]`**

Lists all weekly analyses for an instrument, newest first. Paginated.

- [ ] **Step 6: Create landing page at `/analysis`**

Grid of all instruments with latest week's bias direction. SEO-optimized as the main entry point.

- [ ] **Step 7: Create dynamic sitemap at `/sitemap.ts`**

Generate sitemap.xml including all weekly analysis pages for Google indexing.

- [ ] **Step 8: Add structured data (JSON-LD) to weekly pages**

Article schema markup for rich search results.

- [ ] **Step 9: Add internal linking from dashboard to SEO pages and vice versa**

- [ ] **Step 10: Test that pages render correctly, are accessible without login, and pass Lighthouse SEO audit**

- [ ] **Step 11: Commit**

```bash
git commit -m "feat: add SEO content flywheel with auto-generated weekly analysis pages"
```

---

### Task 6: Historical Analysis Archive with Trend Visualization (#3)

Show how fundamental bias has shifted over weeks/months with timeline charts. Creates a unique dataset that accumulates daily.

**Files:**
- Create: `src/app/(dashboard)/history/page.tsx` (historical trends page)
- Create: `src/app/api/history/route.ts` (bias history data endpoint)
- Create: `src/components/bias-timeline-chart.tsx` (line chart of bias over time)
- Modify: `src/lib/queries.ts` (add historical bias queries)

**Steps:**

- [ ] **Step 1: Create API route `/api/history`**

GET handler accepting `instrument` and `timeframe` query params. Returns bias records over time:
```json
[
  { "date": "2026-03-01", "direction": "bullish", "confidence": 72 },
  { "date": "2026-03-02", "direction": "bullish", "confidence": 68 },
  ...
]
```
Default to last 90 days. Essential+ gets full history.

- [ ] **Step 2: Create `bias-timeline-chart.tsx`**

Use a lightweight charting library (recharts is already commonly used with React, or use the existing Motion library for custom animations). Show:
- X-axis: dates
- Y-axis: confidence score (0-100)
- Color-coded by direction (green = bullish, red = bearish, gray = neutral)
- Hover tooltip with date, direction, confidence, key driver

- [ ] **Step 3: Create `/history` page**

Instrument selector dropdown + timeframe tabs. Shows the timeline chart and a table of historical biases below it.

- [ ] **Step 4: Add "View History" link from instrument detail pages**

- [ ] **Step 5: Test with existing historical data**

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: add historical analysis archive with bias timeline visualization"
```

---

### Task 7: Email Digest Option (#14)

Daily morning email with bias summary for all instruments. Captures the "passive consumer" segment.

**Files:**
- Modify: `drizzle/0019_email_preferences.sql` (email opt-in preferences)
- Create: `scraper/email_digest.py` (generate and send daily email)
- Create: `src/app/api/email/preferences/route.ts` (manage email preferences)
- Modify: `src/app/(dashboard)/settings/page.tsx` (email digest toggle)

**Steps:**

- [ ] **Step 1: Write migration for email preferences**

```sql
-- drizzle/0019_email_preferences.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_digest_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_digest_time TEXT DEFAULT '07:00';
```

- [ ] **Step 2: Create `scraper/email_digest.py`**

After daily pipeline completes:
1. Query all users with `email_digest_enabled = true`
2. Generate HTML email with:
   - Summary table: all instruments with direction + confidence for 1-week timeframe
   - Highlight any bias flips from yesterday
   - Top 3 most impactful articles
   - CTA: "View full analysis on Tradeora"
3. Send via Resend API (or similar transactional email service — affordable, simple)

- [ ] **Step 3: Add Resend SDK and configure**

```bash
pip install resend  # Python
# or npm install resend  # if sending from Next.js API route instead
```
Add `RESEND_API_KEY` to environment variables.

- [ ] **Step 4: Create `/api/email/preferences` endpoint**

GET: return current preference. PATCH: toggle email digest on/off.

- [ ] **Step 5: Add email digest toggle to settings page**

Switch component: "Daily email digest" with time picker (default 7:00 AM UTC).

- [ ] **Step 6: Add email digest step to `scraper/main.py`**

Call `send_email_digests(db)` as a final pipeline step.

- [ ] **Step 7: Test email rendering and delivery**

- [ ] **Step 8: Commit**

```bash
git commit -m "feat: add daily email digest with bias summary for all instruments"
```

---

## Chunk 3: Phase 3 — Differentiation (Months 3-4)

### Task 8: Backtesting Module (#21)

"If you had followed the 1W bullish bias for XAUUSD over the past 6 months, here's what would have happened." Transforms abstract bias into concrete dollar value. Massive conversion driver.

**Files:**
- Create: `src/app/(dashboard)/backtest/page.tsx` (backtesting UI)
- Create: `src/app/api/backtest/route.ts` (run backtest simulation)
- Create: `src/lib/backtest-engine.ts` (core backtesting logic)
- Create: `src/components/backtest-results.tsx` (results display with charts)
- Create: `src/components/backtest-form.tsx` (parameter input form)

**Steps:**

- [ ] **Step 1: Design backtest engine logic**

The backtesting engine answers: "If you traded in the direction of the bias every time it was [bullish/bearish] with confidence >= X, what would your P&L have been?"

Parameters:
- Instrument (e.g., EURUSD)
- Timeframe (1-week, 1-month)
- Date range (e.g., last 6 months)
- Minimum confidence threshold (e.g., 60)
- Position size (e.g., 1 lot)
- Strategy: "Enter at bias generation, exit at next bias generation"

Output:
- Total trades taken
- Win rate
- Total pips gained/lost
- Max drawdown
- Sharpe-like ratio
- Equity curve data points
- Individual trade log

- [ ] **Step 2: Create `src/lib/backtest-engine.ts`**

Core logic:
1. Query `bias_outcomes` for the instrument + timeframe + date range
2. Filter by minimum confidence
3. For each bias where direction is not neutral:
   - Entry price = `open_price` from bias_outcomes
   - Exit price = `close_price` from bias_outcomes
   - Direction = bias direction
   - Calculate P&L using `pnl-calc.ts` functions
4. Aggregate results

- [ ] **Step 3: Create `/api/backtest` POST endpoint**

Accepts parameters, runs backtest engine, returns results. Gate behind Essential+ tier (Premium-only for advanced parameters).

- [ ] **Step 4: Create `backtest-form.tsx`**

Form with:
- Instrument dropdown
- Timeframe selector (1-week, 1-month)
- Date range picker (default: last 6 months)
- Confidence threshold slider (40-100, default 60)
- Position size input
- "Run Backtest" button

- [ ] **Step 5: Create `backtest-results.tsx`**

Display:
- Summary stats cards (win rate, total pips, max drawdown)
- Equity curve chart (line chart of cumulative P&L over time)
- Trade log table (date, direction, entry, exit, pips, result)
- Comparison: "vs random" baseline

- [ ] **Step 6: Create `/backtest` page**

Combines form and results. Show a sample backtest for EURUSD 1-week on first load to demonstrate value.

- [ ] **Step 7: Add "Backtest this bias" shortcut on instrument detail pages**

Link from the instrument page directly to backtesting with that instrument pre-selected.

- [ ] **Step 8: Test with real historical data**

Verify calculations match manual spot-checks against known bias_outcomes.

- [ ] **Step 9: Commit**

```bash
git commit -m "feat: add backtesting module — simulate trading on historical bias predictions"
```

---

## Chunk 4: Phase 4 — Scale (Months 5-6)

### Task 9: Public API for Personal Use (#15)

JSON endpoint for power users to pull bias data into their own tools (Excel, Notion, custom dashboards). Deepens lock-in.

**Files:**
- Create: `drizzle/0020_api_keys.sql` (API key storage)
- Create: `src/app/api/v1/biases/route.ts` (public API endpoint)
- Create: `src/app/api/v1/instruments/route.ts` (list instruments)
- Create: `src/app/api/v1/track-record/route.ts` (accuracy data)
- Create: `src/lib/api-keys.ts` (key generation, validation, rate limiting)
- Modify: `src/app/(dashboard)/settings/page.tsx` (API key management UI)
- Create: `src/app/api/v1/keys/route.ts` (generate/revoke API keys)

**Steps:**

- [ ] **Step 1: Write migration for api_keys table**

```sql
-- drizzle/0020_api_keys.sql
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  name TEXT DEFAULT 'Default',
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
```

- [ ] **Step 2: Create `src/lib/api-keys.ts`**

- `generateApiKey()`: Generate a random key (`tradeora_sk_...`), return plaintext + store bcrypt hash
- `validateApiKey(key)`: Hash the provided key and look up in DB
- Rate limiting: 100 requests/hour per key (use in-memory counter or Redis if available)

- [ ] **Step 3: Create API key management endpoint `/api/v1/keys`**

POST: Generate new key (return plaintext once). DELETE: Revoke key. Requires session auth.

- [ ] **Step 4: Create `/api/v1/biases` endpoint**

```
GET /api/v1/biases?instrument=EURUSD&timeframe=1w
Authorization: Bearer tradeora_sk_...

Response:
{
  "instrument": "EURUSD",
  "timeframe": "1w",
  "direction": "bullish",
  "confidence": 72,
  "summary": "...",
  "key_drivers": [...],
  "generated_at": "2026-03-15T06:00:00Z"
}
```

- [ ] **Step 5: Create `/api/v1/instruments` endpoint**

Returns list of all instruments with latest bias direction and confidence.

- [ ] **Step 6: Create `/api/v1/track-record` endpoint**

Returns accuracy stats by instrument and timeframe.

- [ ] **Step 7: Add API key management to settings page**

Section: "API Access" with:
- Generate new key button (shows key once, then only prefix)
- List of active keys with last-used date
- Revoke button per key
- Gate behind Premium tier

- [ ] **Step 8: Test API with curl**

```bash
curl -H "Authorization: Bearer tradeora_sk_..." https://tradeora.com/api/v1/biases?instrument=EURUSD
```

- [ ] **Step 9: Commit**

```bash
git commit -m "feat: add public API v1 with key auth for personal use"
```

---

### Task 10: B2B API for Prop Firms (#16)

White-label fundamental analysis feed for funded trader programs (FTMO, MyFundedFX). Recurring B2B revenue at $500-2K/month per integration.

**Files:**
- Create: `drizzle/0021_b2b_clients.sql` (B2B client accounts)
- Create: `src/app/api/v1/b2b/feed/route.ts` (bulk bias feed endpoint)
- Create: `src/app/api/v1/b2b/webhook/route.ts` (webhook for bias updates)
- Create: `src/lib/b2b-auth.ts` (B2B client authentication)

**Steps:**

- [ ] **Step 1: Write migration for b2b_clients table**

```sql
-- drizzle/0021_b2b_clients.sql
CREATE TABLE IF NOT EXISTS b2b_clients (
  id SERIAL PRIMARY KEY,
  company_name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  api_key_prefix TEXT NOT NULL,
  webhook_url TEXT,
  instruments JSONB DEFAULT '[]',
  rate_limit INTEGER DEFAULT 1000,
  monthly_fee_cents INTEGER DEFAULT 50000,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] **Step 2: Create `/api/v1/b2b/feed` endpoint**

Returns all biases for all instruments in a single call. Supports filtering by instrument list. Higher rate limits than personal API.

```json
{
  "generated_at": "2026-03-15T06:00:00Z",
  "biases": [
    {
      "instrument": "EURUSD",
      "timeframes": {
        "daily": { "direction": "bullish", "confidence": 65, "summary": "..." },
        "1w": { "direction": "bullish", "confidence": 72, "summary": "..." },
        "1m": { "direction": "neutral", "confidence": 45, "summary": "..." },
        "3m": { "direction": "bearish", "confidence": 58, "summary": "..." }
      }
    },
    ...
  ]
}
```

- [ ] **Step 3: Create webhook delivery system**

When new biases are generated, POST the full feed to each B2B client's `webhook_url`. Add to `scraper/main.py` as a post-bias-generation step.

- [ ] **Step 4: Create B2B auth middleware**

Separate from personal API auth. B2B keys have `tradeora_b2b_` prefix.

- [ ] **Step 5: Test with mock B2B client**

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: add B2B API with bulk feed and webhook delivery for prop firms"
```

---

### Task 11: Multi-Language Support (#17)

Start with Spanish. Auto-translate analysis pages using Claude.

**Files:**
- Modify: `scraper/analyzer.py` (generate Spanish translations of bias summaries)
- Modify: `drizzle/0022_translations.sql` (store translated content)
- Create: `src/app/[locale]/(dashboard)/page.tsx` (locale-aware routing)
- Create: `src/lib/i18n.ts` (translation utilities)
- Modify: `src/components/top-nav.tsx` (language switcher)

**Steps:**

- [ ] **Step 1: Write migration for translations table**

```sql
-- drizzle/0022_translations.sql
CREATE TABLE IF NOT EXISTS bias_translations (
  id SERIAL PRIMARY KEY,
  bias_id INTEGER REFERENCES biases(id) ON DELETE CASCADE,
  locale TEXT NOT NULL DEFAULT 'es',
  summary TEXT NOT NULL,
  key_drivers JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bias_id, locale)
);
```

- [ ] **Step 2: Add translation step to scraper pipeline**

After bias generation, for each bias:
1. Send the English summary + key drivers to Claude with instruction: "Translate to Spanish. Maintain financial terminology accuracy."
2. Store in `bias_translations`

- [ ] **Step 3: Create `src/lib/i18n.ts`**

Simple locale detection (URL prefix `/es/` or browser Accept-Language header). UI string translations for static content (buttons, labels, navigation).

- [ ] **Step 4: Create locale-aware routing**

Use Next.js middleware to detect locale from URL prefix. `/es/` routes to Spanish content, default is English.

- [ ] **Step 5: Add language switcher to top-nav**

Globe icon dropdown: English, Español.

- [ ] **Step 6: Update SEO pages to generate Spanish versions too**

Each weekly analysis page gets a Spanish counterpart at `/es/analysis/[instrument]/[week]`.

- [ ] **Step 7: Test Spanish rendering and SEO**

- [ ] **Step 8: Commit**

```bash
git commit -m "feat: add Spanish language support with auto-translated analysis"
```

---

## Dependencies Between Tasks

```
Task 1 (Instruments) ← No dependencies, start first
Task 2 (Alerts) ← Depends on existing biases pipeline
Task 3 (PWA Push) ← No dependencies
Task 4 (Free Tier Limit) ← No dependencies

Task 5 (SEO) ← Benefits from Task 1 (more instruments = more pages)
Task 6 (History) ← No dependencies
Task 7 (Email) ← Benefits from Task 2 (include alerts in digest)

Task 8 (Backtest) ← Requires bias_outcomes data (already exists)

Task 9 (Personal API) ← No dependencies
Task 10 (B2B API) ← Builds on Task 9 patterns
Task 11 (Multi-language) ← Benefits from Task 5 (translate SEO pages too)
```

## Parallelization

**Phase 1:** Tasks 1, 2, 3, 4 can all run in parallel (independent subsystems).
**Phase 2:** Tasks 5, 6, 7 can run in parallel.
**Phase 3:** Task 8 is standalone.
**Phase 4:** Task 9 before Task 10 (shared patterns). Task 11 independent.

---

## Projected Impact

After all phases complete:

| Dimension | Current | Target |
|-----------|---------|--------|
| Market Size | 6 | 8 (20 instruments + crypto audience) |
| Growth Potential | 7 | 9 (SEO flywheel + B2B + multi-language) |
| Unit Economics | 9 | 9 (unchanged, still excellent) |
| Time to Profit | 7 | 8 |
| Monetization Clarity | 5 | 8 (tested pricing + affiliate + B2B revenue) |
| Defensibility (Moat) | 3 | 8 (SEO + history + journal + track record) |
| Differentiation | 7 | 9 (backtesting + alerts + API) |
| Willingness to Pay | 4 | 8 (premium features justify price) |
| Execution Risk (10=low) | 3 | 7 (mobile + email + API cover gaps) |
| Founder-Market Fit | 7 | 8 |
| **Overall** | **5.8** | **8.2** |
