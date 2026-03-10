"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PlaybookCard } from "@/components/playbook-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, BookOpen } from "lucide-react";

interface Playbook {
  id: number;
  name: string;
  instrument: string | null;
  timeframe: string | null;
  trade_count: number;
  win_rate: number | null;
  total_pnl: number | null;
  avg_rr: number | null;
}

export default function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limitBlocked, setLimitBlocked] = useState(false);

  const fetchPlaybooks = useCallback(async () => {
    try {
      const res = await fetch("/api/playbooks");
      if (res.status === 403) {
        setLimitBlocked(true);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch playbooks");
      const data = await res.json();
      setPlaybooks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaybooks();
  }, [fetchPlaybooks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-white/30" />
        <span className="ml-2 text-sm text-white/40">Loading playbooks...</span>
      </div>
    );
  }

  if (limitBlocked) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-6">Playbooks</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-amber-50 p-3 mb-4">
              <BookOpen className="h-6 w-6 text-amber-500" />
            </div>
            <p className="text-sm font-medium text-white mb-1">
              Playbooks are not available on your current plan
            </p>
            <p className="text-sm text-white/40">
              Upgrade to create and manage trading playbooks.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Playbooks</h1>
        <Link href="/playbooks/add">
          <Button size="sm">
            <Plus className="h-4 w-4" data-icon="inline-start" />
            Create Playbook
          </Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-5">
          {error}
        </div>
      )}

      {playbooks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-white/[0.06] p-3 mb-4">
              <BookOpen className="h-6 w-6 text-white/30" />
            </div>
            <p className="text-sm font-medium text-white mb-1">
              No playbooks yet
            </p>
            <p className="text-sm text-white/40 mb-5">
              Create one to track your strategies.
            </p>
            <Link href="/playbooks/add">
              <Button size="sm">
                <Plus className="h-4 w-4" data-icon="inline-start" />
                Create Playbook
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {playbooks.map((pb) => (
            <PlaybookCard key={pb.id} playbook={pb} />
          ))}
        </div>
      )}
    </div>
  );
}
