import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const hours = Number(request.nextUrl.searchParams.get("hours") || "48");
  const sql = getDb();

  const rows = await sql`
    SELECT * FROM bias_alerts
    WHERE created_at >= NOW() - INTERVAL '1 hour' * ${hours}
    ORDER BY created_at DESC
    LIMIT 50
  `;

  return NextResponse.json({ alerts: rows });
}
