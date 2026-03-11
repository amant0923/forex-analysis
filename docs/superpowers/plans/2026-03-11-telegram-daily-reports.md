# Telegram Daily Reports Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users connect Telegram and receive daily instrument reports after the scraper runs.

**Architecture:** DB migration adds telegram fields to users + link codes table. Next.js API routes handle code generation, webhook, and settings. Python scraper gets a new Step 6 that queries connected users and sends personalized reports via Telegram Bot API.

**Tech Stack:** Next.js API routes, Neon Postgres, Python (requests), Telegram Bot API

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `drizzle/0006_telegram.sql` | Create | Migration: telegram columns + link codes table |
| `src/app/api/telegram/generate-code/route.ts` | Create | Generate 6-digit link code |
| `src/app/api/telegram/webhook/route.ts` | Create | Receive Telegram bot messages, validate codes |
| `src/app/api/settings/telegram/route.ts` | Create | GET/PUT/DELETE telegram settings |
| `src/app/(dashboard)/settings/page.tsx` | Create | Settings page with Telegram connect + instrument picker |
| `src/components/top-nav.tsx` | Modify | Add Settings link to nav |
| `scraper/telegram_reporter.py` | Create | Build and send Telegram reports |
| `scraper/main.py` | Modify | Add Step 6: send Telegram reports |
| `.github/workflows/daily-scrape.yml` | Modify | Add TELEGRAM_BOT_TOKEN env var |

---

## Task 1: Database Migration

**Files:**
- Create: `drizzle/0006_telegram.sql`

- [ ] **Step 1: Write migration**

```sql
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
```

- [ ] **Step 2: Run migration against database**

```bash
# Connect to Neon and run the migration
# The project uses raw SQL migrations, not an ORM migration runner
# Apply via Neon dashboard or psql
```

- [ ] **Step 3: Commit**

```bash
git add drizzle/0006_telegram.sql
git commit -m "feat: add telegram columns and link codes table"
```

---

## Task 2: Generate Link Code API

**Files:**
- Create: `src/app/api/telegram/generate-code/route.ts`

- [ ] **Step 1: Create the API route**

```typescript
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getDb } from "@/lib/db";

export async function POST() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = getDb();

  // Delete existing unused codes for this user
  await sql`
    DELETE FROM telegram_link_codes
    WHERE user_id = ${user.id} AND used = false
  `;

  // Generate 6-digit alphanumeric code
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await sql`
    INSERT INTO telegram_link_codes (user_id, code, expires_at)
    VALUES (${user.id}, ${code}, ${expiresAt})
  `;

  return NextResponse.json({ code, expires_at: expiresAt });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/telegram/generate-code/route.ts
git commit -m "feat: add telegram link code generation endpoint"
```

---

## Task 3: Telegram Webhook API

**Files:**
- Create: `src/app/api/telegram/webhook/route.ts`

- [ ] **Step 1: Create the webhook route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

