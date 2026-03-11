import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "./db";

const client = new Anthropic();

export async function getChatHistory(userId: number) {
  const sql = getDb();
  const rows = await sql`
    SELECT role, content, created_at FROM chat_messages
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 50
  `;
  return rows.reverse(); // oldest first for conversation order
}

export async function getLatestChatSummary(userId: number): Promise<string | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT summary FROM chat_summaries
    WHERE user_id = ${userId}
    ORDER BY generated_at DESC
    LIMIT 1
  `;
  return rows.length > 0 ? (rows[0].summary as string) : null;
}

async function buildSystemPrompt(userId: number): Promise<string> {
  const sql = getDb();

  // User's overall stats
  const statsRows = await sql`
    SELECT
      COUNT(*)::int as total_trades,
      COUNT(CASE WHEN pnl_dollars > 0 THEN 1 END)::int as wins,
      COALESCE(AVG(CASE WHEN rr_ratio IS NOT NULL THEN rr_ratio END), 0)::decimal as avg_rr,
      COALESCE(SUM(pnl_dollars), 0)::decimal as total_pnl
    FROM trades WHERE user_id = ${userId} AND closed_at IS NOT NULL
  `;
  const stats = statsRows[0];
  const winRate =
    stats.total_trades > 0
      ? ((stats.wins / stats.total_trades) * 100).toFixed(1)
      : "0";

  // Recent 20 trades
  const recentTrades = await sql`
    SELECT instrument, direction, pnl_dollars, pnl_pips, pnl_ticks, opened_at
    FROM trades WHERE user_id = ${userId}
    ORDER BY opened_at DESC LIMIT 20
  `;

  // Playbooks
  const playbooks = await sql`SELECT name FROM playbooks WHERE user_id = ${userId}`;

  // Current biases
  const biases = await sql`
    SELECT DISTINCT ON (instrument, timeframe) instrument, timeframe, direction, summary
    FROM biases ORDER BY instrument, timeframe, generated_at DESC
  `;

  let prompt = `You are an expert trading coach and analyst for the Tradeora platform. You have access to the user's full trading history and can answer questions about their performance, patterns, and areas for improvement. Be direct, specific, and actionable.

## User's Trading Profile
- Total Trades: ${stats.total_trades}
- Win Rate: ${winRate}%
- Avg R:R: ${Number(stats.avg_rr).toFixed(2)}
- Total P&L: $${Number(stats.total_pnl).toFixed(2)}

## Recent Trades (last 20)
`;

  recentTrades.forEach((t: any) => {
    const pnl = t.pnl_pips ? `${t.pnl_pips} pips` : `${t.pnl_ticks} ticks`;
    const dateStr = t.opened_at ? new Date(t.opened_at).toISOString().split("T")[0] : "unknown";
    prompt += `- ${dateStr} ${t.instrument} ${t.direction} ${pnl} ($${t.pnl_dollars || 0})\n`;
  });

  if (playbooks.length > 0) {
    prompt += `\n## User's Playbooks\n`;
    playbooks.forEach((p: any) => {
      prompt += `- ${p.name}\n`;
    });
  }

  if (biases.length > 0) {
    prompt += `\n## Current Tradeora Fundamental Biases\n`;
    biases.forEach((b: any) => {
      prompt += `- ${b.instrument} (${b.timeframe}): ${b.direction}\n`;
    });
  }

  return prompt;
}

export async function chat(userId: number, message: string): Promise<string> {
  const sql = getDb();

  // Store user message
  await sql`
    INSERT INTO chat_messages (user_id, role, content)
    VALUES (${userId}, 'user', ${message})
  `;

  // Build context
  const systemPrompt = await buildSystemPrompt(userId);
  const summary = await getLatestChatSummary(userId);
  const history = await getChatHistory(userId);

  let fullSystem = systemPrompt;
  if (summary) {
    fullSystem += `\n\n## Previous Conversation Summary\n${summary}`;
  }

  // Build messages array for Claude
  const messages = history.map((m: any) => ({
    role: m.role as "user" | "assistant",
    content: m.content as string,
  }));

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: fullSystem,
    messages,
  });

  const reply =
    response.content[0].type === "text"
      ? response.content[0].text
      : "I couldn't generate a response.";

  // Store assistant message
  await sql`
    INSERT INTO chat_messages (user_id, role, content)
    VALUES (${userId}, 'assistant', ${reply})
  `;

  // Check if we need to generate a summary (every 50 messages)
  const countRows = await sql`
    SELECT COUNT(*)::int as count FROM chat_messages WHERE user_id = ${userId}
  `;
  const msgCount = countRows[0].count;
  if (msgCount > 0 && msgCount % 50 === 0) {
    // Generate summary in background (don't await)
    generateChatSummary(userId, msgCount).catch(console.error);
  }

  return reply;
}

async function generateChatSummary(userId: number, upToId: number) {
  const sql = getDb();
  const recentMessages = await sql`
    SELECT role, content FROM chat_messages
    WHERE user_id = ${userId}
    ORDER BY created_at DESC LIMIT 50
  `;

  const summaryResponse = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Summarize this trading conversation in 2-3 paragraphs, focusing on key topics discussed, advice given, and any patterns identified:\n\n${recentMessages
          .reverse()
          .map((m: any) => `${m.role}: ${m.content}`)
          .join("\n\n")}`,
      },
    ],
  });

  const summaryText =
    summaryResponse.content[0].type === "text"
      ? summaryResponse.content[0].text
      : "";

  await sql`
    INSERT INTO chat_summaries (user_id, summary, messages_covered_up_to)
    VALUES (${userId}, ${summaryText}, ${upToId})
  `;
}
