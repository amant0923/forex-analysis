# Platform Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add live FMP quotes, TradingView chart embeds, and sentiment scoring (per-instrument + market-wide Fear & Greed) to ForexPulse.

**Architecture:** FMP API fetches live quotes into `instrument_quotes` table. Sentiment is derived from existing `article_analyses` data (weighted by confidence). TradingView widgets embedded as iframes — no chart data storage needed. Dashboard shows prices + sentiment on cards, charts in accordion + detail pages.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS, FMP API, TradingView Widget, Neon Postgres, Python 3.11

---

### Task 1: Database migration — instrument_quotes table

**Files:**
- Create: `drizzle/0004_instrument_quotes.sql`

**Step 1: Write migration**

```sql
CREATE TABLE IF NOT EXISTS instrument_quotes (
  id SERIAL PRIMARY KEY,
  instrument TEXT NOT NULL UNIQUE,
  price DECIMAL(18, 6),
  change DECIMAL(18, 6),
  change_pct DECIMAL(8, 4),
  day_high DECIMAL(18, 6),
  day_low DECIMAL(18, 6),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instrument_quotes_instrument ON instrument_quotes(instrument);
```

**Step 2: Run migration against Neon**

Run: `psql "$DATABASE_URL" -f drizzle/0004_instrument_quotes.sql`
Expected: CREATE TABLE, CREATE INDEX

**Step 3: Commit**

```bash
git add drizzle/0004_instrument_quotes.sql
git commit -m "feat: add instrument_quotes table migration"
```

---

### Task 2: FMP quotes scraper — Python module

**Files:**
- Create: `scraper/fmp_quotes.py`
- Modify: `scraper/main.py`

**Step 1: Create FMP quotes module**

```python
"""Fetch live quotes from Financial Modeling Prep API."""

import urllib.request
import json

FMP_BASE = "https://financialmodelingprep.com/api/v3"

# FMP symbols for our instruments
FMP_FOREX_PAIRS = {
    "EURUSD": "EURUSD",
    "GBPUSD": "GBPUSD",
}

FMP_INDEX_SYMBOLS = {
    "DXY": "DX-Y.NYB",
    "US30": "^DJI",
    "NAS100": "^NDX",
    "SP500": "^GSPC",
    "GER40": "^GDAXI",
}


class FmpQuoteFetcher:
    def __init__(self, api_key: str):
        self.api_key = api_key

    def fetch_all_quotes(self) -> list[dict]:
        """Fetch quotes for all 7 instruments."""
        quotes = []
        quotes.extend(self._fetch_forex_quotes())
        quotes.extend(self._fetch_index_quotes())
        return quotes

    def _fetch_forex_quotes(self) -> list[dict]:
        """Fetch forex quotes via FMP forex quote endpoint."""
        results = []
        for instrument, symbol in FMP_FOREX_PAIRS.items():
            url = f"{FMP_BASE}/fx/{symbol}?apikey={self.api_key}"
            data = self._get_json(url)
            if data and len(data) > 0:
                q = data[0]
                results.append({
                    "instrument": instrument,
                    "price": q.get("bid") or q.get("ask") or 0,
                    "change": q.get("changes", 0),
                    "change_pct": q.get("changesPercentage", 0),
                    "day_high": q.get("dayHigh", 0),
                    "day_low": q.get("dayLow", 0),
                })
        return results

    def _fetch_index_quotes(self) -> list[dict]:
        """Fetch index quotes via FMP stock quote endpoint."""
        symbols = ",".join(FMP_INDEX_SYMBOLS.values())
        url = f"{FMP_BASE}/quote/{symbols}?apikey={self.api_key}"
        data = self._get_json(url)
        if not data:
            return []

        # Build reverse lookup
        symbol_to_instrument = {v: k for k, v in FMP_INDEX_SYMBOLS.items()}
        results = []
        for q in data:
            instrument = symbol_to_instrument.get(q.get("symbol"))
            if instrument:
                results.append({
                    "instrument": instrument,
                    "price": q.get("price", 0),
                    "change": q.get("change", 0),
                    "change_pct": q.get("changesPercentage", 0),
                    "day_high": q.get("dayHigh", 0),
                    "day_low": q.get("dayLow", 0),
                })
        return results

    def _get_json(self, url: str):
        """Fetch URL and return parsed JSON."""
        try:
            req = urllib.request.Request(url)
            resp = urllib.request.urlopen(req, timeout=10)
            return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            print(f"[FMP] Failed to fetch {url}: {e}")
            return None


def store_quotes(db, quotes: list[dict]):
    """Store quotes in instrument_quotes table."""
    for q in quotes:
        db.execute(
            """
            INSERT INTO instrument_quotes (instrument, price, change, change_pct, day_high, day_low, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (instrument) DO UPDATE SET
                price = EXCLUDED.price,
                change = EXCLUDED.change,
                change_pct = EXCLUDED.change_pct,
                day_high = EXCLUDED.day_high,
                day_low = EXCLUDED.day_low,
                updated_at = NOW()
            """,
            (q["instrument"], q["price"], q["change"], q["change_pct"], q["day_high"], q["day_low"]),
        )
    print(f"[FMP] Stored {len(quotes)} quotes")
```