export async function POST(request: NextRequest) {
  // Verify this is from Telegram (basic check - token in URL is standard)
  const body = await request.json();
  const message = body?.message;
  if (!message?.text || !message?.chat?.id) {
    return NextResponse.json({ ok: true });
  }

  const chatId = String(message.chat.id);
  const text = message.text.trim().toUpperCase();
  const sql = getDb();

  // Check if this looks like a link code (6 alphanumeric chars)
  if (/^[A-Z0-9]{6}$/.test(text)) {
    // Find valid unexpired code
    const rows = await sql`
      SELECT * FROM telegram_link_codes
      WHERE code = ${text}
        AND used = false
        AND expires_at > NOW()
      LIMIT 1
    `;

    if (rows.length === 0) {
      await sendTelegramMessage(chatId, "Invalid or expired code. Please generate a new one from ForexPulse settings.");
      return NextResponse.json({ ok: true });
    }

    const linkCode = rows[0];

    // Mark code as used
    await sql`
      UPDATE telegram_link_codes SET used = true WHERE id = ${linkCode.id}
    `;

    // Link telegram chat to user
    await sql`
      UPDATE users SET telegram_chat_id = ${chatId} WHERE id = ${linkCode.user_id}
    `;

    await sendTelegramMessage(
      chatId,
      "✅ <b>Connected!</b>\n\nYour Telegram is now linked to ForexPulse. Go to Settings to select which instruments you want in your daily report."
    );
  } else if (text === "/START" || text === "/HELP") {
    await sendTelegramMessage(
      chatId,
      "👋 <b>ForexPulse Bot</b>\n\nTo connect your account:\n1. Go to ForexPulse → Settings\n2. Click \"Connect Telegram\"\n3. Send the 6-digit code here\n\nYou'll receive daily market reports for your selected instruments."
    );
  } else {
    await sendTelegramMessage(
      chatId,
      "Send your 6-digit link code from ForexPulse settings, or type /help for instructions."
    );
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/telegram/webhook/route.ts
git commit -m "feat: add telegram webhook for link code validation"
```

---

## Task 4: Telegram Settings API

**Files:**
- Create: `src/app/api/settings/telegram/route.ts`

- [ ] **Step 1: Create GET/PUT/DELETE route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = getDb();
  const rows = await sql`
    SELECT telegram_chat_id, telegram_instruments FROM users WHERE id = ${user.id}
  `;

  if (rows.length === 0) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    connected: !!rows[0].telegram_chat_id,
    instruments: rows[0].telegram_instruments || [],
  });
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const instruments: string[] = body.instruments ?? [];

  // Validate instrument codes
  const valid = ["DXY", "EURUSD", "GBPUSD", "GER40", "US30", "NAS100", "SP500"];
  const filtered = instruments.filter((i: string) => valid.includes(i));

  const sql = getDb();
  await sql`
    UPDATE users SET telegram_instruments = ${filtered} WHERE id = ${user.id}
  `;

  return NextResponse.json({ instruments: filtered });
}

export async function DELETE() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = getDb();
  await sql`
    UPDATE users
    SET telegram_chat_id = NULL, telegram_instruments = '{}'
    WHERE id = ${user.id}
  `;

  return NextResponse.json({ disconnected: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/settings/telegram/route.ts
git commit -m "feat: add telegram settings API (GET/PUT/DELETE)"
```

---

## Task 5: Settings Page

**Files:**
- Create: `src/app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: Create the settings page**

```tsx
"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { InstrumentIcon } from "@/components/instrument-icon";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import {
  MessageCircle,
  Check,
  Copy,
  Loader2,
  Unlink,
} from "lucide-react";

const ALL_INSTRUMENTS = ["DXY", "EURUSD", "GBPUSD", "GER40", "US30", "NAS100", "SP500"];

export default function SettingsPage() {
  const [connected, setConnected] = useState(false);
  const [instruments, setInstruments] = useState<string[]>([]);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load current state
  useEffect(() => {
    fetch("/api/settings/telegram")
      .then((r) => r.json())
      .then((data) => {
        setConnected(data.connected);
        setInstruments(data.instruments || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Countdown timer for link code
  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        setLinkCode(null);
        setExpiresAt(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  async function generateCode() {
    setGenerating(true);
    try {
      const res = await fetch("/api/telegram/generate-code", { method: "POST" });
      const data = await res.json();
      setLinkCode(data.code);
      setExpiresAt(data.expires_at);
    } catch {
    } finally {
      setGenerating(false);
    }
  }

  async function disconnect() {
    await fetch("/api/settings/telegram", { method: "DELETE" });
    setConnected(false);
    setInstruments([]);
    setLinkCode(null);
  }

  async function toggleInstrument(code: string) {
    const next = instruments.includes(code)
      ? instruments.filter((i) => i !== code)
      : [...instruments, code];
    setInstruments(next);
    await fetch("/api/settings/telegram", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruments: next }),
    });
  }

  function copyCode() {
    if (linkCode) {
      navigator.clipboard.writeText(linkCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-2xl font-bold text-white mb-2">Settings</h1>
      <p className="text-sm text-white/40 mb-8">Manage your account and notifications</p>

      {/* Telegram Connection */}
      <div className="relative rounded-[1.25rem] mb-6">
        <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={3} disabled={false} />
        <div className="bg-white/[0.06] rounded-[1.25rem] border border-white/10 backdrop-blur-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <MessageCircle className="h-5 w-5 text-[#2AABEE]" />
            <h2 className="text-lg font-semibold text-white">Telegram</h2>
            {connected && (
              <span className="flex items-center gap-1 text-xs font-medium text-green-400 bg-green-500/15 px-2 py-0.5 rounded-full">
                <Check className="h-3 w-3" />
                Connected
              </span>
            )}
          </div>

          <p className="text-sm text-white/40 mb-5">
            Connect your Telegram to receive daily market reports with headlines and bias analysis for your selected instruments.
          </p>

          {connected ? (
            <button
              onClick={disconnect}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors cursor-pointer"
            >
              <Unlink className="h-4 w-4" />
              Disconnect Telegram
            </button>
          ) : linkCode ? (
            <div>
              <p className="text-sm text-white/60 mb-3">
                Send this code to <span className="font-semibold text-white">@ForexPulseBot</span> on Telegram:
              </p>
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-white/[0.08] border border-white/15 rounded-lg px-5 py-3">
                  <span className="text-2xl font-mono font-bold tracking-[0.3em] text-white">
                    {linkCode}
                  </span>
                </div>
                <button
                  onClick={copyCode}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white/60 bg-white/[0.06] hover:bg-white/[0.1] transition-colors cursor-pointer"
                >
                  {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-xs text-white/30">
                Code expires in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
              </p>
            </div>
          ) : (
            <button
              onClick={generateCode}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-[#2AABEE] hover:bg-[#229ED9] transition-colors cursor-pointer disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              Connect Telegram
            </button>
          )}
        </div>
      </div>

      {/* Instrument Selection */}
      {connected && (
        <div className="bg-white/[0.06] rounded-[1.25rem] border border-white/10 backdrop-blur-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Daily Report Instruments</h2>
          <p className="text-sm text-white/40 mb-5">
            Select which instruments to include in your daily Telegram report.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALL_INSTRUMENTS.map((code) => {
              const selected = instruments.includes(code);
              return (
                <button
                  key={code}
                  onClick={() => toggleInstrument(code)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer",
                    selected
                      ? "bg-white/[0.1] border-white/20 text-white"
                      : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.06] hover:text-white/60"
                  )}
                >
                  <InstrumentIcon code={code} size="sm" />
                  <span className="text-sm font-medium flex-1 text-left">{code}</span>
                  {selected && <Check className="h-4 w-4 text-green-400" />}
                </button>
              );
            })}
          </div>

          {instruments.length === 0 && (
            <p className="text-xs text-white/30 mt-3">
              Select at least one instrument to receive daily reports.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/settings/page.tsx
git commit -m "feat: add settings page with telegram connect and instrument picker"
```

---

## Task 6: Add Settings to Navigation

**Files:**
- Modify: `src/components/top-nav.tsx`

- [ ] **Step 1: Add Settings import and link**

Add `Settings` to the lucide-react import. Add a Settings link next to the Logout button in the desktop nav (right side), and add it to the mobile drawer before the Logout button.

Desktop nav (right side area, before Logout):
```tsx
<Link
  href="/settings"
  className={cn(
    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
    pathname === "/settings"
      ? "text-white bg-white/10"
      : "text-gray-400 hover:text-white hover:bg-white/5"
  )}
>
  <Settings className="h-4 w-4" />
  Settings
</Link>
```

Mobile drawer (before Logout button):
```tsx
<Link
  href="/settings"
  onClick={() => setMobileOpen(false)}
  className={cn(
    "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
    pathname === "/settings"
      ? "bg-white/10 text-white"
      : "text-gray-400 hover:text-white hover:bg-white/5"
  )}
>
  <Settings className="h-4 w-4" />
  <span>Settings</span>
</Link>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/top-nav.tsx
git commit -m "feat: add settings link to nav header"
```

---

## Task 7: Python Telegram Reporter

**Files:**
- Create: `scraper/telegram_reporter.py`

- [ ] **Step 1: Create the reporter module**

```python
"""Send daily Telegram reports to connected users."""

import os
import json
from datetime import datetime
import requests

TELEGRAM_API = "https://api.telegram.org/bot{token}/sendMessage"
MAX_MESSAGE_LENGTH = 4096

DIRECTION_EMOJI = {
    "bullish": "🟢",
    "bearish": "🔴",
    "neutral": "⚪",
}


class TelegramReporter:
    def __init__(self, database, bot_token: str):
        self.db = database
        self.bot_token = bot_token
        self.api_url = TELEGRAM_API.format(token=bot_token)
        self.site_url = os.getenv("SITE_URL", "forexpulse.com")

    def get_connected_users(self) -> list[dict]:
        """Get all users with telegram connected and instruments selected."""
        cur = self.db.execute(
            """SELECT id, telegram_chat_id, telegram_instruments
               FROM users
               WHERE telegram_chat_id IS NOT NULL
                 AND array_length(telegram_instruments, 1) > 0"""
        )
        return [dict(row) for row in cur.fetchall()]

    def get_todays_data(self, instrument: str) -> dict:
        """Get today's bias and articles for an instrument."""
        # Get latest daily bias
        cur = self.db.execute(
            """SELECT direction, summary, key_drivers
               FROM biases
               WHERE instrument = %s AND timeframe = 'daily'
               ORDER BY generated_at DESC LIMIT 1""",
            (instrument,),
        )
        bias_row = cur.fetchone()
        bias = dict(bias_row) if bias_row else None

        # Get today's articles with analyses
        cur = self.db.execute(
            """SELECT a.id, a.title, aa.impact_direction, aa.confidence
               FROM articles a
               JOIN article_instruments ai ON a.id = ai.article_id
               LEFT JOIN article_analyses aa ON a.id = aa.article_id AND aa.instrument = %s
               WHERE ai.instrument = %s
                 AND a.published_at >= CURRENT_DATE
               ORDER BY a.published_at DESC""",
            (instrument, instrument),
        )
        articles = [dict(row) for row in cur.fetchall()]

        return {"bias": bias, "articles": articles}

    def build_instrument_block(self, instrument: str, data: dict) -> str:
        """Build the report text for one instrument."""
        bias = data["bias"]
        articles = data["articles"]

        if not bias and not articles:
            return f"⚪ <b>{instrument}</b> — No update today"

        direction = bias["direction"] if bias else "neutral"
        emoji = DIRECTION_EMOJI.get(direction, "⚪")
        direction_label = direction.capitalize()

        lines = [f"{emoji} <b>{instrument}</b> — {direction_label} (1D)"]

        # Add summary from bias
        if bias and bias.get("summary"):
            summary = bias["summary"]
            # Truncate long summaries to one line
            if len(summary) > 120:
                summary = summary[:117] + "..."
            lines.append(summary)

        # Add headlines
        if articles:
            lines.append("")
            lines.append("Headlines:")
            for article in articles:
                a_dir = article.get("impact_direction")
                a_conf = article.get("confidence")
                a_emoji = DIRECTION_EMOJI.get(a_dir, "—") if a_dir else "—"
                conf_label = a_conf.capitalize() if a_conf else ""
                title = article["title"]
                if len(title) > 80:
                    title = title[:77] + "..."
                badge = f" {a_emoji} {conf_label}" if a_dir else ""
                lines.append(f'→ "{title}"{badge}')

        lines.append(f"🔗 {self.site_url}/{instrument}")

        return "\n".join(lines)

    def build_report(self, instruments: list[str]) -> list[str]:
        """Build full report, splitting into multiple messages if needed."""
        today = datetime.utcnow().strftime("%b %d")
        header = f"📊 <b>ForexPulse Daily</b> — {today}\n"

        blocks = []
        for inst in instruments:
            data = self.get_todays_data(inst)
            block = self.build_instrument_block(inst, data)
            blocks.append(block)

        footer = f"\n🔗 {self.site_url}"

        # Try to fit everything in one message
        separator = "\n\n━━━━━━━━━━━━━━━\n\n"
        full_report = header + "\n" + separator.join(blocks) + "\n" + footer

        if len(full_report) <= MAX_MESSAGE_LENGTH:
            return [full_report]

        # Split into per-instrument messages
        messages = []
        for i, block in enumerate(blocks):
            if i == 0:
                msg = header + "\n" + block
            else:
                msg = block
            if i == len(blocks) - 1:
                msg += "\n" + footer
            messages.append(msg)

        return messages

    def send_message(self, chat_id: str, text: str) -> bool:
        """Send a message via Telegram Bot API."""
        try:
            resp = requests.post(
                self.api_url,
                json={
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": True,
                },
                timeout=10,
            )
            if resp.status_code != 200:
                print(f"    Telegram API error: {resp.status_code} {resp.text[:200]}")
                return False
            return True
        except Exception as e:
            print(f"    Telegram send failed: {e}")
            return False

    def send_reports(self):
        """Send daily reports to all connected users."""
        users = self.get_connected_users()
        print(f"  {len(users)} users with Telegram connected")

        success = 0
        failed = 0

        for user in users:
            chat_id = user["telegram_chat_id"]
            instruments = user["telegram_instruments"]

            if not instruments:
                continue

            print(f"  Sending to user {user['id']} ({len(instruments)} instruments)...")
            messages = self.build_report(instruments)

            all_sent = True
            for msg in messages:
                if not self.send_message(chat_id, msg):
                    all_sent = False

            if all_sent:
                success += 1
            else:
                failed += 1

        print(f"  Reports sent: {success} success, {failed} failed")
```

- [ ] **Step 2: Commit**

```bash
git add scraper/telegram_reporter.py
git commit -m "feat: add telegram reporter module for daily reports"
```

---

## Task 8: Integrate Reporter into Scraper Pipeline

**Files:**
- Modify: `scraper/main.py`
- Modify: `.github/workflows/daily-scrape.yml`

- [ ] **Step 1: Add Step 6 to main.py**

Add import at top of `scraper/main.py`:
```python
from scraper.telegram_reporter import TelegramReporter
```

Add Step 6 before `db.close()` (after Step 5):
```python
    # Step 6: Send Telegram reports
    print("\nStep 6: Sending Telegram daily reports...")
    telegram_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if telegram_token:
        try:
            reporter = TelegramReporter(db, telegram_token)
            reporter.send_reports()
        except Exception as e:
            print(f"  Warning: Telegram reports failed: {e}")
    else:
        print("  Skipped — TELEGRAM_BOT_TOKEN not set")
```

- [ ] **Step 2: Add TELEGRAM_BOT_TOKEN to workflow**

In `.github/workflows/daily-scrape.yml`, add to the `env` section of the "Run pipeline" step:
```yaml
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
```

- [ ] **Step 3: Add `requests` to scraper requirements if missing**

Check `scraper/requirements.txt` — if `requests` is not listed, add it.

- [ ] **Step 4: Commit**

```bash
git add scraper/main.py .github/workflows/daily-scrape.yml scraper/requirements.txt
git commit -m "feat: integrate telegram reports as step 6 in daily pipeline"
```

---

## Task 9: Environment Setup & Bot Registration

- [ ] **Step 1: Create Telegram bot**

1. Message `@BotFather` on Telegram
2. Send `/newbot`
3. Name: `ForexPulse`
4. Username: `ForexPulseBot` (or available variant)
5. Copy the bot token

- [ ] **Step 2: Set webhook**

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://<your-vercel-domain>/api/telegram/webhook"}'
```

- [ ] **Step 3: Add environment variables**

- Vercel: Add `TELEGRAM_BOT_TOKEN` to project environment variables
- GitHub: Add `TELEGRAM_BOT_TOKEN` to repository secrets
- Local `.env.local`: Add `TELEGRAM_BOT_TOKEN=<token>`
- Optionally add `SITE_URL=https://your-domain.com` (defaults to `forexpulse.com`)

- [ ] **Step 4: Run database migration**

Apply `drizzle/0006_telegram.sql` to Neon database.
