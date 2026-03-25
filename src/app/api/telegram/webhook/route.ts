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

  // Handle callback queries (Approve/Skip buttons from draft review)
  if (body.callback_query) {
    const callbackQuery = body.callback_query;
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

    // Only the admin can approve/skip
    if (String(callbackQuery.from.id) !== adminChatId) {
      return NextResponse.json({ ok: true });
    }

    try {
      const sql = getDb();
      const [action, draftIdStr] = callbackQuery.data.split(":");
      const draft_id = parseInt(draftIdStr, 10);

      if (action === "approve" || action === "skip") {
        const status = action === "approve" ? "approved" : "skipped";
        const postedAt = action === "approve" ? new Date().toISOString() : null;

        // Update draft status
        await sql`UPDATE telegram_drafts SET status = ${status}, posted_at = ${postedAt} WHERE id = ${draft_id}`;

        if (action === "approve") {
          // Get the draft and post to channel
          const drafts = await sql`SELECT formatted_message, image_url, article_id FROM telegram_drafts WHERE id = ${draft_id}`;
          if (drafts.length > 0) {
            const draft = drafts[0];
            const channelId = process.env.TELEGRAM_CHANNEL_ID;
            const botToken = process.env.TELEGRAM_BOT_TOKEN;

            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: channelId,
                text: draft.formatted_message,
                disable_web_page_preview: true,
              }),
            });

            if (draft.article_id) {
              await sql`UPDATE articles SET posted_to_channel = TRUE, channel_posted_at = NOW() WHERE id = ${draft.article_id}`;
            }
          }
        }

        // Answer callback to remove loading spinner
        const answerText = action === "approve" ? "Posted to channel!" : "Skipped.";
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callback_query_id: callbackQuery.id, text: answerText }),
        });

        // Update button to show result
        const statusEmoji = action === "approve" ? "\u2705" : "\u274C";
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: callbackQuery.message.chat.id,
            message_id: callbackQuery.message.message_id,
            reply_markup: { inline_keyboard: [[{ text: `${statusEmoji} ${status.toUpperCase()}`, callback_data: "noop" }]] },
          }),
        });
      }
    } catch (e) {
      console.error("Callback query error:", e);
    }

    return NextResponse.json({ ok: true });
  }

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
      await sendTelegramMessage(chatId, "Invalid or expired code. Please generate a new one from Tradeora settings.");
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
      "✅ <b>Connected!</b>\n\nYour Telegram is now linked to Tradeora. Go to Settings to select which instruments you want in your daily report."
    );
  } else if (text === "/START" || text === "/HELP") {
    await sendTelegramMessage(
      chatId,
      "👋 <b>Tradeora Bot</b>\n\nTo connect your account:\n1. Go to Tradeora → Settings\n2. Click \"Connect Telegram\"\n3. Send the 6-digit code here\n\nYou'll receive daily market reports for your selected instruments."
    );
  } else {
    await sendTelegramMessage(
      chatId,
      "Send your 6-digit link code from Tradeora settings, or type /help for instructions."
    );
  }

  return NextResponse.json({ ok: true });
}
