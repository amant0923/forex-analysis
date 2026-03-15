"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { InstrumentIcon } from "./instrument-icon";

interface BiasAlert {
  id: number;
  instrument: string;
  timeframe: string;
  previous_direction: string;
  new_direction: string;
  confidence: number;
  previous_confidence: number;
  key_articles: { article_id: number; title: string; relevance: string }[];
  created_at: string;
}

const DIRECTION_EMOJI: Record<string, string> = {
  bullish: "🟢",
  bearish: "🔴",
  neutral: "⚪",
};

const TIMEFRAME_LABEL: Record<string, string> = {
  daily: "Daily",
  "1week": "1W",
  "1month": "1M",
  "3month": "3M",
};

export function AlertsDropdown() {
  const [alerts, setAlerts] = useState<BiasAlert[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/alerts?hours=48")
      .then((r) => r.json())
      .then((data) => setAlerts(data.alerts || []))
      .catch(() => {});

    // Refresh every 5 minutes
    const interval = setInterval(() => {
      fetch("/api/alerts?hours=48")
        .then((r) => r.json())
        .then((data) => setAlerts(data.alerts || []))
        .catch(() => {});
    }, 300000);
    return () => clearInterval(interval);
  }, []);

  const recentCount = alerts.filter((a) => {
    const age = Date.now() - new Date(a.created_at).getTime();
    return age < 24 * 60 * 60 * 1000; // last 24h
  }).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
      >
        <Bell className="h-4 w-4" />
        {recentCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-4 min-w-[16px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
            {recentCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-[360px] bg-black/90 backdrop-blur-2xl border border-white/[0.1] rounded-2xl shadow-[0_16px_64px_rgba(0,0,0,0.5)] z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white">Bias Alerts</h3>
              <p className="text-[11px] text-white/30">Direction changes in the last 48 hours</p>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-white/30">
                  No bias changes detected recently
                </div>
              ) : (
                alerts.map((alert) => {
                  const age = Date.now() - new Date(alert.created_at).getTime();
                  const isNew = age < 24 * 60 * 60 * 1000;
                  const hoursAgo = Math.floor(age / (60 * 60 * 1000));
                  const timeLabel = hoursAgo < 1 ? "Just now" : hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.floor(hoursAgo / 24)}d ago`;

                  return (
                    <div
                      key={alert.id}
                      className={cn(
                        "px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors",
                        isNew && "bg-white/[0.02]"
                      )}
                    >
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <InstrumentIcon code={alert.instrument} size="sm" />
                        <span className="text-sm font-semibold text-white">{alert.instrument}</span>
                        <span className="text-[10px] font-medium text-white/30 bg-white/[0.06] px-1.5 py-0.5 rounded">
                          {TIMEFRAME_LABEL[alert.timeframe] || alert.timeframe}
                        </span>
                        <span className="text-[10px] text-white/25 ml-auto">{timeLabel}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs mb-1">
                        <span className="text-white/40">
                          {DIRECTION_EMOJI[alert.previous_direction]} {alert.previous_direction}
                        </span>
                        <span className="text-white/20">→</span>
                        <span className="text-white/70 font-medium">
                          {DIRECTION_EMOJI[alert.new_direction]} {alert.new_direction}
                        </span>
                        <span className="text-white/25 ml-1">
                          ({alert.previous_confidence}% → {alert.confidence}%)
                        </span>
                      </div>

                      {alert.key_articles && alert.key_articles.length > 0 && (
                        <p className="text-[11px] text-white/25 truncate mt-1">
                          Key: {alert.key_articles[0]?.title}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
