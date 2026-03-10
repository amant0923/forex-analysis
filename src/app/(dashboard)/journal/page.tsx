"use client";

import { useState, useEffect } from "react";
import { JournalStatsBar } from "@/components/journal-stats-bar";
import { JournalTable } from "@/components/journal-table";
import type { JournalStats } from "@/types";

export default function JournalPage() {
  const [stats, setStats] = useState<JournalStats | null>(null);

  useEffect(() => {
    fetch("/api/trades")
      .then((r) => r.json())
      .then((data) => setStats(data.stats))
      .catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Trading Journal</h1>
      {stats && <JournalStatsBar stats={stats} />}
      <JournalTable />
    </div>
  );
}
