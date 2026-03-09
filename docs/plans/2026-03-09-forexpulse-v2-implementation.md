# ForexPulse v2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild ForexPulse as an institutional research platform with per-article AI reasoning chains, JPMorgan-style aesthetic, and full UI overhaul.

**Architecture:** Three layers of change: (1) Database migration + new `article_analyses` table and `articles.summary` column, (2) Python pipeline adds per-article analysis step before the existing bias generation, (3) Full frontend rebuild — new pages, new components, new aesthetic with serif headings, muted institutional colors, and editorial layout.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Neon Postgres, Python 3.11+, Anthropic Claude API, Google Fonts (Libre Baskerville + Inter)

---

### Task 1: Database Migration — Add article_analyses table and articles.summary column

**Files:**
- Create: `drizzle/0002_article_analyses.sql`
- Modify: `scraper/database.py:1-73`

**Step 1: Create the migration SQL file**

Create `drizzle/0002_article_analyses.sql`:

```sql
-- Add summary column to articles
ALTER TABLE articles ADD COLUMN IF NOT EXISTS summary TEXT;

-- Per-article impact analysis (one row per article-instrument pair)
CREATE TABLE IF NOT EXISTS article_analyses (
  id SERIAL PRIMARY KEY,
  article_id INT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  instrument TEXT NOT NULL REFERENCES instruments(code),
  event TEXT NOT NULL,
  mechanism TEXT NOT NULL,
  impact_direction TEXT NOT NULL,
  impact_timeframes JSONB,
  confidence TEXT NOT NULL,
  commentary TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (article_id, instrument)
);

CREATE INDEX IF NOT EXISTS idx_article_analyses_article ON article_analyses(article_id);
CREATE INDEX IF NOT EXISTS idx_article_analyses_instrument ON article_analyses(instrument, generated_at DESC);
```

**Step 2: Run the migration against Neon**

Run:
```bash
# Get DATABASE_URL from .env.local
source <(grep DATABASE_URL .env.local | sed 's/^/export /')
psql "$DATABASE_URL" -f drizzle/0002_article_analyses.sql
```

Expected: Tables created successfully, no errors.

**Step 3: Add database methods for article analyses**

Add to `scraper/database.py` — two new methods on the `Database` class:

```python
def update_article_summary(self, article_id: int, summary: str):
    self.execute(
        "UPDATE articles SET summary = %s WHERE id = %s",
        (summary, article_id),
    )

def insert_article_analysis(
    self,
    article_id: int,
    instrument: str,
    event: str,
    mechanism: str,
    impact_direction: str,
    impact_timeframes: list[str],
    confidence: str,
    commentary: str,
):
    self.execute(
        """INSERT INTO article_analyses
           (article_id, instrument, event, mechanism, impact_direction, impact_timeframes, confidence, commentary)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
           ON CONFLICT (article_id, instrument) DO UPDATE SET
             event = EXCLUDED.event,
             mechanism = EXCLUDED.mechanism,
             impact_direction = EXCLUDED.impact_direction,
             impact_timeframes = EXCLUDED.impact_timeframes,
             confidence = EXCLUDED.confidence,
             commentary = EXCLUDED.commentary,
             generated_at = NOW()""",
        (article_id, instrument, event, mechanism, impact_direction,
         json.dumps(impact_timeframes), confidence, commentary),
    )

def get_unanalyzed_articles(self, days: int = 7) -> list[dict]:
    """Get articles from last N days that don't have a summary yet."""
    cur = self.execute(
        """SELECT a.id, a.title, a.content, a.source, a.published_at, a.url
           FROM articles a
           WHERE a.summary IS NULL
             AND a.published_at >= NOW() - INTERVAL '%s days'
           ORDER BY a.published_at DESC
           LIMIT 100""",
        (days,),
    )
    return [dict(row) for row in cur.fetchall()]
```

**Step 4: Verify by running a quick Python check**

Run:
```bash
cd /Users/a/forex-analysis && python3 -c "
from scraper.database import Database
import os
from dotenv import load_dotenv
load_dotenv('.env.local')
db = Database(os.getenv('DATABASE_URL'))
print('get_unanalyzed_articles:', len(db.get_unanalyzed_articles(days=90)))
db.close()
print('OK')
"
```

Expected: Prints count of articles and "OK" without errors.

**Step 5: Commit**

```bash
git add drizzle/0002_article_analyses.sql scraper/database.py
git commit -m "feat: add article_analyses table and database methods"
```

---

### Task 2: Per-Article Analyzer — AI generates summaries and impact chains

**Files:**
- Create: `scraper/article_analyzer.py`
- Modify: `scraper/main.py:1-98`

**Step 1: Create the article analyzer module**

Create `scraper/article_analyzer.py`:

