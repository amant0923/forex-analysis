"use client";

import { useState, useEffect } from "react";
import { ReportViewer } from "@/components/report-viewer";
import { Lock, BarChart3 } from "lucide-react";
import Link from "next/link";

interface TierInfo {
  tier: string;
  has_weekly_report: boolean;
  has_monthly_report: boolean;
}

export default function ReportsPage() {
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/tier")
      .then((r) => r.json())
      .then((data) => {
        setTierInfo({
          tier: data.tier || "free",
          has_weekly_report: data.limits?.has_weekly_report ?? false,
          has_monthly_report: data.limits?.has_monthly_report ?? false,
        });
      })
      .catch(() => {
        setTierInfo({
          tier: "free",
          has_weekly_report: false,
          has_monthly_report: false,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (tierInfo && !tierInfo.has_weekly_report) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="bg-[#1e2433] border border-[#2a3040] rounded-xl p-8">
          <Lock className="h-10 w-10 text-white/40 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            Reports require Essential or Premium
          </h2>
          <p className="text-sm text-white/30 mb-6">
            Upgrade your plan to access weekly and monthly trading performance reports
            with stats breakdowns and AI-powered insights.
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

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="h-6 w-6 text-blue-400" />
        <h1 className="text-2xl font-semibold">Performance Reports</h1>
      </div>
      <ReportViewer
        hasWeekly={tierInfo?.has_weekly_report ?? false}
        hasMonthly={tierInfo?.has_monthly_report ?? false}
      />
    </div>
  );
}
