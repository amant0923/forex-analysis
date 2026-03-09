import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, FileText, Newspaper } from "lucide-react";
import type { Bias, Article } from "@/types";
import { NewsArticleCard } from "./news-article-card";

interface BiasDetailProps {
  bias: Bias | null;
  articles: Article[];
}

export function BiasDetail({ bias, articles }: BiasDetailProps) {
  if (!bias) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200/60">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 ring-1 ring-gray-200">
          <FileText className="h-5 w-5 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-500">No analysis available yet</p>
        <p className="mt-1 text-xs text-gray-400">
          Data will appear after the next pipeline run.
        </p>
      </div>
    );
  }

  const supportingArticleMap = new Map(
    (bias.supporting_articles ?? []).map((sa) => [sa.article_id, sa.relevance])
  );

  const supportingArticles = articles.filter((a) => supportingArticleMap.has(a.id));
  const otherArticles = articles.filter((a) => !supportingArticleMap.has(a.id));

  const DirectionIcon =
    bias.direction === "bullish" ? TrendingUp
    : bias.direction === "bearish" ? TrendingDown
    : Minus;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200/60">
        <div className="mb-4 flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold",
            bias.direction === "bullish" && "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200",
            bias.direction === "bearish" && "bg-red-50 text-red-600 ring-1 ring-red-200",
            bias.direction === "neutral" && "bg-gray-50 text-gray-500 ring-1 ring-gray-200",
          )}>
            <DirectionIcon className="h-4 w-4" />
            {bias.direction === "bullish" ? "BULLISH" : bias.direction === "bearish" ? "BEARISH" : "NEUTRAL"}
          </div>
          <span className="text-[11px] text-gray-400">
            Generated {new Date(bias.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-gray-700">{bias.summary}</p>
      </div>

      {/* Key Drivers */}
      {bias.key_drivers && bias.key_drivers.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200/60">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-gray-400">
            Key Drivers
          </h3>
          <div className="space-y-3">
            {bias.key_drivers.map((driver, i) => (
              <div key={i} className="flex items-start gap-3 text-sm text-gray-600">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-[10px] font-bold text-indigo-600 ring-1 ring-indigo-200">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{driver}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      {(supportingArticles.length > 0 || otherArticles.length > 0) && (
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <Newspaper className="h-3.5 w-3.5 text-gray-300" />
          <div className="h-px flex-1 bg-gray-200" />
        </div>
      )}

      {/* Supporting Articles */}
      {supportingArticles.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-gray-400">
            Supporting Evidence ({supportingArticles.length} articles)
          </h3>
          <div className="space-y-3">
            {supportingArticles.map((article) => (
              <NewsArticleCard
                key={article.id}
                article={article}
                relevance={supportingArticleMap.get(article.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Recent Articles */}
      {otherArticles.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-gray-400">
            Other Recent News ({otherArticles.length} articles)
          </h3>
          <div className="space-y-3">
            {otherArticles.map((article) => (
              <NewsArticleCard key={article.id} article={article} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
