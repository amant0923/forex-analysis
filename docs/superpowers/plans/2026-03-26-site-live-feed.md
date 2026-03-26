# Site Live Feed Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Tradeora site show articles in real-time as they arrive, matching the Telegram channel's speed.

**Architecture:** Client-side polling (60s interval) against a new `/api/live-feed` GET endpoint that queries articles marked `posted_to_channel = TRUE` in the last 24 hours. Server-side initial fetch on the dashboard eliminates loading flash. Three new components: dashboard ticker, instrument-page live feed, poller health indicator.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, `motion` (framer-motion), `@neondatabase/serverless`, `lucide-react`

**Spec:** `docs/superpowers/specs/2026-03-26-site-live-feed-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/types/index.ts` | Modify | Add `LiveArticle` interface |
| `src/lib/utils.ts` | Modify | Add `timeAgo()` utility |
| `src/components/home-feed.tsx` | Modify | Remove local `timeAgo()`, import from utils |
| `src/lib/queries.ts` | Modify | Add `getLiveFeedArticles()` and `getPollerHealth()` |
| `src/app/api/live-feed/route.ts` | Create | GET endpoint for live feed data |
| `src/app/api/poller-health/route.ts` | Create | GET endpoint for poller heartbeat |
| `src/components/live-news-ticker.tsx` | Create | Dashboard breaking news ticker |
| `src/components/live-feed-section.tsx` | Create | Instrument page live news section |
| `src/components/poller-health.tsx` | Create | Poller freshness indicator |
| `src/app/(dashboard)/page.tsx` | Modify | Wire in LiveNewsTicker + PollerHealth |
| `src/app/(dashboard)/[instrument]/page.tsx` | Modify | Wire in LiveFeedSection |

---

## Task 1: Add LiveArticle type + extract timeAgo utility

**Files:**
- Modify: `src/types/index.ts` (append at end)
- Modify: `src/lib/utils.ts` (add function)
- Modify: `src/components/home-feed.tsx` (remove local function, add import)

- [ ] **Step 1: Add `LiveArticle` type**

Add to the end of `src/types/index.ts`:

```ts
export interface LiveArticle {
  id: number;
  title: string;
  source: string | null;
  source_tier: number | null;
  summary: string | null;
  url: string;
  channel_posted_at: string;
  instruments: {
    code: string;
    direction: string | null;
    confidence: string | null;
  }[];
}
```

- [ ] **Step 2: Add `timeAgo()` to utils**

Add to `src/lib/utils.ts`:

```ts
export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
```

- [ ] **Step 3: Update home-feed.tsx to import from utils**

In `src/components/home-feed.tsx`:

1. Add `timeAgo` to the import from `@/lib/utils`:
   ```ts
   import { cn, timeAgo } from "@/lib/utils";
   ```
2. Delete the local `timeAgo` function (lines 52-61):
   ```ts
   // DELETE this entire function:
   function timeAgo(dateStr: string | null): string {
     if (!dateStr) return "";
     const diff = Date.now() - new Date(dateStr).getTime();
     const mins = Math.floor(diff / 60000);
     if (mins < 60) return `${mins}m ago`;
     const hrs = Math.floor(mins / 60);
     if (hrs < 24) return `${hrs}h ago`;
     const days = Math.floor(hrs / 24);
     return `${days}d ago`;
   }
   ```

- [ ] **Step 4: Verify the build compiles**

