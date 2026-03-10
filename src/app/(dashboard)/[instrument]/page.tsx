import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getInstruments,
  getLatestBiases,
  getArticlesWithAnalysesForInstrument,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import { InstrumentIcon } from "@/components/instrument-icon";
import { BiasIndicator } from "@/components/bias-indicator";
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

  const biases = await getLatestBiases(inst.code);
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
        className="inline-flex items-center gap-1 text-[13px] text-gray-400 hover:text-gray-600 transition-colors cursor-pointer mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Market Overview
      </Link>

      {/* Instrument header */}
      <div className="flex items-center gap-3 sm:gap-4 mb-6">
        <InstrumentIcon code={inst.code} size="lg" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900">{inst.code}</h1>
            <span className={cn(
              "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded",
              inst.category === "forex" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
            )}>
              {inst.category}
            </span>
          </div>
          <p className="text-sm text-gray-500">{inst.name}</p>
        </div>
      </div>

      {/* Timeframe tabs */}
      <div className="flex items-center gap-0 border-b border-gray-200 mb-6 sm:mb-8 overflow-x-auto">
        {Object.entries(tfLabels).map(([key, label]) => {
          const isSelected = key === selectedTf;
          const dir = biases[key]?.direction ?? "neutral";
          const dotColor = dir === "bullish" ? "bg-green-700" : dir === "bearish" ? "bg-red-800" : "bg-gray-400";
          return (
            <a
              key={key}
              href={`/${inst.code}?tf=${key}`}
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap",
                isSelected
                  ? "border-[#1e3a5f] text-[#1e3a5f]"
                  : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300"
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
        <div className="mb-8 sm:mb-10 bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <BiasIndicator direction={biasDir} size="md" />
            <span className="text-xs text-gray-400">
              Generated {new Date(selectedBias.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>

          <p className="text-[15px] leading-relaxed text-gray-700 max-w-3xl mb-6">
            {selectedBias.summary}
          </p>

          {selectedBias.key_drivers && selectedBias.key_drivers.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Key Drivers
              </h3>
              <ol className="space-y-2">
                {selectedBias.key_drivers.map((driver, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-100 text-[10px] font-bold text-gray-500">
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
        <div className="mb-10 py-12 text-center border border-gray-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No analysis available for this timeframe yet.</p>
        </div>
      )}

      {/* Article Analysis Dashboard */}
      <div className="mb-10">
        <h2 className="font-serif text-xl font-bold text-gray-900 mb-6">
          Article Analysis
          <span className="ml-2 text-sm font-normal text-gray-400">{articles.length} articles</span>
        </h2>

        {articles.length > 0 ? (
          <div className="space-y-4">
            {articles.map((article: any) => (
              <ArticleAnalysisCard key={article.id} article={article} instrument={inst.code} />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center border border-gray-200 rounded-lg">
            <Newspaper className="h-5 w-5 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No recent articles affecting this instrument.</p>
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
      "bg-white rounded-lg border p-4 sm:p-6",
      isHighConfidence ? "border-[#2563eb]/30" : "border-gray-200"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 sm:gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <Link
            href={`/articles/${article.id}`}
            className="font-serif text-lg font-bold text-gray-900 hover:text-[#1e3a5f] transition-colors line-clamp-2"
          >
            {article.title}
          </Link>
          <div className="flex items-center gap-3 mt-1">
            {article.source && (
              <span className="text-xs font-medium text-gray-500">{article.source}</span>
            )}
            {article.published_at && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
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
            className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      {/* AI Summary */}
      {article.summary && (
        <div className="mb-4">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
            AI Summary
          </h4>
          <p className="text-sm text-gray-600 leading-relaxed">
            {article.summary}
          </p>
        </div>
      )}

      {/* Impact Analysis */}
      {hasAnalysis && (
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Impact on {instrument}
            </h4>
            <div className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded",
              article.impact_direction === "bullish" ? "bg-green-50 text-green-700" :
              article.impact_direction === "bearish" ? "bg-red-50 text-red-700" :
              "bg-gray-50 text-gray-500"
            )}>
              {article.impact_direction}
            </div>
            {article.confidence && (
              <div className={cn(
                "text-[10px] font-medium px-2 py-0.5 rounded",
                article.confidence === "high" ? "bg-blue-50 text-blue-700" :
                article.confidence === "medium" ? "bg-yellow-50 text-yellow-700" :
                "bg-gray-50 text-gray-500"
              )}>
                {article.confidence} confidence
              </div>
            )}
          </div>

          {/* Event */}
          {article.event && (
            <div className="mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mr-2">Event:</span>
              <span className="text-sm text-gray-700">{article.event}</span>
            </div>
          )}

          {/* Mechanism */}
          {article.mechanism && (
            <div className="mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mr-2">Mechanism:</span>
              <span className="text-sm text-gray-700">{article.mechanism}</span>
            </div>
          )}

          {/* Timeframes */}
          {article.impact_timeframes && article.impact_timeframes.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Timeframes:</span>
              {article.impact_timeframes.map((tf: string) => (
                <span key={tf} className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  {tf}
                </span>
              ))}
            </div>
          )}

          {/* Analyst Commentary */}
          {article.commentary && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <h5 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Analyst Commentary
              </h5>
              <p className="text-sm text-gray-700 leading-relaxed">
                {article.commentary}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
