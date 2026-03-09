import Link from "next/link";
import { Activity, TrendingUp, BarChart3 } from "lucide-react";
import { InstrumentIcon } from "./instrument-icon";
import type { Instrument } from "@/types";

interface SidebarProps {
  instruments: Instrument[];
  activeCode?: string;
}

export function Sidebar({ instruments }: SidebarProps) {
  const forexInstruments = instruments.filter((i) => i.category === "forex");
  const indexInstruments = instruments.filter((i) => i.category === "index");

  return (
    <aside className="h-full border-r border-gray-200 bg-white">
      {/* Indigo accent line */}
      <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

      <div className="p-5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">ForexPulse</h1>
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-gray-400">
              Fundamental Analysis
            </p>
          </div>
        </Link>
      </div>

      <nav className="px-3 space-y-5">
        {/* FX Pairs */}
        <div>
          <div className="flex items-center gap-1.5 px-3 mb-2">
            <TrendingUp className="h-3 w-3 text-indigo-400" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400">
              FX Pairs
            </span>
          </div>
          <div className="space-y-0.5">
            {forexInstruments.map((inst) => (
              <Link
                key={inst.code}
                href={`/${inst.code}`}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-600 transition-all duration-150 hover:bg-gray-50 hover:text-gray-900 cursor-pointer"
              >
                <InstrumentIcon code={inst.code} size="sm" />
                <span className="font-semibold text-gray-800">{inst.code}</span>
                <span className="ml-auto text-[11px] text-gray-400">{inst.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Indices */}
        <div>
          <div className="flex items-center gap-1.5 px-3 mb-2">
            <BarChart3 className="h-3 w-3 text-violet-400" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400">
              Indices
            </span>
          </div>
          <div className="space-y-0.5">
            {indexInstruments.map((inst) => (
              <Link
                key={inst.code}
                href={`/${inst.code}`}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-600 transition-all duration-150 hover:bg-gray-50 hover:text-gray-900 cursor-pointer"
              >
                <InstrumentIcon code={inst.code} size="sm" />
                <span className="font-semibold text-gray-800">{inst.code}</span>
                <span className="ml-auto text-[11px] text-gray-400">{inst.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </aside>
  );
}
