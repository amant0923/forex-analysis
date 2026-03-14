import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const sql = getDb();
  const userRows = await sql`SELECT stripe_customer_id FROM users WHERE id = ${userId}`;

  if (!userRows[0]?.stripe_customer_id) {
    return NextResponse.json({ error: "No subscription" }, { status: 400 });
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: userRows[0].stripe_customer_id,
    return_url: `${req.nextUrl.origin}/settings`,
  });

  return NextResponse.json({ url: portalSession.url });
}
