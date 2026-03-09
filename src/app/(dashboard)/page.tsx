import { getInstrumentsWithBiases } from "@/lib/queries";
import { InstrumentCard } from "@/components/instrument-card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const instruments = await getInstrumentsWithBiases();

  const allBiases = instruments.flatMap((i) =>
    Object.values(i.biases ?? {}).map((b: any) => b?.direction).filter(Boolean)
  );
  const bullishCount = allBiases.filter((d) => d === "bullish").length;
  const bearishCount = allBiases.filter((d) => d === "bearish").length;
  const neutralCount = allBiases.filter((d) => d === "neutral").length;

  return (
    <div>
      {/* Header bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Market Overview</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            AI-powered fundamental bias across all instruments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/80">
            <TrendingUp className="h-3 w-3" />
            {bullishCount} Bullish
          </div>
          <div className="flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200/80">
            <TrendingDown className="h-3 w-3" />
            {bearishCount} Bearish
          </div>
          <div className="flex items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500 ring-1 ring-gray-200/80">
            <Minus className="h-3 w-3" />
            {neutralCount} Neutral
          </div>
        </div>
      </div>

      {/* Instrument Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {instruments.map((inst) => (
          <InstrumentCard key={inst.code} instrument={inst} />
        ))}
      </div>
    </div>
  );
}
