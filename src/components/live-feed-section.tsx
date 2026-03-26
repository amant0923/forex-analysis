"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Newspaper } from "lucide-react";
import { BiasIndicator } from "@/components/bias-indicator";
import { timeAgo } from "@/lib/utils";
import type { LiveArticle } from "@/types";

interface LiveFeedSectionProps {
  instrument: string;
}

const tierLabels: Record<number, { label: string; classes: string }> = {
  0: { label: "Official", classes: "bg-blue-500/15 text-blue-400" },
  1: { label: "Wire", classes: "bg-purple-500/15 text-purple-400" },
  2: { label: "Major", classes: "bg-white/[0.08] text-white/50" },
  3: { label: "Blog", classes: "bg-white/[0.04] text-white/30" },
};

function TierBadge({ tier }: { tier: number | null }) {
  if (tier == null) return null;
  const config = tierLabels[tier] ?? tierLabels[3];
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${config.classes}`}>
      {config.label}
    </span>
  );
}

export function LiveFeedSection({ instrument }: LiveFeedSectionProps) {
  const [articles, setArticles] = useState<LiveArticle[] | null>(null);

  const fetchArticles = useCallback(async () => {
    try {
      const res = await fetch(`/api/live-feed?instrument=${instrument}`);
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles);
      }
    } catch {
      // Silently fail
    }
  }, [instrument]);

  useEffect(() => {
    fetchArticles();
    const interval = setInterval(fetchArticles, 60_000);
    return () => clearInterval(interval);
  }, [fetchArticles]);

  // Loading state
  if (articles === null) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          <h2 className="font-serif text-xl font-bold text-white">Live News</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white/[0.04] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (articles.length === 0) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          <h2 className="font-serif text-xl font-bold text-white">Live News</h2>
        </div>
        <div className="py-12 text-center border border-white/10 rounded-lg">
          <Newspaper className="h-5 w-5 text-white/20 mx-auto mb-2" />
          <p className="text-sm text-white/30">No breaking news for {instrument} today</p>
        </div>
      </div>
    );
  }

  const displayArticles = articles.slice(0, 10);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        <h2 className="font-serif text-xl font-bold text-white">Live News</h2>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {displayArticles.map((article) => {
            const instrumentAnalysis = article.instruments.find(
              (inst) => inst.code === instrument
            );

            return (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Link
                  href={`/articles/${article.id}`}
                  className="block bg-white/[0.06] rounded-lg border border-white/10 p-4 sm:p-5 hover:bg-white/[0.08] transition-all cursor-pointer"
                >
                  {/* Top row: source + tier + time */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white/40">
                        {article.source}
                      </span>
                      <TierBadge tier={article.source_tier} />
                    </div>
                    <span className="text-[10px] text-white/30 font-mono">
                      {timeAgo(article.channel_posted_at)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm sm:text-[15px] font-semibold text-white leading-snug mb-1.5">
                    {article.title}
                  </h3>

                  {/* Bias indicator */}
                  {instrumentAnalysis && instrumentAnalysis.direction && (
                    <div className="mb-1.5">
                      <BiasIndicator
                        direction={instrumentAnalysis.direction as "bullish" | "bearish" | "neutral"}
                        size="sm"
                      />
                    </div>
                  )}

                  {/* Summary */}
                  {article.summary && (
                    <p className="text-xs text-white/40 leading-relaxed line-clamp-2">
                      {article.summary}
                    </p>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
