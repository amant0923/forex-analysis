import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { runBacktest } from "@/lib/backtest-engine";

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Gate behind Essential+ tier
  if (user.tier === "free") {
    return NextResponse.json(
      { error: "Backtesting requires Essential or Premium plan" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const {
    instrument = "EURUSD",
    timeframe = "1week",
    days = 180,
    minConfidence = 50,
    positionSize = 10000,
  } = body;

  const result = await runBacktest({
    instrument,
    timeframe,
    days: Math.min(days, 365),
    minConfidence: Math.max(0, Math.min(100, minConfidence)),
    positionSize: Math.max(100, positionSize),
  });

  return NextResponse.json(result);
}
