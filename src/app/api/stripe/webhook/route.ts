import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getDb } from "@/lib/db";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const sql = getDb();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const tier = session.metadata?.tier;
      if (userId && tier) {
        await sql`
          UPDATE users SET
            tier = ${tier},
            stripe_subscription_id = ${session.subscription as string},
            subscription_status = 'active'
          WHERE id = ${Number(userId)}
        `;
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      const tier = subscription.metadata?.tier;
      if (userId) {
        const status = subscription.status === "active" || subscription.status === "trialing" ? subscription.status : "inactive";
        await sql`
          UPDATE users SET
            tier = ${status === "inactive" ? "free" : (tier || "free")},
            subscription_status = ${status}
          WHERE id = ${Number(userId)}
        `;
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      if (userId) {
        await sql`
          UPDATE users SET
            tier = 'free',
            stripe_subscription_id = NULL,
            subscription_status = 'cancelled'
          WHERE id = ${Number(userId)}
        `;
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      await sql`
        UPDATE users SET subscription_status = 'past_due'
        WHERE stripe_customer_id = ${customerId}
      `;
      break;
    }
  }

  return NextResponse.json({ received: true });
}