Run: `cd /Users/a/Desktop/forex-analysis && npx next build 2>&1 | tail -20`
Expected: Build succeeds (no type errors, no missing imports)

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/lib/utils.ts src/components/home-feed.tsx
git commit -m "feat: add LiveArticle type and extract timeAgo to shared utils"
```

---

## Task 2: Add query functions for live feed and poller health

**Files:**
- Modify: `src/lib/queries.ts` (append two functions)

- [ ] **Step 1: Add `getLiveFeedArticles()` function**

Add to the end of `src/lib/queries.ts`:

```ts
export async function getLiveFeedArticles(instrument?: string): Promise<LiveArticle[]> {
  const sql = getDb();

  if (instrument) {
    const rows = await sql`
      SELECT a.id, a.title, a.source, a.summary, a.url, a.channel_posted_at,
             td.source_tier,
             COALESCE(
               (SELECT json_agg(json_build_object(
                 'code', aa.instrument,
                 'direction', aa.impact_direction,
                 'confidence', aa.confidence
               )) FROM article_analyses aa WHERE aa.article_id = a.id),
               '[]'::json
             ) as instruments
      FROM articles a
      LEFT JOIN telegram_drafts td ON td.article_id = a.id
      WHERE a.posted_to_channel = TRUE
        AND a.channel_posted_at > NOW() - INTERVAL '24 hours'
        AND EXISTS (
          SELECT 1 FROM article_instruments ai
          WHERE ai.article_id = a.id AND ai.instrument = ${instrument}
        )
      ORDER BY a.channel_posted_at DESC
      LIMIT 50
    `;
    return rows as LiveArticle[];
  }

  const rows = await sql`
    SELECT a.id, a.title, a.source, a.summary, a.url, a.channel_posted_at,
           td.source_tier,
           COALESCE(
             (SELECT json_agg(json_build_object(
               'code', aa.instrument,
               'direction', aa.impact_direction,
               'confidence', aa.confidence
             )) FROM article_analyses aa WHERE aa.article_id = a.id),
             '[]'::json
           ) as instruments
    FROM articles a
    LEFT JOIN telegram_drafts td ON td.article_id = a.id
    WHERE a.posted_to_channel = TRUE
      AND a.channel_posted_at > NOW() - INTERVAL '24 hours'
    ORDER BY a.channel_posted_at DESC
    LIMIT 50
  `;
  return rows as LiveArticle[];
}
```

Also add the `LiveArticle` import at the top of the file. Update the existing import line:

```ts
import type { Instrument, Article, ArticleAnalysis, Bias, InstrumentWithBias, InstrumentQuote, EconomicEvent, TrackRecordStats, BiasOutcome, LiveArticle } from "@/types";
```

- [ ] **Step 2: Add `getPollerHealth()` function**

Add to the end of `src/lib/queries.ts`:

```ts
export async function getPollerHealth(): Promise<{ last_run: string; articles_found: number } | null> {
  const sql = getDb();
  const rows = await sql`SELECT last_run, articles_found FROM poller_heartbeat WHERE id = 1`;
  if (rows.length === 0) return null;
  return { last_run: rows[0].last_run as string, articles_found: Number(rows[0].articles_found) };
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `cd /Users/a/Desktop/forex-analysis && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/lib/queries.ts
git commit -m "feat: add getLiveFeedArticles and getPollerHealth query functions"
```

---

## Task 3: Create `/api/live-feed` route

**Files:**
- Create: `src/app/api/live-feed/route.ts`

- [ ] **Step 1: Create the API route**

Create `src/app/api/live-feed/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getLiveFeedArticles } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const instrument = request.nextUrl.searchParams.get("instrument") ?? undefined;
  const articles = await getLiveFeedArticles(instrument);
  return NextResponse.json({ articles });
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/a/Desktop/forex-analysis && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Test the endpoint locally**

Run: `cd /Users/a/Desktop/forex-analysis && npx next dev &`
Wait for "Ready", then:
Run: `curl -s http://localhost:3000/api/live-feed | head -c 500`
Expected: JSON response `{"articles":[...]}` (may be empty array if no channel articles in DB — that's fine)

Then test with instrument filter:
Run: `curl -s "http://localhost:3000/api/live-feed?instrument=XAUUSD" | head -c 500`
Expected: JSON response `{"articles":[...]}` filtered to gold articles

- [ ] **Step 4: Commit**

```bash
git add src/app/api/live-feed/route.ts
git commit -m "feat: add /api/live-feed GET endpoint with instrument filtering"
```

---

## Task 4: Create `/api/poller-health` route

**Files:**
- Create: `src/app/api/poller-health/route.ts`

- [ ] **Step 1: Create the API route**

Create `src/app/api/poller-health/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getPollerHealth } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = await getPollerHealth();
  if (!health) {
    return NextResponse.json({ last_run: null, articles_found: 0 });
  }
  return NextResponse.json(health);
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/a/Desktop/forex-analysis && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/api/poller-health/route.ts
git commit -m "feat: add /api/poller-health GET endpoint"
```

---

## Task 5: Create LiveNewsTicker component

**Files:**
- Create: `src/components/live-news-ticker.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/live-news-ticker.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { timeAgo } from "@/lib/utils";
import type { LiveArticle } from "@/types";

interface LiveNewsTickerProps {
  initialArticles: LiveArticle[];
}

function isWithinLastTwoHours(dateStr: string): boolean {
  const twoHoursMs = 2 * 60 * 60 * 1000;
  return Date.now() - new Date(dateStr).getTime() < twoHoursMs;
}

function biasColor(direction: string | null): string {
  if (direction === "bullish") return "text-green-400";
  if (direction === "bearish") return "text-red-400";
  return "text-white/40";
}

export function LiveNewsTicker({ initialArticles }: LiveNewsTickerProps) {
  const [articles, setArticles] = useState<LiveArticle[]>(initialArticles);

  const fetchArticles = useCallback(async () => {
    try {
      const res = await fetch("/api/live-feed");
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles);
      }
    } catch {
      // Silently fail — keep showing stale data
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchArticles, 60_000);
    return () => clearInterval(interval);
  }, [fetchArticles]);

  // Hide if no articles posted in the last 2 hours
  const recentArticles = articles.filter(
    (a) => a.channel_posted_at && isWithinLastTwoHours(a.channel_posted_at)
  );
  if (recentArticles.length === 0) return null;

  const displayArticles = recentArticles.slice(0, 5);

  return (
    <div className="glass-sm rounded-xl p-3 sm:p-4 mb-6">
      <div className="flex items-center gap-3">
        {/* LIVE indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          <span className="font-serif text-xs font-semibold uppercase tracking-wider text-white/60">
            Live
          </span>
        </div>

        {/* Scrollable article list */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 overflow-x-auto scrollbar-hide min-w-0 flex-1">
          <AnimatePresence mode="popLayout">
            {displayArticles.map((article) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Link
                  href={`/articles/${article.id}`}
                  className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
                >
                  <span className="text-[10px] font-medium text-white/30 shrink-0">
                    {article.source}
                  </span>
                  <span className="text-sm font-medium text-white line-clamp-1 max-w-[200px] sm:max-w-[260px]">
                    {article.title}
                  </span>
                  <span className="text-[10px] text-white/30 font-mono shrink-0">
                    {timeAgo(article.channel_posted_at)}
                  </span>
                  {article.instruments.slice(0, 3).map((inst) => (
                    <span
                      key={inst.code}
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/[0.08] shrink-0 ${biasColor(inst.direction)}`}
                    >
                      {inst.code}
                    </span>
                  ))}
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/a/Desktop/forex-analysis && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/live-news-ticker.tsx
git commit -m "feat: add LiveNewsTicker component with 60s polling and motion animations"
```

---

## Task 6: Create LiveFeedSection component

**Files:**
- Create: `src/components/live-feed-section.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/live-feed-section.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Newspaper } from "lucide-react";
import { BiasIndicator } from "@/components/bias-indicator";
import { timeAgo } from "@/lib/utils";
import type { LiveArticle } from "@/types";

