"use client";

import { useState } from "react";
import Link from "next/link";
import { InstrumentIcon } from "@/components/instrument-icon";
import { BiasIndicator, BiasDirectionDot } from "@/components/bias-indicator";
import { Newspaper, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InstrumentWithBias, Bias } from "@/types";

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
      <div className="mb-6 sm:mb-8 flex items-center gap-3 sm:gap-6 border-y border-gray-200 py-3 overflow-x-auto">
        {instruments.map((inst) => {
          const dominant = getDominantBias(inst.biases);
          return (
            <button
              key={inst.code}
              onClick={() => toggleExpand(inst.code)}
              className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm cursor-pointer hover:opacity-70 transition-opacity shrink-0"
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
                className="w-full text-left p-4 sm:p-5 cursor-pointer"
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
                    {dailyBias.key_drivers.slice(0, 3).map((driver: string, i: number) => (
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
                <div className="border-t border-gray-200 p-4 sm:p-5 expand-transition">
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
      <div className="flex items-center gap-0 border-b border-gray-200 mb-4 sm:mb-6 overflow-x-auto">
        {tfKeys.map((key) => {
          const isSelected = key === selectedTf;
          const dir = data.biases?.[key]?.direction ?? "neutral";
          const dotColor = dir === "bullish" ? "bg-green-700" : dir === "bearish" ? "bg-red-800" : "bg-gray-400";
          return (
            <button
              key={key}
              onClick={(e) => { e.stopPropagation(); onTfChange(key); }}
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap",
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
              {bias.key_drivers.map((driver: string, i: number) => (
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
                className="flex items-start sm:items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-3 hover:bg-gray-50/80 transition-colors cursor-pointer"
              >
                {article.impact_direction && (
                  <div className={cn(
                    "h-2 w-2 rounded-full shrink-0 mt-1.5 sm:mt-0",
                    article.impact_direction === "bullish" ? "bg-green-700" :
                    article.impact_direction === "bearish" ? "bg-red-800" : "bg-gray-400"
                  )} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] sm:text-sm font-medium text-gray-900 line-clamp-2 sm:truncate">{article.title}</p>
                  {article.mechanism && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{article.mechanism}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 sm:hidden">
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
                </div>
                <div className="hidden sm:flex items-center gap-2 shrink-0">
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
