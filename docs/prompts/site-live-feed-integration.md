# Tradeora Site Integration — Real-Time Live Feed

## Context

Tradeora is a forex/CFD fundamental analysis platform. We just built a real-time Telegram channel that polls 35 news sources every 3 minutes and posts breaking news with instrument bias tags. The scraper stores all articles in the `articles` table with a `posted_to_channel` boolean and `channel_posted_at` timestamp.

**The site currently only shows articles from the daily morning batch.** We need to make it show articles in real-time as they arrive throughout the day, matching the Telegram channel's speed.

## What Already Exists

### Database (already has these columns — migration already applied):
```sql
-- On articles table:
posted_to_channel BOOLEAN DEFAULT FALSE
channel_posted_at TIMESTAMP

-- New table:
telegram_drafts (id, article_id, formatted_message, image_url, chart_path, relevance_score, source_tier, status, created_at, posted_at)

-- New table:
poller_heartbeat (id, last_run, articles_found, errors)
```

### Backend (Python scraper — DO NOT MODIFY):
- `scraper/poller.py` — polls every 3 min, stores articles, posts to Telegram
- `scraper/sources.py` — 35 curated sources with tier system (0-3)
- `scraper/quality_filter.py` — scores articles 0-100
- Articles are stored with `posted_to_channel=TRUE` when posted to channel

