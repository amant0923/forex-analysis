# Trading Journal + AI Trade Analyst — Design Spec

## Overview

Add a full trading journal with AI-powered trade analysis to the existing ForexPulse platform. Users log forex/CFD trades manually, define strategy playbooks, and receive AI feedback that integrates with ForexPulse's existing bias data and economic calendar. Three subscription tiers gate feature access.

## Instruments

Forex/CFD only, matching existing ForexPulse instruments: DXY, EURUSD, GBPUSD, GER40, US30, NAS100, SP500.

Note: DXY is included for analysis/tracking purposes. Most brokers don't offer DXY as a tradable product directly — users tracking DXY trades are likely trading USDX futures or an ETF proxy. The trade entry form includes it but with a note that it's for tracking purposes.

## P&L Units

- Forex (EURUSD, GBPUSD): pips + dollar amount
- CFD indices (DXY, GER40, US30, NAS100, SP500): ticks + dollar amount
- Dollar P&L calculated from lot size x price movement against user's account size

---

## Data Model

All `instrument` foreign keys are TEXT references to `instruments.code` (not numeric IDs), matching the existing schema.

The existing codebase uses raw SQL with `@neondatabase/serverless` tagged template literals — no ORM. New tables follow this pattern. Migrations go in the `drizzle/` folder as sequential SQL files.

### Existing Users Table (for reference)

