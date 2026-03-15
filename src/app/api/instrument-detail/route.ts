import { NextRequest, NextResponse } from "next/server";
import {
  getLatestBiases,
  getArticlesWithAnalysesForInstrument,
} from "@/lib/queries";
import { getAuthUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  // Free tier: only 7 days of articles. Essential+: 30 days.
  let articleDays = 7;
  try {
    const user = await getAuthUser();
    if (user && (user.tier === "essential" || user.tier === "premium")) {
      articleDays = 30;
    }
  } catch {
    // Not authenticated — use free tier limit
  }

  const biases = await getLatestBiases(code);
  const articles = await getArticlesWithAnalysesForInstrument(code, articleDays);

  return NextResponse.json({ biases, articles, historyLimited: articleDays === 7 });
}
