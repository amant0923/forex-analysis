import Link from "next/link";
import { cn } from "@/lib/utils";
import type { EconomicEvent } from "@/types";
import { CURRENCY_INSTRUMENTS } from "@/types";

const COUNTRY_FLAGS: Record<string, string> = {
  US: "🇺🇸",
  EU: "🇪🇺",
  GB: "🇬🇧",
  JP: "🇯🇵",
  AU: "🇦🇺",
  CA: "🇨🇦",
  NZ: "🇳🇿",
  CH: "🇨🇭",
};

const IMPACT_COLORS: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-orange-400",
  low: "bg-gray-300",
};

function formatEventTime(time: string): string {
  if (!time || time === "All Day" || time === "Tentative") return time || "";
  return time;
}

function isEventPast(event: EconomicEvent): boolean {
  const today = new Date().toISOString().split("T")[0];
  return event.event_date < today;
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

export function UpcomingEvents({ events }: { events: EconomicEvent[] }) {
  if (events.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-white/30">
          Upcoming Events
        </h2>
        <Link
          href="/calendar"
          className="text-xs text-[#2563eb] hover:underline font-medium"
        >
          View Full Calendar
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {events.map((event) => {
          const past = isEventPast(event);
          const result = past ? actualVsForecast(event) : null;
          const instruments = CURRENCY_INSTRUMENTS[event.currency] ?? [];

          return (
            <div
              key={event.id}
              className={cn(
                "flex-shrink-0 rounded-lg border px-3 py-2.5 min-w-[180px] max-w-[220px]",
                past ? "bg-white/[0.04] border-white/10" : "bg-white/[0.06] border-white/10"
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm">{COUNTRY_FLAGS[event.country] ?? ""}</span>
                <div className={cn("h-2 w-2 rounded-full", IMPACT_COLORS[event.impact])} />
                <span className="text-[10px] text-white/30">
                  {formatEventTime(event.event_time)}
                </span>
              </div>
              <p className="text-xs font-medium text-white leading-snug line-clamp-2 mb-1.5">
                {event.event_name}
              </p>
              {past && event.actual ? (
                <div className="flex items-center gap-2 text-[10px]">
                  <span className={cn(
                    "font-semibold",
                    result === "beat" ? "text-green-400" : result === "miss" ? "text-red-400" : "text-white/60"
                  )}>
                    {event.actual}
                  </span>
                  {event.forecast && (
                    <span className="text-white/30">vs {event.forecast}</span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                  {event.forecast && <span>F: {event.forecast}</span>}
                  {event.previous && <span>P: {event.previous}</span>}
                </div>
              )}
              {instruments.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {instruments.slice(0, 4).map((inst) => (
                    <span key={inst} className="text-[9px] bg-white/[0.06] text-white/40 px-1 py-0.5 rounded">
                      {inst}
                    </span>
                  ))}
                  {instruments.length > 4 && (
                    <span className="text-[9px] text-white/25 px-1 py-0.5">
                      +{instruments.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
