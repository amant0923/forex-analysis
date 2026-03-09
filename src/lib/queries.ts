import { getDb } from "./db";
import type { Instrument, Article, Bias, InstrumentWithBias } from "@/types";

export async function getInstruments(): Promise<Instrument[]> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM instruments ORDER BY code`;
  return rows as Instrument[];
}

export async function getLatestBiases(instrument: string): Promise<Record<string, Bias | null>> {
  const sql = getDb();
  const timeframes = ["daily", "1week", "1month", "3month"];
  const result: Record<string, Bias | null> = {};

  for (const tf of timeframes) {
    const rows = await sql`
      SELECT * FROM biases
      WHERE instrument = ${instrument} AND timeframe = ${tf}
      ORDER BY generated_at DESC LIMIT 1
    `;
    result[tf] = rows.length > 0 ? (rows[0] as Bias) : null;
  }
  return result;
}

export async function getInstrumentsWithBiases(): Promise<InstrumentWithBias[]> {
  const instruments = await getInstruments();
  const results: InstrumentWithBias[] = [];

  for (const inst of instruments) {
    const biases = await getLatestBiases(inst.code);
    const sql = getDb();
    const countRows = await sql`
      SELECT COUNT(*) as count FROM article_instruments
      WHERE instrument = ${inst.code}
    `;
    results.push({
      ...inst,
      biases,
      article_count: Number(countRows[0].count),
    });
  }
  return results;
}

export async function getArticlesForInstrument(
  instrument: string,
  days: number = 7
): Promise<Article[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT a.* FROM articles a
    JOIN article_instruments ai ON a.id = ai.article_id
    WHERE ai.instrument = ${instrument}
      AND a.published_at >= NOW() - INTERVAL '1 day' * ${days}
    ORDER BY a.published_at DESC
  `;
  return rows as Article[];
}

export async function getArticlesByIds(ids: number[]): Promise<Article[]> {
  if (ids.length === 0) return [];
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM articles WHERE id = ANY(${ids})
    ORDER BY published_at DESC
  `;
  return rows as Article[];
}
