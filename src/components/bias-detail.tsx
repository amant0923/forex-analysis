import { cn } from "@/lib/utils";
import type { Bias, Article } from "@/types";
import { NewsArticleCard } from "./news-article-card";

interface BiasDetailProps {
  bias: Bias | null;
  articles: Article[];
}

export function BiasDetail({ bias, articles }: BiasDetailProps) {
  if (!bias) {
    return (
      <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-8 text-center text-zinc-600">
        No analysis available yet. Data will appear after the next pipeline run.
      </div>
    );
  }

  const supportingArticleMap = new Map(
    (bias.supporting_articles ?? []).map((sa) => [sa.article_id, sa.relevance])
  );

  const supportingArticles = articles.filter((a) => supportingArticleMap.has(a.id));
  const otherArticles = articles.filter((a) => !supportingArticleMap.has(a.id));

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm">
        <div className={cn(
          "mb-3 inline-block rounded-full px-3 py-1 text-sm font-bold",
          bias.direction === "bullish" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
          bias.direction === "bearish" && "bg-red-500/10 text-red-400 border border-red-500/20",
          bias.direction === "neutral" && "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20",
        )}>
          {bias.direction === "bullish" ? "BULLISH" : bias.direction === "bearish" ? "BEARISH" : "NEUTRAL"}
        </div>
        <p className="text-sm leading-relaxed text-zinc-300">{bias.summary}</p>
      </div>

      {/* Key Drivers */}
      {bias.key_drivers && bias.key_drivers.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-600">
            Key Drivers
          </h3>
          <div className="space-y-2">
            {bias.key_drivers.map((driver, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-zinc-400">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
                {driver}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supporting Articles */}
      {supportingArticles.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-600">
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
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-600">
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