**Step 2: Add FMP step to pipeline**

In `scraper/main.py`, add after the economic calendar step (Step 4):

```python
from scraper.fmp_quotes import FmpQuoteFetcher, store_quotes
```

And add Step 5 before `db.close()`:

```python
    # Step 5: Live Quotes
    print("\nStep 5: Fetching live quotes...")
    fmp_key = os.getenv("FMP_API_KEY")
    if fmp_key:
        try:
            fmp = FmpQuoteFetcher(api_key=fmp_key)
            quotes = fmp.fetch_all_quotes()
            print(f"  Fetched {len(quotes)} quotes")
            if quotes:
                store_quotes(db, quotes)
        except Exception as e:
            print(f"  Warning: FMP quote fetch failed: {e}")
    else:
        print("  Skipped — FMP_API_KEY not set")
```

**Step 3: Add FMP_API_KEY to .env.local**

User provides their FMP API key. Add to `.env.local`:
```
FMP_API_KEY=<user_key>
```

**Step 4: Test manually**

Run: `python3 -c "import os; os.environ['FMP_API_KEY']='<key>'; from scraper.fmp_quotes import FmpQuoteFetcher; f = FmpQuoteFetcher(os.environ['FMP_API_KEY']); print(f.fetch_all_quotes())"`
Expected: List of 7 quote dicts with price, change, change_pct

**Step 5: Commit**

```bash
git add scraper/fmp_quotes.py scraper/main.py
git commit -m "feat: FMP live quote fetcher + pipeline integration"
```

---

### Task 3: TypeScript types + queries for quotes and sentiment

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/queries.ts`
- Create: `src/lib/sentiment.ts`

**Step 1: Add Quote and Sentiment types to `src/types/index.ts`**

Add after the `CURRENCY_INSTRUMENTS` constant:

```typescript
export interface InstrumentQuote {
  instrument: string;
  price: number;
  change: number;
  change_pct: number;
  day_high: number;
  day_low: number;
  updated_at: string;
}

export interface InstrumentSentiment {
  instrument: string;
  score: number; // 0-100 (0=extreme bearish, 100=extreme bullish)
  bullish_count: number;
  bearish_count: number;
  neutral_count: number;
  total_articles: number;
}

export interface MarketSentiment {
  score: number; // 0-100
  label: "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed";
  instruments: InstrumentSentiment[];
  driver_summary: string;
}
```

Update `InstrumentWithBias` to include quote and sentiment:

```typescript
export interface InstrumentWithBias extends Instrument {
  biases: Record<string, Bias | null>;
  article_count: number;
  latestArticle: {
    id: number;
    title: string;
    source: string | null;
    impact_direction: "bullish" | "bearish" | "neutral" | null;
    mechanism: string | null;
  } | null;
  quote: InstrumentQuote | null;
  sentiment: InstrumentSentiment | null;
}
```

**Step 2: Add quote queries to `src/lib/queries.ts`**

```typescript
export async function getInstrumentQuotes(): Promise<Record<string, InstrumentQuote>> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM instrument_quotes`;
  const map: Record<string, InstrumentQuote> = {};
  for (const row of rows) {
    map[row.instrument as string] = {
      instrument: row.instrument as string,
      price: Number(row.price),
      change: Number(row.change),
      change_pct: Number(row.change_pct),
      day_high: Number(row.day_high),
      day_low: Number(row.day_low),
      updated_at: row.updated_at as string,
    };
  }
  return map;
}
```

