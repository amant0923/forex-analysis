import { getInstrumentsWithBiases } from "@/lib/queries";
import { InstrumentCard } from "@/components/instrument-card";
import { Activity, TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import type { InstrumentWithBias } from "@/types";

export const dynamic = "force-dynamic";

function getSentimentSummary(instruments: InstrumentWithBias[]) {
  let bullish = 0;
  let bearish = 0;
  let neutral = 0;
  instruments.forEach((inst) => {
    const daily = inst.biases?.daily?.direction;
    if (daily === "bullish") bullish++;
    else if (daily === "bearish") bearish++;
    else neutral++;
  });
  return { bullish, bearish, neutral };
}

export default async function DashboardPage() {
  const instruments = await getInstrumentsWithBiases();
  const sentiment = getSentimentSummary(instruments);

  return (
    <div>
      {/* Dashboard hero header */}
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-purple-500/[0.08] via-blue-500/[0.04] to-emerald-500/[0.06] p-8 backdrop-blur-md">
        {/* Decorative elements */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/30 to-blue-500/30 border border-purple-500/20">
                <Activity className="h-4 w-4 text-purple-300" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
                Market Overview
              </h2>
            </div>
            <p className="text-sm text-zinc-400">
              AI-powered fundamental bias across all instruments
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          {/* Sentiment summary pills */}
          {instruments.length > 0 && (
            <div className="flex gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <div>
                  <p className="text-lg font-bold text-emerald-300">
                    {sentiment.bullish}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-emerald-500/80">
                    Bullish
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5">
                <TrendingDown className="h-4 w-4 text-red-400" />
                <div>
                  <p className="text-lg font-bold text-red-300">
                    {sentiment.bearish}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-red-500/80">
                    Bearish
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-zinc-500/20 bg-zinc-500/10 px-4 py-2.5">
                <Minus className="h-4 w-4 text-zinc-400" />
                <div>
                  <p className="text-lg font-bold text-zinc-300">
                    {sentiment.neutral}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                    Neutral
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {instruments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.04] bg-white/[0.02] p-16 text-center backdrop-blur-sm">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/10">
            <Activity className="h-7 w-7 text-purple-500/50" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-400">
            No instruments yet
          </h3>
          <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-zinc-600">
            Run the analysis pipeline to populate instruments and their
            fundamental biases.
          </p>
        </div>
      ) : (
        <>
          {/* Section header */}
          <div className="mb-5 flex items-center gap-3">
            <BarChart3 className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">
              Instruments ({instruments.length})
            </h3>
            <div className="h-px flex-1 bg-gradient-to-r from-white/[0.06] to-transparent" />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {instruments.map((inst) => (
              <InstrumentCard key={inst.code} instrument={inst} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
