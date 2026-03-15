"use client";

import { useState, useEffect } from "react";
import { BiasTimelineChart } from "@/components/bias-timeline-chart";
import { InstrumentIcon } from "@/components/instrument-icon";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const INSTRUMENTS = [
  "DXY", "EURUSD", "GBPUSD", "USDJPY", "EURJPY", "GBPJPY", "EURGBP",
  "AUDUSD", "USDCAD", "NZDUSD", "USDCHF",
  "XAUUSD", "XAGUSD", "GER40", "US30", "NAS100", "SP500",
  "BTCUSD", "ETHUSD", "USOIL",
];

const TIMEFRAMES = [
  { value: "daily", label: "Daily" },
  { value: "1week", label: "1 Week" },
  { value: "1month", label: "1 Month" },
  { value: "3month", label: "3 Month" },
];

interface HistoryData {
  date: string;
  direction: string;
  confidence: number;
  summary: string;
}

export default function HistoryPage() {
  const [instrument, setInstrument] = useState("EURUSD");
  const [timeframe, setTimeframe] = useState("1week");
  const [data, setData] = useState<HistoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/history?instrument=${instrument}&timeframe=${timeframe}`)
      .then((r) => r.json())
      .then((d) => setData(d.history || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [instrument, timeframe]);

  return (
    <div className="max-w-5xl">
      <h1 className="font-serif text-2xl font-bold text-white mb-2">Historical Analysis</h1>
      <p className="text-sm text-white/40 mb-6">
        Track how fundamental bias has evolved over time for each instrument.
      </p>

      {/* Instrument selector */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {INSTRUMENTS.map((code) => (
          <button
            key={code}
            onClick={() => setInstrument(code)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border",
              instrument === code
                ? "bg-white/10 border-white/20 text-white"
                : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.06] hover:text-white/60"
            )}
          >
            <InstrumentIcon code={code} size="sm" />
            {code}
          </button>
        ))}
      </div>

      {/* Timeframe selector */}
      <div className="flex gap-1.5 mb-6">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.value}
            onClick={() => setTimeframe(tf.value)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border",
              timeframe === tf.value
                ? "bg-[#2563eb]/20 border-[#2563eb]/30 text-[#60a5fa]"
                : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.06]"
            )}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-white/30" />
        </div>
      ) : (
        <>
          <BiasTimelineChart data={data} instrument={instrument} timeframe={timeframe} />

          {/* Data table */}
          {data.length > 0 && (
            <div className="mt-6 bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-white/30 text-xs font-medium px-4 py-2.5">Date</th>
                    <th className="text-left text-white/30 text-xs font-medium px-4 py-2.5">Direction</th>
                    <th className="text-left text-white/30 text-xs font-medium px-4 py-2.5">Confidence</th>
                    <th className="text-left text-white/30 text-xs font-medium px-4 py-2.5 hidden md:table-cell">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data].reverse().slice(0, 30).map((d, i) => (
                    <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-white/50 text-xs">
                        {new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full",
                          d.direction === "bullish" ? "bg-green-500/15 text-green-400" :
                          d.direction === "bearish" ? "bg-red-500/15 text-red-400" :
                          "bg-white/[0.06] text-white/40"
                        )}>
                          {d.direction}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-white/50 text-xs">{d.confidence}%</td>
                      <td className="px-4 py-2.5 text-white/30 text-xs truncate max-w-[300px] hidden md:table-cell">
                        {d.summary?.slice(0, 100)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
