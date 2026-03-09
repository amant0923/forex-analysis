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
      className="block rounded-lg border border-white/[0.04] bg-white/[0.02] p-4 transition-all duration-200 hover:border-white/[0.08] hover:bg-white/[0.04]"
    >
      <h4 className="font-medium leading-snug text-zinc-200">
        {article.title}
      </h4>
      <div className="mt-1.5 flex items-center gap-2 text-xs text-zinc-600">
        <span>{article.source}</span>
        <span className="text-zinc-700">·</span>
        <span>{timeAgo}</span>
      </div>
      {relevance && (
        <p className="mt-2 rounded-md bg-purple-500/5 border border-purple-500/10 px-3 py-1.5 text-xs text-purple-300/80">
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
