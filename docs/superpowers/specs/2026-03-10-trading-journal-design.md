# Trading Journal + AI Trade Analyst — Design Spec

## Overview

Add a full trading journal with AI-powered trade analysis to the existing ForexPulse platform. Users log forex/CFD trades manually, define strategy playbooks, and receive AI feedback that integrates with ForexPulse's existing bias data and economic calendar. Three subscription tiers gate feature access.

## Instruments

Forex/CFD only, matching existing ForexPulse instruments: DXY, EURUSD, GBPUSD, GER40, US30, NAS100, SP500.

## P&L Units

- Forex (EURUSD, GBPUSD): pips + dollar amount
- CFD indices (DXY, GER40, US30, NAS100, SP500): ticks + dollar amount
- Dollar P&L calculated from lot size x price movement against user's account size

---

## Data Model

### New Tables

**trading_accounts**
- id, user_id (FK users), name, broker, account_size (decimal), currency, leverage, created_at

**playbooks**
- id, user_id (FK users), name, description, instrument, timeframe, created_at, updated_at

**playbook_rules**
- id, playbook_id (FK playbooks), category (entry | exit | risk), rule_text, sort_order

**trades**
- id, user_id (FK users), account_id (FK trading_accounts), playbook_id (FK playbooks, nullable)
- instrument (FK instruments), direction (buy | sell)
- entry_price, exit_price, stop_loss, take_profit, lot_size
- opened_at (timestamptz), closed_at (timestamptz)
- pnl_pips (decimal, nullable — forex only), pnl_ticks (decimal, nullable — CFD only), pnl_dollars (decimal)
- rr_ratio (decimal, auto-calculated)
- account_pct_impact (decimal, auto-calculated from pnl_dollars / account_size)
- session (london | new_york | asia | overlap), timeframe_traded (M1, M5, M15, H1, H4, D1)
- emotion_before (confident | calm | anxious | FOMO | revenge | uncertain)
- emotion_after (satisfied | frustrated | relieved | regretful | neutral)
- rule_adherence_score (0-100, calculated from playbook checklist)
- rule_adherence_details (JSONB — array of {rule_id, followed: bool})
- notes (text)
- created_at

**trade_screenshots**
- id, trade_id (FK trades), url (text), label (entry | exit | setup | other), uploaded_at

**trade_ai_reviews**
- id, trade_id (FK trades, unique)
- verdict (good | acceptable | poor)
- bias_alignment (with | against | neutral + explanation)
- rule_adherence_review (text — which rules followed/broken)
- risk_assessment (text)
- timing_analysis (text)
- psychology_flag (text, nullable)
- suggestions (JSONB — array of strings)
- bias_snapshot (JSONB — ForexPulse bias data at time of trade)
- events_snapshot (JSONB — economic events during trade)
- generated_at

**chat_messages**
- id, user_id (FK users), role (user | assistant), content (text), created_at

### Existing Table Changes

**users** — extend `tier` column values: `free | essential | premium`

---

## Pages & Routes

### New Pages

1. **`/journal`** — Trade log table (sortable, filterable by instrument/date/playbook/outcome). Quick stats bar: win rate, avg R:R, P&L today/week/month. "Add Trade" button.

2. **`/journal/add`** — Trade entry form:
   - Account selector
   - Instrument selector (7 instruments)
   - Direction (buy/sell)
   - Entry/exit price, SL, TP, lot size
   - Open/close timestamps
   - Playbook selector (pulls rule checklist for adherence tracking)
   - Session tag, timeframe traded
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
- `POST /api/ai/analyze-trade` — single trade AI review
- `POST /api/ai/chat` — chat message (premium)
- `GET /api/ai/report` — generate weekly/monthly report

---

## AI Assistant Design

### Single Trade Analysis

**Input to Claude:**
- Full trade data (entry/exit, P&L, timing, emotions, rule adherence)
- Linked playbook rules
- ForexPulse bias for that instrument on that day (daily + 1W + 1M)
- Economic events that occurred during the trade window

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

Context windowed to last ~50 messages + summary of older history.

### Pattern Detection Reports (Premium)

Weekly and monthly auto-generated or on-demand reports identifying:
- Best/worst setups and sessions
- Emotional trading patterns
- Bias alignment correlation with win rate
- Drawdown analysis
- Streak analysis
- Rule adherence trends

### Cost Control

All AI calls use Claude Sonnet (not Opus). Chat context windowed. Single trade analysis = single API call. Reports batch multiple trades into one call.

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
| Weekly reports | No | Yes (basic stats) | Yes (AI-powered) |
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
- **Backend:** Next.js API routes, Neon Postgres
- **File storage:** Vercel Blob (screenshots)
- **AI:** Anthropic Claude Sonnet API
- **Auth:** Existing NextAuth + extended tier column
- **Payments:** Deferred (Stripe later, manual tier for now)

---

## Future Considerations (Not in Scope)

- MT5 broker import (only if free/low-cost API path exists)
- Trade replay (tick-by-tick)
- Mentor/sharing mode
- Mobile app
- Backtesting against historical data
