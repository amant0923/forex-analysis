"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Minus,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TradeAiReview } from "@/types";

interface AiReviewPanelProps {
  tradeId: number;
  review: TradeAiReview | null;
  tier: string;
}

const verdictConfig = {
  good: { label: "Good Trade", className: "bg-green-100 text-green-800", icon: CheckCircle2 },
  acceptable: { label: "Acceptable", className: "bg-yellow-100 text-yellow-800", icon: Minus },
  poor: { label: "Poor Trade", className: "bg-red-100 text-red-800", icon: XCircle },
};

const alignmentConfig = {
  with: { label: "With Bias", className: "text-green-700" },
  against: { label: "Against Bias", className: "text-red-700" },
  neutral: { label: "Neutral", className: "text-gray-600" },
};

export function AiReviewPanel({ tradeId, review: initialReview, tier }: AiReviewPanelProps) {
  const [review, setReview] = useState<TradeAiReview | null>(initialReview);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/analyze-trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trade_id: tradeId }),
      });

      if (res.status === 403) {
        setError("AI analysis limit reached for your tier. Upgrade for more analyses.");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to analyze trade.");
        return;
      }

      const data = await res.json();
      setReview(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-indigo-600" />
          AI Trade Review
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {review ? (
          <>
            {/* Verdict */}
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                  verdictConfig[review.verdict].className
                )}
              >
                {(() => {
                  const Icon = verdictConfig[review.verdict].icon;
                  return <Icon className="h-3.5 w-3.5" />;
                })()}
                {verdictConfig[review.verdict].label}
              </span>
              <span
                className={cn(
                  "text-xs font-medium",
                  alignmentConfig[review.bias_alignment].className
                )}
              >
                {alignmentConfig[review.bias_alignment].label}
              </span>
            </div>

            {/* Bias alignment explanation */}
            {review.bias_alignment_explanation && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Bias Alignment
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {review.bias_alignment_explanation}
                </p>
              </div>
            )}

            {/* Rule adherence review */}
            {review.rule_adherence_review && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Rule Adherence
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {review.rule_adherence_review}
                </p>
              </div>
            )}

            {/* Risk assessment */}
            {review.risk_assessment && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Risk Assessment
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {review.risk_assessment}
                </p>
              </div>
            )}

            {/* Timing analysis */}
            {review.timing_analysis && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Timing Analysis
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {review.timing_analysis}
                </p>
              </div>
            )}

            {/* Psychology flag */}
            {review.psychology_flag && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-semibold text-amber-800 mb-0.5">
                    Psychology Flag
                  </h4>
                  <p className="text-sm text-amber-700 leading-relaxed">
                    {review.psychology_flag}
                  </p>
                </div>
              </div>
            )}

            {/* Suggestions */}
            {review.suggestions && review.suggestions.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Suggestions
                </h4>
                <ol className="space-y-1.5">
                  {review.suggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-100 text-[10px] font-bold text-gray-500">
                        {i + 1}
                      </span>
                      {suggestion}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Generated at */}
            <p className="text-[11px] text-gray-400 pt-2 border-t border-gray-100">
              Generated{" "}
              {new Date(review.generated_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-400 py-4 text-center">
            No AI review yet. Click below to analyze this trade.
          </p>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Analyzing...
            </>
          ) : review ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              Re-analyze
            </>
          ) : (
            <>
              <Bot className="h-3.5 w-3.5" />
              Analyze This Trade
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
