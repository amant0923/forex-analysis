import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { validateApiKey } from "@/lib/api-keys";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  const key = authHeader.replace("Bearer ", "");

  const auth = await validateApiKey(key);
  if (!auth) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const instrument = request.nextUrl.searchParams.get("instrument");
  const sql = getDb();

  if (instrument) {
    const rows = await sql`
      SELECT timeframe,
        COUNT(*) FILTER (WHERE is_correct IS NOT NULL) as total,
        COUNT(*) FILTER (WHERE is_correct = true) as correct
      FROM bias_outcomes
      WHERE instrument = ${instrument} AND settled_at IS NOT NULL
      GROUP BY timeframe
    `;

    return NextResponse.json({
      instrument,
      accuracy: rows.map((r: any) => ({
        timeframe: r.timeframe,
        total: Number(r.total),
        correct: Number(r.correct),
        accuracy: Number(r.total) > 0 ? Math.round((Number(r.correct) / Number(r.total)) * 1000) / 10 : 0,
      })),
    });
  }

  // Overall stats
  const rows = await sql`
    SELECT instrument, timeframe,
      COUNT(*) FILTER (WHERE is_correct IS NOT NULL) as total,
      COUNT(*) FILTER (WHERE is_correct = true) as correct
    FROM bias_outcomes
    WHERE settled_at IS NOT NULL
    GROUP BY instrument, timeframe
    ORDER BY instrument, timeframe
  `;

  return NextResponse.json({
    accuracy: rows.map((r: any) => ({
      instrument: r.instrument,
      timeframe: r.timeframe,
      total: Number(r.total),
      correct: Number(r.correct),
      accuracy: Number(r.total) > 0 ? Math.round((Number(r.correct) / Number(r.total)) * 1000) / 10 : 0,
    })),
  });
}
