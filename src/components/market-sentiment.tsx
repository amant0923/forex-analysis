import { cn } from "@/lib/utils";
import type { MarketSentiment as MarketSentimentType } from "@/types";

function getLabelColor(label: string): string {
  switch (label) {
    case "Extreme Fear": return "text-red-600";
    case "Fear": return "text-orange-500";
    case "Neutral": return "text-yellow-600";
    case "Greed": return "text-green-600";
    case "Extreme Greed": return "text-green-700";
    default: return "text-gray-500";
  }
}

export function MarketSentiment({ sentiment }: { sentiment: MarketSentimentType }) {
  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Market Sentiment
        </h2>
        <span className={cn("text-sm font-bold", getLabelColor(sentiment.label))}>
          {sentiment.label}
        </span>
      </div>

      {/* Gauge bar */}
      <div className="relative mb-3">
        <div
          className="h-3 rounded-full overflow-hidden"
          style={{
            background: "linear-gradient(to right, #dc2626, #f97316, #eab308, #22c55e, #16a34a)",
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-gray-800 shadow-sm transition-all"
          style={{ left: `calc(${sentiment.score}% - 8px)` }}
        />
      </div>

      {/* Score + driver */}
      <div className="flex items-center justify-between">
        <span className={cn("text-2xl font-bold tabular-nums", getLabelColor(sentiment.label))}>
          {sentiment.score}
        </span>
        <span className="text-xs text-gray-500">
          {sentiment.driver_summary}
        </span>
      </div>
    </div>
  );
}
