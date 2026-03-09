# Dashboard Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the ForexPulse dashboard with a Bloomberg-hybrid aesthetic (dark nav, light content), dense instrument cards with inline accordion expansion showing reasoning chains, and a rich instrument detail page with full article analysis cards.

**Architecture:** Pure frontend changes. No database or schema changes — all data already exists in Neon (`biases`, `article_analyses`, `articles`). One new query needed (latest article per instrument for dashboard cards). Dashboard becomes a client component for accordion state. Instrument detail page gets richer article rendering.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript, Lucide React icons, Libre Baskerville + Inter fonts

---

### Task 1: Add query for latest article + analysis per instrument

**Files:**
- Modify: `src/lib/queries.ts:26-44`
- Modify: `src/types/index.ts:47-50`

**Step 1: Add the `latestArticle` field to `InstrumentWithBias` type**

In `src/types/index.ts`, change:

```typescript
export interface InstrumentWithBias extends Instrument {
  biases: Record<string, Bias | null>;
  article_count: number;
}
```

to:

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
}
```

**Step 2: Update `getInstrumentsWithBiases` to fetch latest article**

In `src/lib/queries.ts`, replace the `getInstrumentsWithBiases` function with:

```typescript
export async function getInstrumentsWithBiases(): Promise<InstrumentWithBias[]> {
  const instruments = await getInstruments();
  const results: InstrumentWithBias[] = [];

  for (const inst of instruments) {
    const biases = await getLatestBiases(inst.code);
    const sql = getDb();
    const countRows = await sql`
      SELECT COUNT(*) as count FROM article_instruments
      WHERE instrument = ${inst.code}
    `;

    // Get the most recent article with its analysis for this instrument
    const latestRows = await sql`
      SELECT a.id, a.title, a.source, aa.impact_direction, aa.mechanism
      FROM articles a
      JOIN article_instruments ai ON a.id = ai.article_id
      LEFT JOIN article_analyses aa ON a.id = aa.article_id AND aa.instrument = ${inst.code}
      WHERE ai.instrument = ${inst.code}
      ORDER BY a.published_at DESC
      LIMIT 1
    `;

    results.push({
      ...inst,
      biases,
      article_count: Number(countRows[0].count),
      latestArticle: latestRows.length > 0
        ? {
            id: latestRows[0].id,
            title: latestRows[0].title,
            source: latestRows[0].source,
            impact_direction: latestRows[0].impact_direction ?? null,
            mechanism: latestRows[0].mechanism ?? null,
          }
        : null,
    });
  }
  return results;
}
```

**Step 3: Verify build**

Run: `npx next build 2>&1 | tail -10`
Expected: Compiles successfully (no type errors).

**Step 4: Commit**

```bash
git add src/types/index.ts src/lib/queries.ts
git commit -m "feat: add latest article + analysis to instrument query"
```

---

### Task 2: Restyle TopNav to dark theme

**Files:**
- Modify: `src/components/top-nav.tsx:1-62`

**Step 1: Replace the entire TopNav component**

Replace the content of `src/components/top-nav.tsx` with:

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
    <header className="sticky top-0 z-50 w-full bg-[#1a1f2e] border-b border-[#2a3040]">
      <div className="mx-auto flex h-12 max-w-[1400px] items-center justify-between px-6 lg:px-10">
        <div className="flex items-center gap-6">
          <Link href="/" className="shrink-0 cursor-pointer">
            <span className="font-serif text-lg font-bold tracking-tight text-white">
              ForexPulse
            </span>
          </Link>

          <div className="hidden sm:block h-4 w-px bg-gray-600" />

          <nav className="hidden sm:flex items-center gap-0.5 overflow-x-auto">
            {instruments.map((inst) => {
              const isActive = pathname === `/${inst.code}`;
              return (
                <Link
                  key={inst.code}
                  href={`/${inst.code}`}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded text-[13px] font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer",
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:text-white hover:bg-white/5",
                  )}
                >
                  <InstrumentIcon code={inst.code} size="sm" />
                  {inst.code}
                </Link>
              );
            })}
          </nav>
        </div>

        <span className="hidden md:block text-xs text-gray-500 font-medium">
          {today}
        </span>
      </div>
      {/* Accent line */}
      <div className="h-[2px] bg-[#2563eb]" />
    </header>
  );
}
```

