import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getArticleById,
  getArticleAnalyses,
  getArticleInstruments,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import { InstrumentIcon } from "@/components/instrument-icon";
import { ArrowLeft, ExternalLink, TrendingUp, TrendingDown, Minus, Shield } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

const confidenceConfig = {
  high: { label: "High Confidence", color: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
  medium: { label: "Medium Confidence", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  low: { label: "Low Confidence", color: "text-white/40", bg: "bg-white/[0.04]", border: "border-white/10" },
};

export default async function ArticlePage({ params }: PageProps) {
  const { id } = await params;
  const articleId = parseInt(id, 10);
  if (isNaN(articleId)) notFound();

  const article = await getArticleById(articleId);
  if (!article) notFound();

  const analyses = await getArticleAnalyses(articleId);
  const instruments = await getArticleInstruments(articleId);

  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="max-w-3xl">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-[13px] text-white/30 hover:text-white/60 transition-colors cursor-pointer mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Market Overview
      </Link>

      <article>
        {/* Article header */}
        <header className="mb-8">
          <h1 className="font-serif text-2xl font-bold leading-snug text-white mb-3">
            {article.title}
          </h1>
          <div className="flex items-center gap-3 text-sm text-white/30">
            {article.source && (
              <span className="font-medium text-white/60">{article.source}</span>
            )}
            {publishedDate && (
              <>
                <span className="text-white/20">|</span>
                <span>{publishedDate}</span>
              </>
            )}
          </div>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-medium text-[#1e3a5f] hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            Read Original Article
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </header>

        {/* AI Summary */}
        {article.summary && (
          <section className="mb-10">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/30 mb-3">
              AI Summary
            </h2>
            <div className="text-[15px] leading-relaxed text-white/80 space-y-4 border-l-2 border-white/10 pl-5">
              {article.summary.split("\n\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>
        )}

        {/* Affected Instruments tags */}
        {instruments.length > 0 && (
          <div className="flex items-center gap-2 mb-8">
            <span className="text-xs text-white/30 font-medium">Affects:</span>
            {instruments.map((code) => (
              <Link
                key={code}
                href={`/${code}`}
                className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-white/80 hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <InstrumentIcon code={code} size="sm" />
                {code}
              </Link>
            ))}
          </div>
        )}

        {/* Impact Analyses */}
        {analyses.length > 0 && (
          <section>
            <h2 className="font-serif text-lg font-bold text-white mb-6">
              Impact Analysis
            </h2>

            <div className="space-y-8">
              {analyses.map((analysis) => {
                const DirectionIcon =
                  analysis.impact_direction === "bullish" ? TrendingUp
                  : analysis.impact_direction === "bearish" ? TrendingDown
                  : Minus;
                const dirColor =
                  analysis.impact_direction === "bullish" ? "text-green-800"
                  : analysis.impact_direction === "bearish" ? "text-red-800"
                  : "text-white/40";
                const conf = confidenceConfig[analysis.confidence] ?? confidenceConfig.medium;

                return (
                  <div key={analysis.id} className="border border-white/10 rounded-lg overflow-hidden">
                    {/* Instrument header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 bg-white/[0.04] px-4 sm:px-5 py-3 border-b border-white/10">
                      <Link
                        href={`/${analysis.instrument}`}
                        className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity"
                      >
                        <InstrumentIcon code={analysis.instrument} size="sm" />
                        <span className="font-serif font-bold text-white">
                          {analysis.instrument}
                        </span>
                      </Link>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-1.5">
                          <DirectionIcon className={cn("h-4 w-4", dirColor)} />
                          <span className={cn("text-xs sm:text-sm font-bold uppercase", dirColor)}>
                            {analysis.impact_direction}
                          </span>
                        </div>
                        <div className={cn("flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] sm:text-[11px] font-medium", conf.bg, conf.border, conf.color)}>
                          <Shield className="h-3 w-3" />
                          {conf.label}
                        </div>
                      </div>
                    </div>

                    {/* Structured chain */}
                    <div className="px-4 sm:px-5 py-4 space-y-3">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/30">
                          Event
                        </span>
                        <p className="text-sm text-white/80 mt-0.5">{analysis.event}</p>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/30">
                          Mechanism
                        </span>
                        <p className="text-sm text-white/80 mt-0.5">{analysis.mechanism}</p>
                      </div>
                      {analysis.impact_timeframes && analysis.impact_timeframes.length > 0 && (
                        <div>
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/30">
                            Relevant Timeframes
                          </span>
                          <div className="flex gap-1.5 mt-1">
                            {analysis.impact_timeframes.map((tf: string) => (
                              <span key={tf} className="rounded bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-white/60">
                                {tf}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Analyst commentary */}
                    <div className="border-t border-white/10 bg-white/[0.02] px-4 sm:px-5 py-4">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/30">
                        Analyst Commentary
                      </span>
                      <p className="text-sm leading-relaxed text-white/80 mt-1">
                        {analysis.commentary}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <div className="mt-10 pt-6 border-t border-white/10">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded bg-[#1e3a5f] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#162d4a] transition-colors cursor-pointer"
          >
            Read Original Article
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </article>
    </div>
  );
}
