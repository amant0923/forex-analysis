import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getDb } from "@/lib/db";

export async function POST() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = getDb();

  // Delete existing unused codes for this user
  await sql`
    DELETE FROM telegram_link_codes
    WHERE user_id = ${user.id} AND used = false
  `;

  // Generate 6-digit alphanumeric code
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await sql`
    INSERT INTO telegram_link_codes (user_id, code, expires_at)
    VALUES (${user.id}, ${code}, ${expiresAt})
  `;

  return NextResponse.json({ code, expires_at: expiresAt });
}
