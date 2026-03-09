import Link from "next/link";
import { ArrowUpRight, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { BiasBadge } from "./bias-badge";
import { InstrumentIcon } from "./instrument-icon";
import type { InstrumentWithBias } from "@/types";

interface InstrumentCardProps {
  instrument: InstrumentWithBias;
}

function getDominantBias(instrument: InstrumentWithBias): "bullish" | "bearish" | "neutral" {
  const dirs = ["daily", "1week", "1month", "3month"]
    .map((tf) => instrument.biases?.[tf]?.direction)
    .filter(Boolean);
  if (dirs.length === 0) return "neutral";
  const counts = { bullish: 0, bearish: 0, neutral: 0 };
  dirs.forEach((d) => counts[d as keyof typeof counts]++);
  if (counts.bullish > counts.bearish) return "bullish";
  if (counts.bearish > counts.bullish) return "bearish";
  return "neutral";
}

const dominantStyles = {
  bullish: {
    border: "border-l-emerald-500/60",
    gradient: "from-emerald-500/[0.08] via-emerald-500/[0.02] to-transparent",
    hoverGlow: "hover:shadow-emerald-500/10",
    accentLine: "bg-emerald-500",
  },
  bearish: {
    border: "border-l-red-500/60",
    gradient: "from-red-500/[0.08] via-red-500/[0.02] to-transparent",
    hoverGlow: "hover:shadow-red-500/10",
    accentLine: "bg-red-500",
  },
  neutral: {
    border: "border-l-zinc-500/30",
    gradient: "from-zinc-500/[0.04] via-transparent to-transparent",
    hoverGlow: "hover:shadow-purple-500/5",
    accentLine: "bg-zinc-600",
  },
};

export function InstrumentCard({ instrument }: InstrumentCardProps) {
  const dominant = getDominantBias(instrument);
  const styles = dominantStyles[dominant];

  return (
    <Link href={`/${instrument.code}`}>
      <div
        className={cn(
          "group relative overflow-hidden rounded-xl border border-white/[0.06] border-l-[3px] bg-white/[0.02] p-6 backdrop-blur-md transition-all duration-300",
          "hover:-translate-y-1 hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-2xl",
          styles.border,
          styles.hoverGlow
        )}
      >
        {/* Gradient background tint based on dominant bias */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-100",
            styles.gradient
          )}
        />

        {/* Top accent line */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-[2px]",
            styles.accentLine,
            "opacity-40"
          )}
        />

        {/* Header row: icon + name + category */}
        <div className="relative mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <InstrumentIcon code={instrument.code} size="md" />
            <div>
              <h3 className="font-data text-xl font-bold tracking-tight text-zinc-100">
                {instrument.code}
              </h3>
              <p className="text-xs text-zinc-500">{instrument.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                instrument.category === "forex"
                  ? "border-purple-500/20 bg-purple-500/10 text-purple-400"
                  : "border-blue-500/20 bg-blue-500/10 text-blue-400"
              )}
            >
              {instrument.category}
            </span>
            <ArrowUpRight className="h-4 w-4 text-zinc-700 transition-all duration-200 group-hover:text-zinc-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>

        {/* Bias badges */}
        <div className="relative grid grid-cols-4 gap-2">
          <BiasBadge
            direction={instrument.biases?.daily?.direction ?? null}
            label="Daily"
          />
          <BiasBadge
            direction={instrument.biases?.["1week"]?.direction ?? null}
            label="1W"
          />
          <BiasBadge
            direction={instrument.biases?.["1month"]?.direction ?? null}
            label="1M"
          />
          <BiasBadge
            direction={instrument.biases?.["3month"]?.direction ?? null}
            label="3M"
          />
        </div>

        {/* Footer: article count */}
        <div className="relative mt-4 flex items-center justify-end gap-1.5 text-xs text-zinc-500">
          <Newspaper className="h-3 w-3" />
          <span>{instrument.article_count} articles</span>
        </div>
      </div>
    </Link>
  );
}