interface LiveFeedSectionProps {
  instrument: string;
}

const tierLabels: Record<number, { label: string; classes: string }> = {
  0: { label: "Official", classes: "bg-blue-500/15 text-blue-400" },
  1: { label: "Wire", classes: "bg-purple-500/15 text-purple-400" },
  2: { label: "Major", classes: "bg-white/[0.08] text-white/50" },
  3: { label: "Blog", classes: "bg-white/[0.04] text-white/30" },
};

function TierBadge({ tier }: { tier: number | null }) {
  if (tier == null) return null;
  const config = tierLabels[tier] ?? tierLabels[3];
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${config.classes}`}>
      {config.label}
    </span>
  );
}

export function LiveFeedSection({ instrument }: LiveFeedSectionProps) {
  const [articles, setArticles] = useState<LiveArticle[] | null>(null);

  const fetchArticles = useCallback(async () => {
    try {
      const res = await fetch(`/api/live-feed?instrument=${instrument}`);
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles);
      }
    } catch {
      // Silently fail
    }
  }, [instrument]);

  useEffect(() => {
    fetchArticles();
    const interval = setInterval(fetchArticles, 60_000);
    return () => clearInterval(interval);
  }, [fetchArticles]);

  // Loading state
  if (articles === null) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          <h2 className="font-serif text-xl font-bold text-white">Live News</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white/[0.04] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (articles.length === 0) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          <h2 className="font-serif text-xl font-bold text-white">Live News</h2>
        </div>
        <div className="py-12 text-center border border-white/10 rounded-lg">
          <Newspaper className="h-5 w-5 text-white/20 mx-auto mb-2" />
          <p className="text-sm text-white/30">No breaking news for {instrument} today</p>
        </div>
      </div>
    );
  }

  const displayArticles = articles.slice(0, 10);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        <h2 className="font-serif text-xl font-bold text-white">Live News</h2>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {displayArticles.map((article) => {
            const instrumentAnalysis = article.instruments.find(
              (inst) => inst.code === instrument
            );

            return (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Link
                  href={`/articles/${article.id}`}
                  className="block bg-white/[0.06] rounded-lg border border-white/10 p-4 sm:p-5 hover:bg-white/[0.08] transition-all cursor-pointer"
                >
                  {/* Top row: source + tier + time */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white/40">
                        {article.source}
                      </span>
                      <TierBadge tier={article.source_tier} />
                    </div>
                    <span className="text-[10px] text-white/30 font-mono">
                      {timeAgo(article.channel_posted_at)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm sm:text-[15px] font-semibold text-white leading-snug mb-1.5">
                    {article.title}
                  </h3>

                  {/* Bias indicator */}
                  {instrumentAnalysis && instrumentAnalysis.direction && (
                    <div className="mb-1.5">
                      <BiasIndicator
                        direction={instrumentAnalysis.direction as "bullish" | "bearish" | "neutral"}
                        size="sm"
                      />
                    </div>
                  )}

                  {/* Summary */}
                  {article.summary && (
                    <p className="text-xs text-white/40 leading-relaxed line-clamp-2">
                      {article.summary}
                    </p>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/a/Desktop/forex-analysis && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/live-feed-section.tsx
git commit -m "feat: add LiveFeedSection component for instrument detail pages"
```

---

## Task 7: Create PollerHealth component

**Files:**
- Create: `src/components/poller-health.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/poller-health.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { timeAgo } from "@/lib/utils";

export function PollerHealth() {
  const [lastRun, setLastRun] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/poller-health");
      if (res.ok) {
        const data = await res.json();
        setLastRun(data.last_run);
      }
    } catch {
      // Hide on error
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 60_000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (!lastRun) return null;

  const minutesAgo = Math.floor((Date.now() - new Date(lastRun).getTime()) / 60_000);

  let dotColor: string;
  if (minutesAgo < 5) {
    dotColor = "bg-green-500";
  } else if (minutesAgo <= 15) {
    dotColor = "bg-yellow-500";
  } else {
    dotColor = "bg-red-500";
  }

  return (
    <div className="flex items-center justify-center gap-2 py-4 text-[10px] text-white/30">
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      <span className="font-mono">Updated {timeAgo(lastRun)}</span>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/a/Desktop/forex-analysis && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/poller-health.tsx
git commit -m "feat: add PollerHealth indicator component"
```

---

## Task 8: Wire LiveNewsTicker + PollerHealth into dashboard page

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`

- [ ] **Step 1: Update imports**

Add these imports to the top of `src/app/(dashboard)/page.tsx`:

```ts
import { getLiveFeedArticles } from "@/lib/queries";
import { LiveNewsTicker } from "@/components/live-news-ticker";
import { PollerHealth } from "@/components/poller-health";
```

Note: `getLiveFeedArticles` must be added alongside the existing imports from `@/lib/queries`:

```ts
import {
  getInstrumentsWithBiases,
  getUpcomingEconomicEvents,
  getRecentArticlesAll,
  getLiveFeedArticles,
} from "@/lib/queries";
```

- [ ] **Step 2: Add live feed to the data fetch**

Update the `Promise.all` in the `DashboardPage` function. Change:

```ts
const [instruments, upcomingEvents, marketSentiment, recentArticles] =
  await Promise.all([
    getInstrumentsWithBiases(),
    getUpcomingEconomicEvents(7),
    getMarketSentiment(),
    getRecentArticlesAll(7, 30),
  ]);
```

To:

```ts
const [instruments, upcomingEvents, marketSentiment, recentArticles, liveArticles] =
  await Promise.all([
    getInstrumentsWithBiases(),
    getUpcomingEconomicEvents(7),
    getMarketSentiment(),
    getRecentArticlesAll(7, 30),
    getLiveFeedArticles(),
  ]);
```

- [ ] **Step 3: Add components to the JSX**

Change the return JSX from:

```tsx
return (
  <>
    <UpcomingEvents events={upcomingEvents} />
    <MarketSentiment sentiment={marketSentiment} />
    <HomeFeed
      instruments={instruments}
      articles={recentArticles}
    />
    <BrokerPartners />
  </>
);
```

To:

```tsx
return (
  <>
    <UpcomingEvents events={upcomingEvents} />
    <MarketSentiment sentiment={marketSentiment} />
    <LiveNewsTicker initialArticles={liveArticles} />
    <HomeFeed
      instruments={instruments}
      articles={recentArticles}
    />
    <BrokerPartners />
    <PollerHealth />
  </>
);
```

- [ ] **Step 4: Verify the build compiles**

Run: `cd /Users/a/Desktop/forex-analysis && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/page.tsx
git commit -m "feat: wire LiveNewsTicker and PollerHealth into dashboard"
```

---

## Task 9: Wire LiveFeedSection into instrument detail page

**Files:**
- Modify: `src/app/(dashboard)/[instrument]/page.tsx`

- [ ] **Step 1: Add import**

Add this import to the top of `src/app/(dashboard)/[instrument]/page.tsx`:

```ts
import { LiveFeedSection } from "@/components/live-feed-section";
```

- [ ] **Step 2: Add the component between TradingView chart and timeframe tabs**

In the JSX, find the TradingView chart section:

```tsx
{/* TradingView chart */}
<div className="mb-6">
  <TradingViewWidget instrument={inst.code} height={500} />
</div>

{/* Timeframe tabs */}
```

Insert `<LiveFeedSection>` between them:

```tsx
{/* TradingView chart */}
<div className="mb-6">
  <TradingViewWidget instrument={inst.code} height={500} />
</div>

<LiveFeedSection instrument={inst.code} />

{/* Timeframe tabs */}
```

- [ ] **Step 3: Verify the build compiles**

Run: `cd /Users/a/Desktop/forex-analysis && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/\[instrument\]/page.tsx
git commit -m "feat: wire LiveFeedSection into instrument detail page"
```

---

## Task 10: Visual verification on dev server

- [ ] **Step 1: Start dev server**

Run: `cd /Users/a/Desktop/forex-analysis && npx next dev`
Wait for "Ready on http://localhost:3000"

- [ ] **Step 2: Check dashboard page**

Open `http://localhost:3000` in browser. Verify:
- LiveNewsTicker appears between MarketSentiment and HomeFeed (or is hidden if no recent channel articles — both are correct)
- PollerHealth appears at bottom with colored dot
- No layout shifts or broken styling

- [ ] **Step 3: Check instrument detail page**

Open `http://localhost:3000/XAUUSD` in browser. Verify:
- LiveFeedSection appears between TradingView chart and timeframe tabs
- Shows loading skeletons, then either articles or "No breaking news for XAUUSD today"
- Tier badges render with correct colors

- [ ] **Step 4: Check mobile responsive**

Resize browser to mobile width (375px). Verify:
- Ticker stacks vertically
- Article cards are full-width
- No horizontal overflow

- [ ] **Step 5: Final commit and push**

```bash
git push
```
