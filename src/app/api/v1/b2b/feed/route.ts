import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createHash } from "crypto";

async function validateB2BKey(key: string) {
  if (!key.startsWith("tradeora_b2b_")) return null;
  const hash = createHash("sha256").update(key).digest("hex");
  const sql = getDb();
  const rows = await sql`
    SELECT id, company_name, instruments FROM b2b_clients
    WHERE api_key_hash = ${hash} AND active = TRUE
    LIMIT 1
  `;
  return rows.length > 0 ? rows[0] : null;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  const key = authHeader.replace("Bearer ", "");

  const client = await validateB2BKey(key);
  if (!client) {
    return NextResponse.json({ error: "Invalid B2B API key" }, { status: 401 });
  }

  const sql = getDb();

  // Get all latest biases for all instruments across all timeframes
  const rows = await sql`
    SELECT DISTINCT ON (instrument, timeframe)
      instrument, timeframe, direction, confidence, confidence_rationale, summary, key_drivers, generated_at
    FROM biases
    ORDER BY instrument, timeframe, generated_at DESC
  `;

  // Group by instrument
  const byInstrument: Record<string, any> = {};
  for (const row of rows) {
    const inst = row.instrument as string;
    if (!byInstrument[inst]) byInstrument[inst] = {};
    byInstrument[inst][row.timeframe as string] = {
      direction: row.direction,
      confidence: row.confidence,
      confidence_rationale: row.confidence_rationale,
      summary: row.summary,
      key_drivers: row.key_drivers,
    };
  }

  // Filter by client's instrument whitelist if set
  const clientInstruments = (client as any).instruments;
  const instrumentList = Array.isArray(clientInstruments) && clientInstruments.length > 0
    ? clientInstruments
    : null;

  const biases = Object.entries(byInstrument)
    .filter(([inst]) => !instrumentList || instrumentList.includes(inst))
    .map(([instrument, timeframes]) => ({
      instrument,
      timeframes,
    }));

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    client: (client as any).company_name,
    biases,
  });
}
