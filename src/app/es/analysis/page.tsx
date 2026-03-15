import Link from "next/link";
import { getDb } from "@/lib/db";
import { InstrumentIcon } from "@/components/instrument-icon";

export const metadata = {
  title: "Análisis Fundamental de Forex y CFDs — Tradeora",
  description: "Análisis fundamental semanal impulsado por IA para 20 instrumentos de forex, materias primas y criptomonedas. Gratis, transparente y respaldado por fuentes.",
};

export const revalidate = 3600;

async function getInstrumentsWithLatestSummary() {
  const sql = getDb();
  try {
    const rows = await sql`
      SELECT DISTINCT ON (ws.instrument)
        ws.instrument, ws.week_start, ws.key_themes, i.name
      FROM weekly_summaries ws
      JOIN instruments i ON i.code = ws.instrument
      ORDER BY ws.instrument, ws.week_start DESC
    `;
    return rows;
  } catch {
    return [];
  }
}

export default async function AnalysisLandingPageES() {
  const instruments = await getInstrumentsWithLatestSummary();

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/analysis" className="text-sm text-white/40 hover:text-white/60 transition-colors">
              English
            </Link>
            <span className="text-white/20">|</span>
            <span className="text-sm text-white/60 font-medium">Español</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-white mt-2 mb-2">
            Archivo de Análisis Fundamental
          </h1>
          <p className="text-white/50 text-lg">
            Análisis fundamental semanal generado por IA para forex, materias primas, índices y criptomonedas.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {instruments.map((inst: any) => (
            <Link
              key={inst.instrument}
              href={`/es/analysis/${inst.instrument}`}
              className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <InstrumentIcon code={inst.instrument} size="md" />
                <div>
                  <span className="text-white font-semibold text-lg">{inst.instrument}</span>
                  <p className="text-[11px] text-white/30">{inst.name}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {instruments.length === 0 && (
          <div className="text-center py-16 text-white/30">
            <p className="text-lg mb-2">No se han generado análisis semanales todavía.</p>
          </div>
        )}
      </div>
    </div>
  );
}
