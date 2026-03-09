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
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";

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

  // Split into supporting and other articles
  const supportingIds = new Set((selectedBias?.supporting_articles ?? []).map((sa) => sa.article_id));
  const supportingRelevance = new Map((selectedBias?.supporting_articles ?? []).map((sa) => [sa.article_id, sa.relevance]));
  const supportingArticles = articles.filter((a: any) => supportingIds.has(a.id));
  const otherArticles = articles.filter((a: any) => !supportingIds.has(a.id));

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
      <div className="flex items-center gap-4 mb-6">
        <InstrumentIcon code={inst.code} size="lg" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl font-bold text-gray-900">{inst.code}</h1>
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

      {/* Timeframe tabs — underline style */}
      <div className="flex items-center gap-0 border-b border-gray-200 mb-8">
        {Object.entries(tfLabels).map(([key, label]) => {
          const isSelected = key === selectedTf;
          const dir = biases[key]?.direction ?? "neutral";
          const dotColor = dir === "bullish" ? "bg-green-700" : dir === "bearish" ? "bg-red-800" : "bg-gray-400";
          return (
            <a
              key={key}
              href={`/${inst.code}?tf=${key}`}
              className={cn(
                "flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer",
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
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <BiasIndicator direction={biasDir} size="md" />
            <span className="text-xs text-gray-400">
              Generated {new Date(selectedBias.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>

          <p className="text-[15px] leading-relaxed text-gray-700 max-w-3xl mb-6">
            {selectedBias.summary}
          </p>

          {/* Key drivers */}
          {selectedBias.key_drivers && selectedBias.key_drivers.length > 0 && (
            <div className="mb-6">
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
          <p className="text-sm text-gray-400">No analysis available for this timeframe yet.</p>
        </div>
      )}

      {/* Supporting Evidence */}
      {supportingArticles.length > 0 && (
        <div className="mb-10">
          <h2 className="font-serif text-lg font-bold text-gray-900 mb-4">
            Supporting Evidence
            <span className="ml-2 text-sm font-normal text-gray-400">{supportingArticles.length} articles</span>
          </h2>
          <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-200">
            {supportingArticles.map((article: any) => (
              <ArticleRow
                key={article.id}
                article={article}
                relevance={supportingRelevance.get(article.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Recent News */}
      {otherArticles.length > 0 && (
        <div className="mb-10">
          <h2 className="font-serif text-lg font-bold text-gray-900 mb-4">
            Other Recent News
            <span className="ml-2 text-sm font-normal text-gray-400">{otherArticles.length} articles</span>
          </h2>
          <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-200">
            {otherArticles.map((article: any) => (
              <ArticleRow key={article.id} article={article} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ArticleRow({
  article,
  relevance,
}: {
  article: any;
  relevance?: string;
}) {
  const impactDir = article.impact_direction;
  const timeAgo = getTimeAgo(article.published_at);

  return (
    <Link
      href={`/articles/${article.id}`}
      className="flex items-center gap-4 px-4 py-3 bg-white hover:bg-gray-50/80 transition-colors cursor-pointer"
    >
      {impactDir && (
        <div className={cn(
          "h-2 w-2 rounded-full shrink-0",
          impactDir === "bullish" ? "bg-green-700" : impactDir === "bearish" ? "bg-red-800" : "bg-gray-400"
        )} />
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{article.title}</p>
        {relevance && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{relevance}</p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {article.source && (
          <span className="text-[11px] font-medium text-gray-400">{article.source}</span>
        )}
        <span className="text-[11px] text-gray-300">{timeAgo}</span>
      </div>
    </Link>
  );
}

function getTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Now";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
