import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import webpush from "web-push";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:hello@tradeora.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export async function POST(request: NextRequest) {
  // Protect with internal API key
  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
  }

  const body = await request.json();
  const { title, body: messageBody, url } = body;

  const sql = getDb();
  const subscriptions = await sql`SELECT * FROM push_subscriptions`;

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint as string,
          keys: {
            p256dh: sub.p256dh as string,
            auth: sub.auth as string,
          },
        },
        JSON.stringify({
          title: title || "Tradeora",
          body: messageBody || "New bias analysis available",
          url: url || "/",
        })
      );
      sent++;
    } catch (err: any) {
      // Remove expired subscriptions
      if (err.statusCode === 404 || err.statusCode === 410) {
        await sql`DELETE FROM push_subscriptions WHERE id = ${sub.id}`;
      }
      failed++;
    }
  }

  return NextResponse.json({ sent, failed, total: subscriptions.length });
}
