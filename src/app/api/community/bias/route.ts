import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getCommunityBias, castVote } from "@/lib/community-queries";
import { getTierLimits } from "@/lib/tier-limits";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const instrument = searchParams.get("instrument");
  const timeframe = searchParams.get("timeframe") || "1week";

  if (!instrument) {
    return NextResponse.json({ error: "instrument is required" }, { status: 400 });
  }

  const bias = await getCommunityBias(instrument, timeframe);
  return NextResponse.json(bias);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limits = getTierLimits(user.tier);
  if (!limits.can_vote_community) {
    return NextResponse.json(
      { error: "Community voting requires Essential or Premium tier" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { instrument, timeframe, direction } = body;

  if (!instrument || !timeframe || !direction) {
    return NextResponse.json({ error: "instrument, timeframe, and direction are required" }, { status: 400 });
  }

  const validTimeframes = ["daily", "1week", "1month", "3month"];
  const validDirections = ["bullish", "bearish", "neutral"];

  if (!validTimeframes.includes(timeframe)) {
    return NextResponse.json({ error: "Invalid timeframe" }, { status: 400 });
  }
  if (!validDirections.includes(direction)) {
    return NextResponse.json({ error: "Invalid direction" }, { status: 400 });
  }

  await castVote(user.id, instrument, timeframe, direction);
  return NextResponse.json({ success: true });
}
