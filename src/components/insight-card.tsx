"use client";

import { TrendingUp, Clock, BarChart3, Heart, Repeat, Shield } from "lucide-react";
import type { TraderInsight } from "@/types";

const categoryConfig: Record<TraderInsight["category"], { icon: typeof TrendingUp; color: string }> = {
  bias_alignment: { icon: TrendingUp, color: "text-blue-400" },
  session: { icon: Clock, color: "text-amber-400" },
  instrument: { icon: BarChart3, color: "text-emerald-400" },
  emotion: { icon: Heart, color: "text-pink-400" },
  pattern: { icon: Repeat, color: "text-purple-400" },
  risk: { icon: Shield, color: "text-cyan-400" },
};

function isPositiveStat(stat: string): boolean {
  // Heuristic: if the stat contains high win rates or positive patterns
  const positivePatterns = /(\b[6-9]\d|100)%\s*(win|aligned)|improvement|strong|best|high/i;
  return positivePatterns.test(stat);
}

export function InsightCard({ insight }: { insight: TraderInsight }) {
  const config = categoryConfig[insight.category] || categoryConfig.pattern;
  const Icon = config.icon;
  const positive = isPositiveStat(insight.stat);

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 hover:bg-white/[0.05] transition-colors">
      <div className="flex items-start gap-3 mb-3">
        <div className={`mt-0.5 ${config.color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white">{insight.title}</h3>
          <p className="text-[10px] uppercase tracking-wider text-white/30 mt-0.5">
            {insight.category.replace("_", " ")}
          </p>
        </div>
      </div>
      <p className={`text-lg font-bold mb-2 ${positive ? "text-emerald-400" : "text-red-400"}`}>
        {insight.stat}
      </p>
      <p className="text-sm text-white/60 leading-relaxed">
        {insight.description}
      </p>
    </div>
  );
}
