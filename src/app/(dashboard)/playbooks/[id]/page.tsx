"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlaybookForm } from "@/components/playbook-form";
import {
  Loader2,
  Pencil,
  Trash2,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Rule {
  id: number;
  category: string;
  rule_text: string;
}

interface Playbook {
  id: number;
  name: string;
  description: string | null;
  instrument: string | null;
  timeframe: string | null;
  trade_count: number;
  win_rate: number | null;
  total_pnl: number | null;
  avg_rr: number | null;
  rules: Rule[];
  created_at: string;
}

const CATEGORY_ORDER = ["entry", "exit", "risk"];
const CATEGORY_LABELS: Record<string, string> = {
  entry: "Entry Rules",
  exit: "Exit Rules",
  risk: "Risk Rules",
};

export default function PlaybookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [playbook, setPlaybook] = useState<Playbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchPlaybook = useCallback(async () => {
    try {
      const res = await fetch(`/api/playbooks/${id}`);
      if (!res.ok) throw new Error("Failed to fetch playbook");
      const data = await res.json();
      setPlaybook(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPlaybook();
  }, [fetchPlaybook]);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this playbook?")) return;
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/playbooks/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete playbook");
      }
      router.push("/playbooks");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading playbook...</span>
      </div>
    );
  }

  if (error && !playbook) {
    return (
      <div>
        <button
          onClick={() => router.push("/playbooks")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Playbooks
        </button>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!playbook) return null;

  if (editing) {
    return (
      <div>
        <button
          onClick={() => setEditing(false)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Playbook
        </button>
        <h1 className="text-2xl font-semibold mb-6">Edit Playbook</h1>
        <PlaybookForm mode="edit" playbook={playbook} />
      </div>
    );
  }

  const pnl = playbook.total_pnl ?? 0;
  const winRate = playbook.win_rate ?? 0;

  const rulesByCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    rules: (playbook.rules ?? []).filter((r) => r.category === cat),
  })).filter((group) => group.rules.length > 0);

  return (
    <div>
      <button
        onClick={() => router.push("/playbooks")}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Playbooks
      </button>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-5">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{playbook.name}</h1>
          {playbook.description && (
            <p className="text-sm text-gray-500 mt-1">{playbook.description}</p>
          )}
          <div className="flex items-center gap-1.5 mt-2">
            {playbook.instrument && (
              <Badge variant="secondary">{playbook.instrument}</Badge>
            )}
            {playbook.timeframe && (
              <Badge variant="outline">{playbook.timeframe}</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5" data-icon="inline-start" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" data-icon="inline-start" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" data-icon="inline-start" />
            )}
            Delete
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <Card>
          <CardContent className="text-center py-3">
            <p className="text-xs text-gray-500 mb-1">Trades</p>
            <p className="text-xl font-mono font-bold text-gray-900">
              {playbook.trade_count}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-3">
            <p className="text-xs text-gray-500 mb-1">Win Rate</p>
            <p className="text-xl font-mono font-bold text-gray-900">
              {winRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-3">
            <p className="text-xs text-gray-500 mb-1">Total P&L</p>
            <p
              className={cn(
                "text-xl font-mono font-bold flex items-center justify-center gap-1",
                pnl > 0 && "text-green-600",
                pnl < 0 && "text-red-600",
                pnl === 0 && "text-gray-400"
              )}
            >
              {pnl > 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : pnl < 0 ? (
                <TrendingDown className="h-4 w-4" />
              ) : null}
              {pnl > 0 ? "+" : ""}
              {pnl.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-3">
            <p className="text-xs text-gray-500 mb-1">Avg R:R</p>
            <p className="text-xl font-mono font-bold text-gray-900">
              {playbook.avg_rr != null ? playbook.avg_rr.toFixed(2) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rules */}
      {rulesByCategory.length > 0 ? (
        <div className="space-y-4">
          {rulesByCategory.map((group) => (
            <Card key={group.category}>
              <CardContent>
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  {group.label}
                </h3>
                <ul className="space-y-2">
                  {group.rules.map((rule) => (
                    <li
                      key={rule.id}
                      className="flex items-start gap-2 text-sm text-gray-600"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                      {rule.rule_text}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent>
            <p className="text-sm text-gray-400 text-center py-4">
              No rules defined. Edit this playbook to add rules.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
