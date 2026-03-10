"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { InstrumentIcon } from "@/components/instrument-icon";
import { BiasIndicator, BiasDirectionDot } from "@/components/bias-indicator";
import { SentimentGauge } from "@/components/sentiment-gauge";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import {
  Newspaper,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  ExternalLink,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import type { InstrumentWithBias, JournalStats, Article } from "@/types";

type RecentArticle = Article & {
  instruments: string[];
  analyses: { instrument: string; impact_direction: string; confidence: string }[];
};

interface HomeFeedProps {
  instruments: InstrumentWithBias[];
  articles: RecentArticle[];
}

function formatDollars(value: number): string {
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  return value < 0 ? `-${formatted}` : `+${formatted}`;
}

function getDominantBias(biases: Record<string, any>): "bullish" | "bearish" | "neutral" {
  const dirs = Object.values(biases ?? {}).map((b: any) => b?.direction).filter(Boolean);
  const bullish = dirs.filter((d) => d === "bullish").length;
  const bearish = dirs.filter((d) => d === "bearish").length;
  if (bullish > bearish) return "bullish";
  if (bearish > bullish) return "bearish";
  return "neutral";
}

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

export function HomeFeed({ instruments, articles }: HomeFeedProps) {
  const [stats, setStats] = useState<JournalStats | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/trades")
      .then((r) => r.json())
      .then((data) => setStats(data.stats))
      .catch(() => {});
  }, []);

  const filteredArticles =
    filter === "all"
      ? articles
      : articles.filter((a) => a.instruments.includes(filter));

  return (
    <div>
      {/* Page title */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-white/40">
          Latest news, market bias & journal overview
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* ─── Main column: News feed ─── */}
        <div>
          {/* Instrument filter strip */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer",
                filter === "all"
                  ? "bg-white/15 text-white"
                  : "bg-white/[0.06] text-white/40 hover:text-white/60"
              )}
            >
              All News
            </button>
            {instruments.map((inst) => (
              <button
                key={inst.code}
                onClick={() => setFilter(inst.code)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer",
                  filter === inst.code
                    ? "bg-white/15 text-white"
                    : "bg-white/[0.06] text-white/40 hover:text-white/60"
                )}
              >
                <BiasDirectionDot direction={getDominantBias(inst.biases)} />
                {inst.code}
              </button>
            ))}
          </div>

          {/* Article list */}
          <div className="space-y-3">
            {filteredArticles.length > 0 ? (
              filteredArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))
            ) : (
              <div className="py-12 text-center border border-white/10 rounded-lg">
                <Newspaper className="h-5 w-5 text-white/20 mx-auto mb-2" />
                <p className="text-sm text-white/30">No articles found for this filter.</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Sidebar: Journal stats + Instrument biases ─── */}
        <aside className="space-y-4">
          {/* Journal quick stats */}
          <div className="relative rounded-[1.25rem]">
            <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={3} disabled={false} />
            <div className="bg-white/[0.06] rounded-[1.25rem] border border-white/10 backdrop-blur-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white/30">
                  Journal
                </h3>
                <Link
                  href="/journal"
                  className="text-xs text-[#2563eb] hover:underline font-medium flex items-center gap-0.5"
                >
                  View <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              {stats ? (
                <div className="grid grid-cols-2 gap-3">
                  <JournalStat
                    label="Win Rate"
                    value={`${stats.win_rate.toFixed(1)}%`}
                    color={stats.win_rate >= 50 ? "text-green-400" : "text-red-400"}
                  />
                  <JournalStat
                    label="Avg R:R"
                    value={stats.avg_rr.toFixed(2)}
                  />
                  <JournalStat
                    label="P&L Today"
                    value={formatDollars(stats.pnl_today)}
                    color={stats.pnl_today >= 0 ? "text-green-400" : "text-red-400"}
                  />
                  <JournalStat
                    label="P&L Week"
                    value={formatDollars(stats.pnl_week)}
                    color={stats.pnl_week >= 0 ? "text-green-400" : "text-red-400"}
                  />
                  <JournalStat
                    label="P&L Month"
                    value={formatDollars(stats.pnl_month)}
                    color={stats.pnl_month >= 0 ? "text-green-400" : "text-red-400"}
                  />
                  <JournalStat
                    label="Trades"
                    value={String(stats.total_trades)}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-12 bg-white/[0.04] rounded animate-pulse" />
                  ))}
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <Link
                  href="/journal/add"
                  className="flex-1 text-center text-xs font-medium py-2 rounded-lg bg-white/[0.08] text-white/60 hover:bg-white/[0.12] hover:text-white transition-colors cursor-pointer"
                >
                  Log Trade
                </Link>
                <Link
                  href="/journal/reports"
                  className="flex items-center justify-center gap-1 flex-1 text-center text-xs font-medium py-2 rounded-lg bg-white/[0.08] text-white/60 hover:bg-white/[0.12] hover:text-white transition-colors cursor-pointer"
                >
                  <BarChart3 className="h-3 w-3" />
                  Reports
                </Link>
              </div>
            </div>
          </div>

          {/* Instrument bias cards */}
          <div className="bg-white/[0.06] rounded-[1.25rem] border border-white/10 backdrop-blur-xl p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/30 mb-3">
              Instrument Bias
            </h3>
            <div className="space-y-2">
              {instruments.map((inst) => (
                <Link
                  key={inst.code}
                  href={`/${inst.code}`}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer group"
                >
                  <InstrumentIcon code={inst.code} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-white">{inst.code}</span>
                      {inst.quote && (
                        <span className={cn(
                          "text-[10px] font-semibold tabular-nums",
                          inst.quote.change_pct >= 0 ? "text-green-400" : "text-red-400"
                        )}>
                          {inst.quote.change_pct >= 0 ? "+" : ""}{inst.quote.change_pct.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BiasIndicator direction={inst.biases?.daily?.direction ?? null} label="1D" />
                    <BiasIndicator direction={inst.biases?.["1week"]?.direction ?? null} label="1W" />
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function JournalStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <p className="text-[10px] text-white/30 mb-0.5">{label}</p>
      <p className={cn("text-sm font-semibold font-mono", color || "text-white")}>
        {value}
      </p>
    </div>
  );
}

function ArticleCard({ article }: { article: RecentArticle }) {
  const mainAnalysis = article.analyses?.[0];
  const DirectionIcon =
    mainAnalysis?.impact_direction === "bullish"
      ? TrendingUp
      : mainAnalysis?.impact_direction === "bearish"
        ? TrendingDown
        : Minus;
  const dirColor =
    mainAnalysis?.impact_direction === "bullish"
      ? "text-green-400"
      : mainAnalysis?.impact_direction === "bearish"
        ? "text-red-400"
        : "text-white/30";

  return (
    <Link
      href={`/articles/${article.id}`}
      className="block bg-white/[0.06] rounded-xl border border-white/10 p-4 hover:bg-white/[0.08] hover:border-white/15 transition-all cursor-pointer group"
    >
      {/* Top row: instruments + time */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {article.instruments.slice(0, 4).map((code) => (
            <span
              key={code}
              className="text-[10px] font-medium bg-white/[0.08] text-white/50 px-1.5 py-0.5 rounded"
            >
              {code}
            </span>
          ))}
          {article.instruments.length > 4 && (
            <span className="text-[10px] text-white/30">
              +{article.instruments.length - 4}
            </span>
          )}
        </div>
        <span className="flex items-center gap-1 text-[10px] text-white/30 shrink-0">
          <Clock className="h-3 w-3" />
          {timeAgo(article.published_at)}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-[15px] font-semibold text-white leading-snug mb-1.5 group-hover:text-white/90 line-clamp-2">
        {article.title}
      </h3>

      {/* Summary */}
      {article.summary && (
        <p className="text-xs text-white/40 leading-relaxed line-clamp-2 mb-2.5">
          {article.summary}
        </p>
      )}

      {/* Bottom row: analysis badges + source */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {mainAnalysis && (
            <div className="flex items-center gap-1">
              <DirectionIcon className={cn("h-3.5 w-3.5", dirColor)} />
              <span className={cn("text-[11px] font-semibold uppercase", dirColor)}>
                {mainAnalysis.impact_direction}
              </span>
            </div>
          )}
          {mainAnalysis?.confidence && (
            <span
              className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded",
                mainAnalysis.confidence === "high"
                  ? "bg-green-500/15 text-green-400"
                  : mainAnalysis.confidence === "medium"
                    ? "bg-yellow-500/15 text-yellow-400"
                    : "bg-white/[0.04] text-white/40"
              )}
            >
              {mainAnalysis.confidence}
            </span>
          )}
          {/* Show per-instrument impacts if multiple */}
          {article.analyses.length > 1 && (
            <div className="flex items-center gap-1 ml-1">
              {article.analyses.slice(0, 3).map((a) => (
                <span
                  key={a.instrument}
                  className={cn(
                    "text-[9px] font-medium px-1 py-0.5 rounded flex items-center gap-0.5",
                    a.impact_direction === "bullish"
                      ? "text-green-400/70"
                      : a.impact_direction === "bearish"
                        ? "text-red-400/70"
                        : "text-white/30"
                  )}
                >
                  {a.instrument}
                  {a.impact_direction === "bullish" ? (
                    <TrendingUp className="h-2.5 w-2.5" />
                  ) : a.impact_direction === "bearish" ? (
                    <TrendingDown className="h-2.5 w-2.5" />
                  ) : null}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {article.source && (
            <span className="text-[10px] text-white/30">{article.source}</span>
          )}
          <ExternalLink className="h-3 w-3 text-white/20 group-hover:text-white/40 transition-colors" />
        </div>
      </div>
    </Link>
  );
}
