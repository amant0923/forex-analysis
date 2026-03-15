import Link from "next/link";
import { getDb } from "@/lib/db";
import { InstrumentIcon } from "@/components/instrument-icon";

export const metadata = {
  title: "Forex & CFD Fundamental Analysis — Tradeora",
  description: "Weekly AI-powered fundamental analysis for 20 forex, commodity, and crypto instruments. Free, transparent, source-backed market bias.",
};

export const revalidate = 3600; // Revalidate every hour

async function getInstrumentsWithLatestSummary() {
  const sql = getDb();
  try {
    const rows = await sql`
      SELECT DISTINCT ON (ws.instrument)
        ws.instrument,
        ws.week_start,
        ws.week_end,
        ws.key_themes,
        i.name,
        i.category
      FROM weekly_summaries ws
      JOIN instruments i ON i.code = ws.instrument
      ORDER BY ws.instrument, ws.week_start DESC
    `;
    return rows;
  } catch {
    return [];
  }
}

export default async function AnalysisLandingPage() {
  const instruments = await getInstrumentsWithLatestSummary();

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <Link href="/" className="text-sm text-white/40 hover:text-white/60 transition-colors">
            ← Back to Dashboard
          </Link>
          <h1 className="font-serif text-3xl font-bold text-white mt-4 mb-2">
            Fundamental Analysis Archive
          </h1>
          <p className="text-white/50 text-lg">
            Weekly AI-generated fundamental analysis for forex, commodities, indices, and crypto.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {instruments.map((inst: any) => {
            const weekSlug = inst.week_start;
            const themes = typeof inst.key_themes === "string" ? JSON.parse(inst.key_themes) : inst.key_themes || [];
            return (
              <Link
                key={inst.instrument}
                href={`/analysis/${inst.instrument}`}
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <InstrumentIcon code={inst.instrument} size="md" />
                  <div>
                    <span className="text-white font-semibold text-lg">{inst.instrument}</span>
                    <p className="text-[11px] text-white/30">{inst.name}</p>
                  </div>
                </div>
                {themes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {themes.slice(0, 3).map((theme: string, i: number) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/40">
                        {theme}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {instruments.length === 0 && (
          <div className="text-center py-16 text-white/30">
            <p className="text-lg mb-2">No weekly analyses generated yet.</p>
            <p className="text-sm">Check back after the first weekly summary runs.</p>
          </div>
        )}
      </div>
    </div>
  );
}