Update `getInstrumentsWithBiases()` to include quotes and sentiment (after fetching instruments and biases):

```typescript
const quotes = await getInstrumentQuotes();
// ... inside the loop:
quote: quotes[inst.code] ?? null,
sentiment: null, // filled by sentiment.ts
```

**Step 3: Create sentiment calculation module `src/lib/sentiment.ts`**

```typescript
import { getDb } from "./db";
import type { InstrumentSentiment, MarketSentiment } from "@/types";

const CONFIDENCE_WEIGHTS: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export async function getInstrumentSentiment(instrument: string, days: number = 7): Promise<InstrumentSentiment> {
  const sql = getDb();
  const rows = await sql`
    SELECT aa.impact_direction, aa.confidence, COUNT(*) as cnt
    FROM article_analyses aa
    JOIN articles a ON aa.article_id = a.id
    WHERE aa.instrument = ${instrument}
      AND a.published_at >= NOW() - INTERVAL '1 day' * ${days}
    GROUP BY aa.impact_direction, aa.confidence
  `;

  let bullishWeight = 0;
  let bearishWeight = 0;
  let totalWeight = 0;
  let bullish_count = 0;
  let bearish_count = 0;
  let neutral_count = 0;

  for (const row of rows) {
    const w = CONFIDENCE_WEIGHTS[row.confidence as string] ?? 1;
    const count = Number(row.cnt);
    const weighted = count * w;
    totalWeight += weighted;

    if (row.impact_direction === "bullish") {
      bullishWeight += weighted;
      bullish_count += count;
    } else if (row.impact_direction === "bearish") {
      bearishWeight += weighted;
      bearish_count += count;
    } else {
      neutral_count += count;
    }
  }

  // Score: 0-100 where 50 is neutral
  const score = totalWeight > 0
    ? Math.round((bullishWeight / totalWeight) * 100)
    : 50;

  return {
    instrument,
    score,
    bullish_count,
    bearish_count,
    neutral_count,
    total_articles: bullish_count + bearish_count + neutral_count,
  };
}

export async function getMarketSentiment(days: number = 7): Promise<MarketSentiment> {
  const instruments = ["DXY", "EURUSD", "GBPUSD", "GER40", "US30", "NAS100", "SP500"];
  const sentiments: InstrumentSentiment[] = [];

  for (const inst of instruments) {
    sentiments.push(await getInstrumentSentiment(inst, days));
  }

  // Weighted average by article volume
  let totalWeighted = 0;
  let totalArticles = 0;
  let bullishCount = 0;

  for (const s of sentiments) {
    totalWeighted += s.score * s.total_articles;
    totalArticles += s.total_articles;
    if (s.score > 55) bullishCount++;
  }

  const score = totalArticles > 0 ? Math.round(totalWeighted / totalArticles) : 50;

  const label =
    score <= 20 ? "Extreme Fear" :
    score <= 40 ? "Fear" :
    score <= 60 ? "Neutral" :
    score <= 80 ? "Greed" :
    "Extreme Greed";

  const driver_summary = `${bullishCount} of ${instruments.length} instruments bullish this week`;

  return { score, label, instruments: sentiments, driver_summary };
}
```

**Step 4: Commit**

```bash
git add src/types/index.ts src/lib/queries.ts src/lib/sentiment.ts
git commit -m "feat: quote + sentiment types, queries, and calculation logic"
```

---

### Task 4: TradingView widget component

