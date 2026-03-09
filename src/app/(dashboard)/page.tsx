import { getInstrumentsWithBiases } from "@/lib/queries";
import { InstrumentCard } from "@/components/instrument-card";

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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {instruments.map((inst) => (
          <InstrumentCard key={inst.code} instrument={inst} />
        ))}
      </div>
    </div>
  );
}
