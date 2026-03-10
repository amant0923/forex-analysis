"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { EconomicEvent } from "@/types";
import { CURRENCY_INSTRUMENTS } from "@/types";

const COUNTRY_FLAGS: Record<string, string> = {
  US: "\u{1f1fa}\u{1f1f8}",
  EU: "\u{1f1ea}\u{1f1fa}",
  GB: "\u{1f1ec}\u{1f1e7}",
};

const IMPACT_COLORS: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-orange-400",
  low: "bg-gray-300",
};

const CURRENCIES = ["USD", "EUR", "GBP"] as const;
const IMPACTS = ["high", "medium", "low"] as const;

function getWeekStart(offset: number = 0): string {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  return monday.toISOString().split("T")[0];
}

function normalizeDate(dateStr: string): string {
  const match = String(dateStr).match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : String(dateStr);
}

function formatDate(dateStr: string): string {
  const iso = normalizeDate(dateStr);
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function actualVsForecast(event: EconomicEvent): "beat" | "miss" | null {
  if (!event.actual || !event.forecast) return null;
  const actual = parseFloat(event.actual.replace(/[%K]/g, ""));
  const forecast = parseFloat(event.forecast.replace(/[%K]/g, ""));
  if (isNaN(actual) || isNaN(forecast)) return null;
  if (actual > forecast) return "beat";
  if (actual < forecast) return "miss";
  return null;
}

export default function CalendarPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCurrencies, setActiveCurrencies] = useState<Set<string>>(new Set(CURRENCIES));
  const [activeImpacts, setActiveImpacts] = useState<Set<string>>(new Set(["high", "medium"]));

  const weekStart = getWeekStart(weekOffset);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ start: weekStart });
      if (activeCurrencies.size < 3) {
        params.set("currencies", Array.from(activeCurrencies).join(","));
      }
      if (activeImpacts.size < 3) {
        params.set("impacts", Array.from(activeImpacts).join(","));
      }
      const res = await fetch(`/api/economic-events?${params}`);
      const data = await res.json();
      setEvents(data.events ?? []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [weekStart, activeCurrencies, activeImpacts]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  function toggleCurrency(c: string) {
    setActiveCurrencies((prev) => {
      const next = new Set(prev);
      if (next.has(c)) { if (next.size > 1) next.delete(c); }
      else { next.add(c); }
      return next;
    });
  }

  function toggleImpact(i: string) {
    setActiveImpacts((prev) => {
      const next = new Set(prev);
      if (next.has(i)) { if (next.size > 1) next.delete(i); }
      else { next.add(i); }
      return next;
    });
  }

  // Group events by date
  const grouped: Record<string, EconomicEvent[]> = {};
  for (const e of events) {
    const key = normalizeDate(e.event_date);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  }
  const sortedDates = Object.keys(grouped).sort();

  const weekLabel = (() => {
    if (weekOffset === 0) return "This Week";
    if (weekOffset === 1) return "Next Week";
    if (weekOffset === -1) return "Last Week";
    const d = new Date(weekStart);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  })();

  return (
    <div>
      <div className="mb-5 sm:mb-6">
        <h1 className="font-serif text-xl sm:text-2xl font-bold text-gray-900">Economic Calendar</h1>
        <p className="mt-1 text-xs sm:text-sm text-gray-500">
          Upcoming economic events for USD, EUR, and GBP instruments
        </p>
      </div>

      {/* Week selector */}
      <div className="flex items-center justify-between sm:justify-start sm:gap-4 mb-4 sm:mb-5">
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          className="text-xs sm:text-sm text-gray-500 hover:text-gray-800 font-medium cursor-pointer px-2 py-1"
        >
          ← Prev
        </button>
        <span className="text-sm font-semibold text-gray-800 min-w-[100px] text-center">
          {weekLabel}
        </span>
        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          className="text-xs sm:text-sm text-gray-500 hover:text-gray-800 font-medium cursor-pointer px-2 py-1"
        >
          Next →
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-[10px] sm:text-xs text-gray-400 font-semibold uppercase tracking-wider">Currency</span>
          {CURRENCIES.map((c) => (
            <button
              key={c}
              onClick={() => toggleCurrency(c)}
              className={cn(
                "text-[11px] sm:text-xs font-medium px-2 sm:px-2.5 py-1 rounded-full border cursor-pointer transition-colors",
                activeCurrencies.has(c)
                  ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-[10px] sm:text-xs text-gray-400 font-semibold uppercase tracking-wider">Impact</span>
          {IMPACTS.map((i) => (
            <button
              key={i}
              onClick={() => toggleImpact(i)}
              className={cn(
                "text-[11px] sm:text-xs font-medium px-2 sm:px-2.5 py-1 rounded-full border cursor-pointer transition-colors capitalize",
                activeImpacts.has(i)
                  ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
              )}
            >
              {i}
            </button>
          ))}
        </div>
      </div>

      {/* Events */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded" />
          ))}
        </div>
      ) : sortedDates.length === 0 ? (
        <div className="text-center py-12 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-500">No events match your filters for this week.</p>
          <p className="text-xs text-gray-400 mt-1">Try adjusting currency or impact filters.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Column headers — desktop only */}
          <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-200 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            <span className="w-16 shrink-0">Time</span>
            <span className="shrink-0 w-6" />
            <span className="shrink-0 w-2" />
            <span className="flex-1">Event</span>
            <span className="w-16 text-right shrink-0">Actual</span>
            <span className="w-16 text-right shrink-0">Forecast</span>
            <span className="w-16 text-right shrink-0">Previous</span>
          </div>

          {sortedDates.map((date) => (
            <div key={date}>
              {/* Date header */}
              <div className="bg-gray-50 px-3 sm:px-4 py-2 border-b border-gray-200">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {formatDate(date)}
                </span>
              </div>

              {/* Event rows */}
              {grouped[date].map((event) => {
                const result = actualVsForecast(event);
                const instruments = CURRENCY_INSTRUMENTS[event.currency] ?? [];
                const isPast = event.actual !== null && event.actual !== "";

                return (
                  <div
                    key={event.id}
                    className={cn(
                      "border-b border-gray-100 last:border-b-0",
                      event.impact === "high" && "border-l-3 border-l-red-500",
                      isPast && "bg-gray-50/50"
                    )}
                  >
                    {/* Desktop row */}
                    <div className="hidden sm:flex items-center gap-3 px-4 py-3">
                      <span className="text-xs text-gray-400 w-16 shrink-0 font-mono">
                        {event.event_time || "\u2014"}
                      </span>
                      <span className="text-sm shrink-0">{COUNTRY_FLAGS[event.country] ?? ""}</span>
                      <div className={cn("h-2 w-2 rounded-full shrink-0", IMPACT_COLORS[event.impact])} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 font-medium truncate">{event.event_name}</p>
                        <div className="flex gap-1 mt-0.5">
                          {instruments.map((inst) => (
                            <span key={inst} className="text-[9px] bg-gray-100 text-gray-500 px-1 py-0.5 rounded">
                              {inst}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="w-16 text-right shrink-0">
                        {isPast ? (
                          <span className={cn(
                            "text-xs font-semibold",
                            result === "beat" ? "text-green-600" : result === "miss" ? "text-red-600" : "text-gray-700"
                          )}>
                            {event.actual}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">{"\u2014"}</span>
                        )}
                      </div>
                      <div className="w-16 text-right shrink-0">
                        <span className="text-xs text-gray-500">{event.forecast || "\u2014"}</span>
                      </div>
                      <div className="w-16 text-right shrink-0">
                        <span className="text-xs text-gray-400">{event.previous || "\u2014"}</span>
                      </div>
                    </div>

                    {/* Mobile row — stacked layout */}
                    <div className="sm:hidden px-3 py-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[11px] text-gray-400 font-mono">
                          {event.event_time || "TBD"}
                        </span>
                        <span className="text-sm">{COUNTRY_FLAGS[event.country] ?? ""}</span>
                        <div className={cn("h-2 w-2 rounded-full", IMPACT_COLORS[event.impact])} />
                      </div>
                      <p className="text-[13px] text-gray-800 font-medium leading-snug mb-1.5">
                        {event.event_name}
                      </p>
                      <div className="flex items-center gap-3 text-[11px]">
                        {isPast && event.actual ? (
                          <span className={cn(
                            "font-semibold",
                            result === "beat" ? "text-green-600" : result === "miss" ? "text-red-600" : "text-gray-700"
                          )}>
                            A: {event.actual}
                          </span>
                        ) : (
                          <span className="text-gray-300">A: {"\u2014"}</span>
                        )}
                        <span className="text-gray-500">F: {event.forecast || "\u2014"}</span>
                        <span className="text-gray-400">P: {event.previous || "\u2014"}</span>
                      </div>
                      <div className="flex gap-1 mt-1.5">
                        {instruments.map((inst) => (
                          <span key={inst} className="text-[9px] bg-gray-100 text-gray-500 px-1 py-0.5 rounded">
                            {inst}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
