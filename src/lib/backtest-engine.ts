import { getDb } from "./db";

export interface BacktestParams {
  instrument: string;
  timeframe: string;
  days: number;
  minConfidence: number;
  positionSize: number;
}

export interface BacktestTrade {
  date: string;
  direction: string;
  confidence: number;
  openPrice: number;
  closePrice: number;
  pricePct: number;
  result: "win" | "loss";
}

export interface BacktestResult {
  instrument: string;
  timeframe: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPips: number;
  maxDrawdownPct: number;
  trades: BacktestTrade[];
  equityCurve: { date: string; equity: number }[];
}

export async function runBacktest(params: BacktestParams): Promise<BacktestResult> {
  const { instrument, timeframe, days, minConfidence, positionSize } = params;
  const sql = getDb();

  // Get settled bias outcomes for this instrument+timeframe
  const rows = await sql`
    SELECT
      bo.predicted_direction,
      bo.open_price,
      bo.close_price,
      bo.price_change_pct,
      bo.is_correct,
      bo.generated_at,
      bo.settled_at,
      b.confidence
    FROM bias_outcomes bo
    JOIN biases b ON b.id = bo.bias_id
    WHERE bo.instrument = ${instrument}
      AND bo.timeframe = ${timeframe}
      AND bo.settled_at IS NOT NULL
      AND bo.is_correct IS NOT NULL
      AND bo.open_price IS NOT NULL
      AND bo.close_price IS NOT NULL
      AND bo.generated_at >= NOW() - INTERVAL '1 day' * ${days}
      AND COALESCE(b.confidence, 0) >= ${minConfidence}
      AND bo.predicted_direction != 'neutral'
    ORDER BY bo.generated_at ASC
  `;

  const trades: BacktestTrade[] = [];
  const equityCurve: { date: string; equity: number }[] = [];
  let equity = positionSize;
  let maxEquity = equity;
  let maxDrawdown = 0;
  let wins = 0;
  let losses = 0;
  let totalPips = 0;

  for (const row of rows) {
    const openPrice = Number(row.open_price);
    const closePrice = Number(row.close_price);
    const confidence = Number(row.confidence) || 0;
    const direction = row.predicted_direction as string;
    const isCorrect = row.is_correct as boolean;

    // Calculate P&L percentage
    let pricePct = ((closePrice - openPrice) / openPrice) * 100;
    if (direction === "bearish") pricePct = -pricePct;

    const result: "win" | "loss" = isCorrect ? "win" : "loss";
    if (isCorrect) wins++;
    else losses++;

    // Simple pips estimate
    totalPips += pricePct > 0 ? Math.abs(pricePct * 100) : -Math.abs(pricePct * 100);

    // Update equity
    equity = equity * (1 + pricePct / 100);
    maxEquity = Math.max(maxEquity, equity);
    const drawdown = ((maxEquity - equity) / maxEquity) * 100;
    maxDrawdown = Math.max(maxDrawdown, drawdown);

    const date = new Date(row.generated_at as string).toISOString().split("T")[0];

    trades.push({
      date,
      direction,
      confidence,
      openPrice,
      closePrice,
      pricePct: Math.round(pricePct * 100) / 100,
      result,
    });

    equityCurve.push({ date, equity: Math.round(equity * 100) / 100 });
  }

  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 1000) / 10 : 0;

  return {
    instrument,
    timeframe,
    totalTrades,
    wins,
    losses,
    winRate,
    totalPips: Math.round(totalPips * 100) / 100,
    maxDrawdownPct: Math.round(maxDrawdown * 100) / 100,
    trades,
    equityCurve,
  };
}
