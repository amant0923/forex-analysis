import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const message = body?.message;
  if (!message?.text || !message?.chat?.id) {
    return NextResponse.json({ ok: true });
  }

  const chatId = String(message.chat.id);
  const text = message.text.trim().toUpperCase();
  const sql = getDb();

  // Check if this looks like a link code (6 alphanumeric chars)
  if (/^[A-Z0-9]{6}$/.test(text)) {
    // Find valid unexpired code
    const rows = await sql`
      SELECT * FROM telegram_link_codes
      WHERE code = ${text}
        AND used = false
        AND expires_at > NOW()
      LIMIT 1
    `;

    if (rows.length === 0) {
      await sendTelegramMessage(chatId, "Invalid or expired code. Please generate a new one from ForexPulse settings.");
      return NextResponse.json({ ok: true });
    }

    const linkCode = rows[0];

    // Mark code as used
    await sql`
      UPDATE telegram_link_codes SET used = true WHERE id = ${linkCode.id}
    `;

    // Link telegram chat to user
    await sql`
      UPDATE users SET telegram_chat_id = ${chatId} WHERE id = ${linkCode.user_id}
    `;

    await sendTelegramMessage(
      chatId,
      "✅ <b>Connected!</b>\n\nYour Telegram is now linked to ForexPulse. Go to Settings to select which instruments you want in your daily report."
    );
  } else if (text === "/START" || text === "/HELP") {
    await sendTelegramMessage(
      chatId,
      "👋 <b>ForexPulse Bot</b>\n\nTo connect your account:\n1. Go to ForexPulse → Settings\n2. Click \"Connect Telegram\"\n3. Send the 6-digit code here\n\nYou'll receive daily market reports for your selected instruments."
    );
  } else {
    await sendTelegramMessage(
      chatId,
      "Send your 6-digit link code from ForexPulse settings, or type /help for instructions."
    );
  }

  return NextResponse.json({ ok: true });
}
