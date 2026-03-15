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
  const timeframe = request.nextUrl.searchParams.get("timeframe");

  const sql = getDb();

  if (instrument && timeframe) {
    // Single bias
    const rows = await sql`
      SELECT instrument, timeframe, direction, confidence, confidence_rationale, summary, key_drivers, generated_at
      FROM biases
      WHERE instrument = ${instrument} AND timeframe = ${timeframe}
      ORDER BY generated_at DESC LIMIT 1
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: "No bias found" }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  }

  if (instrument) {
    // All timeframes for one instrument
    const rows = await sql`
      SELECT DISTINCT ON (timeframe)
        instrument, timeframe, direction, confidence, confidence_rationale, summary, key_drivers, generated_at
      FROM biases
      WHERE instrument = ${instrument}
      ORDER BY timeframe, generated_at DESC
    `;
    return NextResponse.json({ instrument, biases: rows });
  }

  // All instruments, latest 1week bias
  const rows = await sql`
    SELECT DISTINCT ON (instrument)
      instrument, timeframe, direction, confidence, summary, generated_at
    FROM biases
    WHERE timeframe = '1week'
    ORDER BY instrument, generated_at DESC
  `;
  return NextResponse.json({ biases: rows });
}
