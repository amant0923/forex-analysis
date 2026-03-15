import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { InstrumentIcon } from "@/components/instrument-icon";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ instrument: string }> }) {
  const { instrument } = await params;
  return {
    title: `${instrument} Fundamental Analysis Archive — Tradeora`,
    description: `Weekly AI-powered fundamental analysis for ${instrument}. Historical bias trends, key themes, and source-backed market insights.`,
  };
}

async function getWeeklySummaries(instrument: string) {
  const sql = getDb();
  const rows = await sql`
    SELECT ws.*, i.name
    FROM weekly_summaries ws
    JOIN instruments i ON i.code = ws.instrument
    WHERE ws.instrument = ${instrument}
    ORDER BY ws.week_start DESC
    LIMIT 52
  `;
  return rows;
}

export default async function InstrumentArchivePage({ params }: { params: Promise<{ instrument: string }> }) {
  const { instrument } = await params;
  const summaries = await getWeeklySummaries(instrument.toUpperCase());

  if (summaries.length === 0) {
    notFound();
  }

  const instName = (summaries[0] as any).name;

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link href="/analysis" className="text-sm text-white/40 hover:text-white/60 transition-colors">
            ← All Instruments
          </Link>
          <div className="flex items-center gap-3 mt-4 mb-2">
            <InstrumentIcon code={instrument.toUpperCase()} size="lg" />
            <div>
              <h1 className="font-serif text-2xl font-bold text-white">{instrument.toUpperCase()}</h1>
              <p className="text-white/40 text-sm">{instName}</p>
            </div>
          </div>
          <p className="text-white/50">Weekly fundamental analysis archive</p>
        </div>

        <div className="space-y-3">
          {summaries.map((s: any) => {
            const themes = typeof s.key_themes === "string" ? JSON.parse(s.key_themes) : s.key_themes || [];
            const weekLabel = new Date(s.week_start + "T00:00:00").toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric",
            });
            return (
              <Link
                key={s.id}
                href={`/analysis/${instrument.toUpperCase()}/${s.week_start}`}
                className="block bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold text-white">Week of {weekLabel}</h2>
                  <span className="text-xs text-white/30">{s.article_count} articles</span>
                </div>
                <p className="text-sm text-white/50 line-clamp-2">{s.summary?.slice(0, 200)}...</p>
                {themes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {themes.map((theme: string, i: number) => (
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
      </div>
    </div>
  );
}
