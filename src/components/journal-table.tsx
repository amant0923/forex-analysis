"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Plus, Download, Loader2, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import type { Trade, Playbook } from "@/types";

const INSTRUMENTS = ["EURUSD", "GBPUSD", "DXY", "GER40", "US30", "NAS100", "SP500"];
const DIRECTIONS = ["all", "buy", "sell"] as const;
const PAGE_SIZE = 50;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPnl(trade: Trade): string {
  if (trade.pnl_dollars === null) return "--";
  const pips = trade.pnl_pips !== null ? `${trade.pnl_pips} pips` : "";
  const ticks = trade.pnl_ticks !== null ? `${trade.pnl_ticks} ticks` : "";
  const dollars = `$${Math.abs(trade.pnl_dollars).toFixed(2)}`;
  const unit = pips || ticks;
  const sign = trade.pnl_dollars >= 0 ? "+" : "-";
  return unit ? `${unit} / ${sign}${dollars}` : `${sign}${dollars}`;
}

export function JournalTable() {
  const router = useRouter();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Filters
  const [instrument, setInstrument] = useState("");
  const [direction, setDirection] = useState<"all" | "buy" | "sell">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [playbookId, setPlaybookId] = useState("");
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);

  useEffect(() => {
    fetch("/api/playbooks")
      .then((r) => r.json())
      .then((data) => setPlaybooks(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (instrument) params.set("instrument", instrument);
    if (direction !== "all") params.set("direction", direction);
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    if (playbookId) params.set("playbook_id", playbookId);

    try {
      const res = await fetch(`/api/trades?${params}`);
      if (!res.ok) throw new Error("Failed to fetch trades");
      const data = await res.json();
      const fetched = data.trades || [];
      setTrades(fetched);
      setHasMore(fetched.length === PAGE_SIZE);
    } catch {
      setTrades([]);
    } finally {
      setLoading(false);
    }
  }, [page, instrument, direction, startDate, endDate, playbookId]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [instrument, direction, startDate, endDate, playbookId]);

  async function handleExport() {
    try {
      const res = await fetch("/api/trades/export");
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Export failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trades-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed");
    }
  }

  const startIndex = (page - 1) * PAGE_SIZE + 1;
  const endIndex = startIndex + trades.length - 1;

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Instrument filter */}
          <select
            value={instrument}
            onChange={(e) => setInstrument(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">All Instruments</option>
            {INSTRUMENTS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>

          {/* Direction toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {DIRECTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDirection(d)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer capitalize",
                  direction === d
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {d === "all" ? "All" : d}
              </button>
            ))}
          </div>

          {/* Date range */}
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-8 w-[140px] text-xs"
            placeholder="Start date"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-8 w-[140px] text-xs"
            placeholder="End date"
          />

          {/* Playbook filter */}
          {playbooks.length > 0 && (
            <select
              value={playbookId}
              onChange={(e) => setPlaybookId(e.target.value)}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">All Playbooks</option>
              {playbooks.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" data-icon="inline-start" />
            Export CSV
          </Button>
          <Button size="sm" onClick={() => router.push("/journal/add")}>
            <Plus className="h-4 w-4" data-icon="inline-start" />
            Add Trade
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">Loading trades...</span>
            </div>
          ) : trades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-gray-100 p-3 mb-4">
                <BookOpen className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">No trades yet</p>
              <p className="text-sm text-gray-500 mb-5">
                Log your first trade to start tracking.
              </p>
              <Button size="sm" onClick={() => router.push("/journal/add")}>
                <Plus className="h-4 w-4" data-icon="inline-start" />
                Add Trade
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Instrument</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Direction</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500">Entry</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500">Exit</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500">P&L</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500">R:R</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Session</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Emotion</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade) => (
                    <tr
                      key={trade.id}
                      onClick={() => router.push(`/journal/${trade.id}`)}
                      className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 text-xs text-gray-600 whitespace-nowrap">
                        {formatDate(trade.opened_at)}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {trade.instrument}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] uppercase font-semibold",
                            trade.direction === "buy"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-red-50 text-red-700"
                          )}
                        >
                          {trade.direction}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-gray-700">
                        {trade.entry_price}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-gray-700">
                        {trade.exit_price ?? "--"}
                      </td>
                      <td
                        className={cn(
                          "py-3 px-4 text-right font-mono text-xs whitespace-nowrap",
                          trade.pnl_dollars !== null && trade.pnl_dollars > 0
                            ? "text-green-600"
                            : trade.pnl_dollars !== null && trade.pnl_dollars < 0
                              ? "text-red-600"
                              : "text-gray-500"
                        )}
                      >
                        {formatPnl(trade)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-gray-700">
                        {trade.rr_ratio !== null ? trade.rr_ratio.toFixed(2) : "--"}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500 capitalize">
                        {trade.session?.replace("_", " ") ?? "--"}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500 capitalize">
                        {trade.emotion_before ?? "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && trades.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Showing {startIndex}-{endIndex}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" data-icon="inline-start" />
              Prev
            </Button>
            <span className="text-xs text-gray-600 px-2">Page {page}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasMore}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" data-icon="inline-end" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
