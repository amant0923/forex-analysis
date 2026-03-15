import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getTierLimits } from "@/lib/tier-limits";
import {
  canGenerateInsights,
  getLatestInsights,
  generatePatternInsights,
  canRegenerateInsights,
} from "@/lib/trader-insights";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limits = getTierLimits(user.tier);
  if (!limits.has_trader_insights) {
    return NextResponse.json({ error: "Premium subscription required" }, { status: 403 });
  }

  const { eligible, tradeCount } = await canGenerateInsights(user.id);
  const { insights, generated_at } = await getLatestInsights(user.id);

  return NextResponse.json({
    eligible,
    trade_count: tradeCount,
    insights,
    generated_at,
  });
}

export async function POST() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limits = getTierLimits(user.tier);
  if (!limits.has_trader_insights) {
    return NextResponse.json({ error: "Premium subscription required" }, { status: 403 });
  }

  const { eligible, tradeCount } = await canGenerateInsights(user.id);
  if (!eligible) {
    return NextResponse.json(
      { error: `Need at least 20 closed trades (currently ${tradeCount})` },
      { status: 400 }
    );
  }

  const canRegenerate = await canRegenerateInsights(user.id);
  if (!canRegenerate) {
    return NextResponse.json(
      { error: "Insights can only be regenerated once every 24 hours" },
      { status: 429 }
    );
  }

  const insights = await generatePatternInsights(user.id);
  return NextResponse.json({ insights, generated_at: new Date().toISOString() });
}