```sql
users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT NOT NULL,
  tier TEXT DEFAULT 'free',  -- extend to: 'free' | 'essential' | 'premium'
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

### New Tables

**trading_accounts**
- id SERIAL PRIMARY KEY
- user_id INT NOT NULL (FK users.id ON DELETE CASCADE)
- name TEXT NOT NULL (e.g. "Main MT5", "Funded Account")
- broker TEXT
- account_size DECIMAL(18, 2) NOT NULL
- currency TEXT DEFAULT 'USD'
- leverage INT (e.g. 100 for 1:100)
- created_at TIMESTAMPTZ DEFAULT NOW()
- updated_at TIMESTAMPTZ DEFAULT NOW()

**playbooks**
- id SERIAL PRIMARY KEY
- user_id INT NOT NULL (FK users.id ON DELETE CASCADE)
- name TEXT NOT NULL
- description TEXT
- instrument TEXT (FK instruments.code ON DELETE SET NULL) — nullable, a playbook can apply to multiple instruments
- timeframe TEXT (nullable — e.g. "H1", or null if multi-timeframe)
- created_at TIMESTAMPTZ DEFAULT NOW()
- updated_at TIMESTAMPTZ DEFAULT NOW()

**playbook_rules**
- id SERIAL PRIMARY KEY
- playbook_id INT NOT NULL (FK playbooks.id ON DELETE CASCADE)
- category TEXT NOT NULL (entry | exit | risk)
- rule_text TEXT NOT NULL
- sort_order INT DEFAULT 0

**trades**
- id SERIAL PRIMARY KEY
- user_id INT NOT NULL (FK users.id ON DELETE CASCADE)
- account_id INT NOT NULL (FK trading_accounts.id ON DELETE RESTRICT)
- playbook_id INT (FK playbooks.id ON DELETE SET NULL) — nullable, free tier has no playbooks
- instrument TEXT NOT NULL (FK instruments.code)
- direction TEXT NOT NULL (buy | sell)
- entry_price DECIMAL(18, 6) NOT NULL
- exit_price DECIMAL(18, 6)
- stop_loss DECIMAL(18, 6)
- take_profit DECIMAL(18, 6)
- lot_size DECIMAL(10, 4) NOT NULL
- opened_at TIMESTAMPTZ NOT NULL
- closed_at TIMESTAMPTZ
- pnl_pips DECIMAL(10, 2) — forex only, null for CFDs
- pnl_ticks DECIMAL(10, 2) — CFD only, null for forex
- pnl_dollars DECIMAL(18, 2)
- rr_ratio DECIMAL(6, 2) — auto-calculated, recalculated on trade edit
- account_pct_impact DECIMAL(8, 4) — auto-calculated, recalculated on trade edit
- session TEXT — nullable (london | new_york | asia | overlap)
- timeframe_traded TEXT (M1 | M5 | M15 | H1 | H4 | D1)
- emotion_before TEXT (confident | calm | anxious | FOMO | revenge | uncertain)
- emotion_after TEXT (satisfied | frustrated | relieved | regretful | neutral)
- rule_adherence_score INT — 0-100, null when no playbook attached
- rule_adherence_details JSONB — null when no playbook attached
- notes TEXT
- created_at TIMESTAMPTZ DEFAULT NOW()
- updated_at TIMESTAMPTZ DEFAULT NOW()
- CHECK: pnl_pips IS NULL OR pnl_ticks IS NULL (mutual exclusivity)

**trade_screenshots**
- id SERIAL PRIMARY KEY
- trade_id INT NOT NULL (FK trades.id ON DELETE CASCADE)
- url TEXT NOT NULL
- label TEXT (entry | exit | setup | other)
- uploaded_at TIMESTAMPTZ DEFAULT NOW()

**trade_ai_reviews**
- id SERIAL PRIMARY KEY
- trade_id INT NOT NULL (FK trades.id ON DELETE CASCADE, UNIQUE)
- verdict TEXT (good | acceptable | poor)
- bias_alignment TEXT (with | against | neutral)
- bias_alignment_explanation TEXT
- rule_adherence_review TEXT
- risk_assessment TEXT
- timing_analysis TEXT
- psychology_flag TEXT
- suggestions JSONB — array of strings
- bias_snapshot JSONB — ForexPulse bias data at time of trade
- events_snapshot JSONB — economic events during trade window
- generated_at TIMESTAMPTZ DEFAULT NOW()

Note: One review per trade. Re-analyzing overwrites the existing review (UPDATE). This is intentional — the review reflects the current state of the trade data.

**chat_messages**
- id SERIAL PRIMARY KEY
- user_id INT NOT NULL (FK users.id ON DELETE CASCADE)
- role TEXT NOT NULL (user | assistant)
- content TEXT NOT NULL
- created_at TIMESTAMPTZ DEFAULT NOW()

**chat_summaries** (for context windowing)
- id SERIAL PRIMARY KEY
- user_id INT NOT NULL (FK users.id ON DELETE CASCADE)
- summary TEXT NOT NULL
- messages_covered_up_to INT NOT NULL (last chat_messages.id included)
- generated_at TIMESTAMPTZ DEFAULT NOW()

### Indexes

```sql
CREATE INDEX idx_trades_user_opened ON trades(user_id, opened_at DESC);
CREATE INDEX idx_trades_user_instrument ON trades(user_id, instrument);
CREATE INDEX idx_trades_user_playbook ON trades(user_id, playbook_id);
CREATE INDEX idx_trades_user_closed ON trades(user_id, closed_at DESC);
CREATE INDEX idx_trade_screenshots_trade ON trade_screenshots(trade_id);
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id, created_at DESC);
CREATE INDEX idx_trading_accounts_user ON trading_accounts(user_id);
CREATE INDEX idx_playbooks_user ON playbooks(user_id);
CREATE INDEX idx_playbook_rules_playbook ON playbook_rules(playbook_id, sort_order);
```

### Cascade Behavior Summary

| Parent deleted | Child table | Behavior |
|---|---|---|
| users | trading_accounts, playbooks, trades, chat_messages | CASCADE |
| trades | trade_screenshots, trade_ai_reviews | CASCADE |
| playbooks | playbook_rules | CASCADE |
| playbooks | trades.playbook_id | SET NULL |
| trading_accounts | trades.account_id | RESTRICT (must reassign first) |

---

## Auth & Session Changes

The existing NextAuth v4 setup (`src/lib/auth.ts`) returns `{ id, email, name }` in the JWT. Extend it to include `tier`:

- Add `tier` to the JWT callback and session callback in `authOptions`
- Extend NextAuth types to include `tier` on the session user object
- API routes extract `user_id` and `tier` via `getServerSession(authOptions)`
- All new API routes are user-scoped (filter by `user_id`)
- Tier-gated features checked at the API route level before processing

### Tier Enforcement Middleware

Create a shared `checkTierLimits()` utility used by API routes:
- Counts today's trades for daily logging limits
- Counts today's AI analyses for daily analysis limits
- Checks playbook count against tier max
- Checks account count against tier max
- Checks screenshot count per trade against tier max
- Returns 403 with clear error message when limit exceeded

---

## Pages & Routes

All new pages go under `src/app/(dashboard)/` to inherit the existing dashboard layout and auth protection.

### New Pages

1. **`/journal`** — Trade log table (sortable, filterable by instrument/date/playbook/outcome). Quick stats bar: win rate, avg R:R, P&L today/week/month. "Add Trade" button.

2. **`/journal/add`** — Trade entry form:
   - Account selector
   - Instrument selector (7 instruments)
   - Direction (buy/sell)
   - Entry/exit price, SL, TP, lot size
   - Open/close timestamps
   - Playbook selector (hidden for free tier, pulls rule checklist for adherence tracking)
   - Session tag (optional), timeframe traded
   - Emotion tags (before + after)
   - Notes, screenshot upload
   - Auto-calculates: pips/ticks, dollar P&L, R:R, account % impact

3. **`/journal/[id]`** — Trade detail view. All trade data, screenshots, AI review panel. "Analyze this trade" button (1/day free, 10/day essential, unlimited premium). Shows ForexPulse bias at time of trade.

4. **`/playbooks`** — List playbooks with per-playbook stats (win rate, avg P&L, trade count).

5. **`/playbooks/add`** and **`/playbooks/[id]`** — Create/edit playbook: name, description, instrument, timeframe, entry/exit/risk rule checklists.

6. **`/journal/chat`** — AI chat assistant (premium only). Conversational interface for querying trade history.

7. **`/journal/accounts`** — Manage trading accounts (add/edit account name, broker, size, leverage).

8. **`/journal/reports`** — Weekly/monthly AI reports (essential: basic weekly stats; premium: AI-powered weekly + monthly with pattern detection).

### New API Routes

- `GET/POST /api/trades` — list + create trades
- `GET/PUT/DELETE /api/trades/[id]` — read, update, delete trade
- `GET/POST /api/playbooks` — list + create playbooks
- `GET/PUT/DELETE /api/playbooks/[id]` — read, update, delete playbook
- `GET/POST /api/accounts` — list + create trading accounts
- `GET/PUT/DELETE /api/accounts/[id]` — read, update, delete account
- `POST /api/uploads` — screenshot upload (Vercel Blob, max 2MB, JPEG/PNG/WebP)
- `POST /api/ai/analyze-trade` — single trade AI review
- `POST /api/ai/chat` — chat message (premium)
- `GET /api/ai/report` — generate weekly/monthly report on-demand
- `GET /api/trades/export` — CSV export (essential + premium)

### Screenshot Upload

- Endpoint: `POST /api/uploads` returns a Vercel Blob URL
- Max file size: 2MB per image
- Accepted formats: JPEG, PNG, WebP
- Images compressed on upload (client-side before sending)
- Screenshots linked to a trade via `trade_screenshots` after trade creation
- When a trade is deleted, screenshots are cascade-deleted from DB; a cleanup job removes orphaned blobs from Vercel Blob periodically

---

## AI Assistant Design

### Single Trade Analysis

**Input to Claude (Sonnet):**
- Full trade data (entry/exit, P&L, timing, emotions, rule adherence)
- Linked playbook rules (if any)
- ForexPulse bias for that instrument on that day (daily + 1W + 1M)
- Economic events that occurred during the trade window

Free tier: trade data only (no bias context, no playbook rules).
Essential tier: trade data + bias context (no full history).
Premium tier: trade data + bias context + recent trade history for pattern context.

**Output (structured review):**
- **Verdict:** Good trade / Acceptable / Poor trade
- **Bias alignment:** Trading with or against the fundamental bias
- **Rule adherence:** Which playbook rules followed/broken
- **Risk assessment:** Position size appropriate for account? SL reasonable?
- **Timing:** Economic event impact? Session optimal?
- **Psychology flag:** Calls out revenge/FOMO if emotion tags suggest it
- **Suggestions:** 1-3 specific actionable improvements

### Chat Assistant (Premium)

Full conversational AI with access to:
- Entire trade history
- All playbook definitions
- ForexPulse bias history
- Economic calendar data
- Account/risk data

Example queries: "What's my win rate on breakout trades during London session?", "Why do I keep losing on GER40?", "Am I following my risk rules?"

Context management: last ~50 messages in full. Older history summarized into `chat_summaries` table — summary regenerated every 50 messages. Summary + recent messages stay within Sonnet's context window.

### Pattern Detection Reports (Premium)

Generated on-demand via `/api/ai/report`. User selects time range (this week, this month, custom).

Reports identify:
- Best/worst setups and sessions
- Emotional trading patterns
- Bias alignment correlation with win rate
- Drawdown analysis
- Streak analysis
- Rule adherence trends

Essential tier weekly reports are non-AI: computed stats only (win rate, P&L, avg R:R, best/worst day).

### Cost Control

All AI calls use Claude Sonnet (not Opus). Chat context windowed with summaries. Single trade analysis = single API call. Reports batch multiple trades into one call.

`@anthropic-ai/sdk` must be added to package.json as a new dependency.

---

## Subscription Tiers

| Feature | Free | Essential (~$19/mo) | Premium (~$39/mo) |
|---|---|---|---|
| Manual trade logging | 5/day | 5/day | Unlimited |
| Playbooks | 0 | 5 | Unlimited |
| Screenshots per trade | 1 | 3 | 10 |
| Trading accounts | 1 | 3 | Unlimited |
| AI trade analysis | 1/day (single trade, no context) | 10/day (with bias context) | Unlimited (full history + bias) |
| AI chat assistant | No | No | Yes |
| Weekly reports | No | Yes (basic stats, non-AI) | Yes (AI-powered) |
| Monthly reports | No | No | Yes (pattern detection) |
| Pattern detection | No | No | Yes |
| Trade history access | Last 7 days | Last 7 days | Unlimited |
| Economic calendar | Yes | Yes | Yes |
| ForexPulse bias dashboard | Yes | Yes | Yes |
| Export trades (CSV) | No | Yes | Yes |

Pricing is placeholder — finalize before launch. Stripe integration deferred; manual tier assignment initially.

---

## Tech Stack

No new services. Extends existing ForexPulse:

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui
- **Backend:** Next.js API routes, Neon Postgres (raw SQL, no ORM)
- **File storage:** Vercel Blob (screenshots, 2MB limit per file)
- **AI:** Anthropic Claude Sonnet API (`@anthropic-ai/sdk` — new dependency)
- **Auth:** Existing NextAuth v4 + extended session with tier
- **Payments:** Deferred (Stripe later, manual tier for now)

---

## Future Considerations (Not in Scope)

- MT5 broker import (only if free/low-cost API path exists)
- Trade replay (tick-by-tick)
- Mentor/sharing mode
- Mobile app
- Backtesting against historical data
