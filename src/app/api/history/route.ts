import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const instrument = request.nextUrl.searchParams.get("instrument");
  const timeframe = request.nextUrl.searchParams.get("timeframe") || "1week";

  if (!instrument) {
    return NextResponse.json({ error: "Missing instrument" }, { status: 400 });
  }

  // Free tier: 30 days history. Essential+: 90 days. Premium: all.
  let days = 30;
  try {
    const user = await getAuthUser();
    if (user?.tier === "premium") {
      days = 365;
    } else if (user?.tier === "essential") {
      days = 90;
    }
  } catch {
    // Not authenticated
  }

  const sql = getDb();
  const rows = await sql`
    SELECT
      generated_at::date as date,
      direction,
      confidence,
      summary
    FROM biases
    WHERE instrument = ${instrument}
      AND timeframe = ${timeframe}
      AND generated_at >= NOW() - INTERVAL '1 day' * ${days}
    ORDER BY generated_at ASC
  `;

  return NextResponse.json({
    instrument,
    timeframe,
    days,
    history: rows.map((r: any) => ({
      date: r.date,
      direction: r.direction,
      confidence: r.confidence || 0,
      summary: r.summary,
    })),
  });
}
