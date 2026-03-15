import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/community-queries";

export async function GET() {
  const leaderboard = await getLeaderboard();
  return NextResponse.json(leaderboard);
}
