# ForexPulse v2 — Institutional Research Platform Design

**Date:** 2026-03-09
**Status:** Approved
**Goal:** Rebuild ForexPulse as a JPMorgan-style institutional research portal with per-article AI reasoning chains, premium typography, and authoritative aesthetic.

---

## Aesthetic Direction

- **Style:** JPMorgan/Goldman Sachs research portal — clean, light, authoritative
- **Background:** Off-white (#fafafa)
- **Typography:** Serif headings (Georgia or similar premium serif) + Inter for body text
- **Colors:** Muted, institutional palette:
  - Bullish: Dark forest green (#15803d / green-700 range), not neon
  - Bearish: Burgundy/dark red (#b91c1c / red-700 range), not bright
  - Neutral: Slate gray
  - Accent: Deep navy or muted indigo for interactive elements
- **Borders:** Thin, sharp — no heavy rounded corners (use rounded-lg max, not rounded-2xl)
- **Shadows:** Minimal — borders over shadows for separation
- **Hover states:** Subtle background/border transitions, no scale/lift animations
- **Overall feel:** Like reading an institutional research PDF in a browser

---

## Pages

### 1. Dashboard (/)

**Top Navigation Bar:**
- "ForexPulse" wordmark in serif font (no icon logo)
- Instrument navigation tabs (horizontal, text-only with active underline)
- Current date stamp on the right

**Market Summary Strip:**
- Single horizontal bar showing all 7 instruments in a row
- Each: code + small colored indicator dot (green/red/gray for dominant bias)
- Dense, scannable at a glance

**Instrument Panels (below summary):**
- Grid layout, responsive (1 col mobile → 2 cols tablet → 3-4 cols desktop)
- Each panel:
  - Instrument code + name + flag/icon
  - 4 timeframe biases in a compact horizontal row (small pills, not tall badges)
  - 1-line daily bias summary text
  - Article count
  - "View Analysis →" text link
- Bordered panels with thin borders, no heavy card shadows
- Subtle hover: border darkens slightly

### 2. Instrument Detail Page (/[instrument])

**Header:**
- Instrument code (large, serif), name, flag/icon, category tag
- Back link to dashboard

**Timeframe Tabs:**
- Horizontal tab bar: Daily | 1 Week | 1 Month | 3 Months
- Underline-style active indicator (not filled background tabs)

**Bias Panel:**
- Direction badge (small, muted color) + confidence indicator
- Summary paragraph (the AI-generated bias summary)
- Key drivers as a clean numbered list

**Supporting Evidence Table:**
- Table/list rows, not cards
- Columns: Source | Title | Date | Impact (bullish/bearish tag)
- Each row links to the article detail page (/articles/[id])
- Clean horizontal rules between rows

**Other Recent News:**
- Same row format as supporting evidence
- Section divider with label

### 3. Article Detail Page (/articles/[id]) — NEW

**Header:**
- Article title (large, serif)
- Source name + published date + "Read Original →" button (prominent external link)

**AI Summary Section:**
- 2-3 paragraph summary of the article content
- Clearly labeled as "AI Summary"

**Impact Analysis (per affected instrument):**
- For each instrument this article is categorized under:
  - Instrument name/code with flag
  - **Structured Reasoning Chain:**
    - Event: What happened (1 sentence)
    - Mechanism: Why it affects this instrument (1-2 sentences)
    - Impact: Bullish/Bearish/Neutral + relevant timeframes
    - Confidence: High / Medium / Low
  - **Analyst Commentary:** 3-4 sentence written paragraph explaining the cause-and-effect
- Multiple instruments shown if article affects more than one

**Affected Instruments:**
- Tag links to each instrument's detail page

**Footer:**
- "Read Original Article" button (external link, opens in new tab)

### 4. Auth Pages (login/register)

- Minimal, centered forms
- Match the institutional aesthetic (serif heading, clean inputs)
- No gradient backgrounds — simple off-white

---

## Data Model Changes

### Modified Table: articles

Add column:
```sql
ALTER TABLE articles ADD COLUMN summary TEXT;
```

### New Table: article_analyses

```sql
CREATE TABLE article_analyses (
  id SERIAL PRIMARY KEY,
  article_id INT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  instrument TEXT NOT NULL REFERENCES instruments(code),
  event TEXT NOT NULL,
  mechanism TEXT NOT NULL,
  impact_direction TEXT NOT NULL,  -- "bullish" | "bearish" | "neutral"
  impact_timeframes JSONB,        -- ["daily", "1week", "1month"]
  confidence TEXT NOT NULL,        -- "high" | "medium" | "low"
  commentary TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (article_id, instrument)
);
```

### Updated Type: Article (TypeScript)

```typescript
interface Article {
  id: number;
  title: string;
  content: string | null;
  summary: string | null;        // NEW
  url: string;
  source: string | null;
  published_at: string | null;
  created_at: string;
}

interface ArticleAnalysis {       // NEW
  id: number;
  article_id: number;
  instrument: string;
  event: string;
  mechanism: string;
  impact_direction: "bullish" | "bearish" | "neutral";
  impact_timeframes: string[];
  confidence: "high" | "medium" | "low";
  commentary: string;
  generated_at: string;
}
```

---

## Pipeline Changes

### Current Flow
```
Scrape RSS → Categorize by instrument → Generate per-instrument bias → Store
```

### New Flow
```
Scrape RSS → Categorize by instrument → [NEW] Per-article analysis → Generate per-instrument bias → Store
```

### Per-Article Analysis Step (NEW)

For each newly scraped article:
1. Generate a 2-3 paragraph summary
2. For each instrument the article is categorized under, generate:
   - Event / Mechanism / Impact / Confidence (structured)
   - Analyst commentary (written paragraph)
3. Store in `articles.summary` and `article_analyses` table

### Updated Per-Instrument Bias Step

The existing bias generation can now reference pre-analyzed articles for higher quality output. The prompt can include the structured impact analyses rather than raw article content.

### Cost Impact

- Additional Claude API calls: ~1 call per batch of articles (batch 5-10 articles per call to stay efficient)
- Estimated additional cost: ~$0.02-0.05/day
- Total daily cost: ~$0.05-0.13/day

---

## New Queries Needed

```typescript
// Get article with its analyses
getArticleWithAnalyses(articleId: number): Promise<{article: Article, analyses: ArticleAnalysis[]}>

// Get analyses for an instrument (for the detail page evidence table)
getArticleAnalysesForInstrument(instrument: string, days: number): Promise<(Article & {analysis: ArticleAnalysis})[]>
```

---

## Component Architecture

### New Components
- `ArticlePage` — full article detail with summary + impact analyses
- `ImpactChain` — renders the Event → Mechanism → Impact → Confidence chain
- `AnalystCommentary` — renders the written paragraph
- `ArticleRow` — table row for article listings (replaces NewsArticleCard)
- `MarketSummaryStrip` — horizontal summary of all instruments

### Rebuilt Components
- `TopNav` — serif wordmark, cleaner tabs, date stamp
- `InstrumentPanel` — replaces InstrumentCard, more editorial layout
- `BiasIndicator` — replaces BiasBadge, smaller/muted institutional style
- `InstrumentDetail` — new layout with tab bar + evidence table
- `LoginForm` / `RegisterForm` — match institutional aesthetic

### Deleted Components
- `NewsArticleCard` — replaced by ArticleRow
- `InstrumentCard` — replaced by InstrumentPanel
- `BiasBadge` — replaced by BiasIndicator
- `BiasDetail` — rebuilt into InstrumentDetail page directly

---

## Font Strategy

```css
/* Headings: Serif for authority */
font-family: Georgia, 'Times New Roman', serif;

/* Body: Inter for readability */
font-family: Inter, system-ui, sans-serif;

/* Data/labels: Inter at smaller sizes */
```

If we want a more premium serif than Georgia, consider loading Playfair Display or Libre Baskerville from Google Fonts. Georgia is the safe zero-cost option.

---

## Color Tokens

```css
:root {
  --bg-primary: #fafafa;
  --bg-surface: #ffffff;
  --text-primary: #111827;
  --text-secondary: #4b5563;
  --text-muted: #9ca3af;
  --border: #e5e7eb;
  --border-strong: #d1d5db;

  --bullish: #15803d;
  --bullish-bg: #f0fdf4;
  --bearish: #b91c1c;
  --bearish-bg: #fef2f2;
  --neutral: #6b7280;
  --neutral-bg: #f9fafb;

  --accent: #1e3a5f;       /* deep navy */
  --accent-light: #dbeafe;
}
```
