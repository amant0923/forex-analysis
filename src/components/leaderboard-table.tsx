"use client";

import { useState } from "react";
import type { LeaderboardEntry } from "@/types";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserName?: string | null;
}

type SortField = "rank" | "display_name" | "win_rate" | "consistency_score" | "avg_rr" | "total_trades";

export function LeaderboardTable({ entries, currentUserName }: LeaderboardTableProps) {
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortAsc, setSortAsc] = useState(true);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === "rank" || field === "display_name");
    }
  }

  const sorted = [...entries].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (aVal === null && bVal === null) return 0;
    if (aVal === null) return 1;
    if (bVal === null) return -1;
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const rankStyles: Record<number, string> = {
    1: "text-amber-400",
    2: "text-gray-300",
    3: "text-amber-700",
  };

  function SortHeader({ field, label, align }: { field: SortField; label: string; align?: string }) {
    const active = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`${align === "right" ? "text-right" : "text-left"} text-xs uppercase tracking-wider font-semibold px-4 py-3 cursor-pointer select-none transition-colors ${
          active ? "text-white/60" : "text-white/30 hover:text-white/50"
        }`}
      >
        {label}
        {active && (
          <span className="ml-1">{sortAsc ? "\u2191" : "\u2193"}</span>
        )}
      </th>
    );
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <SortHeader field="rank" label="Rank" />
              <SortHeader field="display_name" label="Trader" />
              <SortHeader field="win_rate" label="Win Rate" align="right" />
              <SortHeader field="consistency_score" label="Consistency" align="right" />
              <SortHeader field="avg_rr" label="Avg R:R" align="right" />
              <SortHeader field="total_trades" label="Trades" align="right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-white/30 py-8">
                  No leaderboard data yet
                </td>
              </tr>
            ) : (
              sorted.map((entry) => {
                const isCurrentUser = currentUserName && entry.display_name === currentUserName;
                return (
                  <tr
                    key={`${entry.rank}-${entry.display_name}`}
                    className={`hover:bg-white/[0.02] transition-colors ${
                      isCurrentUser ? "bg-white/[0.04]" : ""
                    }`}
                  >
                    <td className={`px-4 py-3 font-bold ${rankStyles[entry.rank] || "text-white/60"}`}>
                      {entry.rank <= 3 ? (
                        <span className="text-lg">
                          {entry.rank === 1 ? "\uD83E\uDD47" : entry.rank === 2 ? "\uD83E\uDD48" : "\uD83E\uDD49"}
                        </span>
                      ) : (
                        entry.rank
                      )}
                    </td>
                    <td className={`px-4 py-3 font-medium ${isCurrentUser ? "text-white" : "text-white/80"}`}>
                      {entry.display_name}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-white/30">(you)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-white/80">
                      {entry.win_rate.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-white/60">
                      {entry.consistency_score !== null ? entry.consistency_score.toFixed(1) : "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-white/60">
                      {entry.avg_rr !== null ? `${entry.avg_rr.toFixed(2)}R` : "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-right text-white/50">
                      {entry.total_trades}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
