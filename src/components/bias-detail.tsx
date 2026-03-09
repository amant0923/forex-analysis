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
      <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.04] bg-white/[0.02] p-12 text-center backdrop-blur-sm">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.03]">
          <FileText className="h-5 w-5 text-zinc-600" />
        </div>
        <p className="text-sm font-medium text-zinc-500">No analysis available yet</p>
        <p className="mt-1 text-xs text-zinc-700">
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
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold",
            bias.direction === "bullish" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
            bias.direction === "bearish" && "bg-red-500/10 text-red-400 border border-red-500/20",
            bias.direction === "neutral" && "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20",
          )}>
            <DirectionIcon className="h-4 w-4" />
            {bias.direction === "bullish" ? "BULLISH" : bias.direction === "bearish" ? "BEARISH" : "NEUTRAL"}
          </div>
          <span className="text-[11px] text-zinc-600">
            Generated {new Date(bias.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-zinc-300">{bias.summary}</p>
      </div>

      {/* Key Drivers */}
      {bias.key_drivers && bias.key_drivers.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
            Key Drivers
          </h3>
          <div className="space-y-3">
            {bias.key_drivers.map((driver, i) => (
              <div key={i} className="flex items-start gap-3 text-sm text-zinc-400">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/10 font-data text-[10px] font-bold text-purple-400">
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
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
          <Newspaper className="h-3.5 w-3.5 text-zinc-700" />
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        </div>
      )}

      {/* Supporting Articles */}
      {supportingArticles.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
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
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
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
