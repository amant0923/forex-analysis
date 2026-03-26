# Site Live Feed Integration — Design Spec

**Date:** 2026-03-26
**Status:** Approved
**Depends on:** Telegram channel poller (already deployed)

## Overview

The Tradeora site currently only shows articles from the daily morning batch. This feature makes the site show articles in real-time as they arrive throughout the day, matching the Telegram channel's speed. Three new components — a dashboard ticker, an instrument-page live feed, and a poller health indicator — poll a new API endpoint every 60 seconds.

## Database Schema (existing — no migrations needed)

| Table | Columns used | Notes |
|-------|-------------|-------|
| `articles` | `id`, `title`, `content`, `summary`, `url`, `source`, `published_at`, `posted_to_channel` (BOOLEAN), `channel_posted_at` (TIMESTAMP) | `posted_to_channel` and `channel_posted_at` added in migration 0018 |
| `article_instruments` | `article_id`, `instrument` | Junction table |
| `article_analyses` | `article_id`, `instrument`, `impact_direction` (TEXT), `confidence` (TEXT) | Per-instrument AI analysis |
| `telegram_drafts` | `article_id`, `source_tier` (INTEGER) | `source_tier` lives here, NOT on articles |
| `poller_heartbeat` | `id=1`, `last_run`, `articles_found`, `errors` | Single-row table, updated by poller |

## TypeScript Types

Add to `src/types/index.ts`:

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

## API Route: `/api/live-feed`

**File:** `src/app/api/live-feed/route.ts`

GET endpoint. Optional query param `?instrument=XAUUSD`.

### Query function: `getLiveFeedArticles(instrument?: string)`

Add to `src/lib/queries.ts`:

```sql
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
```

When `instrument` param is provided, add:
```sql
AND EXISTS (
  SELECT 1 FROM article_instruments ai
  WHERE ai.article_id = a.id AND ai.instrument = $instrument
)
```

### Response shape

```json
{
  "articles": [
    {
      "id": 123,
      "title": "Fed holds rates steady",
      "source": "Reuters",
      "source_tier": 1,
      "summary": "The Federal Reserve...",
      "url": "https://...",
      "channel_posted_at": "2026-03-26T14:30:00Z",
      "instruments": [
        { "code": "DXY", "direction": "bullish", "confidence": "high" },
        { "code": "XAUUSD", "direction": "bearish", "confidence": "medium" }
      ]
    }
  ]
}
```

## API Route: `/api/poller-health`

**File:** `src/app/api/poller-health/route.ts`

GET endpoint. No params.

### Query function: `getPollerHealth()`

```sql
SELECT last_run, articles_found FROM poller_heartbeat WHERE id = 1
```

### Response shape

```json
{ "last_run": "2026-03-26T14:30:00Z", "articles_found": 3 }
```

## Shared Utility: `timeAgo()`

Extract from `src/components/home-feed.tsx` into `src/lib/utils.ts`:

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

Update `home-feed.tsx` to import from `@/lib/utils` instead of defining locally.

## Component: LiveNewsTicker

**File:** `src/components/live-news-ticker.tsx`
**Type:** Client component (`"use client"`)
**Props:** `initialArticles: LiveArticle[]`

### Placement

Dashboard `page.tsx` render order:
1. `<UpcomingEvents />`
2. `<MarketSentiment />`
3. **`<LiveNewsTicker initialArticles={liveArticles} />`** — NEW
4. `<HomeFeed />`
5. `<BrokerPartners />`
6. `<PollerHealth />` — NEW

### Behavior

- Renders initial data from server props (no loading flash)
- Polls `/api/live-feed` every 60 seconds via `setInterval` + `fetch`
- Shows max 5 articles in a horizontal scrollable row
- If no articles with `channel_posted_at` in last 2 hours → returns `null` (hides entirely)
- New articles fade in using `motion` library: `initial={{ opacity: 0 }}` → `animate={{ opacity: 1 }}`
- Each article is a `Link` to `/articles/[id]`
- Mobile (`< sm`): items stack vertically

### Sizing (exact Tailwind classes)

| Element | Classes |
|---------|---------|
| Container | `glass-sm rounded-xl p-3 sm:p-4 mb-6` |
| LIVE label | `font-serif text-xs font-semibold uppercase tracking-wider text-white/60` |
| Pulsing dot | `h-2 w-2 rounded-full bg-green-500 animate-pulse` |
| Scroll container | `flex gap-3 overflow-x-auto scrollbar-hide` (mobile: `flex-col sm:flex-row`) |
| Article item | `shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer` |
| Source name | `text-[10px] font-medium text-white/30` |
| Article title | `text-sm font-medium text-white line-clamp-1` (max-width constrained) |
| Time ago | `text-[10px] text-white/30 font-mono` |
| Instrument tags | `text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/[0.08]` + bias color (`text-green-400` / `text-red-400` / `text-white/40`) |

