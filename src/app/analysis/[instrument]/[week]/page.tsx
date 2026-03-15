import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { InstrumentIcon } from "@/components/instrument-icon";

export const revalidate = 86400; // Revalidate daily

export async function generateMetadata({ params }: { params: Promise<{ instrument: string; week: string }> }) {
  const { instrument, week } = await params;
  const weekDate = new Date(week + "T00:00:00");
  const weekLabel = weekDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return {
    title: `${instrument.toUpperCase()} Fundamental Analysis — Week of ${weekLabel} | Tradeora`,
    description: `AI-powered fundamental analysis for ${instrument.toUpperCase()} for the week of ${weekLabel}. Bullish/bearish bias, key drivers, and source-backed insights.`,
  };
}

async function getWeeklySummary(instrument: string, weekStart: string) {
  const sql = getDb();
  const rows = await sql`
    SELECT ws.*, i.name
    FROM weekly_summaries ws
    JOIN instruments i ON i.code = ws.instrument
    WHERE ws.instrument = ${instrument} AND ws.week_start = ${weekStart}
    LIMIT 1
  `;
  return rows.length > 0 ? rows[0] : null;
}

export default async function WeeklyAnalysisPage({ params }: { params: Promise<{ instrument: string; week: string }> }) {
  const { instrument, week } = await params;
  const code = instrument.toUpperCase();
  const summary = await getWeeklySummary(code, week);

  if (!summary) {
    notFound();
  }

  const s = summary as any;
  const themes = typeof s.key_themes === "string" ? JSON.parse(s.key_themes) : s.key_themes || [];
  const trajectory = typeof s.bias_trajectory === "string" ? JSON.parse(s.bias_trajectory) : s.bias_trajectory || {};
  const weekDate = new Date(s.week_start + "T00:00:00");
  const weekLabel = weekDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link href={`/analysis/${code}`} className="text-sm text-white/40 hover:text-white/60 transition-colors">
            ← {code} Archive
          </Link>
          <div className="flex items-center gap-3 mt-4 mb-2">
            <InstrumentIcon code={code} size="lg" />
            <div>
              <h1 className="font-serif text-2xl font-bold text-white">
                {code} Fundamental Analysis
              </h1>
              <p className="text-white/40 text-sm">Week of {weekLabel}</p>
            </div>
          </div>
        </div>

        {/* Key themes */}
        {themes.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {themes.map((theme: string, i: number) => (
              <span key={i} className="text-xs px-3 py-1 rounded-full bg-white/[0.06] text-white/50 border border-white/[0.08]">
                {theme}
              </span>
            ))}
          </div>
        )}

        {/* Bias trajectory */}
        {Object.keys(trajectory).length > 0 && (
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 mb-6">
            <h2 className="text-sm font-semibold text-white/60 mb-3">Bias Trajectory</h2>
            <div className="space-y-1.5">
              {Object.entries(trajectory).map(([date, biases]: [string, any]) => (
                <div key={date} className="flex items-center gap-3 text-xs">
                  <span className="text-white/30 w-20 shrink-0">{new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                  <div className="flex gap-2">
                    {biases["1week"] && (
                      <span className={`px-2 py-0.5 rounded-full ${biases["1week"].direction === "bullish" ? "bg-green-500/15 text-green-400" : biases["1week"].direction === "bearish" ? "bg-red-500/15 text-red-400" : "bg-white/[0.06] text-white/40"}`}>
                        1W: {biases["1week"].direction} ({biases["1week"].confidence}%)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main analysis */}
        <article className="prose prose-invert prose-sm max-w-none">
          <div className="text-white/70 leading-relaxed whitespace-pre-line text-[15px]">
            {s.summary}
          </div>
        </article>

        {/* CTA */}
        <div className="mt-10 bg-white/[0.04] border border-white/[0.08] rounded-xl p-6 text-center">
          <h3 className="font-semibold text-white mb-2">Get Daily Fundamental Analysis</h3>
          <p className="text-sm text-white/40 mb-4">
            Tradeora generates AI-powered fundamental bias for {s.article_count}+ instruments every day, with per-article reasoning chains.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-[#2563eb] hover:bg-[#1d4ed8] transition-colors"
          >
            Sign Up Free
          </Link>
        </div>

        <p className="text-[11px] text-white/20 mt-6">
          Generated on {new Date(s.generated_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} based on {s.article_count} articles. For informational purposes only — not financial advice.
        </p>
      </div>

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: `${code} Fundamental Analysis — Week of ${weekLabel}`,
            datePublished: s.generated_at,
            author: { "@type": "Organization", name: "Tradeora" },
            publisher: { "@type": "Organization", name: "Tradeora" },
            description: `AI-powered fundamental analysis for ${code} for the week of ${weekLabel}.`,
          }),
        }}
      />
    </div>
  );
}
