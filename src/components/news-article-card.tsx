import { ExternalLink } from "lucide-react";
import type { Article } from "@/types";

interface NewsArticleCardProps {
  article: Article;
  relevance?: string;
}

export function NewsArticleCard({ article, relevance }: NewsArticleCardProps) {
  const timeAgo = getTimeAgo(article.published_at);

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-lg border border-white/[0.04] bg-white/[0.02] p-4 transition-all duration-200 hover:-translate-y-px hover:border-white/[0.08] hover:bg-white/[0.04] hover:shadow-lg hover:shadow-purple-500/[0.03]"
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-medium leading-snug text-zinc-200 group-hover:text-zinc-100 transition-colors">
          {article.title}
        </h4>
        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-700 transition-colors group-hover:text-zinc-400" />
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {article.source && (
          <span className="rounded-md bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-zinc-400">
            {article.source}
          </span>
        )}
        <span className="text-zinc-600">{timeAgo}</span>
      </div>
      {relevance && (
        <p className="mt-2.5 rounded-md bg-purple-500/5 border border-purple-500/10 px-3 py-1.5 text-xs text-purple-300/80 leading-relaxed">
          {relevance}
        </p>
      )}
    </a>
  );
}

function getTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "Unknown";
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
