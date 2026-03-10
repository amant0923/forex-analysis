import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getTierLimits, countTodayAnalyses } from "@/lib/tier-limits";
import { analyzeTradeWithAI } from "@/lib/ai-analysis";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { trade_id } = await req.json();
  if (!trade_id) return NextResponse.json({ error: "trade_id required" }, { status: 400 });

  const limits = getTierLimits(user.tier);
  if (limits.max_ai_analyses_per_day !== null) {
    const count = await countTodayAnalyses(user.id);
    if (count >= limits.max_ai_analyses_per_day) {
      return NextResponse.json({
        error: `AI analysis limit reached (${limits.max_ai_analyses_per_day}/day). Upgrade for more.`,
      }, { status: 403 });
    }
  }

  try {
    const review = await analyzeTradeWithAI(trade_id, user.id, user.tier);
    return NextResponse.json(review);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
