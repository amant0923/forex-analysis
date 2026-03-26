"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { timeAgo } from "@/lib/utils";
import type { LiveArticle } from "@/types";

interface LiveNewsTickerProps {
  initialArticles: LiveArticle[];
}

function isWithinLastTwoHours(dateStr: string): boolean {
  const twoHoursMs = 2 * 60 * 60 * 1000;
  return Date.now() - new Date(dateStr).getTime() < twoHoursMs;
}

function biasColor(direction: string | null): string {
  if (direction === "bullish") return "text-green-400";
  if (direction === "bearish") return "text-red-400";
  return "text-white/40";
}

export function LiveNewsTicker({ initialArticles }: LiveNewsTickerProps) {
  const [articles, setArticles] = useState<LiveArticle[]>(initialArticles);

  const fetchArticles = useCallback(async () => {
    try {
      const res = await fetch("/api/live-feed");
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles);
      }
    } catch {
      // Silently fail — keep showing stale data
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchArticles, 60_000);
    return () => clearInterval(interval);
  }, [fetchArticles]);

  // Hide if no articles posted in the last 2 hours
  const recentArticles = articles.filter(
    (a) => a.channel_posted_at && isWithinLastTwoHours(a.channel_posted_at)
  );
  if (recentArticles.length === 0) return null;

  const displayArticles = recentArticles.slice(0, 5);

  return (
    <div className="glass-sm rounded-xl p-3 sm:p-4 mb-6">
      <div className="flex items-center gap-3">
        {/* LIVE indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          <span className="font-serif text-xs font-semibold uppercase tracking-wider text-white/60">
            Live
          </span>
        </div>

        {/* Scrollable article list */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 overflow-x-auto scrollbar-hide min-w-0 flex-1">
          <AnimatePresence mode="popLayout">
            {displayArticles.map((article) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Link
                  href={`/articles/${article.id}`}
                  className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
                >
                  <span className="text-[10px] font-medium text-white/30 shrink-0">
                    {article.source}
                  </span>
                  <span className="text-sm font-medium text-white line-clamp-1 max-w-[200px] sm:max-w-[260px]">
                    {article.title}
                  </span>
                  <span className="text-[10px] text-white/30 font-mono shrink-0">
                    {timeAgo(article.channel_posted_at)}
                  </span>
                  {article.instruments.slice(0, 3).map((inst) => (
                    <span
                      key={inst.code}
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/[0.08] shrink-0 ${biasColor(inst.direction)}`}
                    >
                      {inst.code}
                    </span>
                  ))}
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
