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
