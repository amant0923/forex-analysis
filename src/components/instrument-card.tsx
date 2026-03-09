import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BiasBadge } from "./bias-badge";
import type { InstrumentWithBias } from "@/types";

interface InstrumentCardProps {
  instrument: InstrumentWithBias;
}

export function InstrumentCard({ instrument }: InstrumentCardProps) {
  return (
    <Link href={`/${instrument.code}`}>
      <div className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-2xl hover:shadow-purple-500/5">
        {/* Subtle gradient border overlay on hover */}
        <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-gradient-to-br from-purple-500/[0.03] via-transparent to-blue-500/[0.03]" />

        <div className="relative mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-data text-xl font-bold tracking-tight text-zinc-100">{instrument.code}</h3>
            <p className="text-xs text-zinc-500">{instrument.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-white/5 bg-white/[0.03] px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
              {instrument.category}
            </span>
            <ArrowUpRight className="h-4 w-4 text-zinc-700 transition-all duration-200 group-hover:text-zinc-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>
        <div className="relative grid grid-cols-4 gap-2">
          <BiasBadge direction={instrument.biases?.daily?.direction ?? null} label="Daily" />
          <BiasBadge direction={instrument.biases?.["1week"]?.direction ?? null} label="1W" />
          <BiasBadge direction={instrument.biases?.["1month"]?.direction ?? null} label="1M" />
          <BiasBadge direction={instrument.biases?.["3month"]?.direction ?? null} label="3M" />
        </div>
        <div className="relative mt-3 text-right">
          <span className="text-xs text-zinc-600">
            {instrument.article_count} articles
          </span>
        </div>
      </div>
    </Link>
  );
}
