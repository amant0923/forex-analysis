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

const CONFIDENCE_EMOJI: Record<string, string> = {
  high: "🔴",
  medium: "🟡",
  low: "🔵",
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

  const userRows = await sql`
    SELECT telegram_chat_id, telegram_instruments, telegram_confidence_filter
    FROM users WHERE id = ${user.id}
  `;
  if (userRows.length === 0 || !userRows[0].telegram_chat_id) {
    return NextResponse.json({ error: "Telegram not connected" }, { status: 400 });
  }

  const chatId = userRows[0].telegram_chat_id as string;
  const instruments: string[] = userRows[0].telegram_instruments || [];
  const confidenceFilter: string[] = userRows[0].telegram_confidence_filter || ["high", "medium", "low"];

  if (instruments.length === 0) {
    return NextResponse.json({ error: "No instruments selected" }, { status: 400 });
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const blocks: string[] = [];

  for (const instrument of instruments) {
    // Get latest daily bias
    const biasRows = await sql`
      SELECT direction, summary
      FROM biases
      WHERE instrument = ${instrument} AND timeframe = 'daily'
      ORDER BY generated_at DESC LIMIT 1
    `;
    const bias = biasRows.length > 0 ? biasRows[0] : null;

    // Get today's articles matching confidence filter
    const todayArticles = await sql`
      SELECT DISTINCT a.id, a.title, a.published_at, aa.impact_direction, aa.confidence
      FROM articles a
      JOIN article_instruments ai ON a.id = ai.article_id
      LEFT JOIN article_analyses aa ON a.id = aa.article_id AND aa.instrument = ${instrument}
      WHERE ai.instrument = ${instrument}
        AND a.published_at >= CURRENT_DATE
        AND (aa.confidence IS NULL OR aa.confidence = ANY(${confidenceFilter}))
      ORDER BY a.published_at DESC
    `;

    // If no articles today, get the single most recent one
    let articles = todayArticles;
    let isLatestFallback = false;
    if (articles.length === 0) {
      const latestArticle = await sql`
        SELECT DISTINCT a.id, a.title, a.published_at, aa.impact_direction, aa.confidence
        FROM articles a
        JOIN article_instruments ai ON a.id = ai.article_id
        LEFT JOIN article_analyses aa ON a.id = aa.article_id AND aa.instrument = ${instrument}
        WHERE ai.instrument = ${instrument}
        ORDER BY a.published_at DESC
        LIMIT 1
      `;
      articles = latestArticle;
      isLatestFallback = true;
    }

    const direction = bias ? (bias.direction as string) : "neutral";
    const emoji = DIRECTION_EMOJI[direction] || "⚪";
    const dirLabel = direction.charAt(0).toUpperCase() + direction.slice(1);

    // Header line
    const lines: string[] = [`${emoji} <b>${instrument}</b> — ${dirLabel}`];

    // Bias summary
    if (bias?.summary) {
      let summary = bias.summary as string;
      if (summary.length > 150) summary = summary.slice(0, 147) + "...";
      lines.push(`<i>${summary}</i>`);
    }

    // Articles
    if (articles.length > 0) {
      lines.push("");
      if (isLatestFallback) {
        lines.push("📰 <b>Latest:</b>");
      } else {
        lines.push(`📰 <b>Today (${articles.length}):</b>`);
      }
      for (const article of articles) {
        const aDir = article.impact_direction as string | null;
        const aConf = article.confidence as string | null;
        const dirIcon = aDir ? (DIRECTION_EMOJI[aDir] || "") : "";
        const confIcon = aConf ? (CONFIDENCE_EMOJI[aConf] || "") : "";
        let title = article.title as string;
        if (title.length > 75) title = title.slice(0, 72) + "...";
        const badges = [dirIcon, confIcon].filter(Boolean).join(" ");
        lines.push(`  ${badges ? badges + " " : ""}${title}`);
      }
    } else {
      lines.push("\n<i>No recent articles</i>");
    }

    blocks.push(lines.join("\n"));
  }

  // Filter label
  const filterLabel = confidenceFilter.length === 3
    ? "All"
    : confidenceFilter.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(", ");

  const header = `📊 <b>Tradeora Daily</b> — ${today}\n📋 Filter: ${filterLabel} impact\n`;
  const footer = `\n🔗 <b>Full analysis:</b> ${SITE_URL}`;
  const separator = "\n\n━━━━━━━━━━━━━━━\n\n";

  const fullReport = header + "\n" + blocks.join(separator) + "\n" + footer;

  // Split if too long
  const messages: string[] = [];
  if (fullReport.length <= 4096) {
    messages.push(fullReport);
  } else {
    for (let i = 0; i < blocks.length; i++) {
      let msg = i === 0 ? header + "\n" + blocks[i] : blocks[i];
      if (i === blocks.length - 1) msg += "\n" + footer;
      if (msg.length > 4096) msg = msg.slice(0, 4093) + "...";
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
