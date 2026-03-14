"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Check, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const TIERS = [
  {
    key: "free",
    name: "Free",
    description: "Get started with fundamental analysis",
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      "Full analysis dashboard",
      "3 trade logs per day",
      "1 AI analysis per day",
      "7-day history",
    ],
    cta: "Current Plan",
    recommended: false,
  },
  {
    key: "essential",
    name: "Essential",
    description: "For active traders who want deeper insights",
    monthlyPrice: 19,
    annualPrice: 182,
    monthlyPlan: "essential_monthly",
    annualPlan: "essential_annual",
    features: [
      "Everything in Free",
      "10 AI analyses per day",
      "5 playbooks",
      "CSV export",
      "Weekly performance stats",
      "30-day history",
    ],
    cta: "Start Free Trial",
    recommended: false,
  },
  {
    key: "premium",
    name: "Premium",
    description: "Unlimited access for professional traders",
    monthlyPrice: 39,
    annualPrice: 374,
    monthlyPlan: "premium_monthly",
    annualPlan: "premium_annual",
    features: [
      "Everything in Essential",
      "Unlimited AI analyses",
      "AI chat assistant",
      "Monthly pattern reports",
      "Unlimited playbooks",
      "Unlimited history",
    ],
    cta: "Start Free Trial",
    recommended: true,
  },
];

export default function PricingPage() {
  const { data: session } = useSession();
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const currentTier = (session?.user as any)?.tier || "free";

  async function handleSubscribe(plan: string) {
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-white mb-3">
          Choose Your Plan
        </h1>
        <p className="text-white/40 text-lg max-w-xl mx-auto">
          Unlock deeper market insights and AI-powered analysis to sharpen your trading edge.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <span
            className={cn(
              "text-sm font-medium transition-colors",
              !annual ? "text-white" : "text-white/40"
            )}
          >
            Monthly
          </span>
          <button
            onClick={() => setAnnual(!annual)}
            className={cn(
              "relative w-12 h-6 rounded-full transition-colors cursor-pointer",
              annual ? "bg-[#2D5A3D]" : "bg-white/20"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform",
                annual && "translate-x-6"
              )}
            />
          </button>
          <span
            className={cn(
              "text-sm font-medium transition-colors",
              annual ? "text-white" : "text-white/40"
            )}
          >
            Annual
          </span>
          {annual && (
            <span className="text-xs font-medium text-[#4ADE80] bg-[#2D5A3D]/30 px-2 py-0.5 rounded-full">
              Save 20%
            </span>
          )}
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TIERS.map((tier) => {
          const isCurrentTier = currentTier === tier.key;
          const price = annual ? tier.annualPrice : tier.monthlyPrice;
          const planKey = annual ? tier.annualPlan : tier.monthlyPlan;
          const isRecommended = tier.recommended;

          return (
            <div
              key={tier.key}
              className={cn(
                "relative rounded-2xl border p-6 flex flex-col",
                isRecommended
                  ? "bg-[#2D5A3D]/10 border-[#2D5A3D]/40"
                  : "bg-white/[0.03] border-white/[0.06]"
              )}
            >
              {isRecommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1 text-xs font-semibold text-white bg-[#2D5A3D] px-3 py-1 rounded-full">
                    <Sparkles className="h-3 w-3" />
                    Recommended
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h2 className="font-serif text-xl font-bold text-white mb-1">
                  {tier.name}
                </h2>
                <p className="text-sm text-white/40">{tier.description}</p>
              </div>

              <div className="mb-6">
                {price === 0 ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">$0</span>
                    <span className="text-white/40 text-sm">/ forever</span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">
                      ${annual ? Math.round(price / 12) : price}
                    </span>
                    <span className="text-white/40 text-sm">/ month</span>
                    {annual && (
                      <span className="text-xs text-white/30 ml-1">
                        (${price}/yr)
                      </span>
                    )}
                  </div>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check
                      className={cn(
                        "h-4 w-4 mt-0.5 shrink-0",
                        isRecommended ? "text-[#4ADE80]" : "text-white/30"
                      )}
                    />
                    <span className="text-sm text-white/60">{feature}</span>
                  </li>
                ))}
              </ul>

              {isCurrentTier ? (
                <div className="w-full py-2.5 rounded-xl text-sm font-medium text-center text-white/40 bg-white/[0.06] border border-white/[0.06]">
                  Current Plan
                </div>
              ) : tier.key === "free" ? (
                <Link
                  href="/settings"
                  className="w-full py-2.5 rounded-xl text-sm font-medium text-center text-white/60 bg-white/[0.06] border border-white/[0.06] hover:bg-white/[0.1] transition-colors block"
                >
                  Downgrade
                </Link>
              ) : (
                <button
                  onClick={() => planKey && handleSubscribe(planKey)}
                  disabled={loading === planKey}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50",
                    isRecommended
                      ? "bg-[#2D5A3D] text-white hover:bg-[#3A7A50]"
                      : "bg-white/[0.08] text-white border border-white/[0.1] hover:bg-white/[0.12]"
                  )}
                >
                  {loading === planKey ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {tier.cta}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}

              {tier.key !== "free" && (
                <p className="text-xs text-white/20 text-center mt-3">
                  7-day free trial included
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* FAQ / Footer note */}
      <div className="text-center mt-12 mb-8">
        <p className="text-sm text-white/30">
          All plans include a 7-day free trial. Cancel anytime from your{" "}
          <Link href="/settings" className="text-white/50 underline hover:text-white/70">
            settings
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
