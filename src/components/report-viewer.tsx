"use client";

import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Loader2,
  Lock,
  Sparkles,
  AlertCircle,
  CheckCircle,
  XCircle,
  Lightbulb,
  Brain,
  Target,
} from "lucide-react";

interface ReportData {
  type: "basic" | "ai";
  period: "weekly" | "monthly";
  total_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  total_pnl: number;
  avg_rr: number;
  best_trade: number;
  worst_trade: number;
  by_instrument: { instrument: string; count: number; pnl: number }[];
  daily_pnl: { day: string; pnl: number }[];
  ai_insights?: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    patterns: string[];
    emotional_analysis: string;
    bias_alignment: string;
    top_suggestions: string[];
  } | null;
}

interface ReportViewerProps {
  hasWeekly: boolean;
  hasMonthly: boolean;
}

export function ReportViewer({ hasWeekly, hasMonthly }: ReportViewerProps) {
  const [type, setType] = useState<"weekly" | "monthly">("weekly");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch(`/api/ai/report?type=${type}&date=${date}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate report");
      setReport(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const maxAbsPnl = report?.daily_pnl.length
    ? Math.max(...report.daily_pnl.map((d) => Math.abs(Number(d.pnl))), 1)
    : 1;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Report Type</label>
          <div className="flex rounded-lg overflow-hidden border border-[#2a3040]">
            <button
              onClick={() => setType("weekly")}
              disabled={!hasWeekly}
              className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                type === "weekly"
                  ? "bg-blue-600 text-white"
                  : "bg-[#1e2433] text-gray-400 hover:text-white"
              } ${!hasWeekly ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Weekly
            </button>
            <button
              onClick={() => setType("monthly")}
              disabled={!hasMonthly}
              className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                type === "monthly"
                  ? "bg-blue-600 text-white"
                  : "bg-[#1e2433] text-gray-400 hover:text-white"
              } ${!hasMonthly ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Monthly
              {!hasMonthly && <Lock className="h-3 w-3" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Period Ending</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-[#1e2433] border border-[#2a3040] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <BarChart3 className="h-4 w-4" />
              Generate Report
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Report */}
      {report && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total Trades" value={String(report.total_trades)} />
            <StatCard
              label="Win Rate"
              value={`${report.win_rate.toFixed(1)}%`}
              color={report.win_rate >= 50 ? "green" : "red"}
            />
            <StatCard
              label="Total P&L"
              value={`$${report.total_pnl.toFixed(2)}`}
              color={report.total_pnl >= 0 ? "green" : "red"}
            />
            <StatCard label="Avg R:R" value={report.avg_rr.toFixed(2)} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Wins" value={String(report.wins)} color="green" />
            <StatCard label="Losses" value={String(report.losses)} color="red" />
            <StatCard
              label="Best Trade"
              value={`$${report.best_trade.toFixed(2)}`}
              color="green"
            />
            <StatCard
              label="Worst Trade"
              value={`$${report.worst_trade.toFixed(2)}`}
              color="red"
            />
          </div>

          {/* Instrument Breakdown */}
          {report.by_instrument.length > 0 && (
            <div className="bg-[#1e2433] border border-[#2a3040] rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white mb-3">By Instrument</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 text-left">
                      <th className="pb-2 font-medium">Instrument</th>
                      <th className="pb-2 font-medium text-right">Trades</th>
                      <th className="pb-2 font-medium text-right">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.by_instrument.map((row) => (
                      <tr key={row.instrument} className="border-t border-[#2a3040]">
                        <td className="py-2 text-white font-medium">{row.instrument}</td>
                        <td className="py-2 text-right text-gray-300">{row.count}</td>
                        <td
                          className={`py-2 text-right font-medium ${
                            Number(row.pnl) >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          ${Number(row.pnl).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Daily P&L Chart */}
          {report.daily_pnl.length > 0 && (
            <div className="bg-[#1e2433] border border-[#2a3040] rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Daily P&L</h3>
              <div className="flex items-end gap-1 h-40">
                {report.daily_pnl.map((day) => {
                  const pnl = Number(day.pnl);
                  const heightPct = (Math.abs(pnl) / maxAbsPnl) * 100;
                  const isPositive = pnl >= 0;
                  return (
                    <div
                      key={day.day}
                      className="flex-1 flex flex-col items-center justify-end h-full relative group"
                    >
                      {/* Tooltip */}
                      <div className="absolute -top-8 bg-gray-800 text-xs text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        {day.day}: ${pnl.toFixed(2)}
                      </div>
                      {/* Bar */}
                      <div
                        className={`w-full max-w-[32px] rounded-t transition-all ${
                          isPositive ? "bg-emerald-500" : "bg-red-500"
                        }`}
                        style={{ height: `${Math.max(heightPct, 2)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-1 mt-1">
                {report.daily_pnl.map((day) => (
                  <div
                    key={day.day}
                    className="flex-1 text-center text-[10px] text-gray-500 truncate"
                  >
                    {day.day.slice(5)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Insights (premium) */}
          {report.type === "ai" && report.ai_insights && (
            <div className="bg-[#1e2433] border border-purple-500/30 rounded-lg p-5 space-y-5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">AI Insights</h3>
              </div>

              <p className="text-sm text-gray-300 leading-relaxed">
                {report.ai_insights.summary}
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Strengths
                  </div>
                  <ul className="space-y-1">
                    {report.ai_insights.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-gray-300 pl-5 relative before:content-[''] before:absolute before:left-1.5 before:top-2 before:w-1 before:h-1 before:rounded-full before:bg-emerald-500">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-red-400 text-xs font-semibold">
                    <XCircle className="h-3.5 w-3.5" />
                    Weaknesses
                  </div>
                  <ul className="space-y-1">
                    {report.ai_insights.weaknesses.map((w, i) => (
                      <li key={i} className="text-sm text-gray-300 pl-5 relative before:content-[''] before:absolute before:left-1.5 before:top-2 before:w-1 before:h-1 before:rounded-full before:bg-red-500">
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Patterns */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-blue-400 text-xs font-semibold">
                  <Target className="h-3.5 w-3.5" />
                  Patterns Identified
                </div>
                <ul className="space-y-1">
                  {report.ai_insights.patterns.map((p, i) => (
                    <li key={i} className="text-sm text-gray-300 pl-5 relative before:content-[''] before:absolute before:left-1.5 before:top-2 before:w-1 before:h-1 before:rounded-full before:bg-blue-500">
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Emotional Analysis */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
                  <Brain className="h-3.5 w-3.5" />
                  Emotional Analysis
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {report.ai_insights.emotional_analysis}
                </p>
              </div>

              {/* Bias Alignment */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-semibold">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Bias Alignment
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {report.ai_insights.bias_alignment}
                </p>
              </div>

              {/* Top Suggestions */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-purple-400 text-xs font-semibold">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Top Suggestions
                </div>
                <ol className="space-y-1">
                  {report.ai_insights.top_suggestions.map((s, i) => (
                    <li key={i} className="text-sm text-gray-300 pl-5 relative">
                      <span className="absolute left-0 text-purple-400 font-medium">{i + 1}.</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {/* Upgrade prompt for basic reports */}
          {report.type === "basic" && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-purple-300">
                  Upgrade to Premium for AI-powered insights
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Get personalized analysis of your trading patterns, emotional tendencies,
                  strengths, weaknesses, and actionable suggestions.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!report && !loading && !error && (
        <div className="text-center py-16 text-gray-500">
          <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Select a period and generate your report</p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: "green" | "red";
}) {
  return (
    <div className="bg-[#1e2433] border border-[#2a3040] rounded-lg p-3">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p
        className={`text-lg font-semibold ${
          color === "green"
            ? "text-emerald-400"
            : color === "red"
              ? "text-red-400"
              : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
