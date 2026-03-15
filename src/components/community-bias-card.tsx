"use client";

import { useState, useTransition } from "react";
import type { CommunityBias } from "@/types";

interface CommunityBiasCardProps {
  bias: CommunityBias;
  userVote?: string | null;
  canVote: boolean;
  timeframe: string;
}

export function CommunityBiasCard({ bias, userVote, canVote, timeframe }: CommunityBiasCardProps) {
  const [currentVote, setCurrentVote] = useState<string | null>(userVote ?? null);
  const [localBias, setLocalBias] = useState(bias);
  const [isPending, startTransition] = useTransition();

  const bullishPct = localBias.total > 0 ? Math.round((localBias.bullish / localBias.total) * 100) : 0;
  const bearishPct = localBias.total > 0 ? Math.round((localBias.bearish / localBias.total) * 100) : 0;
  const neutralPct = localBias.total > 0 ? 100 - bullishPct - bearishPct : 0;

  function handleVote(direction: string) {
    if (!canVote || isPending) return;

    startTransition(async () => {
      const res = await fetch("/api/community/bias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instrument: bias.instrument, timeframe, direction }),
      });

      if (res.ok) {
        // Optimistically update the local state
        const newBias = { ...localBias };
        // Remove old vote
        if (currentVote && currentVote !== direction) {
          newBias[currentVote as "bullish" | "bearish" | "neutral"]--;
          newBias.total--;
        }
        // Add new vote (only if different from current)
        if (currentVote !== direction) {
          newBias[direction as "bullish" | "bearish" | "neutral"]++;
          newBias.total++;
        }
        setLocalBias(newBias);
        setCurrentVote(direction);
      }
    });
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">{bias.instrument}</h3>
        <span className="text-xs text-white/30">{localBias.total} vote{localBias.total !== 1 ? "s" : ""}</span>
      </div>

      {/* Percentage bar */}
      <div className="w-full h-3 rounded-full overflow-hidden flex bg-white/[0.06]">
        {localBias.total > 0 ? (
          <>
            {bullishPct > 0 && (
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${bullishPct}%`, backgroundColor: "#2D5A3D" }}
              />
            )}
            {neutralPct > 0 && (
              <div
                className="h-full transition-all duration-500 bg-white/40"
                style={{ width: `${neutralPct}%` }}
              />
            )}
            {bearishPct > 0 && (
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${bearishPct}%`, backgroundColor: "#8B2252" }}
              />
            )}
          </>
        ) : (
          <div className="h-full w-full bg-white/[0.06]" />
        )}
      </div>

      {/* Percentage labels */}
      <div className="flex justify-between text-xs">
        <span className="text-[#2D5A3D] font-semibold">{bullishPct}% bullish</span>
        {neutralPct > 0 && <span className="text-white/40">{neutralPct}%</span>}
        <span className="text-[#8B2252] font-semibold">{bearishPct}% bearish</span>
      </div>

      {/* Vote buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => handleVote("bullish")}
          disabled={!canVote || isPending}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            currentVote === "bullish"
              ? "bg-[#2D5A3D] text-white"
              : "bg-white/[0.04] text-white/50 hover:bg-[#2D5A3D]/20 hover:text-[#2D5A3D]"
          } ${!canVote ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          Bullish
        </button>
        <button
          onClick={() => handleVote("neutral")}
          disabled={!canVote || isPending}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            currentVote === "neutral"
              ? "bg-white/30 text-white"
              : "bg-white/[0.04] text-white/50 hover:bg-white/10 hover:text-white"
          } ${!canVote ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          Neutral
        </button>
        <button
          onClick={() => handleVote("bearish")}
          disabled={!canVote || isPending}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            currentVote === "bearish"
              ? "bg-[#8B2252] text-white"
              : "bg-white/[0.04] text-white/50 hover:bg-[#8B2252]/20 hover:text-[#8B2252]"
          } ${!canVote ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          Bearish
        </button>
      </div>
    </div>
  );
}