**Files:**
- Create: `src/components/tradingview-widget.tsx`

**Step 1: Create TradingView embed component**

```tsx
"use client";

import { useEffect, useRef, memo } from "react";

const TV_SYMBOL_MAP: Record<string, string> = {
  EURUSD: "FX:EURUSD",
  GBPUSD: "FX:GBPUSD",
  DXY: "TVC:DXY",
  US30: "TVC:DJI",
  NAS100: "NASDAQ:NDX",
  SP500: "SP:SPX",
  GER40: "XETR:DAX",
};

interface TradingViewWidgetProps {
  instrument: string;
  height?: number;
  compact?: boolean;
}

function TradingViewWidgetInner({ instrument, height = 500, compact = false }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear previous widget
    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: TV_SYMBOL_MAP[instrument] ?? instrument,
      interval: compact ? "60" : "D",
      timezone: "Etc/UTC",
      theme: "light",
      style: "1",
      locale: "en",
      hide_top_toolbar: compact,
      hide_legend: compact,
      allow_symbol_change: !compact,
      save_image: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });

    container.appendChild(script);

    return () => {
      if (container) container.innerHTML = "";
    };
  }, [instrument, compact]);

  return (
    <div
      className="tradingview-widget-container rounded-lg overflow-hidden border border-gray-200"
      style={{ height }}
    >
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}

export const TradingViewWidget = memo(TradingViewWidgetInner);
```

**Step 2: Commit**

```bash
git add src/components/tradingview-widget.tsx
git commit -m "feat: TradingView advanced chart widget component"
```

---

### Task 5: Sentiment gauge + market sentiment components

**Files:**
- Create: `src/components/sentiment-gauge.tsx`
- Create: `src/components/market-sentiment.tsx`

**Step 1: Create sentiment gauge component**

`src/components/sentiment-gauge.tsx`:
```tsx
import { cn } from "@/lib/utils";

interface SentimentGaugeProps {
  score: number; // 0-100
  size?: "sm" | "md";
  showLabel?: boolean;
}

function getLabel(score: number): string {
  if (score <= 20) return "Extreme Fear";
  if (score <= 40) return "Fear";
  if (score <= 60) return "Neutral";
  if (score <= 80) return "Greed";
  return "Extreme Greed";
}

function getColor(score: number): string {
  if (score <= 20) return "bg-red-600";
  if (score <= 40) return "bg-orange-500";
  if (score <= 60) return "bg-yellow-500";
  if (score <= 80) return "bg-green-500";
  return "bg-green-600";
}

function getTextColor(score: number): string {
  if (score <= 20) return "text-red-600";
  if (score <= 40) return "text-orange-500";
  if (score <= 60) return "text-yellow-600";
  if (score <= 80) return "text-green-600";
  return "text-green-700";
}

export function SentimentGauge({ score, size = "sm", showLabel = true }: SentimentGaugeProps) {
  const h = size === "sm" ? "h-1.5" : "h-2.5";

  return (
    <div className="flex items-center gap-2">
      <div className={cn("flex-1 rounded-full bg-gray-100 overflow-hidden", h)}>
        <div
          className={cn("h-full rounded-full transition-all", getColor(score))}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={cn(
        "font-semibold tabular-nums shrink-0",
        getTextColor(score),
        size === "sm" ? "text-[10px]" : "text-xs"
      )}>
        {score}
      </span>
      {showLabel && size === "md" && (
        <span className={cn("text-xs font-medium", getTextColor(score))}>
          {getLabel(score)}
        </span>
      )}
    </div>
  );
}

export function SentimentLabel({ score }: { score: number }) {
  return (
    <span className={cn("text-xs font-semibold", getTextColor(score))}>
      {getLabel(score)}
    </span>
  );
}
```

**Step 2: Create market sentiment strip**

