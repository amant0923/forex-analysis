import Link from "next/link";
import { Activity, BarChart3, TrendingUp } from "lucide-react";
import type { Instrument } from "@/types";

interface SidebarProps {
  instruments: Instrument[];
  activeCode?: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  forex: <TrendingUp className="h-3.5 w-3.5 text-zinc-600" />,
  index: <BarChart3 className="h-3.5 w-3.5 text-zinc-600" />,
};

export function Sidebar({ instruments, activeCode }: SidebarProps) {
  return (
    <aside className="h-full border-r border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl">
      {/* Top gradient accent line */}
      <div className="h-[2px] bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500" />

      <div className="p-6">
        <Link href="/" className="group block">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 transition-all duration-300 group-hover:from-purple-500/30 group-hover:to-blue-500/30 group-hover:shadow-lg group-hover:shadow-purple-500/10">
              <Activity className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent glow-purple">
                ForexPulse
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                Fundamental Analysis
              </p>
            </div>
          </div>
        </Link>
      </div>

      <div className="px-3 mb-2">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600">
          Instruments
        </p>
      </div>

      <nav className="space-y-0.5 px-3 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
        {instruments.map((inst) => {
          const isActive = activeCode === inst.code;
          return (
            <Link
              key={inst.code}
              href={`/${inst.code}`}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${
                isActive
                  ? "bg-white/[0.06] text-zinc-100 border border-white/[0.08] shadow-sm shadow-purple-500/5"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100 border border-transparent"
              }`}
            >
              {categoryIcons[inst.category] ?? <TrendingUp className="h-3.5 w-3.5 text-zinc-600" />}
              <span className="font-data font-semibold text-zinc-300">{inst.code}</span>
              <span className="ml-auto text-[11px] text-zinc-600">{inst.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Last updated footer */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-white/[0.04] px-6 py-3">
        <p className="text-[10px] text-zinc-700">
          Last updated: {new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </aside>
  );
}
