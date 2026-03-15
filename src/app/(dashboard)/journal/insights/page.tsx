"use client";

import { useState, useEffect } from "react";
import { Sparkles, Lock, RefreshCw } from "lucide-react";
import Link from "next/link";
import { InsightCard } from "@/components/insight-card";
import { DNAProfileCard } from "@/components/dna-profile";
import type { TraderInsight, DNAProfile } from "@/types";

interface InsightsData {
  eligible: boolean;
  trade_count: number;
  insights: TraderInsight[] | null;
  generated_at: string | null;
}

interface DNAData {
  profile: DNAProfile | null;
  generated_at: string | null;
}

export default function InsightsPage() {
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [data, setData] = useState<InsightsData | null>(null);
  const [dnaData, setDnaData] = useState<DNAData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatingDNA, setGeneratingDNA] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default to current month
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Generate month options for last 12 months
  const monthOptions: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/ai/insights");
        if (res.status === 403) {
          setIsPremium(false);
          setLoading(false);
          return;
        }
        setIsPremium(true);
        const json = await res.json();
        setData(json);
      } catch {
        setError("Failed to load insights");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Load DNA profile when month changes
  useEffect(() => {
    if (!isPremium) return;
    async function loadDNA() {
      try {
        const res = await fetch(`/api/ai/dna-profile?month=${selectedMonth}`);
        if (res.ok) {
          const json = await res.json();
          setDnaData(json);
        }
      } catch {
        // Silently fail for DNA
      }
    }
    loadDNA();
  }, [selectedMonth, isPremium]);

  async function handleRefreshInsights() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/insights", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to generate insights");
        return;
      }
      setData((prev) => prev ? { ...prev, insights: json.insights, generated_at: json.generated_at } : prev);
    } catch {
      setError("Failed to generate insights");
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateDNA() {
    setGeneratingDNA(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/dna-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: selectedMonth }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to generate DNA profile");
        return;
      }
      setDnaData({ profile: json.profile, generated_at: json.generated_at });
    } catch {
      setError("Failed to generate DNA profile");
    } finally {
      setGeneratingDNA(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not premium — locked state
  if (!isPremium) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8">
          <Lock className="h-10 w-10 text-white/40 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            Upgrade to Premium to unlock AI Trading Insights
          </h2>
          <p className="text-sm text-white/30 mb-6">
            Get personalized AI analysis of your trading patterns, bias alignment stats,
            and a monthly Trader DNA Profile with actionable goals.
          </p>
          <Link
            href="/settings/billing"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Upgrade Plan
          </Link>
        </div>
      </div>
    );
  }

  // Not enough trades
  if (data && !data.eligible) {
    const remaining = 20 - data.trade_count;
    const progress = (data.trade_count / 20) * 100;
    return (
      <div className="max-w-lg mx-auto py-20">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 text-center">
          <Sparkles className="h-10 w-10 text-blue-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            Log {remaining} more trade{remaining !== 1 ? "s" : ""} to unlock insights
          </h2>
          <p className="text-sm text-white/30 mb-6">
            AI trading insights require at least 20 closed trades to generate meaningful patterns.
          </p>
          <div className="w-full bg-white/[0.06] rounded-full h-3 mb-2">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-white/40">{data.trade_count} / 20 trades</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-blue-400" />
          <h1 className="text-2xl font-semibold">Your Trading Insights</h1>
        </div>
        <button
          onClick={handleRefreshInsights}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.06] text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
          {generating ? "Generating..." : "Refresh Insights"}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400 mb-6">
          {error}
        </div>
      )}

      {data?.generated_at && (
        <p className="text-xs text-white/30 mb-4">
          Last updated: {new Date(data.generated_at).toLocaleString()}
        </p>
      )}

      {/* Insight Cards Grid */}
      {data?.insights && data.insights.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {data.insights.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 text-center mb-10">
          <p className="text-white/40">No insights generated yet. Click "Refresh Insights" to get started.</p>
        </div>
      )}

      {/* DNA Profile Section */}
      <div className="border-t border-white/[0.06] pt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Trader DNA Profile</h2>
          <div className="flex items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white/[0.06] border border-white/[0.06] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {monthOptions.map((m) => {
                const label = new Date(`${m}-01`).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                });
                return (
                  <option key={m} value={m} className="bg-[#0a0a0a]">
                    {label}
                  </option>
                );
              })}
            </select>
            {!dnaData?.profile && (
              <button
                onClick={handleGenerateDNA}
                disabled={generatingDNA}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingDNA ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Profile"
                )}
              </button>
            )}
          </div>
        </div>

        {dnaData?.profile ? (
          <DNAProfileCard profile={dnaData.profile} month={selectedMonth} />
        ) : (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 text-center">
            <p className="text-white/40">
              No DNA profile for this month yet. Click "Generate Profile" to create one.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
