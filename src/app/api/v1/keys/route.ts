import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthUser } from "@/lib/api-auth";
import { generateApiKey } from "@/lib/api-keys";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = getDb();
  const rows = await sql`
    SELECT id, key_prefix, name, last_used_at, created_at
    FROM api_keys
    WHERE user_id = ${user.id} AND revoked_at IS NULL
    ORDER BY created_at DESC
  `;

  return NextResponse.json({ keys: rows });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.tier !== "premium") {
    return NextResponse.json({ error: "API access requires Premium plan" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const name = body.name || "Default";

  const { key, hash, prefix } = generateApiKey();
  const sql = getDb();

  await sql`
    INSERT INTO api_keys (user_id, key_hash, key_prefix, name)
    VALUES (${user.id}, ${hash}, ${prefix}, ${name})
  `;

  // Return the key in plaintext — only time it's shown
  return NextResponse.json({ key, prefix, name });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { keyId } = body;

  if (!keyId) return NextResponse.json({ error: "Missing keyId" }, { status: 400 });

  const sql = getDb();
  await sql`
    UPDATE api_keys SET revoked_at = NOW()
    WHERE id = ${keyId} AND user_id = ${user.id}
  `;

  return NextResponse.json({ ok: true });
}