```python
import json
import anthropic

SYSTEM_PROMPT = """You are a senior forex and CFD research analyst at a top investment bank.
You produce institutional-quality analysis of news articles for trading professionals.
You must respond in valid JSON only — no markdown, no explanation outside the JSON."""

ARTICLE_ANALYSIS_PROMPT = """Analyze these news articles and produce summaries and impact analyses.

For each article, generate:
1. A 2-3 paragraph institutional-quality summary
2. For each instrument the article affects, a structured impact analysis

Articles to analyze:
{articles_text}

Instruments each article is tagged with:
{instruments_text}

Respond ONLY with this exact JSON structure:
{{
  "articles": [
    {{
      "id": <article_id>,
      "summary": "2-3 paragraph summary of the article. Write like a Goldman Sachs morning brief — authoritative, concise, factual.",
      "impacts": [
        {{
          "instrument": "EURUSD",
          "event": "1 sentence: what happened",
          "mechanism": "1-2 sentences: the cause-effect chain explaining WHY this affects the instrument",
          "impact_direction": "bullish" | "bearish" | "neutral",
          "impact_timeframes": ["daily", "1week"],
          "confidence": "high" | "medium" | "low",
          "commentary": "3-4 sentence analyst paragraph. Write like a research note — explain the reasoning chain from event to market impact, reference historical precedent if relevant, note any caveats."
        }}
      ]
    }}
  ]
}}

Rules:
- summary must be 2-3 paragraphs, professional tone, no fluff
- event is factual: what happened in the article
- mechanism explains the economic transmission channel (e.g. "Higher rates attract capital inflows, strengthening the currency")
- impact_timeframes: which timeframes this is most relevant to
- confidence: high = direct and clear causal link, medium = indirect or contested, low = speculative
- commentary should read like a research analyst's note — authoritative but measured
- Only include instruments that are actually listed in the instruments_text for each article"""


class ArticleAnalyzer:
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-6"):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model

    def analyze_batch(self, articles: list[dict], article_instruments: dict[int, list[str]]) -> list[dict]:
        """Analyze a batch of articles (up to 10 at a time).

        Args:
            articles: list of article dicts with id, title, content, source, published_at
            article_instruments: mapping of article_id -> list of instrument codes

        Returns:
            list of dicts with id, summary, impacts
        """
        if not articles:
            return []

        articles_text = "\n\n---\n\n".join(
            f"[ARTICLE ID={a['id']}]\nTitle: {a['title']}\nSource: {a.get('source', 'Unknown')}\nDate: {str(a.get('published_at', ''))[:10]}\nContent:\n{str(a.get('content', ''))[:1500]}"
            for a in articles
        )

        instruments_text = "\n".join(
            f"Article {aid}: {', '.join(insts)}"
            for aid, insts in article_instruments.items()
            if insts
        )

        prompt = ARTICLE_ANALYSIS_PROMPT.format(
            articles_text=articles_text,
            instruments_text=instruments_text,
        )

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = response.content[0].text.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            result = json.loads(raw)
            return result.get("articles", [])
        except (json.JSONDecodeError, Exception) as e:
            print(f"[ArticleAnalyzer] Error: {e}")
            return []
```

**Step 2: Add per-article analysis step to the pipeline**

Modify `scraper/main.py`. After Step 2 (Store) and before Step 3 (Analyze), add a new Step 2.5. The full updated `run()` function:

```python
def run():
    print(f"\n{'='*60}")
    print(f"Forex Analysis Pipeline — {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC")
    print(f"{'='*60}\n")

    database_url = os.getenv("DATABASE_URL")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")

    if not database_url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)
    if not anthropic_key:
        print("ERROR: ANTHROPIC_API_KEY not set")
        sys.exit(1)

    db = Database(database_url)
    rss = RssScraper()
    analyzer = Analyzer(api_key=anthropic_key)
    article_analyzer = ArticleAnalyzer(api_key=anthropic_key)

    # Step 1: Scrape
    print("Step 1: Scraping RSS feeds...")
    articles = rss.scrape()
    print(f"  Found {len(articles)} relevant articles")

    # Step 2: Store
    print("\nStep 2: Storing articles...")
    stored = 0
    for article in articles:
        result = db.insert_article(
            title=article["title"],
            content=article["content"],
            url=article["url"],
            source=article["source"],
            published_at=article["published_at"],
            instruments=article["instruments"],
        )
        if result:
            stored += 1
    print(f"  Stored {stored} new articles ({len(articles) - stored} duplicates)")

    # Step 2.5: Per-article analysis
    print("\nStep 2.5: Generating per-article AI analysis...")
    unanalyzed = db.get_unanalyzed_articles(days=7)
    print(f"  {len(unanalyzed)} articles need analysis")

    # Process in batches of 8
    for i in range(0, len(unanalyzed), 8):
        batch = unanalyzed[i:i + 8]
        batch_ids = [a["id"] for a in batch]
        print(f"  Batch {i // 8 + 1}: articles {batch_ids}")

        # Get instruments for each article in this batch
        article_instruments = {}
        for a in batch:
            cur = db.execute(
                "SELECT instrument FROM article_instruments WHERE article_id = %s",
                (a["id"],),
            )
            article_instruments[a["id"]] = [row["instrument"] for row in cur.fetchall()]

        results = article_analyzer.analyze_batch(batch, article_instruments)

        for art_result in results:
            aid = art_result.get("id")
            if not aid:
                continue
            # Store summary
            summary = art_result.get("summary", "")
            if summary:
                db.update_article_summary(aid, summary)

            # Store per-instrument impacts
            for impact in art_result.get("impacts", []):
                try:
                    db.insert_article_analysis(
                        article_id=aid,
                        instrument=impact["instrument"],
                        event=impact["event"],
                        mechanism=impact["mechanism"],
                        impact_direction=impact["impact_direction"],
                        impact_timeframes=impact.get("impact_timeframes", []),
                        confidence=impact.get("confidence", "medium"),
                        commentary=impact["commentary"],
                    )
                except Exception as e:
                    print(f"    Error storing analysis for article {aid}: {e}")

        print(f"    Analyzed {len(results)} articles")

    # Step 3: Analyze (per-instrument bias — existing logic)
    print("\nStep 3: Generating AI bias analysis...")
    now = datetime.utcnow().isoformat()

    for instrument in INSTRUMENTS:
        print(f"\n  Analyzing {instrument}...")
        articles_for_inst = db.get_articles_for_instrument(instrument, days=90)
        print(f"    {len(articles_for_inst)} articles in last 90 days")

        if not articles_for_inst:
            print(f"    Skipping — no articles")
            continue

        bias = analyzer.analyze(instrument, articles_for_inst)

        for timeframe, result in bias.items():
            db.insert_bias(
                instrument=instrument,
                timeframe=timeframe,
                direction=result["direction"],
                summary=result.get("summary", ""),
                key_drivers=result.get("key_drivers", []),
                supporting_articles=result.get("supporting_articles", []),
                generated_at=now,
            )

        d = bias.get("daily", {}).get("direction", "?").upper()
        w = bias.get("1week", {}).get("direction", "?").upper()
        m = bias.get("1month", {}).get("direction", "?").upper()
        q = bias.get("3month", {}).get("direction", "?").upper()
        print(f"    Daily: {d} | 1W: {w} | 1M: {m} | 3M: {q}")

    db.close()
    print(f"\nPipeline complete!")
```

