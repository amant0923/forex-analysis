import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { broker, referrer } = await req.json();
  if (!broker) return NextResponse.json({ error: "Missing broker" }, { status: 400 });

  const session = await getServerSession(authOptions);
  const userId = session?.user ? (session.user as any).id : null;
  const sql = getDb();

  await sql`
    INSERT INTO affiliate_clicks (broker, user_id, referrer_page)
    VALUES (${broker}, ${userId}, ${referrer || null})
  `;

  return NextResponse.json({ ok: true });
}
