import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe, PLANS, PlanKey } from "@/lib/stripe";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan } = await req.json();
  if (!plan || !(plan in PLANS)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const planConfig = PLANS[plan as PlanKey];
  const userId = (session.user as any).id;
  const sql = getDb();

  // Get or create Stripe customer
  const userRows = await sql`SELECT stripe_customer_id, email FROM users WHERE id = ${userId}`;
  const user = userRows[0];
  let customerId = user?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: String(userId) },
    });
    customerId = customer.id;
    await sql`UPDATE users SET stripe_customer_id = ${customerId} WHERE id = ${userId}`;
  }

  // Create checkout session
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: planConfig.name },
          unit_amount: planConfig.price,
          recurring: { interval: planConfig.interval },
        },
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: 7,
      metadata: { userId: String(userId), tier: planConfig.tier, plan },
    },
    success_url: `${req.nextUrl.origin}/settings?subscription=success`,
    cancel_url: `${req.nextUrl.origin}/pricing`,
    metadata: { userId: String(userId), tier: planConfig.tier },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
