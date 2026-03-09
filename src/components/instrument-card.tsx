import Link from "next/link";
import { BiasBadge } from "./bias-badge";
import type { InstrumentWithBias } from "@/types";

interface InstrumentCardProps {
  instrument: InstrumentWithBias;
}

export function InstrumentCard({ instrument }: InstrumentCardProps) {
  return (
    <Link href={`/${instrument.code}`}>
      <div className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-md transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-2xl hover:shadow-purple-500/5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-zinc-100">{instrument.code}</h3>
            <p className="text-xs text-zinc-500">{instrument.name}</p>
          </div>
          <span className="rounded-full border border-white/5 bg-white/[0.03] px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
            {instrument.category}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <BiasBadge direction={instrument.biases?.daily?.direction ?? null} label="Daily" />
          <BiasBadge direction={instrument.biases?.["1week"]?.direction ?? null} label="1W" />
          <BiasBadge direction={instrument.biases?.["1month"]?.direction ?? null} label="1M" />
          <BiasBadge direction={instrument.biases?.["3month"]?.direction ?? null} label="3M" />
        </div>
        <div className="mt-3 text-right">
          <span className="text-xs text-zinc-600">
            {instrument.article_count} articles
          </span>
        </div>
      </div>
    </Link>
  );
}
