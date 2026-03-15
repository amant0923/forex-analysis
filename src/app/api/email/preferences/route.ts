import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/api-auth";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = getDb();
  const rows = await sql`
    SELECT email_digest_enabled, email_digest_time FROM users WHERE id = ${user.id}
  `;

  if (rows.length === 0) return NextResponse.json({ enabled: false, time: "07:00" });

  return NextResponse.json({
    enabled: rows[0].email_digest_enabled || false,
    time: rows[0].email_digest_time || "07:00",
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const sql = getDb();

  if (body.enabled !== undefined) {
    await sql`UPDATE users SET email_digest_enabled = ${!!body.enabled} WHERE id = ${user.id}`;
  }
  if (body.time) {
    await sql`UPDATE users SET email_digest_time = ${body.time} WHERE id = ${user.id}`;
  }

  return NextResponse.json({ ok: true });
}
