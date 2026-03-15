"use client";

import { useState } from "react";
import { InstrumentIcon } from "@/components/instrument-icon";
import { cn } from "@/lib/utils";
import { Loader2, TrendingUp, TrendingDown, BarChart3, AlertTriangle } from "lucide-react";

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
];

interface BacktestResult {
  instrument: string;
  timeframe: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPips: number;
  maxDrawdownPct: number;
  trades: {
    date: string;
    direction: string;
    confidence: number;
    openPrice: number;
    closePrice: number;
    pricePct: number;
    result: "win" | "loss";
  }[];
  equityCurve: { date: string; equity: number }[];
}

export default function BacktestPage() {
  const [instrument, setInstrument] = useState("EURUSD");
  const [timeframe, setTimeframe] = useState("1week");
  const [minConfidence, setMinConfidence] = useState(50);
  const [days, setDays] = useState(180);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runBacktest() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instrument, timeframe, days, minConfidence, positionSize: 10000 }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Backtest failed");
        return;
      }
      setResult(await res.json());
    } catch {
      setError("Failed to run backtest");
    } finally {
      setLoading(false);
    }
  }

  const equityCurve = result?.equityCurve || [];
  const maxEquity = Math.max(...equityCurve.map((d) => d.equity), 10000);
  const minEquity = Math.min(...equityCurve.map((d) => d.equity), 10000);
  const range = maxEquity - minEquity || 1;

  return (
    <div className="max-w-5xl">
      <h1 className="font-serif text-2xl font-bold text-white mb-2">Backtesting</h1>
      <p className="text-sm text-white/40 mb-6">
        Simulate trading on historical bias predictions to see how they would have performed.
      </p>

      {/* Parameters */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Instrument */}
          <div>
            <label className="text-xs text-white/30 font-medium mb-2 block">Instrument</label>
            <div className="flex flex-wrap gap-1.5">
              {INSTRUMENTS.slice(0, 10).map((code) => (
                <button
                  key={code}
                  onClick={() => setInstrument(code)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-all",
                    instrument === code
                      ? "bg-white/10 border-white/20 text-white"
                      : "bg-white/[0.02] border-white/[0.06] text-white/40 hover:bg-white/[0.06]"
                  )}
                >
                  <InstrumentIcon code={code} size="sm" />
                  {code}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {INSTRUMENTS.slice(10).map((code) => (
                <button
                  key={code}
                  onClick={() => setInstrument(code)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-all",
                    instrument === code
                      ? "bg-white/10 border-white/20 text-white"
                      : "bg-white/[0.02] border-white/[0.06] text-white/40 hover:bg-white/[0.06]"
                  )}
                >
                  <InstrumentIcon code={code} size="sm" />
                  {code}
                </button>
              ))}
            </div>
          </div>

          {/* Timeframe */}
          <div>
            <label className="text-xs text-white/30 font-medium mb-2 block">Timeframe</label>
            <div className="flex gap-1.5">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => setTimeframe(tf.value)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium border cursor-pointer transition-all",
                    timeframe === tf.value
                      ? "bg-[#2563eb]/20 border-[#2563eb]/30 text-[#60a5fa]"
                      : "bg-white/[0.02] border-white/[0.06] text-white/40 hover:bg-white/[0.06]"
                  )}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            <label className="text-xs text-white/30 font-medium mt-4 mb-2 block">
              Min Confidence: {minConfidence}%
            </label>
            <input
              type="range"
              min={0}
              max={90}
              step={5}
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
              className="w-full accent-[#2563eb]"
            />

            <label className="text-xs text-white/30 font-medium mt-4 mb-2 block">
              Lookback: {days} days
            </label>
            <input
              type="range"
              min={30}
              max={365}
              step={30}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full accent-[#2563eb]"
            />
          </div>
        </div>

        <button
          onClick={runBacktest}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-[#2563eb] hover:bg-[#1d4ed8] transition-colors cursor-pointer disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
          {loading ? "Running..." : "Run Backtest"}
        </button>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Total Trades</p>
              <p className="text-2xl font-bold text-white">{result.totalTrades}</p>
            </div>
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Win Rate</p>
              <p className={cn("text-2xl font-bold", result.winRate >= 50 ? "text-green-400" : "text-red-400")}>
                {result.winRate}%
              </p>
            </div>
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Total Return</p>
              <p className={cn("text-2xl font-bold", result.totalPips >= 0 ? "text-green-400" : "text-red-400")}>
                {result.totalPips >= 0 ? "+" : ""}{result.totalPips}
              </p>
            </div>
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Max Drawdown</p>
              <p className="text-2xl font-bold text-red-400">{result.maxDrawdownPct}%</p>
            </div>
          </div>

          {/* Equity curve */}
          {equityCurve.length > 1 && (
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 mb-6">
              <h3 className="text-sm font-semibold text-white/60 mb-3">Equity Curve (starting $10,000)</h3>
              <svg width="100%" height={160} viewBox={`0 0 ${Math.max(equityCurve.length * 8, 400)} 160`} preserveAspectRatio="none">
                <path
                  d={equityCurve.map((d, i) => {
                    const x = (i / Math.max(equityCurve.length - 1, 1)) * Math.max(equityCurve.length * 8, 400);
                    const y = 150 - ((d.equity - minEquity) / range) * 130;
                    return `${i === 0 ? "M" : "L"} ${x},${y}`;
                  }).join(" ")}
                  fill="none"
                  stroke={equityCurve[equityCurve.length - 1]?.equity >= 10000 ? "#4ade80" : "#f87171"}
                  strokeWidth={2}
                />
                {/* Baseline at 10000 */}
                <line
                  x1={0}
                  y1={150 - ((10000 - minEquity) / range) * 130}
                  x2={Math.max(equityCurve.length * 8, 400)}
                  y2={150 - ((10000 - minEquity) / range) * 130}
                  stroke="rgba(255,255,255,0.1)"
                  strokeDasharray="4,4"
                />
              </svg>
            </div>
          )}

          {/* Trade log */}
          {result.trades.length > 0 && (
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-white/30 text-xs font-medium px-4 py-2.5">Date</th>
                    <th className="text-left text-white/30 text-xs font-medium px-4 py-2.5">Direction</th>
                    <th className="text-left text-white/30 text-xs font-medium px-4 py-2.5">Confidence</th>
                    <th className="text-left text-white/30 text-xs font-medium px-4 py-2.5">P&L %</th>
                    <th className="text-left text-white/30 text-xs font-medium px-4 py-2.5">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {result.trades.map((t, i) => (
                    <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-4 py-2 text-white/50 text-xs">{t.date}</td>
                      <td className="px-4 py-2">
                        <span className="flex items-center gap-1 text-xs">
                          {t.direction === "bullish" ? <TrendingUp className="h-3 w-3 text-green-400" /> : <TrendingDown className="h-3 w-3 text-red-400" />}
                          {t.direction}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-white/40 text-xs">{t.confidence}%</td>
                      <td className={cn("px-4 py-2 text-xs font-medium", t.pricePct >= 0 ? "text-green-400" : "text-red-400")}>
                        {t.pricePct >= 0 ? "+" : ""}{t.pricePct}%
                      </td>
                      <td className="px-4 py-2">
                        <span className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-full",
                          t.result === "win" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                        )}>
                          {t.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.totalTrades === 0 && (
            <div className="text-center py-12 text-white/30">
              <p className="text-lg mb-2">No settled predictions found</p>
              <p className="text-sm">Try lowering the confidence threshold or increasing the lookback period.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