**Step 2: Verify dev server**

Run: `npx next build 2>&1 | tail -10`
Expected: Compiles successfully.

**Step 3: Commit**

```bash
git add src/components/top-nav.tsx
git commit -m "feat: dark charcoal nav with blue accent line"
```

---

### Task 3: Rebuild dashboard as client component with accordion expansion

This is the largest task — the dashboard becomes a client component for expand/collapse state. It includes dense cards with key drivers + latest headline, and inline expansion with bias tabs and headline dashboard.

**Files:**
- Modify: `src/app/(dashboard)/page.tsx:1-103`
- Create: `src/app/api/instrument-detail/route.ts` (API route for expanded card data)

**Step 1: Create the API route for expanded card data**

Create `src/app/api/instrument-detail/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import {
  getLatestBiases,
  getArticlesWithAnalysesForInstrument,
} from "@/lib/queries";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  const biases = await getLatestBiases(code);
  const articles = await getArticlesWithAnalysesForInstrument(code, 30);

  return NextResponse.json({ biases, articles });
}
```

**Step 2: Replace the dashboard page**

Replace the entire content of `src/app/(dashboard)/page.tsx` with:

```tsx
import { getInstrumentsWithBiases } from "@/lib/queries";
import { DashboardClient } from "@/components/dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const instruments = await getInstrumentsWithBiases();

  return <DashboardClient instruments={instruments} />;
}
```

**Step 3: Create the DashboardClient component**

