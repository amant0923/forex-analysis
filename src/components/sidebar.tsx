import Link from "next/link";
import { Activity, TrendingUp, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { InstrumentIcon } from "./instrument-icon";
import type { Instrument } from "@/types";

interface SidebarProps {
  instruments: Instrument[];
  activeCode?: string;
}

const categoryConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  forex: {
    icon: <TrendingUp className="h-3 w-3" />,
    color: "text-purple-400",
    label: "FX PAIRS",
  },
  index: {
    icon: <BarChart3 className="h-3 w-3" />,
    color: "text-blue-400",
    label: "INDICES",
  },
};

export function Sidebar({ instruments, activeCode }: SidebarProps) {
  const grouped = instruments.reduce(
    (acc, inst) => {
      const cat = inst.category || "other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(inst);
      return acc;
    },
    {} as Record<string, Instrument[]>
  );

  return (
    <aside className="h-full border-r border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl">
      {/* Top gradient accent line */}
      <div className="h-[2px] bg-gradient-to-r from-emerald-500 via-purple-500 to-red-500" />

      <div className="p-6">
        <Link href="/" className="group block">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 border border-purple-500/30 shadow-lg shadow-purple-500/10 transition-all duration-300 group-hover:from-purple-500/40 group-hover:to-blue-500/40 group-hover:shadow-purple-500/20">
              <Activity className="h-4.5 w-4.5 text-purple-300" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-purple-300 via-blue-300 to-purple-300 bg-clip-text text-transparent glow-purple">
                ForexPulse
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                Trading Terminal
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Market sentiment mini bar */}
      <div className="mx-3 mb-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
          Market Pulse
        </p>
        <div className="flex gap-1.5">
          <div className="h-1.5 flex-1 rounded-full bg-gradient-to-r from-emerald-500/60 to-emerald-500/30" />
          <div className="h-1.5 flex-1 rounded-full bg-gradient-to-r from-red-500/60 to-red-500/30" />
          <div className="h-1.5 flex-1 rounded-full bg-gradient-to-r from-zinc-500/40 to-zinc-500/20" />
        </div>
        <div className="mt-1.5 flex justify-between text-[9px] text-zinc-600">
          <span className="text-emerald-500/80">Bullish</span>
          <span className="text-red-500/80">Bearish</span>
          <span>Neutral</span>
        </div>
      </div>

      {/* Instruments grouped by category */}
      <nav
        className="space-y-4 overflow-y-auto px-3"
        style={{ maxHeight: "calc(100vh - 280px)" }}
      >
        {Object.entries(grouped).map(([category, items]) => {
          const catConfig = categoryConfig[category] ?? {
            icon: <TrendingUp className="h-3 w-3" />,
            color: "text-zinc-400",
            label: category.toUpperCase(),
          };
          return (
            <div key={category}>
              <div className="mb-1.5 flex items-center gap-2 px-3">
                <span className={catConfig.color}>{catConfig.icon}</span>
                <p
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-[0.15em]",
                    catConfig.color
                  )}
                >
                  {catConfig.label}
                </p>
              </div>
              <div className="space-y-0.5">
                {items.map((inst) => {
                  const isActive = activeCode === inst.code;
                  return (
                    <Link
                      key={inst.code}
                      href={`/${inst.code}`}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 border",
                        isActive
                          ? "bg-white/[0.08] text-zinc-100 border-white/[0.1] shadow-sm shadow-purple-500/10"
                          : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200 border-transparent"
                      )}
                    >
                      <InstrumentIcon code={inst.code} size="sm" />
                      <span className="font-data font-semibold text-zinc-200">
                        {inst.code}
                      </span>
                      <span className="ml-auto text-[10px] text-zinc-600 truncate max-w-[80px]">
                        {inst.name}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-white/[0.04] bg-zinc-950/50 px-6 py-3">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[10px] text-zinc-600">
            Live &middot;{" "}
            {new Date().toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>
    </aside>
  );
}
