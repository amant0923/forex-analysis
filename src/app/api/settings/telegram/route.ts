import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = getDb();
  const rows = await sql`
    SELECT telegram_chat_id, telegram_instruments, telegram_confidence_filter
    FROM users WHERE id = ${user.id}
  `;

  if (rows.length === 0) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    connected: !!rows[0].telegram_chat_id,
    instruments: rows[0].telegram_instruments || [],
    confidenceFilter: rows[0].telegram_confidence_filter || ["high", "medium", "low"],
  });
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const sql = getDb();

  // Handle instruments update
  if (body.instruments !== undefined) {
    const validInstruments = ["DXY", "EURUSD", "GBPUSD", "USDJPY", "EURJPY", "GBPJPY", "EURGBP", "AUDUSD", "USDCAD", "NZDUSD", "USDCHF", "XAUUSD", "XAGUSD", "GER40", "US30", "NAS100", "SP500", "BTCUSD", "ETHUSD", "USOIL"];
    const filtered = (body.instruments as string[]).filter((i: string) => validInstruments.includes(i));
    await sql`
      UPDATE users SET telegram_instruments = ${filtered} WHERE id = ${user.id}
    `;
    return NextResponse.json({ instruments: filtered });
  }

  // Handle confidence filter update
  if (body.confidenceFilter !== undefined) {
    const validConfidence = ["high", "medium", "low"];
    const filtered = (body.confidenceFilter as string[]).filter((c: string) => validConfidence.includes(c));
    await sql`
      UPDATE users SET telegram_confidence_filter = ${filtered} WHERE id = ${user.id}
    `;
    return NextResponse.json({ confidenceFilter: filtered });
  }

  return NextResponse.json({ error: "No valid fields" }, { status: 400 });
}

export async function DELETE() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = getDb();
  await sql`
    UPDATE users
    SET telegram_chat_id = NULL, telegram_instruments = '{}', telegram_confidence_filter = '{high,medium,low}'
    WHERE id = ${user.id}
  `;

  return NextResponse.json({ disconnected: true });
}
