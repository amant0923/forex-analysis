# ForexPulse v2 — Dashboard Redesign Design

**Date:** 2026-03-09
**Approach:** Incremental enhancement (Approach A) — restyle and enrich existing pages, no architectural changes.
**Data:** All required data already exists in Neon (biases, article_analyses, articles). No schema changes needed.

---

## 1. Visual Aesthetic & Navigation

**TopNav** goes dark — charcoal/navy (`#1a1f2e`):
- "ForexPulse" wordmark in white serif (Libre Baskerville)
- Instrument tabs as compact pills: code + small flag icon, white text, active tab gets subtle lighter background
- Right side: current date stamp + user avatar/logout
- Thin accent line at bottom (solid `#2563eb`)

**Content area** stays light (`#fafafa`) with existing institutional typography (serif headings, Inter body).

Hybrid feel: terminal header, research content below.

---

## 2. Dashboard — Dense Instrument Cards

Each instrument card is a mini research briefing:

- **Header row:** Flag icon + instrument code + name + category tag ("forex"/"index")
- **Bias strip:** 4 compact bias pills (1D | 1W | 1M | 3M) — green/red/gray with direction text
- **Daily summary:** 1-2 sentence summary from daily bias
- **Key drivers:** Top 2-3 key drivers as compact bullet points (from `biases.key_drivers`)
- **Latest headline:** Most recent article title + impact direction badge — immediate "why" context
- **Footer:** Article count + "View Details" link

**Layout:** 2-column grid on desktop (cards need room for extra content), 1-column on mobile.

Goal: glance at dashboard, immediately understand the bias AND reasoning without clicking.

---

## 3. Expanded Instrument Card (Inline Detail)

Clicking a card expands it inline (accordion-style, pushes other cards down):

### Bias Tabs (Daily | 1 Week | 1 Month | 3 Months)
Each tab shows:
- Direction badge (Bullish/Bearish/Neutral) with confidence level
- Summary paragraph (2-3 sentences of market context)
- Key drivers as numbered list (2-4 factors)

### Headline Dashboard
Not a plain article list — a grid/table where each row shows:
- Headline title (clickable — goes to `/articles/[id]`)
- Source + date
- Impact direction badge (bullish/bearish/neutral)
- 1-sentence mechanism — WHY this news affects the instrument (from `article_analyses.mechanism`)
- Confidence pill (High/Med/Low)

### Behavior
- Only one card expanded at a time — expanding another auto-collapses the current one
- Smooth CSS transition on expand/collapse
- Collapse button / click again to close
- "Open Full Page" link navigates to `/[instrument]` for even deeper detail

---

## 4. Instrument Detail Page (`/[instrument]`) — Deep Analysis

Full research report page. Not a list of articles — structured analytical breakdown.

### Top Section — Bias Overview
- Instrument header with flag, name, category
- Tabbed bias panels (Daily | 1W | 1M | 3M) — same as expanded card but with more room
- Key drivers with more detail

### Main Section — Article Analysis Dashboard

Each article rendered as a **full analysis card** (not a row):

- **Headline + source + date** (link to original)
- **AI Summary** — 2-3 paragraph summary (from `articles.summary`)
- **Impact Analysis** (from `article_analyses`):
  - **Event:** What happened (1 sentence)
  - **Mechanism:** Why this affects the instrument (1-2 sentences)
  - **Impact direction** badge + **confidence** badge
  - **Relevant timeframes** as pills (Daily, 1 Week, 1 Month)
  - **Analyst Commentary:** 3-4 sentence deep analysis paragraph
- Clear visual separator between articles

**Ordering:** Most recent first. High-confidence articles visually emphasized (stronger border or subtle highlight).

**Key difference from dashboard expansion:** Dashboard gives headline + 1-sentence mechanism. This page gives full summary, full reasoning chain, and full analyst commentary for every article.

---

## 5. Error Handling & Empty States

- **No data for a timeframe:** "No analysis available for this timeframe" — muted text, not blank
- **No articles for an instrument:** "No recent articles affecting this instrument" with subtle icon
- **Expanded card loading:** Brief skeleton/shimmer while fetching detail data
- **Database connection issues:** Graceful fallback message, not a crash

---

## Files to Modify

- `src/app/(dashboard)/page.tsx` — dashboard with dense cards + inline expansion
- `src/app/(dashboard)/layout.tsx` — dark nav styling
- `src/app/(dashboard)/[instrument]/page.tsx` — deep analysis article cards
- `src/components/top-nav.tsx` — dark theme restyle
- `src/components/bias-indicator.tsx` — compact bias pills for card strip
- `src/app/globals.css` — dark nav tokens, expansion transitions
- `src/lib/queries.ts` — may need query for latest article per instrument (for dashboard card)

## No Changes Needed

- Database schema (all data exists)
- Scraper pipeline
- Auth pages
- Article detail page (`/articles/[id]`) — already has full reasoning chains
