import { getDb } from "./db";
import type { InstrumentSentiment, MarketSentiment } from "@/types";

const CONFIDENCE_WEIGHTS: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export async function getInstrumentSentiment(instrument: string, days: number = 7): Promise<InstrumentSentiment> {
  const sql = getDb();
  const rows = await sql`
    SELECT aa.impact_direction, aa.confidence, COUNT(*) as cnt
    FROM article_analyses aa
    JOIN articles a ON aa.article_id = a.id
    WHERE aa.instrument = ${instrument}
      AND a.published_at >= NOW() - INTERVAL '1 day' * ${days}
    GROUP BY aa.impact_direction, aa.confidence
  `;

  let bullishWeight = 0;
  let bearishWeight = 0;
  let totalWeight = 0;
  let bullish_count = 0;
  let bearish_count = 0;
  let neutral_count = 0;

  for (const row of rows) {
    const w = CONFIDENCE_WEIGHTS[row.confidence as string] ?? 1;
    const count = Number(row.cnt);
    const weighted = count * w;
    totalWeight += weighted;

    if (row.impact_direction === "bullish") {
      bullishWeight += weighted;
      bullish_count += count;
    } else if (row.impact_direction === "bearish") {
      bearishWeight += weighted;
      bearish_count += count;
    } else {
      neutral_count += count;
    }
  }

  const score = totalWeight > 0
    ? Math.round((bullishWeight / totalWeight) * 100)
    : 50;

  return {
    instrument,
    score,
    bullish_count,
    bearish_count,
    neutral_count,
    total_articles: bullish_count + bearish_count + neutral_count,
  };
}

export async function getMarketSentiment(days: number = 7): Promise<MarketSentiment> {
  const instruments = ["DXY", "EURUSD", "GBPUSD", "USDJPY", "EURJPY", "GBPJPY", "EURGBP", "AUDUSD", "USDCAD", "NZDUSD", "USDCHF", "XAUUSD", "XAGUSD", "GER40", "US30", "NAS100", "SP500", "BTCUSD", "ETHUSD", "USOIL"];
  const sentiments: InstrumentSentiment[] = [];

  for (const inst of instruments) {
    sentiments.push(await getInstrumentSentiment(inst, days));
  }

  let totalWeighted = 0;
  let totalArticles = 0;
  let bullishCount = 0;

  for (const s of sentiments) {
    totalWeighted += s.score * s.total_articles;
    totalArticles += s.total_articles;
    if (s.score > 55) bullishCount++;
  }

  const score = totalArticles > 0 ? Math.round(totalWeighted / totalArticles) : 50;

  const label: MarketSentiment["label"] =
    score <= 20 ? "Extreme Fear" :
    score <= 40 ? "Fear" :
    score <= 60 ? "Neutral" :
    score <= 80 ? "Greed" :
    "Extreme Greed";

  const driver_summary = `${bullishCount} of ${instruments.length} instruments bullish this week`;

  return { score, label, instruments: sentiments, driver_summary };
}
