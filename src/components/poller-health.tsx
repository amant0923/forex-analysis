"use client";

import { useState, useEffect, useCallback } from "react";
import { timeAgo } from "@/lib/utils";

export function PollerHealth() {
  const [lastRun, setLastRun] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/poller-health");
      if (res.ok) {
        const data = await res.json();
        setLastRun(data.last_run);
      }
    } catch {
      // Hide on error
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 60_000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (!lastRun) return null;

  const minutesAgo = Math.floor((Date.now() - new Date(lastRun).getTime()) / 60_000);

  let dotColor: string;
  if (minutesAgo < 5) {
    dotColor = "bg-green-500";
  } else if (minutesAgo <= 15) {
    dotColor = "bg-yellow-500";
  } else {
    dotColor = "bg-red-500";
  }

  return (
    <div className="flex items-center justify-center gap-2 py-4 text-[10px] text-white/30">
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      <span className="font-mono">Updated {timeAgo(lastRun)}</span>
    </div>
  );
}
