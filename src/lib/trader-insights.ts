import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "./db";
import type { TraderInsight, DNAProfile } from "@/types";

const client = new Anthropic();

export async function canGenerateInsights(userId: number): Promise<{ eligible: boolean; tradeCount: number }> {
  const sql = getDb();
  const rows = await sql`
    SELECT COUNT(*)::int as count FROM trades
    WHERE user_id = ${userId} AND closed_at IS NOT NULL
  `;
  const tradeCount = rows[0]?.count || 0;
  return { eligible: tradeCount >= 20, tradeCount };
}

export async function getTradePatternStats(userId: number) {
  const sql = getDb();

  // Total closed trades
  const totalRows = await sql`
    SELECT COUNT(*)::int as count FROM trades
    WHERE user_id = ${userId} AND closed_at IS NOT NULL
  `;
  const totalTrades = totalRows[0]?.count || 0;

  // Win rate overall
  const winRows = await sql`
    SELECT
      COUNT(*)::int as total,
      COUNT(CASE WHEN pnl_dollars > 0 THEN 1 END)::int as wins
    FROM trades
    WHERE user_id = ${userId} AND closed_at IS NOT NULL
  `;
  const overallWinRate = winRows[0].total > 0
    ? (winRows[0].wins / winRows[0].total) * 100
    : 0;

  // Bias alignment analysis
  const biasAlignmentRows = await sql`
    SELECT t.id, t.direction as trade_direction, t.pnl_dollars,
      b.direction as bias_direction
    FROM trades t
    LEFT JOIN LATERAL (
      SELECT direction FROM biases
      WHERE instrument = t.instrument AND timeframe = '1week'
      AND generated_at <= t.opened_at
      ORDER BY generated_at DESC LIMIT 1
    ) b ON true
    WHERE t.user_id = ${userId} AND t.closed_at IS NOT NULL
  `;

  let alignedWins = 0, alignedTotal = 0;
  let notAlignedWins = 0, notAlignedTotal = 0;
  for (const row of biasAlignmentRows) {
    if (!row.bias_direction) continue;
    const aligned =
      (row.trade_direction === "buy" && row.bias_direction === "bullish") ||
      (row.trade_direction === "sell" && row.bias_direction === "bearish");
    if (aligned) {
      alignedTotal++;
      if (Number(row.pnl_dollars) > 0) alignedWins++;
    } else {
      notAlignedTotal++;
      if (Number(row.pnl_dollars) > 0) notAlignedWins++;
    }
  }

  // Win rate by session
  const sessionRows = await sql`
    SELECT session,
      COUNT(*)::int as total,
      COUNT(CASE WHEN pnl_dollars > 0 THEN 1 END)::int as wins
    FROM trades
    WHERE user_id = ${userId} AND closed_at IS NOT NULL AND session IS NOT NULL
    GROUP BY session
  `;

  // Win rate by instrument
  const instrumentRows = await sql`
    SELECT instrument,
      COUNT(*)::int as total,
      COUNT(CASE WHEN pnl_dollars > 0 THEN 1 END)::int as wins
    FROM trades
    WHERE user_id = ${userId} AND closed_at IS NOT NULL
    GROUP BY instrument
    ORDER BY total DESC
  `;

  // Win rate by day of week
  const dowRows = await sql`
    SELECT EXTRACT(DOW FROM opened_at) as dow,
      COUNT(*)::int as total,
      COUNT(CASE WHEN pnl_dollars > 0 THEN 1 END)::int as wins
    FROM trades
    WHERE user_id = ${userId} AND closed_at IS NOT NULL
    GROUP BY dow
    ORDER BY dow
  `;

  // Win rate by emotion_before
  const emotionRows = await sql`
    SELECT emotion_before,
      COUNT(*)::int as total,
      COUNT(CASE WHEN pnl_dollars > 0 THEN 1 END)::int as wins
    FROM trades
    WHERE user_id = ${userId} AND closed_at IS NOT NULL AND emotion_before IS NOT NULL
    GROUP BY emotion_before
  `;

  // Average R:R overall and by direction
  const rrRows = await sql`
    SELECT
      COALESCE(AVG(CASE WHEN rr_ratio IS NOT NULL THEN rr_ratio END), 0)::decimal as avg_rr,
      COALESCE(AVG(CASE WHEN rr_ratio IS NOT NULL AND direction = 'buy' THEN rr_ratio END), 0)::decimal as avg_rr_buy,
      COALESCE(AVG(CASE WHEN rr_ratio IS NOT NULL AND direction = 'sell' THEN rr_ratio END), 0)::decimal as avg_rr_sell
    FROM trades
    WHERE user_id = ${userId} AND closed_at IS NOT NULL
  `;

  // Best/worst instrument by win rate (min 3 trades)
  const bestWorstRows = await sql`
    SELECT instrument,
      COUNT(*)::int as total,
      COUNT(CASE WHEN pnl_dollars > 0 THEN 1 END)::int as wins
    FROM trades
    WHERE user_id = ${userId} AND closed_at IS NOT NULL
    GROUP BY instrument
    HAVING COUNT(*) >= 3
    ORDER BY (COUNT(CASE WHEN pnl_dollars > 0 THEN 1 END)::decimal / COUNT(*)) DESC
  `;

  const bestInstrument = bestWorstRows.length > 0
    ? { instrument: bestWorstRows[0].instrument, win_rate: (bestWorstRows[0].wins / bestWorstRows[0].total) * 100, total: bestWorstRows[0].total }
    : null;
  const worstInstrument = bestWorstRows.length > 0
    ? { instrument: bestWorstRows[bestWorstRows.length - 1].instrument, win_rate: (bestWorstRows[bestWorstRows.length - 1].wins / bestWorstRows[bestWorstRows.length - 1].total) * 100, total: bestWorstRows[bestWorstRows.length - 1].total }
    : null;

  // Longest win/loss streaks
  const streakRows = await sql`
    SELECT pnl_dollars FROM trades
    WHERE user_id = ${userId} AND closed_at IS NOT NULL
    ORDER BY closed_at ASC
  `;

  let longestWinStreak = 0, longestLossStreak = 0;
  let currentWinStreak = 0, currentLossStreak = 0;
  for (const row of streakRows) {
    if (Number(row.pnl_dollars) > 0) {
      currentWinStreak++;
      currentLossStreak = 0;
      if (currentWinStreak > longestWinStreak) longestWinStreak = currentWinStreak;
    } else {
      currentLossStreak++;
      currentWinStreak = 0;
      if (currentLossStreak > longestLossStreak) longestLossStreak = currentLossStreak;
    }
  }

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return {
    totalTrades,
    overallWinRate: Math.round(overallWinRate * 10) / 10,
    biasAlignment: {
      alignedWinRate: alignedTotal > 0 ? Math.round((alignedWins / alignedTotal) * 1000) / 10 : null,
      alignedTotal,
      notAlignedWinRate: notAlignedTotal > 0 ? Math.round((notAlignedWins / notAlignedTotal) * 1000) / 10 : null,
      notAlignedTotal,
    },
    bySessions: sessionRows.map((r: any) => ({
      session: r.session,
      total: r.total,
      winRate: Math.round((r.wins / r.total) * 1000) / 10,
    })),
    byInstrument: instrumentRows.map((r: any) => ({
      instrument: r.instrument,
      total: r.total,
      winRate: Math.round((r.wins / r.total) * 1000) / 10,
    })),
    byDayOfWeek: dowRows.map((r: any) => ({
      day: dayNames[Number(r.dow)] || `Day ${r.dow}`,
      total: r.total,
      winRate: Math.round((r.wins / r.total) * 1000) / 10,
    })),
    byEmotion: emotionRows.map((r: any) => ({
      emotion: r.emotion_before,
      total: r.total,
      winRate: Math.round((r.wins / r.total) * 1000) / 10,
    })),
    avgRR: Number(rrRows[0].avg_rr),
    avgRRBuy: Number(rrRows[0].avg_rr_buy),
    avgRRSell: Number(rrRows[0].avg_rr_sell),
    bestInstrument,
    worstInstrument,
    longestWinStreak,
    longestLossStreak,
  };
}