`src/components/market-sentiment.tsx`:
```tsx
import { cn } from "@/lib/utils";
import type { MarketSentiment as MarketSentimentType } from "@/types";

const GRADIENT_STOPS = [
  { pct: 0, color: "#dc2626" },
  { pct: 25, color: "#f97316" },
  { pct: 50, color: "#eab308" },
  { pct: 75, color: "#22c55e" },
  { pct: 100, color: "#16a34a" },
];

function getLabelColor(label: string): string {
  switch (label) {
    case "Extreme Fear": return "text-red-600";
    case "Fear": return "text-orange-500";
    case "Neutral": return "text-yellow-600";
    case "Greed": return "text-green-600";
    case "Extreme Greed": return "text-green-700";
    default: return "text-gray-500";
  }
}

export function MarketSentiment({ sentiment }: { sentiment: MarketSentimentType }) {
  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Market Sentiment
        </h2>
        <span className={cn("text-sm font-bold", getLabelColor(sentiment.label))}>
          {sentiment.label}
        </span>
      </div>

      {/* Gauge bar */}
      <div className="relative mb-3">
        <div
          className="h-3 rounded-full overflow-hidden"
          style={{
            background: `linear-gradient(to right, #dc2626, #f97316, #eab308, #22c55e, #16a34a)`,
          }}
        />
        {/* Indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-gray-800 shadow-sm transition-all"
          style={{ left: `calc(${sentiment.score}% - 8px)` }}
        />
      </div>

      {/* Score + driver */}
      <div className="flex items-center justify-between">
        <span className={cn("text-2xl font-bold tabular-nums", getLabelColor(sentiment.label))}>
          {sentiment.score}
        </span>
        <span className="text-xs text-gray-500">
          {sentiment.driver_summary}
        </span>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/sentiment-gauge.tsx src/components/market-sentiment.tsx
git commit -m "feat: sentiment gauge + market sentiment Fear & Greed strip"
```

---

### Task 6: Integrate quotes + sentiment + chart into dashboard

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`
- Modify: `src/components/dashboard-client.tsx`
- Modify: `src/lib/queries.ts` (update getInstrumentsWithBiases)

**Step 1: Update `getInstrumentsWithBiases` in queries.ts**

Add imports and update the function to include quotes and sentiment:

```typescript
import type { ..., InstrumentQuote, InstrumentSentiment } from "@/types";
```

Add `getInstrumentQuotes()` call and sentiment import. Update the loop to attach `quote` and `sentiment` to each instrument.

**Step 2: Update dashboard page to fetch market sentiment**

`src/app/(dashboard)/page.tsx`:
```tsx
import { getInstrumentsWithBiases, getUpcomingEconomicEvents } from "@/lib/queries";
import { getMarketSentiment } from "@/lib/sentiment";
import { DashboardClient } from "@/components/dashboard-client";
import { UpcomingEvents } from "@/components/upcoming-events";
import { MarketSentiment } from "@/components/market-sentiment";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [instruments, upcomingEvents, marketSentiment] = await Promise.all([
    getInstrumentsWithBiases(),
    getUpcomingEconomicEvents(7),
    getMarketSentiment(),
  ]);

  return (
    <>
      <UpcomingEvents events={upcomingEvents} />
      <MarketSentiment sentiment={marketSentiment} />
      <DashboardClient instruments={instruments} />
    </>
  );
}
```

**Step 3: Update dashboard-client.tsx**

Add to instrument card (top-right of header area):
```tsx
{inst.quote && (
  <div className="text-right">
    <p className="text-sm font-bold tabular-nums text-gray-900">
      {inst.quote.price.toFixed(inst.category === "forex" ? 4 : 2)}
    </p>
    <p className={cn(
      "text-[11px] font-semibold tabular-nums",
      inst.quote.change_pct >= 0 ? "text-green-600" : "text-red-600"
    )}>
      {inst.quote.change_pct >= 0 ? "+" : ""}{inst.quote.change_pct.toFixed(2)}%
    </p>
  </div>
)}
```

Add sentiment bar below bias strip:
```tsx
{inst.sentiment && inst.sentiment.total_articles > 0 && (
  <div className="mb-2">
    <SentimentGauge score={inst.sentiment.score} size="sm" showLabel={false} />
  </div>
)}
```

