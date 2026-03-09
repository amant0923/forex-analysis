import { getInstrumentsWithBiases } from "@/lib/queries";
import { InstrumentCard } from "@/components/instrument-card";
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const instruments = await getInstrumentsWithBiases();

  // Calculate sentiment summary
  const allBiases = instruments.flatMap((i) =>
    Object.values(i.biases ?? {}).map((b: any) => b?.direction).filter(Boolean)
  );
  const bullishCount = allBiases.filter((d) => d === "bullish").length;
  const bearishCount = allBiases.filter((d) => d === "bearish").length;
  const neutralCount = allBiases.filter((d) => d === "neutral").length;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Market Overview</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              AI-powered fundamental bias across all instruments
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 ring-1 ring-emerald-200">
              <TrendingUp className="h-3 w-3" />
              {bullishCount} Bullish
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 ring-1 ring-red-200">
              <TrendingDown className="h-3 w-3" />
              {bearishCount} Bearish
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-500 ring-1 ring-gray-200">
              <Minus className="h-3 w-3" />
              {neutralCount} Neutral
            </div>
          </div>
        </div>
      </div>

      {/* Instrument Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {instruments.map((inst) => (
          <InstrumentCard key={inst.code} instrument={inst} />
        ))}
      </div>
    </div>
  );
}
