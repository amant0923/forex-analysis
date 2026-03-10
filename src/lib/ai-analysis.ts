import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "./db";
import type { Trade, TradeAiReview, UserTier } from "@/types";

const client = new Anthropic();

interface AnalysisContext {
  trade: Trade;
  playbook_rules?: { category: string; rule_text: string; followed: boolean }[];
  bias_data?: { timeframe: string; direction: string; summary: string }[];
  economic_events?: { event_name: string; currency: string; impact: string; actual: string; forecast: string }[];
}

async function gatherContext(trade: Trade, tier: UserTier): Promise<AnalysisContext> {
  const sql = getDb();
  const ctx: AnalysisContext = { trade };

  if (trade.playbook_id && trade.rule_adherence_details) {
    const rules = await sql`
      SELECT * FROM playbook_rules WHERE playbook_id = ${trade.playbook_id} ORDER BY sort_order
    `;
    ctx.playbook_rules = rules.map((r: any) => ({
      category: r.category,
      rule_text: r.rule_text,
      followed: trade.rule_adherence_details?.find((d: any) => d.rule_id === r.id)?.followed ?? false,
    }));
  }

  if (tier !== "free") {
    const biases = await sql`
      SELECT timeframe, direction, summary FROM biases
      WHERE instrument = ${trade.instrument}
      AND generated_at <= ${trade.opened_at}
      ORDER BY generated_at DESC
      LIMIT 4
    `;
    ctx.bias_data = biases as any[];
  }

  if (tier !== "free" && trade.opened_at) {
    const tradeDate = new Date(String(trade.opened_at)).toISOString().split("T")[0];
    const events = await sql`
      SELECT event_name, currency, impact, actual, forecast
      FROM economic_events
      WHERE event_date = ${tradeDate}
      AND impact IN ('high', 'medium')
    `;
    ctx.economic_events = events as any[];
  }

  return ctx;
}

function buildPrompt(ctx: AnalysisContext): string {
  let prompt = `You are an expert trading analyst. Analyze this trade and provide structured feedback.

## Trade Data
- Instrument: ${ctx.trade.instrument}
- Direction: ${ctx.trade.direction}
- Entry: ${ctx.trade.entry_price}, Exit: ${ctx.trade.exit_price || "still open"}
- SL: ${ctx.trade.stop_loss || "none"}, TP: ${ctx.trade.take_profit || "none"}
- Lot Size: ${ctx.trade.lot_size}
- P&L: ${ctx.trade.pnl_dollars !== null ? "$" + ctx.trade.pnl_dollars : "N/A"} (${ctx.trade.pnl_pips !== null ? ctx.trade.pnl_pips + " pips" : ctx.trade.pnl_ticks + " ticks"})
- R:R: ${ctx.trade.rr_ratio || "N/A"}
- Session: ${ctx.trade.session || "not specified"}
- Timeframe: ${ctx.trade.timeframe_traded || "not specified"}
- Emotion Before: ${ctx.trade.emotion_before || "not specified"}
- Emotion After: ${ctx.trade.emotion_after || "not specified"}
- Notes: ${ctx.trade.notes || "none"}`;

  if (ctx.playbook_rules?.length) {
    prompt += `\n\n## Playbook Rules\n`;
    ctx.playbook_rules.forEach((r) => {
      prompt += `- [${r.followed ? "FOLLOWED" : "BROKEN"}] (${r.category}): ${r.rule_text}\n`;
    });
    prompt += `Rule Adherence Score: ${ctx.trade.rule_adherence_score}%`;
  }

  if (ctx.bias_data?.length) {
    prompt += `\n\n## ForexPulse Fundamental Bias (at time of trade)\n`;
    ctx.bias_data.forEach((b) => {
      prompt += `- ${b.timeframe}: ${b.direction} — ${b.summary}\n`;
    });
  }

  if (ctx.economic_events?.length) {
    prompt += `\n\n## Economic Events on Trade Day\n`;
    ctx.economic_events.forEach((e) => {
      prompt += `- ${e.event_name} (${e.currency}, ${e.impact} impact): Actual=${e.actual || "N/A"}, Forecast=${e.forecast || "N/A"}\n`;
    });
  }

  prompt += `\n\nRespond in JSON format only (no markdown code fences):
{
  "verdict": "good" | "acceptable" | "poor",
  "bias_alignment": "with" | "against" | "neutral",
  "bias_alignment_explanation": "...",
  "rule_adherence_review": "...",
  "risk_assessment": "...",
  "timing_analysis": "...",
  "psychology_flag": "..." or null,
  "suggestions": ["...", "...", "..."]
}`;

  return prompt;
}

export async function analyzeTradeWithAI(tradeId: number, userId: number, tier: UserTier): Promise<TradeAiReview> {
  const sql = getDb();

  const tradeRows = await sql`SELECT * FROM trades WHERE id = ${tradeId} AND user_id = ${userId}`;
  if (tradeRows.length === 0) throw new Error("Trade not found");
  const trade = tradeRows[0] as Trade;

  const ctx = await gatherContext(trade, tier);
  const prompt = buildPrompt(ctx);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse AI response");
  const result = JSON.parse(jsonMatch[0]);

  const reviewRows = await sql`
    INSERT INTO trade_ai_reviews (
      trade_id, verdict, bias_alignment, bias_alignment_explanation,
      rule_adherence_review, risk_assessment, timing_analysis,
      psychology_flag, suggestions, bias_snapshot, events_snapshot
    ) VALUES (
      ${tradeId}, ${result.verdict}, ${result.bias_alignment},
      ${result.bias_alignment_explanation || null},
      ${result.rule_adherence_review || null}, ${result.risk_assessment || null},
      ${result.timing_analysis || null}, ${result.psychology_flag || null},
      ${JSON.stringify(result.suggestions || [])},
      ${ctx.bias_data ? JSON.stringify(ctx.bias_data) : null},
      ${ctx.economic_events ? JSON.stringify(ctx.economic_events) : null}
    )
    ON CONFLICT (trade_id) DO UPDATE SET
      verdict = EXCLUDED.verdict,
      bias_alignment = EXCLUDED.bias_alignment,
      bias_alignment_explanation = EXCLUDED.bias_alignment_explanation,
      rule_adherence_review = EXCLUDED.rule_adherence_review,
      risk_assessment = EXCLUDED.risk_assessment,
      timing_analysis = EXCLUDED.timing_analysis,
      psychology_flag = EXCLUDED.psychology_flag,
      suggestions = EXCLUDED.suggestions,
      bias_snapshot = EXCLUDED.bias_snapshot,
      events_snapshot = EXCLUDED.events_snapshot,
      generated_at = NOW()
    RETURNING *
  `;

  return reviewRows[0] as TradeAiReview;
}
