import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, TrendingUp, TrendingDown } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { cn } from "@/lib/utils";

interface PlaybookCardProps {
  playbook: {
    id: number;
    name: string;
    instrument: string | null;
    timeframe: string | null;
    trade_count: number;
    win_rate: number | null;
    total_pnl: number | null;
    avg_rr: number | null;
  };
}

export function PlaybookCard({ playbook }: PlaybookCardProps) {
  const pnl = playbook.total_pnl ?? 0;
  const winRate = playbook.win_rate ?? 0;

  return (
    <Link href={`/playbooks/${playbook.id}`} className="block">
      <div className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-2">
        <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={3} disabled={false} />
        <Card className="transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 cursor-pointer">
          <CardContent>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0 rounded-lg bg-indigo-500/10 p-2">
                  <BookOpen className="h-4 w-4 text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-white truncate block">
                    {playbook.name}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {playbook.instrument && (
                      <Badge variant="secondary" className="text-[10px]">
                        {playbook.instrument}
                      </Badge>
                    )}
                    {playbook.timeframe && (
                      <Badge variant="outline" className="text-[10px]">
                        {playbook.timeframe}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span
                  className={cn(
                    "text-sm font-mono font-semibold",
                    pnl > 0 && "text-green-400",
                    pnl < 0 && "text-red-400",
                    pnl === 0 && "text-white/30"
                  )}
                >
                  {pnl > 0 ? "+" : ""}
                  {pnl.toFixed(2)}
                </span>
                {pnl !== 0 && (
                  <span className="block">
                    {pnl > 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500 inline" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500 inline" />
                    )}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.06] text-xs text-white/40">
              <span>
                <span className="font-mono font-medium text-white/80">
                  {playbook.trade_count}
                </span>{" "}
                trades
              </span>
              <span>
                Win{" "}
                <span className="font-mono font-medium text-white/80">
                  {winRate.toFixed(1)}%
                </span>
              </span>
              {playbook.avg_rr != null && (
                <span>
                  Avg R:R{" "}
                  <span className="font-mono font-medium text-white/80">
                    {playbook.avg_rr.toFixed(2)}
                  </span>
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Link>
  );
}