Create `src/components/dashboard-client.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { InstrumentIcon } from "@/components/instrument-icon";
import { BiasIndicator, BiasDirectionDot } from "@/components/bias-indicator";
import { ArrowRight, Newspaper, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InstrumentWithBias, Bias, ArticleAnalysis } from "@/types";

interface DashboardClientProps {
  instruments: InstrumentWithBias[];
}

const tfKeys = ["daily", "1week", "1month", "3month"] as const;
const tfLabels: Record<string, string> = {
  daily: "Daily",
  "1week": "1 Week",
  "1month": "1 Month",
  "3month": "3 Months",
};

export function DashboardClient({ instruments }: DashboardClientProps) {
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<any>(null);
  const [expandedTf, setExpandedTf] = useState("daily");
  const [loading, setLoading] = useState(false);

  async function toggleExpand(code: string) {
    if (expandedCode === code) {
      setExpandedCode(null);
      setExpandedData(null);
      return;
    }

    setExpandedCode(code);
    setExpandedTf("daily");
    setLoading(true);

    try {
      const res = await fetch(`/api/instrument-detail?code=${code}`);
      const data = await res.json();
      setExpandedData(data);
    } catch {
      setExpandedData(null);
    } finally {
      setLoading(false);
    }
  }

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
            <button
              key={inst.code}
              onClick={() => toggleExpand(inst.code)}
              className="flex items-center gap-2 text-sm cursor-pointer hover:opacity-70 transition-opacity"
            >
              <span className="font-semibold text-gray-700">{inst.code}</span>
              <BiasDirectionDot direction={dominant} />
            </button>
          );
        })}
      </div>

      {/* Instrument cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {instruments.map((inst) => {
          const dailyBias = inst.biases?.daily;
          const isExpanded = expandedCode === inst.code;

          return (
            <div
              key={inst.code}
              className={cn(
                "bg-white rounded-lg border transition-all duration-300",
                isExpanded ? "border-[#2563eb] sm:col-span-2 shadow-sm" : "border-gray-200"
              )}
            >
              {/* Compact card — always visible */}
              <button
                onClick={() => toggleExpand(inst.code)}
                className="w-full text-left p-5 cursor-pointer"
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
                  {isExpanded
                    ? <ChevronUp className="h-4 w-4 text-gray-400" />
                    : <ChevronDown className="h-4 w-4 text-gray-300" />
                  }
                </div>

                {/* Bias strip */}
                <div className="flex items-center gap-4 mb-3">
                  <BiasIndicator direction={inst.biases?.daily?.direction ?? null} label="1D" />
                  <BiasIndicator direction={inst.biases?.["1week"]?.direction ?? null} label="1W" />
                  <BiasIndicator direction={inst.biases?.["1month"]?.direction ?? null} label="1M" />
                  <BiasIndicator direction={inst.biases?.["3month"]?.direction ?? null} label="3M" />
                </div>

                {/* Daily summary */}
                {dailyBias?.summary && (
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2">
                    {dailyBias.summary}
                  </p>
                )}

                {/* Key drivers */}
                {dailyBias?.key_drivers && dailyBias.key_drivers.length > 0 && (
                  <div className="mb-2">
                    {dailyBias.key_drivers.slice(0, 3).map((driver, i) => (
                      <p key={i} className="text-[11px] text-gray-400 leading-snug truncate">
                        <span className="text-gray-500 font-semibold mr-1">{i + 1}.</span>
                        {driver}
                      </p>
                    ))}
                  </div>
                )}

                {/* Latest headline */}
                {inst.latestArticle && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                    {inst.latestArticle.impact_direction && (
                      <BiasDirectionDot direction={inst.latestArticle.impact_direction} />
                    )}
                    <p className="text-xs text-gray-600 font-medium truncate flex-1">
                      {inst.latestArticle.title}
                    </p>
                    {inst.latestArticle.source && (
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {inst.latestArticle.source}
                      </span>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-2">
                  <Newspaper className="h-3 w-3" />
                  {inst.article_count} articles
                </div>
              </button>

              {/* Expanded section */}
              {isExpanded && (
                <div className="border-t border-gray-200 p-5">
                  {loading ? (
                    <ExpandedSkeleton />
                  ) : expandedData ? (
                    <ExpandedContent
                      code={inst.code}
                      data={expandedData}
                      selectedTf={expandedTf}
                      onTfChange={setExpandedTf}
                    />
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-8">Failed to load data.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExpandedSkeleton() {
  return (
    <div className="animate-pulse space-y-4 py-4">
      <div className="flex gap-2">
        {[1,2,3,4].map(i => <div key={i} className="h-8 w-20 bg-gray-100 rounded" />)}
      </div>
      <div className="h-4 bg-gray-100 rounded w-3/4" />
      <div className="h-4 bg-gray-100 rounded w-1/2" />
      <div className="space-y-3 mt-4">
        {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-50 rounded" />)}
      </div>
    </div>
  );
}

function ExpandedContent({
  code,
  data,
  selectedTf,
  onTfChange,
}: {
  code: string;
  data: any;
  selectedTf: string;
  onTfChange: (tf: string) => void;
}) {
  const bias: Bias | null = data.biases?.[selectedTf] ?? null;
  const articles = data.articles ?? [];

  return (
    <div>
      {/* Timeframe tabs */}
      <div className="flex items-center gap-0 border-b border-gray-200 mb-6">
        {tfKeys.map((key) => {
          const isSelected = key === selectedTf;
          const dir = data.biases?.[key]?.direction ?? "neutral";
          const dotColor = dir === "bullish" ? "bg-green-700" : dir === "bearish" ? "bg-red-800" : "bg-gray-400";
          return (
            <button
              key={key}
              onClick={() => onTfChange(key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer",
                isSelected
                  ? "border-[#1e3a5f] text-[#1e3a5f]"
                  : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300"
              )}
            >
              {tfLabels[key]}
              <div className={cn("h-2 w-2 rounded-full", dotColor)} />
            </button>
          );
        })}
      </div>

      {/* Bias panel */}
      {bias ? (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <BiasIndicator direction={bias.direction} size="md" />
            {bias.generated_at && (
              <span className="text-xs text-gray-400">
                {new Date(bias.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mb-4 max-w-3xl">
            {bias.summary}
          </p>
          {bias.key_drivers && bias.key_drivers.length > 0 && (
            <ol className="space-y-1.5 mb-4">
              {bias.key_drivers.map((driver, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-100 text-[10px] font-bold text-gray-500">
                    {i + 1}
                  </span>
                  {driver}
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400 mb-6">No analysis available for this timeframe.</p>
      )}

      {/* Headline dashboard */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Recent Headlines
          </h4>
          <Link
            href={`/${code}`}
            className="text-xs text-[#2563eb] hover:underline font-medium flex items-center gap-1"
          >
            Open Full Page <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        {articles.length > 0 ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
            {articles.slice(0, 8).map((article: any) => (
              <Link
                key={article.id}
                href={`/articles/${article.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/80 transition-colors cursor-pointer"
              >
                {article.impact_direction && (
                  <div className={cn(
                    "h-2 w-2 rounded-full shrink-0",
                    article.impact_direction === "bullish" ? "bg-green-700" :
                    article.impact_direction === "bearish" ? "bg-red-800" : "bg-gray-400"
                  )} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{article.title}</p>
                  {article.mechanism && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{article.mechanism}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {article.confidence && (
                    <span className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded",
                      article.confidence === "high" ? "bg-green-50 text-green-700" :
                      article.confidence === "medium" ? "bg-yellow-50 text-yellow-700" :
                      "bg-gray-50 text-gray-500"
                    )}>
                      {article.confidence}
                    </span>
                  )}
                  {article.source && (
                    <span className="text-[10px] text-gray-400">{article.source}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6 border border-gray-200 rounded-lg">
            No recent articles for this instrument.
          </p>
        )}
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

**Step 4: Verify build**

Run: `npx next build 2>&1 | tail -10`
Expected: Compiles successfully.

**Step 5: Commit**

```bash
git add src/app/(dashboard)/page.tsx src/components/dashboard-client.tsx src/app/api/instrument-detail/route.ts
git commit -m "feat: dense dashboard cards with accordion expansion and headline dashboard"
```

---

### Task 4: Add expand/collapse CSS transition

**Files:**
- Modify: `src/app/globals.css:83-93`

**Step 1: Add transition utility to globals.css**

After the `@layer base` block (after line 93), add:

```css
@layer utilities {
  .expand-transition {
    animation: expandIn 0.25s ease-out;
  }
}

@keyframes expandIn {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 2000px;
  }
}
```

**Step 2: Apply the class in dashboard-client.tsx**

In `src/components/dashboard-client.tsx`, find the expanded section div:

```tsx
              {/* Expanded section */}
              {isExpanded && (
                <div className="border-t border-gray-200 p-5">
```

Change to:

```tsx
              {/* Expanded section */}
              {isExpanded && (
                <div className="border-t border-gray-200 p-5 expand-transition">
```

**Step 3: Commit**

```bash
git add src/app/globals.css src/components/dashboard-client.tsx
git commit -m "feat: smooth expand/collapse animation for instrument cards"
```

---

### Task 5: Rebuild instrument detail page with full article analysis cards

**Files:**
- Modify: `src/app/(dashboard)/[instrument]/page.tsx:1-234`

**Step 1: Replace the instrument detail page**

Replace the entire content of `src/app/(dashboard)/[instrument]/page.tsx` with:

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
import { ArrowLeft, ExternalLink, Clock, AlertCircle } from "lucide-react";

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

      {/* Timeframe tabs */}
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
        <div className="mb-10 bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <BiasIndicator direction={biasDir} size="md" />
            <span className="text-xs text-gray-400">
              Generated {new Date(selectedBias.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>

          <p className="text-[15px] leading-relaxed text-gray-700 max-w-3xl mb-6">
            {selectedBias.summary}
          </p>

          {selectedBias.key_drivers && selectedBias.key_drivers.length > 0 && (
            <div>
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
          <AlertCircle className="h-5 w-5 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No analysis available for this timeframe yet.</p>
        </div>
      )}

      {/* Article Analysis Dashboard */}
      <div className="mb-10">
        <h2 className="font-serif text-xl font-bold text-gray-900 mb-6">
          Article Analysis
          <span className="ml-2 text-sm font-normal text-gray-400">{articles.length} articles</span>
        </h2>

        {articles.length > 0 ? (
          <div className="space-y-4">
            {articles.map((article: any) => (
              <ArticleAnalysisCard key={article.id} article={article} instrument={inst.code} />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center border border-gray-200 rounded-lg">
            <Newspaper className="h-5 w-5 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No recent articles affecting this instrument.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ArticleAnalysisCard({ article, instrument }: { article: any; instrument: string }) {
  const hasAnalysis = article.impact_direction != null;
  const isHighConfidence = article.confidence === "high";

  return (
    <div className={cn(
      "bg-white rounded-lg border p-6",
      isHighConfidence ? "border-[#2563eb]/30" : "border-gray-200"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <Link
            href={`/articles/${article.id}`}
            className="font-serif text-lg font-bold text-gray-900 hover:text-[#1e3a5f] transition-colors line-clamp-2"
          >
            {article.title}
          </Link>
          <div className="flex items-center gap-3 mt-1">
            {article.source && (
              <span className="text-xs font-medium text-gray-500">{article.source}</span>
            )}
            {article.published_at && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="h-3 w-3" />
                {new Date(article.published_at).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric"
                })}
              </span>
            )}
          </div>
        </div>
        {article.url && (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      {/* AI Summary */}
      {article.summary && (
        <div className="mb-4">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
            AI Summary
          </h4>
          <p className="text-sm text-gray-600 leading-relaxed">
            {article.summary}
          </p>
        </div>
      )}

      {/* Impact Analysis */}
      {hasAnalysis && (
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Impact on {instrument}
            </h4>
            <div className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded",
              article.impact_direction === "bullish" ? "bg-green-50 text-green-700" :
              article.impact_direction === "bearish" ? "bg-red-50 text-red-700" :
              "bg-gray-50 text-gray-500"
            )}>
              {article.impact_direction}
            </div>
            {article.confidence && (
              <div className={cn(
                "text-[10px] font-medium px-2 py-0.5 rounded",
                article.confidence === "high" ? "bg-blue-50 text-blue-700" :
                article.confidence === "medium" ? "bg-yellow-50 text-yellow-700" :
                "bg-gray-50 text-gray-500"
              )}>
                {article.confidence} confidence
              </div>
            )}
          </div>

          {/* Event */}
          {article.event && (
            <div className="mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mr-2">Event:</span>
              <span className="text-sm text-gray-700">{article.event}</span>
            </div>
          )}

          {/* Mechanism */}
          {article.mechanism && (
            <div className="mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mr-2">Mechanism:</span>
              <span className="text-sm text-gray-700">{article.mechanism}</span>
            </div>
          )}

          {/* Timeframes */}
          {article.impact_timeframes && article.impact_timeframes.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Timeframes:</span>
              {article.impact_timeframes.map((tf: string) => (
                <span key={tf} className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  {tf}
                </span>
              ))}
            </div>
          )}

          {/* Analyst Commentary */}
          {article.commentary && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <h5 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Analyst Commentary
              </h5>
              <p className="text-sm text-gray-700 leading-relaxed">
                {article.commentary}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Newspaper({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6Z" />
    </svg>
  );
}
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | tail -10`
Expected: Compiles successfully.

**Step 3: Commit**

```bash
git add src/app/(dashboard)/[instrument]/page.tsx
git commit -m "feat: rich instrument detail page with full article analysis cards"
```

---

### Task 6: Final build verification and visual check

**Step 1: Run full build**

Run: `npx next build 2>&1 | tail -20`
Expected: "Compiled successfully" with all routes listed.

**Step 2: Start dev server and visually verify**

Run: `npx next dev`

Check:
- Dashboard (`/`) — dark nav, dense cards with key drivers, latest headline, accordion expansion works
- Expanded card — bias tabs switch, headline dashboard shows mechanism column, "Open Full Page" link works
- Instrument detail (`/EURUSD`) — bias panel in white card, full article analysis cards with Event/Mechanism/Commentary
- Article detail (`/articles/1`) — unchanged, still works
- Auth pages (`/login`, `/register`) — unchanged, still works

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: polish dashboard redesign after visual review"
```
