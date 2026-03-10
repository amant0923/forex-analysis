import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "./db";

const client = new Anthropic();

export async function generateBasicReport(userId: number, type: "weekly" | "monthly", date: string) {
  const sql = getDb();
  const days = type === "weekly" ? 7 : 30;

  const rows = await sql`
    SELECT
      COUNT(*)::int as total_trades,
      COUNT(CASE WHEN pnl_dollars > 0 THEN 1 END)::int as wins,
      COUNT(CASE WHEN pnl_dollars <= 0 THEN 1 END)::int as losses,
      COALESCE(SUM(pnl_dollars), 0)::decimal as total_pnl,
      COALESCE(AVG(CASE WHEN rr_ratio IS NOT NULL THEN rr_ratio END), 0)::decimal as avg_rr,
      COALESCE(MAX(pnl_dollars), 0)::decimal as best_trade,
      COALESCE(MIN(pnl_dollars), 0)::decimal as worst_trade
    FROM trades
    WHERE user_id = ${userId}
    AND closed_at >= ${date}::date - INTERVAL '1 day' * ${days}
    AND closed_at <= ${date}::date
  `;

  const instrumentRows = await sql`
    SELECT instrument, COUNT(*)::int as count, COALESCE(SUM(pnl_dollars), 0)::decimal as pnl
    FROM trades
    WHERE user_id = ${userId}
    AND closed_at >= ${date}::date - INTERVAL '1 day' * ${days}
    AND closed_at <= ${date}::date
    GROUP BY instrument
    ORDER BY count DESC
  `;

  const dayRows = await sql`
    SELECT closed_at::date as day, COALESCE(SUM(pnl_dollars), 0)::decimal as pnl
    FROM trades
    WHERE user_id = ${userId}
    AND closed_at >= ${date}::date - INTERVAL '1 day' * ${days}
    AND closed_at <= ${date}::date
    GROUP BY closed_at::date
    ORDER BY day
  `;

  const stats = rows[0];
  return {
    type: "basic" as const,
    period: type,
    total_trades: stats.total_trades,
    wins: stats.wins,
    losses: stats.losses,
    win_rate: stats.total_trades > 0 ? (stats.wins / stats.total_trades * 100) : 0,
    total_pnl: Number(stats.total_pnl),
    avg_rr: Number(stats.avg_rr),
    best_trade: Number(stats.best_trade),
    worst_trade: Number(stats.worst_trade),
    by_instrument: instrumentRows.map((r: any) => ({ ...r, pnl: Number(r.pnl) })),
    daily_pnl: dayRows.map((r: any) => ({ ...r, pnl: Number(r.pnl) })),
  };
}

export async function generateAIReport(userId: number, type: "weekly" | "monthly", date: string) {
  const basicReport = await generateBasicReport(userId, type, date);

  const sql = getDb();
  const days = type === "weekly" ? 7 : 30;

  // Get all trades for the period for AI analysis
  const trades = await sql`
    SELECT t.*, p.name as playbook_name
    FROM trades t
    LEFT JOIN playbooks p ON p.id = t.playbook_id
    WHERE t.user_id = ${userId}
    AND t.closed_at >= ${date}::date - INTERVAL '1 day' * ${days}
    AND t.closed_at <= ${date}::date
    ORDER BY t.opened_at
  `;

  if (trades.length === 0) {
    return { ...basicReport, type: "ai" as const, ai_insights: null };
  }

  const tradeSummary = trades.map((t: any) => {
    const dateStr = t.opened_at ? new Date(t.opened_at).toISOString().split("T")[0] : "unknown";
    return `${dateStr} ${t.instrument} ${t.direction} Entry:${t.entry_price} Exit:${t.exit_price} P&L:$${t.pnl_dollars} R:R:${t.rr_ratio || "N/A"} Session:${t.session || "N/A"} EmotionBefore:${t.emotion_before || "N/A"} EmotionAfter:${t.emotion_after || "N/A"} Playbook:${t.playbook_name || "none"} Score:${t.rule_adherence_score || "N/A"}`;
  }).join("\n");

  const prompt = `Analyze this trader's ${type} performance and provide insights.

## Stats
- Total Trades: ${basicReport.total_trades}, Wins: ${basicReport.wins}, Losses: ${basicReport.losses}
- Win Rate: ${basicReport.win_rate.toFixed(1)}%, Avg R:R: ${basicReport.avg_rr.toFixed(2)}
- Total P&L: $${basicReport.total_pnl.toFixed(2)}
- Best Trade: $${basicReport.best_trade.toFixed(2)}, Worst: $${basicReport.worst_trade.toFixed(2)}

## All Trades
${tradeSummary}

Respond in JSON:
{
  "summary": "2-3 sentence overall assessment",
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "patterns": ["...", "..."],
  "emotional_analysis": "analysis of emotional patterns and their impact",
  "bias_alignment": "how well trades aligned with market biases",
  "top_suggestions": ["...", "...", "..."]
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const aiInsights = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

  return { ...basicReport, type: "ai" as const, ai_insights: aiInsights };
}