### Frontend Stack:
- Next.js 16 App Router, force-dynamic server components
- Tailwind 4 (no tailwind.config.ts), dark theme (#09090b background)
- Glass morphism cards: `rgba(255,255,255,0.06)` bg, `rgba(255,255,255,0.10)` borders
- Typography: Libre Baskerville (serif headings), Inter (body), JetBrains Mono (data)
- Colors: green-500 (bullish), red-500 (bearish), white/60 (muted)
- Icons: lucide-react
- DB: @neondatabase/serverless via `src/lib/db.ts` → `getDb()`
- Queries: `src/lib/queries.ts`
- Types: `src/types/index.ts`
- Components: `src/components/` + `src/components/ui/`

### Key Files to Understand Before Coding:
- `src/app/(dashboard)/page.tsx` — main dashboard (renders HomeFeed, MarketSentiment, UpcomingEvents)
- `src/app/(dashboard)/[instrument]/page.tsx` — instrument detail page
- `src/components/home-feed.tsx` — main news feed component (client component)
- `src/lib/queries.ts` — all database query functions
- `src/types/index.ts` — TypeScript interfaces
- `src/app/globals.css` — all styles and design tokens

## Changes Required

### 1. New API Route: `/api/live-feed`
Create `src/app/api/live-feed/route.ts`

- GET endpoint returning articles posted to the channel in the last 24 hours
- Query: `SELECT * FROM articles WHERE posted_to_channel = TRUE AND channel_posted_at > NOW() - INTERVAL '24 hours' ORDER BY channel_posted_at DESC LIMIT 50`
- Join with `article_instruments` to include affected instruments
- Join with `biases` to include latest bias direction + confidence per instrument
- Return JSON: `{ articles: [{ id, title, source, channel_posted_at, summary, instruments: [{ code, direction, confidence }] }] }`
- No auth required (public data for the channel)

### 2. New Component: LiveNewsTicker
Create `src/components/live-news-ticker.tsx`

- Client component that polls `/api/live-feed` every 60 seconds
- Shows a horizontal scrolling ticker or compact list of the latest 5-10 breaking news items
- Each item: source badge + title (truncated) + time ago + instrument tags with bias colors
- Clicking an item navigates to the article detail page
- Use a subtle pulsing green dot to indicate "LIVE"
- Style: glass-sm card, compact, fits above the main feed
- If no live articles in last 2 hours, hide the component entirely

### 3. New Component: LiveFeedSection
Create `src/components/live-feed-section.tsx`

- Client component for the instrument detail page
- Shows articles posted to channel that affect this specific instrument
- Polls `/api/live-feed?instrument=XAUUSD` every 60 seconds
- Each article card shows:
  - Time posted (relative: "5 min ago", "2 hours ago")
  - Title
  - Source name + source tier badge (Tier 0 = "Official", Tier 1 = "Wire", etc.)
  - Impact direction with bias indicator (reuse existing `bias-indicator.tsx`)
  - First 2 sentences of content/summary
- Chronological order, newest first
- Heading: "Live News" with pulsing green dot
- If no articles for this instrument in last 24h, show "No breaking news for [instrument] today"

### 4. Update Dashboard Page
Modify `src/app/(dashboard)/page.tsx`

- Add `<LiveNewsTicker />` component above the existing `<HomeFeed />` component
- Fetch initial live feed data server-side and pass as props for instant render (hydration)

### 5. Update Instrument Detail Page
Modify `src/app/(dashboard)/[instrument]/page.tsx`

- Add `<LiveFeedSection instrument={instrument} />` between the TradingView chart and the bias analysis panel
- This gives users breaking news context before they read the morning bias

### 6. Update `/api/live-feed` to support instrument filtering
- Accept optional `?instrument=XAUUSD` query param
- When provided, filter to articles linked to that instrument via `article_instruments` table

### 7. Poller Health Indicator (optional, nice-to-have)
Add to the dashboard footer or settings page:
- Query `poller_heartbeat` table for `last_run` timestamp
- Show "Last updated X min ago" with green/yellow/red dot
- Green: < 5 min, Yellow: 5-15 min, Red: > 15 min (poller may be down)

## Design Guidelines

- Match the existing institutional dark theme exactly
- Use glass morphism cards (`glass-sm` class) for new components
- Keep the serif/sans font split (Libre Baskerville for section headers, Inter for content)
- Bullish = green-500, Bearish = red-500 (match existing `bias-indicator.tsx` patterns)
- Animations: subtle fade-in for new articles (use `motion` library already installed)
- Mobile responsive: stack vertically on small screens
- The live feed should feel premium and institutional, not cluttered

## Skills and Agents to Use

Use these skills/agents in this order:

1. **Use `/superpowers:brainstorming`** before writing any code — brainstorm the component design, confirm the API structure, and get alignment on the UI approach

2. **Use `/superpowers:writing-plans`** to create a task-by-task implementation plan with TDD

3. **Use `/superpowers:subagent-driven-development`** to execute the plan with:
   - **Frontend Developer agent** for React/Next.js component implementation
   - **Backend Architect agent** for the API route
   - **UI Designer agent** for visual design decisions
   - **Code Reviewer agent** for reviewing each completed task

4. **Use `/senior-frontend`** when building the React components — it has Next.js and Tailwind expertise

5. **Use `/superpowers:test-driven-development`** for each component — write tests first

6. **Use `/superpowers:verification-before-completion`** before claiming anything is done — actually run the dev server and verify

7. **Use `/qa`** after all changes are complete — test the live feed on the running site

## Files You'll Touch

### Create:
- `src/app/api/live-feed/route.ts`
- `src/components/live-news-ticker.tsx`
- `src/components/live-feed-section.tsx`

### Modify:
- `src/app/(dashboard)/page.tsx` — add LiveNewsTicker
- `src/app/(dashboard)/[instrument]/page.tsx` — add LiveFeedSection
- `src/lib/queries.ts` — add query functions for live feed data
- `src/types/index.ts` — add LiveArticle type if needed

### Do NOT modify:
- Any Python scraper files (`scraper/`)
- Database migration files (`drizzle/`)
- The `.env` file
- Authentication or payment files

## Success Criteria

1. Dashboard shows a live news ticker with breaking news from the last 24 hours
2. Instrument pages show a "Live News" section with articles relevant to that instrument
3. New articles appear within 60 seconds of being posted by the poller (client-side polling)
4. The design matches the existing institutional dark theme perfectly
5. Mobile responsive — works on phone screens
6. No performance regression — the polling doesn't cause excessive re-renders
7. Empty states handled gracefully (no live news = component hidden or "No breaking news" message)