export async function generatePatternInsights(userId: number): Promise<TraderInsight[]> {
  const stats = await getTradePatternStats(userId);

  const prompt = `You are a trading performance analyst. Analyze this trader's statistics and provide 5-8 specific, actionable insights.

## Trading Statistics
- Total Closed Trades: ${stats.totalTrades}
- Overall Win Rate: ${stats.overallWinRate}%
- Average R:R: ${stats.avgRR.toFixed(2)}
- Avg R:R (Longs): ${stats.avgRRBuy.toFixed(2)}, Avg R:R (Shorts): ${stats.avgRRSell.toFixed(2)}
- Longest Win Streak: ${stats.longestWinStreak}, Longest Loss Streak: ${stats.longestLossStreak}

## Bias Alignment (trades aligned with weekly fundamental bias)
- Aligned with bias: ${stats.biasAlignment.alignedTotal} trades, ${stats.biasAlignment.alignedWinRate ?? "N/A"}% win rate
- Against bias: ${stats.biasAlignment.notAlignedTotal} trades, ${stats.biasAlignment.notAlignedWinRate ?? "N/A"}% win rate

## By Session
${stats.bySessions.map((s: any) => `- ${s.session}: ${s.total} trades, ${s.winRate}% win rate`).join("\n")}

## By Instrument
${stats.byInstrument.map((i: any) => `- ${i.instrument}: ${i.total} trades, ${i.winRate}% win rate`).join("\n")}

## By Day of Week
${stats.byDayOfWeek.map((d: any) => `- ${d.day}: ${d.total} trades, ${d.winRate}% win rate`).join("\n")}

## By Pre-Trade Emotion
${stats.byEmotion.map((e: any) => `- ${e.emotion}: ${e.total} trades, ${e.winRate}% win rate`).join("\n")}

## Best/Worst Instruments
- Best: ${stats.bestInstrument ? `${stats.bestInstrument.instrument} (${stats.bestInstrument.win_rate.toFixed(1)}% win rate, ${stats.bestInstrument.total} trades)` : "N/A"}
- Worst: ${stats.worstInstrument ? `${stats.worstInstrument.instrument} (${stats.worstInstrument.win_rate.toFixed(1)}% win rate, ${stats.worstInstrument.total} trades)` : "N/A"}

Respond with JSON only:
{
  "insights": [
    {
      "title": "Short descriptive title",
      "stat": "Key statistic highlight (e.g. '73% win rate with bias vs 31% against')",
      "description": "2-3 sentences explaining the insight and what to do about it",
      "category": "bias_alignment" | "session" | "instrument" | "emotion" | "pattern" | "risk"
    }
  ]
}

Categories: bias_alignment (bias-related), session (time/session), instrument (pair-specific), emotion (psychology), pattern (streaks/habits), risk (R:R and risk management).
Focus on the most impactful and actionable findings. Use concrete numbers.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { insights: [] };
  const insights: TraderInsight[] = parsed.insights || [];

  // Store in database
  const sql = getDb();
  await sql`
    INSERT INTO trader_insights (user_id, type, insights, trade_count)
    VALUES (${userId}, 'pattern', ${JSON.stringify(insights)}, ${stats.totalTrades})
  `;

  return insights;
}

export async function generateDNAProfile(userId: number, month: string): Promise<DNAProfile> {
  const sql = getDb();

  // Parse month to get date range
  const periodStart = `${month}-01`;
  const periodEnd = `${month}-01`;

  // Get trades for the specific month
  const trades = await sql`
    SELECT t.*, p.name as playbook_name
    FROM trades t
    LEFT JOIN playbooks p ON p.id = t.playbook_id
    WHERE t.user_id = ${userId}
    AND t.closed_at IS NOT NULL
    AND t.opened_at >= ${periodStart}::date
    AND t.opened_at < ${periodEnd}::date + INTERVAL '1 month'
    ORDER BY t.opened_at
  `;

  // Compute month-specific stats
  const monthStats = await sql`
    SELECT
      COUNT(*)::int as total,
      COUNT(CASE WHEN pnl_dollars > 0 THEN 1 END)::int as wins,
      COALESCE(SUM(pnl_dollars), 0)::decimal as total_pnl,
      COALESCE(AVG(CASE WHEN rr_ratio IS NOT NULL THEN rr_ratio END), 0)::decimal as avg_rr
    FROM trades
    WHERE user_id = ${userId} AND closed_at IS NOT NULL
    AND opened_at >= ${periodStart}::date
    AND opened_at < ${periodEnd}::date + INTERVAL '1 month'
  `;

  // Bias alignment for the month
  const biasRows = await sql`
    SELECT t.direction as trade_direction, t.pnl_dollars,
      b.direction as bias_direction
    FROM trades t
    LEFT JOIN LATERAL (
      SELECT direction FROM biases
      WHERE instrument = t.instrument AND timeframe = '1week'
      AND generated_at <= t.opened_at
      ORDER BY generated_at DESC LIMIT 1
    ) b ON true
    WHERE t.user_id = ${userId} AND t.closed_at IS NOT NULL
    AND t.opened_at >= ${periodStart}::date
    AND t.opened_at < ${periodEnd}::date + INTERVAL '1 month'
  `;

  let alignedTotal = 0, alignedWins = 0;
  for (const row of biasRows) {
    if (!row.bias_direction) continue;
    const aligned =
      (row.trade_direction === "buy" && row.bias_direction === "bullish") ||
      (row.trade_direction === "sell" && row.bias_direction === "bearish");
    if (aligned) {
      alignedTotal++;
      if (Number(row.pnl_dollars) > 0) alignedWins++;
    }
  }
  const biasAlignmentScore = biasRows.length > 0
    ? Math.round((alignedTotal / biasRows.length) * 100)
    : 0;

  // Session breakdown
  const sessionRows = await sql`
    SELECT session,
      COUNT(*)::int as total,
      COUNT(CASE WHEN pnl_dollars > 0 THEN 1 END)::int as wins,
      COALESCE(SUM(pnl_dollars), 0)::decimal as pnl
    FROM trades
    WHERE user_id = ${userId} AND closed_at IS NOT NULL AND session IS NOT NULL
    AND opened_at >= ${periodStart}::date
    AND opened_at < ${periodEnd}::date + INTERVAL '1 month'
    GROUP BY session
  `;

  // Emotion breakdown
  const emotionRows = await sql`
    SELECT emotion_before, emotion_after,
      COUNT(*)::int as total,
      COUNT(CASE WHEN pnl_dollars > 0 THEN 1 END)::int as wins
    FROM trades
    WHERE user_id = ${userId} AND closed_at IS NOT NULL
    AND opened_at >= ${periodStart}::date
    AND opened_at < ${periodEnd}::date + INTERVAL '1 month'
    AND (emotion_before IS NOT NULL OR emotion_after IS NOT NULL)
    GROUP BY emotion_before, emotion_after
  `;

  const ms = monthStats[0];
  const winRate = ms.total > 0 ? ((ms.wins / ms.total) * 100).toFixed(1) : "0";

  const tradeSummary = trades.map((t: any) => {
    const dateStr = t.opened_at ? new Date(t.opened_at).toISOString().split("T")[0] : "unknown";
    return `${dateStr} ${t.instrument} ${t.direction} P&L:$${t.pnl_dollars} R:R:${t.rr_ratio || "N/A"} Session:${t.session || "N/A"} EmotionBefore:${t.emotion_before || "N/A"} EmotionAfter:${t.emotion_after || "N/A"} Playbook:${t.playbook_name || "none"}`;
  }).join("\n");

  const prompt = `You are a trading psychologist and performance coach. Create a "Trader DNA Profile" for this trader's month of ${month}.

## Monthly Stats
- Total Trades: ${ms.total}, Wins: ${ms.wins}, Win Rate: ${winRate}%
- Total P&L: $${Number(ms.total_pnl).toFixed(2)}
- Average R:R: ${Number(ms.avg_rr).toFixed(2)}
- Bias Alignment Score: ${biasAlignmentScore}% of trades aligned with weekly bias

## Session Breakdown
${sessionRows.map((s: any) => `- ${s.session}: ${s.total} trades, ${Math.round((s.wins / s.total) * 100)}% win rate, $${Number(s.pnl).toFixed(2)} P&L`).join("\n") || "No session data"}

## Emotion Patterns
${emotionRows.map((e: any) => `- Before: ${e.emotion_before || "N/A"}, After: ${e.emotion_after || "N/A"}: ${e.total} trades, ${Math.round((e.wins / e.total) * 100)}% win rate`).join("\n") || "No emotion data"}

## All Trades
${tradeSummary || "No trades this month"}

Respond with JSON only:
{
  "trading_style": "2-3 sentence description of their trading style based on patterns",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "blind_spots": ["blind spot 1", "blind spot 2"],
  "bias_alignment_score": ${biasAlignmentScore},
  "emotional_patterns": "2-3 sentence analysis of emotional patterns and impact on performance",
  "session_performance": "2-3 sentence analysis of which sessions work best and why",
  "goals": ["specific goal 1 for next month", "specific goal 2"]
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const profile: DNAProfile = jsonMatch
    ? JSON.parse(jsonMatch[0])
    : {
        trading_style: "Insufficient data to generate profile.",
        strengths: [],
        blind_spots: [],
        bias_alignment_score: biasAlignmentScore,
        emotional_patterns: "No data available.",
        session_performance: "No data available.",
        goals: [],
      };

  // Store in database
  await sql`
    INSERT INTO trader_insights (user_id, type, insights, trade_count, period_start, period_end)
    VALUES (${userId}, 'dna_profile', ${JSON.stringify(profile)}, ${ms.total}, ${periodStart}::date, (${periodEnd}::date + INTERVAL '1 month' - INTERVAL '1 day')::date)
  `;

  return profile;
}

export async function getLatestInsights(userId: number): Promise<{ insights: TraderInsight[] | null; generated_at: string | null }> {
  const sql = getDb();
  const rows = await sql`
    SELECT insights, generated_at FROM trader_insights
    WHERE user_id = ${userId} AND type = 'pattern'
    ORDER BY generated_at DESC LIMIT 1
  `;
  if (rows.length === 0) return { insights: null, generated_at: null };
  return {
    insights: rows[0].insights as TraderInsight[],
    generated_at: rows[0].generated_at as string,
  };
}

export async function getLatestDNAProfile(userId: number, month: string): Promise<{ profile: DNAProfile | null; generated_at: string | null }> {
  const sql = getDb();
  const periodStart = `${month}-01`;
  const rows = await sql`
    SELECT insights, generated_at FROM trader_insights
    WHERE user_id = ${userId} AND type = 'dna_profile'
    AND period_start = ${periodStart}::date
    ORDER BY generated_at DESC LIMIT 1
  `;
  if (rows.length === 0) return { profile: null, generated_at: null };
  return {
    profile: rows[0].insights as DNAProfile,
    generated_at: rows[0].generated_at as string,
  };
}

export async function canRegenerateInsights(userId: number): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`
    SELECT generated_at FROM trader_insights
    WHERE user_id = ${userId} AND type = 'pattern'
    ORDER BY generated_at DESC LIMIT 1
  `;
  if (rows.length === 0) return true;
  const lastGenerated = new Date(rows[0].generated_at as string);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return lastGenerated < oneDayAgo;
}

export async function canRegenerateDNAProfile(userId: number, month: string): Promise<boolean> {
  const sql = getDb();
  const periodStart = `${month}-01`;
  const rows = await sql`
    SELECT generated_at FROM trader_insights
    WHERE user_id = ${userId} AND type = 'dna_profile'
    AND period_start = ${periodStart}::date
    ORDER BY generated_at DESC LIMIT 1
  `;
  return rows.length === 0;
}
