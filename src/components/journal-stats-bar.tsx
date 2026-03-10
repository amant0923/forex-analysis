"use client";

import { Card, CardContent } from "@/components/ui/card";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { cn } from "@/lib/utils";
import type { JournalStats } from "@/types";

interface JournalStatsBarProps {
  stats: JournalStats;
}

function formatDollars(value: number): string {
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  return value < 0 ? `-${formatted}` : `+${formatted}`;
}

function StatCard({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: string;
  colorClass?: string;
}) {
  return (
    <div className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-2">
      <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={3} disabled={false} />
      <Card className="flex-1 min-w-[140px]">
        <CardContent className="py-3 px-4">
          <p className="text-xs text-white/40 mb-0.5">{label}</p>
          <p className={cn("text-lg font-semibold font-mono", colorClass || "text-white")}>
            {value}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function JournalStatsBar({ stats }: JournalStatsBarProps) {
  const pnlColor = (val: number) =>
    val > 0 ? "text-green-400" : val < 0 ? "text-red-400" : "text-white/40";

  const winRateColor = stats.win_rate > 50 ? "text-green-400" : stats.win_rate < 50 ? "text-red-400" : "text-white";

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <StatCard label="Total Trades" value={String(stats.total_trades)} />
      <StatCard
        label="Win Rate"
        value={`${stats.win_rate.toFixed(1)}%`}
        colorClass={winRateColor}
      />
      <StatCard label="Avg R:R" value={stats.avg_rr.toFixed(2)} />
      <StatCard
        label="P&L Today"
        value={formatDollars(stats.pnl_today)}
        colorClass={pnlColor(stats.pnl_today)}
      />
      <StatCard
        label="P&L This Week"
        value={formatDollars(stats.pnl_week)}
        colorClass={pnlColor(stats.pnl_week)}
      />
      <StatCard
        label="P&L This Month"
        value={formatDollars(stats.pnl_month)}
        colorClass={pnlColor(stats.pnl_month)}
      />
    </div>
  );
}