## Component: LiveFeedSection

**File:** `src/components/live-feed-section.tsx`
**Type:** Client component (`"use client"`)
**Props:** `instrument: string`

### Placement

Instrument detail page `[instrument]/page.tsx`:
1. Back link
2. Instrument header
3. TradingView chart
4. **`<LiveFeedSection instrument={inst.code} />`** — NEW
5. Timeframe tabs
6. Bias analysis panel
7. ...rest

### Behavior

- Fetches `/api/live-feed?instrument=XAUUSD` on mount + every 60 seconds
- Shows up to 10 articles, newest first
- Loading state: 3 skeleton cards
- Empty state: "No breaking news for {instrument} today" with `Newspaper` icon
- Each article card is a `Link` to `/articles/[id]`

### Sizing (exact Tailwind classes)

| Element | Classes |
|---------|---------|
| Section container | `mb-6` |
| Heading row | `flex items-center gap-2 mb-4` |
| Heading text | `font-serif text-xl font-bold text-white` |
| Pulsing dot | `h-2 w-2 rounded-full bg-green-500 animate-pulse` |
| Article card | `bg-white/[0.06] rounded-lg border border-white/10 p-4 sm:p-5 hover:bg-white/[0.08] transition-all cursor-pointer` |
| Card spacing | `space-y-3` |
| Time ago | `text-[10px] text-white/30 font-mono` |
| Title | `text-sm sm:text-[15px] font-semibold text-white leading-snug mb-1.5` |
| Source name | `text-xs font-medium text-white/40` |
| Tier badge | `text-[10px] font-semibold px-1.5 py-0.5 rounded` |
| Tier 0 "Official" | `bg-blue-500/15 text-blue-400` |
| Tier 1 "Wire" | `bg-purple-500/15 text-purple-400` |
| Tier 2 "Major" | `bg-white/[0.08] text-white/50` |
| Tier 3 "Blog" | `bg-white/[0.04] text-white/30` |
| Summary | `text-xs text-white/40 leading-relaxed line-clamp-2` |
| Bias indicator | Existing `BiasIndicator` component, `size="sm"` |
| Skeleton | `h-24 bg-white/[0.04] rounded-lg animate-pulse` |
| Empty state icon | `Newspaper` from lucide, `h-5 w-5 text-white/20 mx-auto mb-2` |
| Empty state text | `text-sm text-white/30` |

## Component: PollerHealth

**File:** `src/components/poller-health.tsx`
**Type:** Client component (`"use client"`)

### Behavior

- Fetches `/api/poller-health` on mount + every 60 seconds
- Calculates minutes since `last_run`
- If fetch fails or table empty → hides itself
- Renders below `<BrokerPartners />` on dashboard

### Sizing (exact Tailwind classes)

| Element | Classes |
|---------|---------|
| Container | `flex items-center justify-center gap-2 py-4 text-[10px] text-white/30` |
| Dot (< 5 min) | `h-1.5 w-1.5 rounded-full bg-green-500` |
| Dot (5-15 min) | `h-1.5 w-1.5 rounded-full bg-yellow-500` |
| Dot (> 15 min) | `h-1.5 w-1.5 rounded-full bg-red-500` |
| Text | `font-mono` — "Updated 2m ago" |

## Files Changed

### Create:
- `src/app/api/live-feed/route.ts`
- `src/app/api/poller-health/route.ts`
- `src/components/live-news-ticker.tsx`
- `src/components/live-feed-section.tsx`
- `src/components/poller-health.tsx`

### Modify:
- `src/lib/queries.ts` — add `getLiveFeedArticles()` and `getPollerHealth()`
- `src/types/index.ts` — add `LiveArticle` interface
- `src/lib/utils.ts` — add `timeAgo()` utility
- `src/components/home-feed.tsx` — remove local `timeAgo()`, import from utils
- `src/app/(dashboard)/page.tsx` — add LiveNewsTicker + PollerHealth
- `src/app/(dashboard)/[instrument]/page.tsx` — add LiveFeedSection

### Do NOT modify:
- Any Python scraper files (`scraper/`)
- Database migration files (`drizzle/`)
- `.env`
- Auth or payment files

## Success Criteria

1. Dashboard shows live ticker with breaking news from last 24 hours
2. Instrument pages show "Live News" section filtered to that instrument
3. New articles appear within 60 seconds of poller posting them
4. Design matches existing institutional dark theme (verified class-by-class)
5. Mobile responsive — ticker stacks vertically, cards full-width
6. No performance regression — polling uses `setInterval`, not re-renders
7. Empty states handled: ticker hides if no articles in 2h, feed shows message if none in 24h
8. Poller health indicator shows freshness with colored dot
