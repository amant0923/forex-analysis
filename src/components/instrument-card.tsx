import Link from "next/link";
import { ChevronRight, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { BiasBadge } from "./bias-badge";
import { InstrumentIcon } from "./instrument-icon";
import type { InstrumentWithBias } from "@/types";

interface InstrumentCardProps {
  instrument: InstrumentWithBias;
}

function getDominantBias(biases: Record<string, any>): "bullish" | "bearish" | "neutral" {
  const dirs = Object.values(biases).map((b: any) => b?.direction).filter(Boolean);
  const bullish = dirs.filter((d) => d === "bullish").length;
  const bearish = dirs.filter((d) => d === "bearish").length;
  if (bullish > bearish) return "bullish";
  if (bearish > bullish) return "bearish";
  return "neutral";
}

export function InstrumentCard({ instrument }: InstrumentCardProps) {
  const dominant = getDominantBias(instrument.biases ?? {});

  return (
    <Link href={`/${instrument.code}`} className="group cursor-pointer">
      <div className={cn(
        "relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200/60",
        "transition-all duration-200 hover:shadow-md hover:ring-gray-300/80 hover:-translate-y-0.5",
      )}>
        {/* Colored top accent bar */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-1 rounded-t-2xl",
          dominant === "bullish" && "bg-gradient-to-r from-emerald-400 to-emerald-500",
          dominant === "bearish" && "bg-gradient-to-r from-red-400 to-red-500",
          dominant === "neutral" && "bg-gradient-to-r from-gray-300 to-gray-400",
        )} />

        <div className="flex items-center justify-between mb-4 pt-1">
          <div className="flex items-center gap-3">
            <InstrumentIcon code={instrument.code} size="md" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{instrument.code}</h3>
              <p className="text-xs text-gray-500">{instrument.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
              instrument.category === "forex"
                ? "bg-indigo-50 text-indigo-600"
                : "bg-violet-50 text-violet-600",
            )}>
              {instrument.category}
            </span>
            <ChevronRight className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500" />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <BiasBadge direction={instrument.biases?.daily?.direction ?? null} label="Daily" />
          <BiasBadge direction={instrument.biases?.["1week"]?.direction ?? null} label="1W" />
          <BiasBadge direction={instrument.biases?.["1month"]?.direction ?? null} label="1M" />
          <BiasBadge direction={instrument.biases?.["3month"]?.direction ?? null} label="3M" />
        </div>

        <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-gray-400">
          <Newspaper className="h-3 w-3" />
          <span>{instrument.article_count} articles</span>
        </div>
      </div>
    </Link>
  );
}
