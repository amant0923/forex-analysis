# Telegram Daily Reports — Design Spec

## Overview

Users connect their Telegram account to ForexPulse via a bot-based linking flow. After the daily scraper completes, each connected user receives a full report for their selected instruments via Telegram message.

## User Flow

1. User visits `/settings` → clicks "Connect Telegram" → gets a 6-digit code (15 min TTL)
2. User sends the code to `@ForexPulseBot` on Telegram
3. Bot webhook validates code → stores `telegram_chat_id` on user
4. User selects which instruments they want reports for (checkboxes on settings page)
5. Daily scraper finishes → Python script sends personalized Telegram reports to all connected users

## Database Changes

### New columns on `users` table
- `telegram_chat_id` TEXT, nullable — linked Telegram chat ID
- `telegram_instruments` TEXT[] DEFAULT '{}' — selected instrument codes

### New table: `telegram_link_codes`
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PRIMARY KEY | |
| user_id | INT REFERENCES users(id) | |
| code | TEXT NOT NULL | 6-digit alphanumeric |
| expires_at | TIMESTAMPTZ NOT NULL | 15 minutes from creation |
| used | BOOLEAN DEFAULT false | |
| created_at | TIMESTAMPTZ DEFAULT NOW() | |

## API Routes

### `POST /api/telegram/generate-code`
- Auth required
- Generates 6-digit code, stores in `telegram_link_codes` with 15 min expiry
- Deletes any existing unused codes for this user
- Returns `{ code, expires_at }`

### `POST /api/telegram/webhook`
- No auth (called by Telegram)
- Validated by bot token secret
- Receives message from Telegram user
- If message is a valid unexpired code: links `telegram_chat_id` to user, replies "Connected!"
- If not: replies with usage instructions

### `GET /api/settings/telegram`
- Auth required
- Returns `{ connected: boolean, chat_id?: string, instruments: string[] }`

### `PUT /api/settings/telegram`
- Auth required
- Body: `{ instruments: string[] }`
- Updates `telegram_instruments` on user

### `DELETE /api/settings/telegram`
- Auth required
- Clears `telegram_chat_id` and `telegram_instruments` on user

## Settings Page (`/settings`)

### Telegram Connection Section
- "Connect Telegram" button generates code via API
- Shows code with instructions: "Send this code to @ForexPulseBot on Telegram"
- 15-minute countdown timer
- Once connected: green "Connected" badge, "Disconnect" button

### Instrument Selection Section
- Only visible when Telegram is connected
- 7 checkboxes with instrument icons: DXY, EURUSD, GBPUSD, GER40, US30, NAS100, SP500
- All unchecked by default
- Auto-saves on change

### Nav Update
- Add "Settings" link with gear icon to desktop and mobile nav

## Telegram Bot Setup

- Create bot via BotFather: `@ForexPulseBot`
- Set webhook URL to `https://<domain>/api/telegram/webhook`
- Environment variables: `TELEGRAM_BOT_TOKEN`

## Report Format

One message per instrument (to handle Telegram's 4096 char limit). Each instrument message:

```
📊 ForexPulse Daily — Mar 11

🟢 EURUSD — Bullish (1D)
ECB hawkish stance supports EUR strength

Headlines:
→ "ECB signals further tightening" 🔴 Bearish · High
→ "EUR/USD breaks above 1.09" 🟢 Bullish · High
→ "German PMI beats expectations" 🟢 Bullish · Medium
🔗 forexpulse.com/EURUSD
```

- Every article for each instrument is included (no truncation)
- Each headline shows impact direction emoji and confidence level
- Link to instrument page on site
- If no articles for an instrument: `⚪ INSTRUMENT — No update today`
- If total report fits in one message (<4096 chars), send as single message
- Footer with link to home dashboard

## Report Sender (Python)

Added as Step 6 in `scraper/main.py`, runs after all other steps complete:

1. Query all users where `telegram_chat_id IS NOT NULL` and `telegram_instruments` is not empty
2. For each user, query today's articles + analyses for their selected instruments
3. Build report message(s) per the format above
4. Send via Telegram Bot API (`sendMessage` with `parse_mode=HTML`)
5. Log success/failure per user

## Environment Variables

- `TELEGRAM_BOT_TOKEN` — Bot token from BotFather (needed in both Vercel and GitHub Actions)
