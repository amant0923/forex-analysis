"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { InstrumentIcon } from "./instrument-icon";
import type { InstrumentWithBias } from "@/types";

interface DashboardProps {
  instruments: InstrumentWithBias[];
}

type Filter = "all" | "forex" | "index";

const tfKeys = [
  { key: "daily", label: "1D" },
  { key: "1week", label: "1W" },
  { key: "1month", label: "1M" },
  { key: "3month", label: "3M" },
] as const;

function getDominantBias(biases: Record<string, any>): "bullish" | "bearish" | "neutral" {
  const dirs = Object.values(biases ?? {}).map((b: any) => b?.direction).filter(Boolean);
  const bullish = dirs.filter((d) => d === "bullish").length;
  const bearish = dirs.filter((d) => d === "bearish").length;
  if (bullish > bearish) return "bullish";
  if (bearish > bullish) return "bearish";
  return "neutral";
}

function SentimentDot({ label, direction }: { label: string; direction: string | null }) {
  const dir = direction ?? "neutral";
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1",
        dir === "bullish" && "bg-green-500/[0.08]",
        dir === "bearish" && "bg-red-500/[0.08]",
        dir === "neutral" && "bg-white/30/[0.08]",
      )}
    >
      <span className="font-mono text-[11px] font-medium text-white/30 tracking-wide">{label}</span>
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          dir === "bullish" && "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]",
          dir === "bearish" && "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]",
          dir === "neutral" && "bg-white/30 shadow-[0_0_6px_rgba(161,161,170,0.3)]",
        )}
      />
    </div>
  );
}

function InstrumentCard({ instrument, index }: { instrument: InstrumentWithBias; index: number }) {
  const dominant = getDominantBias(instrument.biases);
  const dailyBias = instrument.biases?.daily;

  const accentColor = dominant === "bullish"
    ? "bg-green-500"
    : dominant === "bearish"
      ? "bg-red-500"
      : "bg-white/30";

  const hoverBorder = dominant === "bullish"
    ? "hover:border-green-500/25"
    : dominant === "bearish"
      ? "hover:border-red-500/25"
      : "hover:border-white/20";

  return (
    <Link
      href={`/${instrument.code}`}
      className={cn(
        "group block rounded-2xl border border-white/[0.06] bg-white/[0.06] overflow-hidden cursor-pointer",
        "transition-all duration-300 ease-out",
        "hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:-translate-y-0.5",
        hoverBorder,
      )}
      style={{
        animation: `fadeSlideIn 0.5s cubic-bezier(0.4,0,0.2,1) ${index * 70}ms both`,
      }}
    >
      {/* Accent bar */}
      <div className={cn("h-[3px] opacity-80", accentColor)} />

      <div className="p-3 sm:p-4 lg:p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3.5">
            <InstrumentIcon code={instrument.code} size="lg" />
            <div>
              <div className="flex items-baseline gap-2.5">
                <span className="text-base sm:text-lg lg:text-xl font-bold tracking-tight text-white">
                  {instrument.code}
                </span>
                <span className="font-mono text-[10px] font-semibold text-white/30 bg-white/[0.04] px-2 py-0.5 rounded tracking-widest uppercase">
                  {instrument.category}
                </span>
              </div>
              <p className="text-[13px] text-white/40 mt-0.5">{instrument.name}</p>
            </div>
          </div>
        </div>

        {/* Sentiment tags */}
        <div className="flex items-center gap-1.5 mb-5 flex-wrap">
          {tfKeys.map(({ key, label }) => (
            <SentimentDot
              key={key}
              label={label}
              direction={instrument.biases?.[key]?.direction ?? null}
            />
          ))}
        </div>

        {/* Summary */}
        {dailyBias?.summary && (
          <p className="text-[13.5px] leading-[1.65] text-white/40 mb-4 line-clamp-3">
            {dailyBias.summary}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
          <span className="font-mono text-[12px] text-white/30">
            {instrument.article_count} articles
          </span>
          <span className="text-[12px] font-medium text-blue-500 flex items-center gap-1 group-hover:gap-2 transition-all duration-200">
            View analysis
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

export function Dashboard({ instruments }: DashboardProps) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = filter === "all"
    ? instruments
    : instruments.filter((i) => i.category === filter);

  const bullishCount = instruments.filter((i) => getDominantBias(i.biases) === "bullish").length;
  const bearishCount = instruments.filter((i) => getDominantBias(i.biases) === "bearish").length;
  const neutralCount = instruments.length - bullishCount - bearishCount;

  return (
    <div>
      {/* Page title */}
      <div className="mb-2">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white">
          Market Overview
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-white/40">
          AI-powered fundamental bias across forex and index instruments
        </p>
      </div>

      {/* Stats bar + filter */}
      <div className="flex items-center gap-3 sm:gap-5 mt-4 sm:mt-6 lg:mt-8 mb-4 sm:mb-6 lg:mb-8 flex-wrap">
        {/* Bearish count */}
        <div className="flex items-center gap-2 rounded-xl border border-red-500/10 bg-red-500/[0.05] px-4 py-2.5">
          <span className="font-mono text-xl font-bold text-red-400">{bearishCount}</span>
          <span className="text-[13px] font-medium text-red-400">Bearish</span>
        </div>

        {/* Bullish count */}
        <div className="flex items-center gap-2 rounded-xl border border-green-500/10 bg-green-500/[0.05] px-4 py-2.5">
          <span className="font-mono text-xl font-bold text-green-400">{bullishCount}</span>
          <span className="text-[13px] font-medium text-green-400">Bullish</span>
        </div>

        {/* Neutral count */}
        {neutralCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5">
            <span className="font-mono text-xl font-bold text-white/40">{neutralCount}</span>
            <span className="text-[13px] font-medium text-white/40">Neutral</span>
          </div>
        )}

        <div className="flex-1" />

        {/* Filter tabs */}
        <div className="flex bg-white/[0.06] rounded-xl p-1">
          {(["all", "forex", "index"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-5 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 cursor-pointer",
                filter === f
                  ? "bg-white/[0.12] text-white shadow-sm"
                  : "text-white/40 hover:text-white/80",
              )}
            >
              {f === "all" ? "All" : f === "forex" ? "Forex" : "Indices"}
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 xl:gap-5">
        {filtered.map((inst, i) => (
          <InstrumentCard key={inst.code} instrument={inst} index={i} />
        ))}
      </div>
    </div>
  );
}