Add the import at the top of `scraper/main.py`:
```python
from scraper.article_analyzer import ArticleAnalyzer
```

**Step 3: Test the pipeline locally**

Run:
```bash
cd /Users/a/forex-analysis && python3 -m scraper.main
```

Expected: Pipeline runs, Step 2.5 processes unanalyzed articles in batches, summaries and analyses are stored in the database.

**Step 4: Commit**

```bash
git add scraper/article_analyzer.py scraper/main.py
git commit -m "feat: add per-article AI analysis step to pipeline"
```

---

### Task 3: TypeScript Types and Queries for Article Analyses

**Files:**
- Modify: `src/types/index.ts:1-31`
- Modify: `src/lib/queries.ts:1-69`

**Step 1: Update TypeScript types**

Replace the entire `src/types/index.ts` with:

```typescript
export interface Instrument {
  code: string;
  name: string;
  category: "forex" | "index";
}

export interface Article {
  id: number;
  title: string;
  content: string | null;
  summary: string | null;
  url: string;
  source: string | null;
  published_at: string | null;
  created_at: string;
}

export interface ArticleAnalysis {
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

export interface ArticleWithAnalyses extends Article {
  analyses: ArticleAnalysis[];
  instruments: string[];
}

export interface Bias {
  id: number;
  instrument: string;
  timeframe: "daily" | "1week" | "1month" | "3month";
  direction: "bullish" | "bearish" | "neutral";
  summary: string | null;
  key_drivers: string[] | null;
  supporting_articles: { article_id: number; relevance: string }[] | null;
  generated_at: string;
}

export interface InstrumentWithBias extends Instrument {
  biases: Record<string, Bias | null>;
  article_count: number;
}
```

**Step 2: Add new queries**

Add these functions to `src/lib/queries.ts`:

```typescript
export async function getArticleById(id: number): Promise<Article | null> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM articles WHERE id = ${id}`;
  return rows.length > 0 ? (rows[0] as Article) : null;
}

export async function getArticleAnalyses(articleId: number): Promise<ArticleAnalysis[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM article_analyses
    WHERE article_id = ${articleId}
    ORDER BY instrument
  `;
  return rows as ArticleAnalysis[];
}

export async function getArticleInstruments(articleId: number): Promise<string[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT instrument FROM article_instruments
    WHERE article_id = ${articleId}
    ORDER BY instrument
  `;
  return rows.map((r: any) => r.instrument);
}

