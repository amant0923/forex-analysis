import { getInstrumentsWithBiases } from "@/lib/queries";
import { InstrumentCard } from "@/components/instrument-card";
import { Activity } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const instruments = await getInstrumentsWithBiases();

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Market Overview</h2>
        <p className="text-sm text-zinc-500">
          AI-powered fundamental bias across all instruments
        </p>
      </div>

      {instruments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.04] bg-white/[0.02] p-16 text-center backdrop-blur-sm">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/10">
            <Activity className="h-7 w-7 text-purple-500/50" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-400">No instruments yet</h3>
          <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-zinc-600">
            Run the analysis pipeline to populate instruments and their fundamental biases.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {instruments.map((inst) => (
            <InstrumentCard key={inst.code} instrument={inst} />
          ))}
        </div>
      )}
    </div>
  );
}
