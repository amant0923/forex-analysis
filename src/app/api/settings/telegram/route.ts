import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = getDb();
  const rows = await sql`
    SELECT telegram_chat_id, telegram_instruments FROM users WHERE id = ${user.id}
  `;

  if (rows.length === 0) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    connected: !!rows[0].telegram_chat_id,
    instruments: rows[0].telegram_instruments || [],
  });
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const instruments: string[] = body.instruments ?? [];

  // Validate instrument codes
  const valid = ["DXY", "EURUSD", "GBPUSD", "GER40", "US30", "NAS100", "SP500"];
  const filtered = instruments.filter((i: string) => valid.includes(i));

  const sql = getDb();
  await sql`
    UPDATE users SET telegram_instruments = ${filtered} WHERE id = ${user.id}
  `;

  return NextResponse.json({ instruments: filtered });
}

export async function DELETE() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = getDb();
  await sql`
    UPDATE users
    SET telegram_chat_id = NULL, telegram_instruments = '{}'
    WHERE id = ${user.id}
  `;

  return NextResponse.json({ disconnected: true });
}
