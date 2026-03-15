"use client";

import { Check, AlertTriangle, Target } from "lucide-react";
import type { DNAProfile } from "@/types";

function BiasAlignmentBar({ score }: { score: number }) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const color =
    clampedScore >= 70 ? "bg-emerald-500" : clampedScore >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-white/60">Bias Alignment Score</span>
        <span className="text-lg font-bold text-white">{clampedScore}%</span>
      </div>
      <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${clampedScore}%` }}
        />
      </div>
      <p className="text-xs text-white/30 mt-1">
        {clampedScore >= 70
          ? "Strong alignment with fundamental biases"
          : clampedScore >= 40
          ? "Moderate alignment — room for improvement"
          : "Low alignment — consider following weekly biases more closely"}
      </p>
    </div>
  );
}

export function DNAProfileCard({ profile, month }: { profile: DNAProfile; month: string }) {
  const monthLabel = new Date(`${month}-01`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-1">Trader DNA Profile</h3>
        <p className="text-sm text-white/30 mb-5">{monthLabel}</p>

        {/* Trading Style */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-white/80 mb-2">Trading Style</h4>
          <p className="text-sm text-white/60 leading-relaxed">{profile.trading_style}</p>
        </div>

        {/* Bias Alignment Score */}
        <div className="mb-6">
          <BiasAlignmentBar score={profile.bias_alignment_score} />
        </div>

        {/* Strengths & Blind Spots */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <h4 className="text-sm font-medium text-emerald-400 mb-3 flex items-center gap-1.5">
              <Check className="h-4 w-4" />
              Strengths
            </h4>
            <ul className="space-y-2">
              {profile.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              Blind Spots
            </h4>
            <ul className="space-y-2">
              {profile.blind_spots.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Emotional Patterns */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-white/80 mb-2">Emotional Patterns</h4>
          <p className="text-sm text-white/60 leading-relaxed">{profile.emotional_patterns}</p>
        </div>

        {/* Session Performance */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-white/80 mb-2">Session Performance</h4>
          <p className="text-sm text-white/60 leading-relaxed">{profile.session_performance}</p>
        </div>

        {/* Goals */}
        <div>
          <h4 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-1.5">
            <Target className="h-4 w-4" />
            Goals for Next Month
          </h4>
          <ul className="space-y-2">
            {profile.goals.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                <span className="text-blue-400 font-mono text-xs mt-0.5">{i + 1}.</span>
                {g}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
