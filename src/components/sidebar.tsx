import Link from "next/link";
import type { Instrument } from "@/types";

interface SidebarProps {
  instruments: Instrument[];
}

export function Sidebar({ instruments }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl">
      <div className="p-6">
        <Link href="/">
          <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            ForexPulse
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
            Fundamental Analysis
          </p>
        </Link>
      </div>
      <nav className="space-y-0.5 px-3">
        {instruments.map((inst) => (
          <Link
            key={inst.code}
            href={`/${inst.code}`}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-zinc-100"
          >
            <span className="font-mono font-semibold text-zinc-300">{inst.code}</span>
            <span className="text-xs text-zinc-600">{inst.name}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
