import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getInstruments,
  getLatestBiases,
  getArticlesWithAnalysesForInstrument,
  getInstrumentQuotes,
} from "@/lib/queries";
import { getInstrumentSentiment } from "@/lib/sentiment";
import { cn } from "@/lib/utils";
import { InstrumentIcon } from "@/components/instrument-icon";
import { BiasIndicator } from "@/components/bias-indicator";
import { SentimentGauge } from "@/components/sentiment-gauge";
import { TradingViewWidget } from "@/components/tradingview-widget";
import { ArrowLeft, ExternalLink, Clock, AlertCircle, Newspaper } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ instrument: string }>;
  searchParams: Promise<{ tf?: string }>;
}

const tfLabels: Record<string, string> = {
  daily: "Daily",
  "1week": "1 Week",
  "1month": "1 Month",
  "3month": "3 Months",
};

const dayMap: Record<string, number> = {
  daily: 1,
  "1week": 7,
  "1month": 30,
  "3month": 90,
};

export default async function InstrumentPage({ params, searchParams }: PageProps) {
  const { instrument: instrumentParam } = await params;
  const { tf } = await searchParams;

  const instruments = await getInstruments();
  const inst = instruments.find((i) => i.code === instrumentParam.toUpperCase());
  if (!inst) notFound();

  const [biases, quotes, sentiment] = await Promise.all([
    getLatestBiases(inst.code),
    getInstrumentQuotes(),
    getInstrumentSentiment(inst.code),
  ]);
  const quote = quotes[inst.code] ?? null;
  const selectedTf = tf || "daily";
  const selectedBias = biases[selectedTf] ?? null;

  const articles = await getArticlesWithAnalysesForInstrument(
    inst.code,
    dayMap[selectedTf] ?? 7
  );

  const biasDir = selectedBias?.direction ?? "neutral";

  return (
    <div>
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-[13px] text-white/30 hover:text-white/60 transition-colors cursor-pointer mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Market Overview
      </Link>

      {/* Instrument header */}
      <div className="flex items-center gap-3 sm:gap-4 mb-6">
        <InstrumentIcon code={inst.code} size="lg" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">{inst.code}</h1>
            <span className={cn(
              "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded",
              inst.category === "forex" ? "bg-blue-500/15 text-blue-400" : "bg-purple-500/15 text-purple-400"
            )}>
              {inst.category}
            </span>
          </div>
          <p className="text-sm text-white/40">{inst.name}</p>
        </div>
        {quote && (
          <div className="text-right">
            <p className="text-xl sm:text-2xl font-bold tabular-nums text-white">
              {Number(quote.price).toFixed(inst.category === "forex" ? 4 : 2)}
            </p>
            <p className={cn(
              "text-sm font-semibold tabular-nums",
              Number(quote.change_pct) >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {Number(quote.change_pct) >= 0 ? "+" : ""}{Number(quote.change_pct).toFixed(2)}%
            </p>
          </div>
        )}
      </div>

      {/* TradingView chart */}
      <div className="mb-6">
        <TradingViewWidget instrument={inst.code} height={500} />
      </div>

      {/* Timeframe tabs */}
      <div className="flex items-center gap-0 border-b border-white/10 mb-6 sm:mb-8 overflow-x-auto">
        {Object.entries(tfLabels).map(([key, label]) => {
          const isSelected = key === selectedTf;
          const dir = biases[key]?.direction ?? "neutral";
          const dotColor = dir === "bullish" ? "bg-green-700" : dir === "bearish" ? "bg-red-800" : "bg-white/30";
          return (
            <a
              key={key}
              href={`/${inst.code}?tf=${key}`}
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap",
                isSelected
                  ? "border-[#1e3a5f] text-[#1e3a5f]"
                  : "border-transparent text-white/30 hover:text-white/60 hover:border-white/20"
              )}
            >
              {label}
              <div className={cn("h-2 w-2 rounded-full", dotColor)} />
            </a>
          );
        })}
      </div>

      {/* Bias analysis panel */}
      {selectedBias ? (
        <div className="mb-8 sm:mb-10 bg-white/[0.06] rounded-lg border border-white/10 p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <BiasIndicator direction={biasDir} size="md" confidence={selectedBias.confidence} />
            {selectedBias.confidence_rationale && (
              <span className="text-[11px] text-white/40 italic max-w-sm truncate" title={selectedBias.confidence_rationale}>
                {selectedBias.confidence_rationale}
              </span>
            )}
            <span className="text-xs text-white/30">
              Generated {new Date(selectedBias.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>

          <p className="text-[15px] leading-relaxed text-white/80 max-w-3xl mb-6">
            {selectedBias.summary}
          </p>

          {selectedBias.key_drivers && selectedBias.key_drivers.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/30 mb-3">
                Key Drivers
              </h3>
              <ol className="space-y-2">
                {selectedBias.key_drivers.map((driver, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-white/60">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/[0.06] text-[10px] font-bold text-white/40">
                      {i + 1}
                    </span>
                    {driver}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-10 py-12 text-center border border-white/10 rounded-lg">
          <AlertCircle className="h-5 w-5 text-white/20 mx-auto mb-2" />
          <p className="text-sm text-white/30">No analysis available for this timeframe yet.</p>
        </div>
      )}

      {/* Sentiment Analysis */}
      {sentiment.total_articles > 0 && (
        <div className="mb-8 bg-white/[0.06] rounded-lg border border-white/10 p-4 sm:p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/30 mb-3">
            Sentiment Analysis
          </h3>
          <SentimentGauge score={sentiment.score} size="md" />
          <div className="flex items-center gap-4 mt-3 text-xs text-white/40">
            <span className="text-green-400 font-medium">{sentiment.bullish_count} bullish</span>
            <span className="text-red-400 font-medium">{sentiment.bearish_count} bearish</span>
            <span>{sentiment.neutral_count} neutral</span>
            <span className="text-white/30">({sentiment.total_articles} articles)</span>
          </div>
        </div>
      )}

      {/* Article Analysis Dashboard */}
      <div className="mb-10">
        <h2 className="font-serif text-xl font-bold text-white mb-6">
          Article Analysis
          <span className="ml-2 text-sm font-normal text-white/30">{articles.length} articles</span>
        </h2>

        {articles.length > 0 ? (
          <div className="space-y-4">
            {articles.map((article: any) => (
              <ArticleAnalysisCard key={article.id} article={article} instrument={inst.code} />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center border border-white/10 rounded-lg">
            <Newspaper className="h-5 w-5 text-white/20 mx-auto mb-2" />
            <p className="text-sm text-white/30">No recent articles affecting this instrument.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ArticleAnalysisCard({ article, instrument }: { article: any; instrument: string }) {
  const hasAnalysis = article.impact_direction != null;
  const isHighConfidence = article.confidence === "high";

  return (
    <div className={cn(
      "bg-white/[0.06] rounded-lg border p-4 sm:p-6",
      isHighConfidence ? "border-[#2563eb]/30" : "border-white/10"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 sm:gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <Link
            href={`/articles/${article.id}`}
            className="font-serif text-lg font-bold text-white hover:text-[#1e3a5f] transition-colors line-clamp-2"
          >
            {article.title}
          </Link>
          <div className="flex items-center gap-3 mt-1">
            {article.source && (
              <span className="text-xs font-medium text-white/40">{article.source}</span>
            )}
            {article.published_at && (
              <span className="flex items-center gap-1 text-xs text-white/30">
                <Clock className="h-3 w-3" />
                {new Date(article.published_at).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric"
                })}
              </span>
            )}
          </div>
        </div>
        {article.url && (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-white/30 hover:text-white/60 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      {/* AI Summary */}
      {article.summary && (
        <div className="mb-4">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-2">
            AI Summary
          </h4>
          <p className="text-sm text-white/60 leading-relaxed">
            {article.summary}
          </p>
        </div>
      )}

      {/* Impact Analysis */}
      {hasAnalysis && (
        <div className="border-t border-white/[0.06] pt-4">
          <div className="flex items-center gap-3 mb-3">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
              Impact on {instrument}
            </h4>
            <div className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded",
              article.impact_direction === "bullish" ? "bg-green-500/15 text-green-400" :
              article.impact_direction === "bearish" ? "bg-red-500/15 text-red-400" :
              "bg-white/[0.04] text-white/40"
            )}>
              {article.impact_direction.charAt(0).toUpperCase() + article.impact_direction.slice(1)}
            </div>
            {article.confidence && (
              <div className={cn(
                "text-[10px] font-medium px-2 py-0.5 rounded",
                article.confidence === "high" ? "bg-blue-500/15 text-blue-400" :
                article.confidence === "medium" ? "bg-yellow-500/15 text-yellow-400" :
                "bg-white/[0.04] text-white/40"
              )}>
                {article.confidence.charAt(0).toUpperCase() + article.confidence.slice(1)} confidence
              </div>
            )}
          </div>

          {/* Event */}
          {article.event && (
            <div className="mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mr-2">Event:</span>
              <span className="text-sm text-white/80">{article.event}</span>
            </div>
          )}

          {/* Mechanism */}
          {article.mechanism && (
            <div className="mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mr-2">Mechanism:</span>
              <span className="text-sm text-white/80">{article.mechanism}</span>
            </div>
          )}

          {/* Timeframes */}
          {article.impact_timeframes && article.impact_timeframes.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Timeframes:</span>
              {article.impact_timeframes.map((tf: string) => (
                <span key={tf} className="text-[10px] font-medium bg-white/[0.06] text-white/60 px-2 py-0.5 rounded">
                  {tf}
                </span>
              ))}
            </div>
          )}

          {/* Analyst Commentary */}
          {article.commentary && (
            <div className="mt-3 p-3 bg-white/[0.04] rounded-lg">
              <h5 className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1.5">
                Analyst Commentary
              </h5>
              <p className="text-sm text-white/80 leading-relaxed">
                {article.commentary}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
