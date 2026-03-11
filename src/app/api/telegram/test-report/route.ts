import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getDb } from "@/lib/db";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SITE_URL = process.env.SITE_URL || "forex-analysis.vercel.app";

const DIRECTION_EMOJI: Record<string, string> = {
  bullish: "🟢",
  bearish: "🔴",
  neutral: "⚪",
};

async function sendTelegramMessage(chatId: string, text: string) {
  const res = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    }
  );
  return res.ok;
}

export async function POST() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = getDb();

  // Get user's telegram info
  const userRows = await sql`
    SELECT telegram_chat_id, telegram_instruments FROM users WHERE id = ${user.id}
  `;
  if (userRows.length === 0 || !userRows[0].telegram_chat_id) {
    return NextResponse.json({ error: "Telegram not connected" }, { status: 400 });
  }

  const chatId = userRows[0].telegram_chat_id as string;
  const instruments: string[] = userRows[0].telegram_instruments || [];

  if (instruments.length === 0) {
    return NextResponse.json({ error: "No instruments selected" }, { status: 400 });
  }

  // Build report for each instrument
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const blocks: string[] = [];

  for (const instrument of instruments) {
    // Get latest daily bias
    const biasRows = await sql`
      SELECT direction, summary, key_drivers
      FROM biases
      WHERE instrument = ${instrument} AND timeframe = 'daily'
      ORDER BY generated_at DESC LIMIT 1
    `;
    const bias = biasRows.length > 0 ? biasRows[0] : null;

    // Get recent articles
    const articleRows = await sql`
      SELECT a.id, a.title, aa.impact_direction, aa.confidence
      FROM articles a
      JOIN article_instruments ai ON a.id = ai.article_id
      LEFT JOIN article_analyses aa ON a.id = aa.article_id AND aa.instrument = ${instrument}
      WHERE ai.instrument = ${instrument}
        AND a.published_at >= CURRENT_DATE - INTERVAL '1 day'
      ORDER BY a.published_at DESC
    `;

    const direction = bias ? (bias.direction as string) : "neutral";
    const emoji = DIRECTION_EMOJI[direction] || "⚪";
    const directionLabel = direction.charAt(0).toUpperCase() + direction.slice(1);

    const lines: string[] = [`${emoji} <b>${instrument}</b> — ${directionLabel} (1D)`];

    if (bias?.summary) {
      let summary = bias.summary as string;
      if (summary.length > 120) summary = summary.slice(0, 117) + "...";
      lines.push(summary);
    }

    if (articleRows.length > 0) {
      lines.push("");
      lines.push("Headlines:");
      for (const article of articleRows) {
        const aDir = article.impact_direction as string | null;
        const aConf = article.confidence as string | null;
        const aEmoji = aDir ? (DIRECTION_EMOJI[aDir] || "—") : "—";
        const confLabel = aConf ? aConf.charAt(0).toUpperCase() + aConf.slice(1) : "";
        let title = article.title as string;
        if (title.length > 80) title = title.slice(0, 77) + "...";
        const badge = aDir ? ` ${aEmoji} ${confLabel}` : "";
        lines.push(`→ "${title}"${badge}`);
      }
    }

    lines.push(`🔗 ${SITE_URL}/${instrument}`);
    blocks.push(lines.join("\n"));
  }

  const header = `📊 <b>Tradeora Daily</b> — ${today}\n`;
  const footer = `\n🔗 ${SITE_URL}`;
  const separator = "\n\n━━━━━━━━━━━━━━━\n\n";

  const fullReport = header + "\n" + blocks.join(separator) + "\n" + footer;

  // Split if too long (4096 char Telegram limit)
  const messages: string[] = [];
  if (fullReport.length <= 4096) {
    messages.push(fullReport);
  } else {
    for (let i = 0; i < blocks.length; i++) {
      let msg = i === 0 ? header + "\n" + blocks[i] : blocks[i];
      if (i === blocks.length - 1) msg += "\n" + footer;
      messages.push(msg);
    }
  }

  let allSent = true;
  for (const msg of messages) {
    const ok = await sendTelegramMessage(chatId, msg);
    if (!ok) allSent = false;
  }

  if (!allSent) {
    return NextResponse.json({ error: "Failed to send some messages" }, { status: 500 });
  }

  return NextResponse.json({ sent: true, instruments: instruments.length });
}