export async function getArticlesWithAnalysesForInstrument(
  instrument: string,
  days: number = 7
): Promise<(Article & { analysis: ArticleAnalysis | null })[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT a.*, aa.event, aa.mechanism, aa.impact_direction, aa.impact_timeframes,
           aa.confidence, aa.commentary, aa.generated_at as analysis_generated_at
    FROM articles a
    JOIN article_instruments ai ON a.id = ai.article_id
    LEFT JOIN article_analyses aa ON a.id = aa.article_id AND aa.instrument = ${instrument}
    WHERE ai.instrument = ${instrument}
      AND a.published_at >= NOW() - INTERVAL '1 day' * ${days}
    ORDER BY a.published_at DESC
  `;
  return rows as any;
}
```

Update the imports at the top of `src/lib/queries.ts`:
```typescript
import type { Instrument, Article, ArticleAnalysis, Bias, InstrumentWithBias } from "@/types";
```

**Step 3: Verify build**

Run:
```bash
cd /Users/a/forex-analysis && npx next build 2>&1 | tail -15
```

Expected: "Compiled successfully"

**Step 4: Commit**

```bash
git add src/types/index.ts src/lib/queries.ts
git commit -m "feat: add TypeScript types and queries for article analyses"
```

---

### Task 4: Global Styles — Institutional Aesthetic with Serif Font

**Files:**
- Modify: `src/app/layout.tsx:1-28`
- Modify: `src/app/globals.css:1-113`

**Step 1: Update root layout to load Libre Baskerville serif font**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter, Libre_Baskerville } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const baskerville = Libre_Baskerville({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "ForexPulse — Fundamental Analysis",
  description: "AI-powered fundamental bias across forex and index instruments",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${baskerville.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
```

**Step 2: Replace globals.css with institutional theme**

Replace the entire `src/app/globals.css`:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-inter);
  --font-serif: var(--font-serif);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

:root {
  --background: #fafafa;
  --foreground: #111827;
  --card: #ffffff;
  --card-foreground: #111827;
  --popover: #ffffff;
  --popover-foreground: #111827;
  --primary: #1e3a5f;
  --primary-foreground: #ffffff;
  --secondary: #f3f4f6;
  --secondary-foreground: #1f2937;
  --muted: #f3f4f6;
  --muted-foreground: #6b7280;
  --accent: #f3f4f6;
  --accent-foreground: #1f2937;
  --destructive: #b91c1c;
  --border: #e5e7eb;
  --input: #e5e7eb;
  --ring: #1e3a5f;
  --chart-1: #1e3a5f;
  --chart-2: #15803d;
  --chart-3: #b91c1c;
  --chart-4: #d97706;
  --chart-5: #6b7280;
  --radius: 0.5rem;
  --sidebar: #ffffff;
  --sidebar-foreground: #111827;
  --sidebar-primary: #1e3a5f;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #f3f4f6;
  --sidebar-accent-foreground: #1f2937;
  --sidebar-border: #e5e7eb;
  --sidebar-ring: #1e3a5f;
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-[#fafafa] text-gray-900 antialiased;
  }
  html {
    scroll-behavior: smooth;
  }
}

/* Scrollbar — thin, subtle */
::-webkit-scrollbar {
  width: 5px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* Selection */
::selection {
  background: rgba(30, 58, 95, 0.12);
  color: #111827;
}
```

Key changes: primary color is now deep navy `#1e3a5f`, destructive/bearish is `#b91c1c` (burgundy), radius is `0.5rem` (sharper), background is `#fafafa`.

**Step 3: Verify build**

Run:
```bash
cd /Users/a/forex-analysis && npx next build 2>&1 | tail -10
```

Expected: "Compiled successfully"

**Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat: institutional aesthetic — serif font, navy palette, sharper radii"
```

---

### Task 5: Rebuild TopNav — Institutional Header with Date Stamp

**Files:**
- Modify: `src/components/top-nav.tsx`

**Step 1: Rewrite top-nav.tsx**

Replace the entire file:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { InstrumentIcon } from "./instrument-icon";
import type { Instrument } from "@/types";

interface TopNavProps {
  instruments: Instrument[];
}

export function TopNav({ instruments }: TopNavProps) {
  const pathname = usePathname();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-12 max-w-[1400px] items-center justify-between px-6 lg:px-10">
        {/* Left: Logo + instruments */}
        <div className="flex items-center gap-6">
          <Link href="/" className="shrink-0 cursor-pointer">
            <span className="font-serif text-lg font-bold tracking-tight text-[#1e3a5f]">
              ForexPulse
            </span>
          </Link>

          <div className="hidden sm:block h-4 w-px bg-gray-300" />

          <nav className="hidden sm:flex items-center gap-0.5 overflow-x-auto">
            {instruments.map((inst) => {
              const isActive = pathname === `/${inst.code}`;
              return (
                <Link
                  key={inst.code}
                  href={`/${inst.code}`}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 text-[13px] font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer border-b-2",
                    isActive
                      ? "border-[#1e3a5f] text-[#1e3a5f]"
                      : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300",
                  )}
                >
                  <InstrumentIcon code={inst.code} size="sm" />
                  {inst.code}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Date */}
        <span className="hidden md:block text-xs text-gray-400 font-medium">
          {today}
        </span>
      </div>
    </header>
  );
}
```

**Step 2: Verify build**

Run:
```bash
cd /Users/a/forex-analysis && npx next build 2>&1 | tail -10
```

Expected: "Compiled successfully"

**Step 3: Commit**

```bash
git add src/components/top-nav.tsx
git commit -m "feat: institutional top nav with serif wordmark, underline tabs, date stamp"
```

---

### Task 6: Rebuild Instrument Icon — Cleaner Flag Rendering

**Files:**
- Modify: `src/components/instrument-icon.tsx`

**Step 1: Rewrite instrument-icon.tsx**

Replace the entire file:

```tsx
import { BarChart3, Cpu, TrendingUp } from "lucide-react";

const FLAG_URL = "https://hatscripts.github.io/circle-flags/flags";

const instrumentConfig: Record<
  string,
  {
    type: "flags" | "icon";
    flags?: string[];
    icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    bgColor?: string;
    textColor?: string;
    label?: string;
  }
> = {
  DXY: { type: "flags", flags: ["us"] },
  EURUSD: { type: "flags", flags: ["eu", "us"] },
  GBPUSD: { type: "flags", flags: ["gb", "us"] },
  GER40: { type: "flags", flags: ["de"] },
  US30: { type: "icon", icon: BarChart3, bgColor: "bg-gray-100", textColor: "text-gray-600" },
  NAS100: { type: "icon", icon: Cpu, bgColor: "bg-gray-100", textColor: "text-gray-600" },
  SP500: { type: "icon", icon: TrendingUp, bgColor: "bg-gray-100", textColor: "text-gray-600" },
};

export function InstrumentIcon({
  code,
  size = "md",
}: {
  code: string;
  size?: "sm" | "md" | "lg";
}) {
  const config = instrumentConfig[code];
  if (!config) return null;

  const flagSizes = { sm: 18, md: 26, lg: 36 };
  const iconContainerSizes = { sm: 22, md: 30, lg: 40 };
  const iconInnerSizes = { sm: 12, md: 16, lg: 22 };
  const fs = flagSizes[size];
  const cs = iconContainerSizes[size];
  const is = iconInnerSizes[size];

  if (config.type === "flags" && config.flags) {
    return (
      <div className="flex items-center" style={{ minWidth: config.flags.length === 1 ? fs : fs + fs * 0.5 }}>
        {config.flags.map((flag, idx) => (
          <img
            key={flag}
            src={`${FLAG_URL}/${flag}.svg`}
            alt={flag.toUpperCase()}
            width={fs}
            height={fs}
            className="rounded-full ring-1 ring-gray-200"
            style={{
              marginLeft: idx > 0 ? -(fs * 0.25) : 0,
              zIndex: config.flags!.length - idx,
              position: "relative",
            }}
          />
        ))}
      </div>
    );
  }

  const Icon = config.icon!;
  return (
    <div
      className={`flex items-center justify-center rounded ${config.bgColor}`}
      style={{ width: cs, height: cs }}
    >
      <Icon className={config.textColor} style={{ width: is, height: is }} />
    </div>
  );
}

export { instrumentConfig };
```

**Step 2: Commit**

```bash
git add src/components/instrument-icon.tsx
git commit -m "feat: cleaner instrument icons with muted index backgrounds"
```

---

### Task 7: New BiasIndicator Component — Replaces BiasBadge

**Files:**
- Create: `src/components/bias-indicator.tsx`
- Delete: `src/components/bias-badge.tsx`

**Step 1: Create bias-indicator.tsx**

Create `src/components/bias-indicator.tsx`:

```tsx
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface BiasIndicatorProps {
  direction: "bullish" | "bearish" | "neutral" | null;
  label?: string;
  size?: "sm" | "md";
}

const dirConfig = {
  bullish: {
    icon: TrendingUp,
    text: "Bullish",
    dotColor: "bg-green-700",
    textColor: "text-green-800",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  bearish: {
    icon: TrendingDown,
    text: "Bearish",
    dotColor: "bg-red-800",
    textColor: "text-red-800",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  neutral: {
    icon: Minus,
    text: "Neutral",
    dotColor: "bg-gray-400",
    textColor: "text-gray-500",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
  },
};

export function BiasIndicator({ direction, label, size = "sm" }: BiasIndicatorProps) {
  const dir = direction ?? "neutral";
  const c = dirConfig[dir];
  const Icon = c.icon;

  if (size === "sm") {
    return (
      <div className="flex items-center gap-1.5">
        {label && (
          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider w-8">
            {label}
          </span>
        )}
        <div className={cn("h-2 w-2 rounded-full", c.dotColor)} />
        <span className={cn("text-xs font-semibold", c.textColor)}>{c.text}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 rounded border px-3 py-1.5", c.bgColor, c.borderColor)}>
      <Icon className={cn("h-3.5 w-3.5", c.textColor)} />
      <span className={cn("text-sm font-semibold", c.textColor)}>{c.text}</span>
      {label && <span className="text-xs text-gray-400 ml-1">{label}</span>}
    </div>
  );
}

export function BiasDirectionDot({ direction }: { direction: "bullish" | "bearish" | "neutral" | null }) {
  const dir = direction ?? "neutral";
  const c = dirConfig[dir];
  return <div className={cn("h-2.5 w-2.5 rounded-full", c.dotColor)} />;
}
```

**Step 2: Delete old bias-badge.tsx**

Run:
```bash
rm src/components/bias-badge.tsx
```

**Step 3: Commit**

```bash
git add src/components/bias-indicator.tsx
git rm src/components/bias-badge.tsx
git commit -m "feat: replace BiasBadge with institutional BiasIndicator"
```

---

### Task 8: Rebuild Dashboard Page — Market Overview

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`
- Delete: `src/components/instrument-card.tsx`

**Step 1: Rewrite dashboard layout**

Replace `src/app/(dashboard)/layout.tsx`:

```tsx
import { TopNav } from "@/components/top-nav";
import { getInstruments } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const instruments = await getInstruments();
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <TopNav instruments={instruments} />
      <main className="mx-auto max-w-[1400px] px-6 py-8 lg:px-10">{children}</main>
    </div>
  );
}
```

**Step 2: Rewrite dashboard page**

Replace `src/app/(dashboard)/page.tsx`:

```tsx
import Link from "next/link";
import { getInstrumentsWithBiases } from "@/lib/queries";
import { InstrumentIcon } from "@/components/instrument-icon";
import { BiasIndicator, BiasDirectionDot } from "@/components/bias-indicator";
import { ArrowRight, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const instruments = await getInstrumentsWithBiases();

  return (
    <div>
      {/* Page title */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold text-gray-900">Market Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          AI-powered fundamental bias across forex and index instruments
        </p>
      </div>

      {/* Market summary strip */}
      <div className="mb-8 flex items-center gap-6 border-y border-gray-200 py-3">
        {instruments.map((inst) => {
          const dominant = getDominantBias(inst.biases);
          return (
            <Link
              key={inst.code}
              href={`/${inst.code}`}
              className="flex items-center gap-2 text-sm cursor-pointer hover:opacity-70 transition-opacity"
            >
              <span className="font-semibold text-gray-700">{inst.code}</span>
              <BiasDirectionDot direction={dominant} />
            </Link>
          );
        })}
      </div>

      {/* Instrument panels */}
      <div className="grid grid-cols-1 gap-px bg-gray-200 rounded-lg overflow-hidden border border-gray-200 sm:grid-cols-2 xl:grid-cols-3">
        {instruments.map((inst) => {
          const dailyBias = inst.biases?.daily;
          return (
            <Link
              key={inst.code}
              href={`/${inst.code}`}
              className="bg-white p-5 transition-colors hover:bg-gray-50/50 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <InstrumentIcon code={inst.code} size="md" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-lg font-bold text-gray-900">{inst.code}</h3>
                      <span className={cn(
                        "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded",
                        inst.category === "forex" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                      )}>
                        {inst.category}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{inst.name}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300" />
              </div>

              {/* 4 timeframe biases in a row */}
              <div className="flex items-center gap-4 mb-3">
                <BiasIndicator direction={inst.biases?.daily?.direction ?? null} label="1D" />
                <BiasIndicator direction={inst.biases?.["1week"]?.direction ?? null} label="1W" />
                <BiasIndicator direction={inst.biases?.["1month"]?.direction ?? null} label="1M" />
                <BiasIndicator direction={inst.biases?.["3month"]?.direction ?? null} label="3M" />
              </div>

              {/* Daily summary line */}
              {dailyBias?.summary && (
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2">
                  {dailyBias.summary}
                </p>
              )}

              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <Newspaper className="h-3 w-3" />
                {inst.article_count} articles
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function getDominantBias(biases: Record<string, any>): "bullish" | "bearish" | "neutral" {
  const dirs = Object.values(biases ?? {}).map((b: any) => b?.direction).filter(Boolean);
  const bullish = dirs.filter((d) => d === "bullish").length;
  const bearish = dirs.filter((d) => d === "bearish").length;
  if (bullish > bearish) return "bullish";
  if (bearish > bullish) return "bearish";
  return "neutral";
}
```

**Step 3: Delete old instrument-card.tsx**

Run:
```bash
rm src/components/instrument-card.tsx
```

**Step 4: Verify build**

Run:
```bash
cd /Users/a/forex-analysis && npx next build 2>&1 | tail -10
```

Expected: "Compiled successfully"

**Step 5: Commit**

```bash
git rm src/components/instrument-card.tsx
git add src/app/\(dashboard\)/page.tsx src/app/\(dashboard\)/layout.tsx
git commit -m "feat: institutional dashboard — editorial grid, summary strip, serif headings"
```

---

### Task 9: Rebuild Instrument Detail Page

**Files:**
- Modify: `src/app/(dashboard)/[instrument]/page.tsx`
- Delete: `src/components/bias-detail.tsx`
- Delete: `src/components/news-article-card.tsx`

**Step 1: Rewrite the instrument detail page**

Replace `src/app/(dashboard)/[instrument]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getInstruments,
  getLatestBiases,
  getArticlesWithAnalysesForInstrument,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import { InstrumentIcon } from "@/components/instrument-icon";
import { BiasIndicator } from "@/components/bias-indicator";
import { ArrowLeft, ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ instrument: string }>;
  searchParams: Promise<{ tf?: string }>;
}

const tfLabels: Record<string, string> = {
  daily: "Daily",
  "1week": "1 Week",
  "1month": "1 Month",
  "3month": "3 Months",
};

const dayMap: Record<string, number> = {
  daily: 1,
  "1week": 7,
  "1month": 30,
  "3month": 90,
};

export default async function InstrumentPage({ params, searchParams }: PageProps) {
  const { instrument: instrumentParam } = await params;
  const { tf } = await searchParams;

  const instruments = await getInstruments();
  const inst = instruments.find((i) => i.code === instrumentParam.toUpperCase());
  if (!inst) notFound();

  const biases = await getLatestBiases(inst.code);
  const selectedTf = tf || "daily";
  const selectedBias = biases[selectedTf] ?? null;

  const articles = await getArticlesWithAnalysesForInstrument(
    inst.code,
    dayMap[selectedTf] ?? 7
  );

  const biasDir = selectedBias?.direction ?? "neutral";
  const DirectionIcon = biasDir === "bullish" ? TrendingUp : biasDir === "bearish" ? TrendingDown : Minus;
  const dirColor = biasDir === "bullish" ? "text-green-800" : biasDir === "bearish" ? "text-red-800" : "text-gray-500";

  // Split into supporting and other articles
  const supportingIds = new Set((selectedBias?.supporting_articles ?? []).map((sa) => sa.article_id));
  const supportingRelevance = new Map((selectedBias?.supporting_articles ?? []).map((sa) => [sa.article_id, sa.relevance]));
  const supportingArticles = articles.filter((a) => supportingIds.has(a.id));
  const otherArticles = articles.filter((a) => !supportingIds.has(a.id));

  return (
    <div>
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-[13px] text-gray-400 hover:text-gray-600 transition-colors cursor-pointer mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Market Overview
      </Link>

      {/* Instrument header */}
      <div className="flex items-center gap-4 mb-6">
        <InstrumentIcon code={inst.code} size="lg" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl font-bold text-gray-900">{inst.code}</h1>
            <span className={cn(
              "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded",
              inst.category === "forex" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
            )}>
              {inst.category}
            </span>
          </div>
          <p className="text-sm text-gray-500">{inst.name}</p>
        </div>
      </div>

      {/* Timeframe tabs — underline style */}
      <div className="flex items-center gap-0 border-b border-gray-200 mb-8">
        {Object.entries(tfLabels).map(([key, label]) => {
          const isSelected = key === selectedTf;
          const dir = biases[key]?.direction ?? "neutral";
          const dotColor = dir === "bullish" ? "bg-green-700" : dir === "bearish" ? "bg-red-800" : "bg-gray-400";
          return (
            <a
              key={key}
              href={`/${inst.code}?tf=${key}`}
              className={cn(
                "flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer",
                isSelected
                  ? "border-[#1e3a5f] text-[#1e3a5f]"
                  : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300"
              )}
            >
              {label}
              <div className={cn("h-2 w-2 rounded-full", dotColor)} />
            </a>
          );
        })}
      </div>

      {/* Bias analysis panel */}
      {selectedBias ? (
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <BiasIndicator direction={biasDir} size="md" />
            <span className="text-xs text-gray-400">
              Generated {new Date(selectedBias.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>

          <p className="text-[15px] leading-relaxed text-gray-700 max-w-3xl mb-6">
            {selectedBias.summary}
          </p>

          {/* Key drivers */}
          {selectedBias.key_drivers && selectedBias.key_drivers.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Key Drivers
              </h3>
              <ol className="space-y-2">
                {selectedBias.key_drivers.map((driver, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-100 text-[10px] font-bold text-gray-500">
                      {i + 1}
                    </span>
                    {driver}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-10 py-12 text-center border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-400">No analysis available for this timeframe yet.</p>
        </div>
      )}

      {/* Supporting Evidence */}
      {supportingArticles.length > 0 && (
        <div className="mb-10">
          <h2 className="font-serif text-lg font-bold text-gray-900 mb-4">
            Supporting Evidence
            <span className="ml-2 text-sm font-normal text-gray-400">{supportingArticles.length} articles</span>
          </h2>
          <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-200">
            {supportingArticles.map((article) => (
              <ArticleRow
                key={article.id}
                article={article}
                relevance={supportingRelevance.get(article.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Recent News */}
      {otherArticles.length > 0 && (
        <div className="mb-10">
          <h2 className="font-serif text-lg font-bold text-gray-900 mb-4">
            Other Recent News
            <span className="ml-2 text-sm font-normal text-gray-400">{otherArticles.length} articles</span>
          </h2>
          <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-200">
            {otherArticles.map((article) => (
              <ArticleRow key={article.id} article={article} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ArticleRow({
  article,
  relevance,
}: {
  article: any;
  relevance?: string;
}) {
  const impactDir = article.impact_direction;
  const timeAgo = getTimeAgo(article.published_at);

  return (
    <Link
      href={`/articles/${article.id}`}
      className="flex items-center gap-4 px-4 py-3 bg-white hover:bg-gray-50/80 transition-colors cursor-pointer"
    >
      {/* Impact dot */}
      {impactDir && (
        <div className={cn(
          "h-2 w-2 rounded-full shrink-0",
          impactDir === "bullish" ? "bg-green-700" : impactDir === "bearish" ? "bg-red-800" : "bg-gray-400"
        )} />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{article.title}</p>
        {relevance && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{relevance}</p>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 shrink-0">
        {article.source && (
          <span className="text-[11px] font-medium text-gray-400">{article.source}</span>
        )}
        <span className="text-[11px] text-gray-300">{timeAgo}</span>
      </div>
    </Link>
  );
}

function getTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Now";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
```

**Step 2: Delete old components**

Run:
```bash
rm src/components/bias-detail.tsx src/components/news-article-card.tsx
```

**Step 3: Verify build**

Run:
```bash
cd /Users/a/forex-analysis && npx next build 2>&1 | tail -15
```

Expected: "Compiled successfully"

**Step 4: Commit**

```bash
git rm src/components/bias-detail.tsx src/components/news-article-card.tsx
git add src/app/\(dashboard\)/\[instrument\]/page.tsx
git commit -m "feat: institutional instrument detail — underline tabs, evidence table rows"
```

---

### Task 10: New Article Detail Page — The Core Feature

**Files:**
- Create: `src/app/(dashboard)/articles/[id]/page.tsx`

**Step 1: Create the article detail page**

Create `src/app/(dashboard)/articles/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getArticleById,
  getArticleAnalyses,
  getArticleInstruments,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import { InstrumentIcon } from "@/components/instrument-icon";
import { ArrowLeft, ExternalLink, TrendingUp, TrendingDown, Minus, Shield } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

const confidenceConfig = {
  high: { label: "High Confidence", color: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
  medium: { label: "Medium Confidence", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  low: { label: "Low Confidence", color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200" },
};

export default async function ArticlePage({ params }: PageProps) {
  const { id } = await params;
  const articleId = parseInt(id, 10);
  if (isNaN(articleId)) notFound();

  const article = await getArticleById(articleId);
  if (!article) notFound();

  const analyses = await getArticleAnalyses(articleId);
  const instruments = await getArticleInstruments(articleId);

  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="max-w-3xl">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-[13px] text-gray-400 hover:text-gray-600 transition-colors cursor-pointer mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Market Overview
      </Link>

      {/* Article header */}
      <article>
        <header className="mb-8">
          <h1 className="font-serif text-2xl font-bold leading-snug text-gray-900 mb-3">
            {article.title}
          </h1>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            {article.source && (
              <span className="font-medium text-gray-600">{article.source}</span>
            )}
            {publishedDate && (
              <>
                <span className="text-gray-300">|</span>
                <span>{publishedDate}</span>
              </>
            )}
          </div>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#1e3a5f] hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Read Original Article
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </header>

        {/* AI Summary */}
        {article.summary && (
          <section className="mb-10">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              AI Summary
            </h2>
            <div className="text-[15px] leading-relaxed text-gray-700 space-y-4 border-l-2 border-gray-200 pl-5">
              {article.summary.split("\n\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>
        )}

        {/* Affected Instruments tags */}
        {instruments.length > 0 && (
          <div className="flex items-center gap-2 mb-8">
            <span className="text-xs text-gray-400 font-medium">Affects:</span>
            {instruments.map((code) => (
              <Link
                key={code}
                href={`/${code}`}
                className="inline-flex items-center gap-1.5 rounded border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <InstrumentIcon code={code} size="sm" />
                {code}
              </Link>
            ))}
          </div>
        )}

        {/* Impact Analyses */}
        {analyses.length > 0 && (
          <section>
            <h2 className="font-serif text-lg font-bold text-gray-900 mb-6">
              Impact Analysis
            </h2>

            <div className="space-y-8">
              {analyses.map((analysis) => {
                const DirectionIcon =
                  analysis.impact_direction === "bullish" ? TrendingUp
                  : analysis.impact_direction === "bearish" ? TrendingDown
                  : Minus;
                const dirColor =
                  analysis.impact_direction === "bullish" ? "text-green-800"
                  : analysis.impact_direction === "bearish" ? "text-red-800"
                  : "text-gray-500";
                const conf = confidenceConfig[analysis.confidence] ?? confidenceConfig.medium;

                return (
                  <div key={analysis.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Instrument header */}
                    <div className="flex items-center justify-between bg-gray-50 px-5 py-3 border-b border-gray-200">
                      <Link
                        href={`/${analysis.instrument}`}
                        className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity"
                      >
                        <InstrumentIcon code={analysis.instrument} size="sm" />
                        <span className="font-serif font-bold text-gray-900">
                          {analysis.instrument}
                        </span>
                      </Link>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <DirectionIcon className={cn("h-4 w-4", dirColor)} />
                          <span className={cn("text-sm font-bold uppercase", dirColor)}>
                            {analysis.impact_direction}
                          </span>
                        </div>
                        <div className={cn("flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium", conf.bg, conf.border, conf.color)}>
                          <Shield className="h-3 w-3" />
                          {conf.label}
                        </div>
                      </div>
                    </div>

                    {/* Structured chain */}
                    <div className="px-5 py-4 space-y-3">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                          Event
                        </span>
                        <p className="text-sm text-gray-700 mt-0.5">{analysis.event}</p>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                          Mechanism
                        </span>
                        <p className="text-sm text-gray-700 mt-0.5">{analysis.mechanism}</p>
                      </div>
                      {analysis.impact_timeframes && analysis.impact_timeframes.length > 0 && (
                        <div>
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                            Relevant Timeframes
                          </span>
                          <div className="flex gap-1.5 mt-1">
                            {analysis.impact_timeframes.map((tf: string) => (
                              <span key={tf} className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                                {tf}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Analyst commentary */}
                    <div className="border-t border-gray-200 bg-gray-50/50 px-5 py-4">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Analyst Commentary
                      </span>
                      <p className="text-sm leading-relaxed text-gray-700 mt-1">
                        {analysis.commentary}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <div className="mt-10 pt-6 border-t border-gray-200">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded bg-[#1e3a5f] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#162d4a] transition-colors cursor-pointer"
          >
            Read Original Article
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </article>
    </div>
  );
}
```

**Step 2: Verify build**

Run:
```bash
cd /Users/a/forex-analysis && npx next build 2>&1 | tail -15
```

Expected: "Compiled successfully"

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/articles/\[id\]/page.tsx
git commit -m "feat: article detail page with AI summary, impact chains, analyst commentary"
```

---

### Task 11: Rebuild Auth Pages to Match Institutional Aesthetic

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/register/page.tsx`
- Modify: `src/components/login-form.tsx`

**Step 1: Read current auth pages**

Read `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`, and `src/components/login-form.tsx` to understand the current implementation.

**Step 2: Rewrite login page**

Replace `src/app/(auth)/login/page.tsx`:

```tsx
import { LoginForm } from "@/components/login-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-2xl font-bold text-gray-900">ForexPulse</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to your account</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <LoginForm />
        </div>

        <p className="mt-4 text-center text-sm text-gray-400">
          No account?{" "}
          <Link href="/register" className="text-[#1e3a5f] hover:underline cursor-pointer">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
```

**Step 3: Rewrite register page**

Replace `src/app/(auth)/register/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
      }),
    });

    if (res.ok) {
      router.push("/login");
    } else {
      const data = await res.json();
      setError(data.error || "Registration failed");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-2xl font-bold text-gray-900">ForexPulse</h1>
          <p className="mt-1 text-sm text-gray-500">Create your account</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                placeholder="Min 8 characters"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded bg-[#1e3a5f] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#162d4a] transition-colors cursor-pointer"
            >
              Create Account
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link href="/login" className="text-[#1e3a5f] hover:underline cursor-pointer">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
```

**Step 4: Rewrite login-form.tsx**

Replace `src/components/login-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);

    const res = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#1e3a5f] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
          placeholder="Your password"
        />
      </div>
      <button
        type="submit"
        className="w-full rounded bg-[#1e3a5f] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#162d4a] transition-colors cursor-pointer"
      >
        Sign In
      </button>
    </form>
  );
}
```

**Step 5: Verify build**

Run:
```bash
cd /Users/a/forex-analysis && npx next build 2>&1 | tail -10
```

Expected: "Compiled successfully"

**Step 6: Commit**

```bash
git add src/app/\(auth\)/login/page.tsx src/app/\(auth\)/register/page.tsx src/components/login-form.tsx
git commit -m "feat: institutional auth pages — serif headings, clean forms, navy accent"
```

---

### Task 12: Run Pipeline to Generate Article Analyses

**Step 1: Run the full pipeline**

Run:
```bash
cd /Users/a/forex-analysis && python3 -m scraper.main
```

Expected: Pipeline runs all steps including the new Step 2.5 (per-article analysis). Summaries and impact analyses are stored in the database.

**Step 2: Verify data was written**

Run:
```bash
cd /Users/a/forex-analysis && python3 -c "
from scraper.database import Database
import os
from dotenv import load_dotenv
load_dotenv('.env.local')
db = Database(os.getenv('DATABASE_URL'))
cur = db.execute('SELECT COUNT(*) as c FROM article_analyses')
print('article_analyses rows:', cur.fetchone()['c'])
cur = db.execute('SELECT COUNT(*) as c FROM articles WHERE summary IS NOT NULL')
print('articles with summaries:', cur.fetchone()['c'])
db.close()
"
```

Expected: Non-zero counts for both.

**Step 3: Commit (no code changes, just verification)**

No commit needed — this is a data generation step.

---

### Task 13: Final Build, Deploy, and Verify

**Step 1: Full build check**

Run:
```bash
cd /Users/a/forex-analysis && npx next build 2>&1 | tail -20
```

Expected: "Compiled successfully" with all routes listed.

**Step 2: Push to deploy**

Run:
```bash
git push
```

Expected: Vercel auto-deploys from main branch.

**Step 3: Verify all pages render**

Check:
- Dashboard (`/`) — serif headings, summary strip, editorial grid
- Instrument detail (`/EURUSD`) — underline tabs, evidence table rows
- Article detail (`/articles/1`) — summary, impact chains, analyst commentary
- Login (`/login`) — clean institutional form
- Register (`/register`) — matching style
