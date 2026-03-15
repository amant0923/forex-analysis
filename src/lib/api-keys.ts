import { getDb } from "./db";
import { randomBytes, createHash } from "crypto";

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const raw = randomBytes(32).toString("hex");
  const key = `tradeora_sk_${raw}`;
  const hash = createHash("sha256").update(key).digest("hex");
  const prefix = `tradeora_sk_${raw.slice(0, 8)}...`;
  return { key, hash, prefix };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function validateApiKey(key: string): Promise<{ userId: number; keyId: number } | null> {
  if (!key.startsWith("tradeora_sk_")) return null;

  const hash = hashApiKey(key);
  const sql = getDb();

  const rows = await sql`
    SELECT id, user_id FROM api_keys
    WHERE key_hash = ${hash} AND revoked_at IS NULL
    LIMIT 1
  `;

  if (rows.length === 0) return null;

  // Update last_used_at
  await sql`UPDATE api_keys SET last_used_at = NOW() WHERE id = ${rows[0].id}`;

  return { userId: Number(rows[0].user_id), keyId: Number(rows[0].id) };
}
