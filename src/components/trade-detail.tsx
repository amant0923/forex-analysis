"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Target,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  ShieldX,
  Image as ImageIcon,
  StickyNote,
  Briefcase,
  BookOpen,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isForex } from "@/lib/pnl-calc";
import { AiReviewPanel } from "@/components/ai-review-panel";
import type { TradeWithDetails } from "@/types";

/** Safely convert Postgres decimal (returned as string) to number */
function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return isNaN(n) ? null : n;
}

interface TradeDetailProps {
  trade: TradeWithDetails;
  tier: string;
}

const emotionBeforeEmoji: Record<string, string> = {
  confident: "💪",
  calm: "😌",
  anxious: "😰",
  FOMO: "🏃",
  revenge: "😤",
  uncertain: "🤔",
};

const emotionAfterEmoji: Record<string, string> = {
  satisfied: "😊",
  frustrated: "😣",
  relieved: "😮‍💨",
  regretful: "😞",
  neutral: "😐",
};

function formatPrice(price: number | string | null | undefined, instrument: string) {
  if (price == null) return "—";
  const num = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(num)) return "—";
  if (isForex(instrument)) {
    // Forex: show up to 5 decimals, trim trailing zeros but keep min 2
    const full = num.toFixed(5);
    const trimmed = full.replace(/0+$/, "");
    const decLen = (trimmed.split(".")[1] || "").length;
    return decLen < 2 ? num.toFixed(2) : trimmed;
  }
  return num.toFixed(2);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TradeDetail({ trade, tier }: TradeDetailProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const pnlDollars = toNum(trade.pnl_dollars);
  const pnlPips = toNum(trade.pnl_pips);
  const pnlTicks = toNum(trade.pnl_ticks);
  const rrRatio = toNum(trade.rr_ratio);
  const acctImpact = toNum(trade.account_pct_impact);
  const isProfitable = (pnlDollars ?? 0) > 0;
  const isLoss = (pnlDollars ?? 0) < 0;
  const forex = isForex(trade.instrument);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/trades/${trade.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/journal");
      }
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/journal"
        className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/80 mb-4 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Journal
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-serif text-2xl font-bold text-white">
              {trade.instrument}
            </h1>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase",
                trade.direction === "buy"
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-red-500/20 text-red-400"
              )}
            >
              {trade.direction === "buy" ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {trade.direction}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/40">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Opened {formatDate(trade.opened_at)}
            </span>
            {trade.closed_at && (
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                Closed {formatDate(trade.closed_at)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Price Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <div className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-1.5">
          <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={3} disabled={false} />
          <Card size="sm">
            <CardContent>
              <p className="text-[11px] font-medium text-white/30 uppercase tracking-wider">Entry</p>
              <p className="text-lg font-mono font-bold text-white mt-0.5">
                {formatPrice(trade.entry_price, trade.instrument)}
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-1.5">
          <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={3} disabled={false} />
          <Card size="sm">
            <CardContent>
              <p className="text-[11px] font-medium text-white/30 uppercase tracking-wider">Exit</p>
              <p className="text-lg font-mono font-bold text-white mt-0.5">
                {trade.exit_price ? formatPrice(trade.exit_price, trade.instrument) : "—"}
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-1.5">
          <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={3} disabled={false} />
          <Card size="sm">
            <CardContent>
              <p className="text-[11px] font-medium text-white/30 uppercase tracking-wider">Stop Loss</p>
              <p className="text-lg font-mono font-bold text-white mt-0.5">
                {trade.stop_loss ? formatPrice(trade.stop_loss, trade.instrument) : "—"}
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-1.5">
          <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={3} disabled={false} />
          <Card size="sm">
            <CardContent>
              <p className="text-[11px] font-medium text-white/30 uppercase tracking-wider">Take Profit</p>
              <p className="text-lg font-mono font-bold text-white mt-0.5">
                {trade.take_profit ? formatPrice(trade.take_profit, trade.instrument) : "—"}
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-1.5">
          <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={3} disabled={false} />
          <Card size="sm">
            <CardContent>
              <p className="text-[11px] font-medium text-white/30 uppercase tracking-wider">Lot Size</p>
              <p className="text-lg font-mono font-bold text-white mt-0.5">
                {trade.lot_size}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* P&L Summary */}
      {pnlDollars !== null && (
        <Card className={cn("mb-6", isProfitable ? "ring-green-500/20" : isLoss ? "ring-red-500/20" : "")}>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              {isProfitable ? (
                <TrendingUp className="h-4 w-4 text-green-400" />
              ) : isLoss ? (
                <TrendingDown className="h-4 w-4 text-red-400" />
              ) : null}
              <h3 className="text-sm font-semibold text-white/80">P&L Summary</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[11px] font-medium text-white/30 uppercase tracking-wider">
                  {forex ? "Pips" : "Ticks"}
                </p>
                <p
                  className={cn(
                    "text-xl font-mono font-bold",
                    isProfitable ? "text-green-400" : isLoss ? "text-red-400" : "text-white"
                  )}
                >
                  {forex
                    ? pnlPips !== null
                      ? (pnlPips > 0 ? "+" : "") + pnlPips.toFixed(1)
                      : "—"
                    : pnlTicks !== null
                      ? (pnlTicks > 0 ? "+" : "") + pnlTicks.toFixed(1)
                      : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-white/30 uppercase tracking-wider">Dollars</p>
                <p
                  className={cn(
                    "text-xl font-mono font-bold",
                    isProfitable ? "text-green-400" : isLoss ? "text-red-400" : "text-white"
                  )}
                >
                  {pnlDollars > 0 ? "+" : ""}${pnlDollars.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-white/30 uppercase tracking-wider">R:R Ratio</p>
                <p className="text-xl font-mono font-bold text-white">
                  {rrRatio !== null ? rrRatio.toFixed(2) : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-white/30 uppercase tracking-wider">Account Impact</p>
                <p
                  className={cn(
                    "text-xl font-mono font-bold",
                    isProfitable ? "text-green-400" : isLoss ? "text-red-400" : "text-white"
                  )}
                >
                  {acctImpact !== null
                    ? (acctImpact > 0 ? "+" : "") + acctImpact.toFixed(2) + "%"
                    : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account & Playbook */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {trade.account_name && (
          <Card size="sm">
            <CardContent className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-white/30" />
              <div>
                <p className="text-[11px] font-medium text-white/30 uppercase tracking-wider">Account</p>
                <p className="text-sm font-medium text-white">{trade.account_name}</p>
              </div>
            </CardContent>
          </Card>
        )}
        {trade.playbook_name && (
          <Card size="sm">
            <CardContent className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-400" />
              <div>
                <p className="text-[11px] font-medium text-white/30 uppercase tracking-wider">Playbook</p>
                <p className="text-sm font-medium text-white">{trade.playbook_name}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Context Badges */}
      {(trade.session || trade.timeframe_traded || trade.emotion_before || trade.emotion_after) && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {trade.session && (
            <Badge variant="secondary" className="text-xs capitalize">
              {trade.session.replace("_", " ")} Session
            </Badge>
          )}
          {trade.timeframe_traded && (
            <Badge variant="outline" className="text-xs">
              {trade.timeframe_traded}
            </Badge>
          )}
          {trade.emotion_before && (
            <Badge variant="secondary" className="text-xs">
              {emotionBeforeEmoji[trade.emotion_before] || ""} Before: {trade.emotion_before}
            </Badge>
          )}
          {trade.emotion_after && (
            <Badge variant="secondary" className="text-xs">
              {emotionAfterEmoji[trade.emotion_after] || ""} After: {trade.emotion_after}
            </Badge>
          )}
        </div>
      )}

      {/* Rule Adherence */}
      {trade.playbook_id && trade.rule_adherence_details && trade.rule_adherence_details.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-white/40" />
              Rule Adherence
              {trade.rule_adherence_score != null && (
                <span
                  className={cn(
                    "ml-auto text-xs font-mono font-bold",
                    trade.rule_adherence_score >= 80
                      ? "text-green-400"
                      : trade.rule_adherence_score >= 50
                        ? "text-yellow-400"
                        : "text-red-400"
                  )}
                >
                  {trade.rule_adherence_score}%
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Score bar */}
            {trade.rule_adherence_score != null && (
              <div className="w-full h-2 bg-white/[0.06] rounded-full mb-3 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    trade.rule_adherence_score >= 80
                      ? "bg-green-500"
                      : trade.rule_adherence_score >= 50
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  )}
                  style={{ width: `${trade.rule_adherence_score}%` }}
                />
              </div>
            )}
            <ul className="space-y-1.5">
              {trade.rule_adherence_details.map((detail, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  {detail.followed ? (
                    <ShieldCheck className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <ShieldX className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                  <span className={detail.followed ? "text-white/80" : "text-red-400"}>
                    Rule #{detail.rule_id}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Screenshots Gallery */}
      {trade.screenshots.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ImageIcon className="h-4 w-4 text-white/40" />
              Screenshots
              <span className="text-xs font-normal text-white/30 ml-1">
                ({trade.screenshots.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {trade.screenshots.map((ss, i) => (
                <button
                  key={ss.id}
                  onClick={() => setLightboxIndex(i)}
                  className="relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] hover:ring-2 hover:ring-white/25 transition-all cursor-pointer group"
                >
                  <img
                    src={ss.url}
                    alt={ss.label || `Screenshot ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  {ss.label && (
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white capitalize">
                      {ss.label}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(null);
            }}
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          {trade.screenshots.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(
                    (lightboxIndex - 1 + trade.screenshots.length) % trade.screenshots.length
                  );
                }}
                className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((lightboxIndex + 1) % trade.screenshots.length);
                }}
                className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <img
            src={trade.screenshots[lightboxIndex].url}
            alt={trade.screenshots[lightboxIndex].label || "Screenshot"}
            className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Notes */}
      {trade.notes && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <StickyNote className="h-4 w-4 text-white/40" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">
              {trade.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* AI Review Panel */}
      <div className="mb-6">
        <AiReviewPanel tradeId={trade.id} review={trade.ai_review} tier={tier} />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pb-8">
        <Link href={`/journal/add?edit=${trade.id}`}>
          <Button variant="outline" size="sm">
            <Pencil className="h-3.5 w-3.5" />
            Edit Trade
          </Button>
        </Link>

        {showDeleteConfirm ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-400">Delete this trade?</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Yes, Delete"
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