Add TradingView compact chart in expanded section (above timeframe tabs):
```tsx
{isExpanded && !loading && expandedData && (
  <div className="mb-4">
    <TradingViewWidget instrument={code} height={300} compact />
  </div>
)}
```

**Step 4: Commit**

```bash
git add src/app/(dashboard)/page.tsx src/components/dashboard-client.tsx src/lib/queries.ts
git commit -m "feat: integrate quotes, sentiment, and chart into dashboard"
```

---

### Task 7: Integrate chart + sentiment into instrument detail page

**Files:**
- Modify: `src/app/(dashboard)/[instrument]/page.tsx`
- Modify: `src/lib/queries.ts` (if needed for single instrument quote)

**Step 1: Add TradingView full chart + price to header**

In the instrument header, add price + change next to the code:
```tsx
// After fetching biases, also get quote and sentiment
const sql = getDb();
const quoteRows = await sql`SELECT * FROM instrument_quotes WHERE instrument = ${inst.code}`;
const quote = quoteRows.length > 0 ? quoteRows[0] : null;
```

Display price in header:
```tsx
{quote && (
  <div className="ml-auto text-right">
    <p className="text-xl font-bold tabular-nums text-gray-900">
      {Number(quote.price).toFixed(inst.category === "forex" ? 4 : 2)}
    </p>
    <p className={cn(
      "text-sm font-semibold tabular-nums",
      Number(quote.change_pct) >= 0 ? "text-green-600" : "text-red-600"
    )}>
      {Number(quote.change_pct) >= 0 ? "+" : ""}{Number(quote.change_pct).toFixed(2)}%
    </p>
  </div>
)}
```

**Step 2: Add full TradingView chart between header and tabs**

```tsx
<div className="mb-6">
  <TradingViewWidget instrument={inst.code} height={500} />
</div>
```

**Step 3: Add sentiment section after bias panel**

```tsx
// Fetch sentiment
import { getInstrumentSentiment } from "@/lib/sentiment";
const sentiment = await getInstrumentSentiment(inst.code);
```

Display:
```tsx
{sentiment.total_articles > 0 && (
  <div className="mb-8 bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
      Sentiment Analysis
    </h3>
    <SentimentGauge score={sentiment.score} size="md" />
    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
      <span>{sentiment.bullish_count} bullish</span>
      <span>{sentiment.bearish_count} bearish</span>
      <span>{sentiment.neutral_count} neutral</span>
      <span className="text-gray-400">({sentiment.total_articles} articles)</span>
    </div>
  </div>
)}
```

**Step 4: Commit**

```bash
git add src/app/(dashboard)/[instrument]/page.tsx
git commit -m "feat: TradingView chart + price + sentiment on instrument detail"
```

---

### Task 8: Add FMP_API_KEY + initial quote load + build verification

**Files:**
- Modify: `.env.local`

**Step 1: Add FMP API key**

Ask user for their FMP API key, add to `.env.local`:
```
FMP_API_KEY=<their_key>
```

**Step 2: Run migration**

```bash
psql "$DATABASE_URL" -f drizzle/0004_instrument_quotes.sql
```

**Step 3: Run initial quote fetch**

```python
python3 -c "
import os, sys
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv('.env.local')
from scraper.fmp_quotes import FmpQuoteFetcher, store_quotes
from scraper.database import Database

db = Database(os.environ['DATABASE_URL'])
fmp = FmpQuoteFetcher(os.environ['FMP_API_KEY'])
quotes = fmp.fetch_all_quotes()
print(f'Fetched {len(quotes)} quotes')
for q in quotes:
    print(f'  {q[\"instrument\"]}: {q[\"price\"]} ({q[\"change_pct\"]}%)')
store_quotes(db, quotes)
db.close()
"
```

**Step 4: Build verification**

```bash
npx next build
```

Expected: All routes compile, no TypeScript errors.

**Step 5: Push to deploy**

```bash
git push
```

**Step 6: Verify on Vercel**

Check dashboard shows prices, sentiment strip, and charts load in accordion + detail pages.
