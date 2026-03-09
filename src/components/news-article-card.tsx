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
      className="group block cursor-pointer rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200/60 transition-all duration-200 hover:-translate-y-px hover:shadow-md hover:ring-gray-300/80"
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-medium leading-snug text-gray-900 group-hover:text-indigo-600 transition-colors">
          {article.title}
        </h4>
        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-300 transition-colors group-hover:text-gray-500" />
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {article.source && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500 ring-1 ring-gray-200">
            {article.source}
          </span>
        )}
        <span className="text-gray-400">{timeAgo}</span>
      </div>
      {relevance && (
        <p className="mt-2.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs text-indigo-600 leading-relaxed ring-1 ring-indigo-100">
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
