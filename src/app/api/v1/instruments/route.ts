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

  const sql = getDb();
  const rows = await sql`
    SELECT i.code, i.name, i.category,
      (SELECT direction FROM biases WHERE instrument = i.code AND timeframe = '1week' ORDER BY generated_at DESC LIMIT 1) as latest_direction,
      (SELECT confidence FROM biases WHERE instrument = i.code AND timeframe = '1week' ORDER BY generated_at DESC LIMIT 1) as latest_confidence,
      q.price, q.change, q.change_pct
    FROM instruments i
    LEFT JOIN instrument_quotes q ON q.instrument = i.code
    ORDER BY i.code
  `;

  return NextResponse.json({ instruments: rows });
}
