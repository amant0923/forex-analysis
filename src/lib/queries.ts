import { getDb } from "./db";
import type { Instrument, Article, ArticleAnalysis, Bias, InstrumentWithBias, EconomicEvent } from "@/types";

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
    // Get the most recent article with its analysis for this instrument
    const latestRows = await sql`
      SELECT a.id, a.title, a.source, aa.impact_direction, aa.mechanism
      FROM articles a
      JOIN article_instruments ai ON a.id = ai.article_id
      LEFT JOIN article_analyses aa ON a.id = aa.article_id AND aa.instrument = ${inst.code}
      WHERE ai.instrument = ${inst.code}
      ORDER BY a.published_at DESC
      LIMIT 1
    `;

    results.push({
      ...inst,
      biases,
      article_count: Number(countRows[0].count),
      latestArticle: latestRows.length > 0
        ? {
            id: latestRows[0].id,
            title: latestRows[0].title,
            source: latestRows[0].source,
            impact_direction: latestRows[0].impact_direction ?? null,
            mechanism: latestRows[0].mechanism ?? null,
          }
        : null,
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

export async function getArticleById(id: number): Promise<Article | null> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM articles WHERE id = ${id}`;
  return rows.length > 0 ? (rows[0] as Article) : null;
}

export async function getArticleAnalyses(articleId: number): Promise<ArticleAnalysis[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM article_analyses
    WHERE article_id = ${articleId}
    ORDER BY instrument
  `;
  return rows as ArticleAnalysis[];
}

export async function getArticleInstruments(articleId: number): Promise<string[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT instrument FROM article_instruments
    WHERE article_id = ${articleId}
    ORDER BY instrument
  `;
  return rows.map((r: any) => r.instrument);
}

export async function getArticlesWithAnalysesForInstrument(
  instrument: string,
  days: number = 7
): Promise<(Article & { analysis: ArticleAnalysis | null })[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT a.*, aa.event, aa.mechanism, aa.impact_direction, aa.impact_timeframes,
           aa.confidence, aa.commentary, aa.generated_at as analysis_generated_at
    FROM articles a
    JOIN article_instruments ai ON a.id = ai.article_id
    LEFT JOIN article_analyses aa ON a.id = aa.article_id AND aa.instrument = ${instrument}
    WHERE ai.instrument = ${instrument}
      AND a.published_at >= NOW() - INTERVAL '1 day' * ${days}
    ORDER BY a.published_at DESC
  `;
  return rows as any;
}

export async function getUpcomingEconomicEvents(limit: number = 7): Promise<EconomicEvent[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM economic_events
    WHERE event_date >= CURRENT_DATE
    ORDER BY event_date ASC, event_time ASC
    LIMIT ${limit}
  `;
  return rows as EconomicEvent[];
}

export async function getEconomicEventsByWeek(
  startDate: string,
  currencies?: string[],
  impacts?: string[]
): Promise<EconomicEvent[]> {
  const sql = getDb();

  if (currencies && currencies.length > 0 && impacts && impacts.length > 0) {
    const rows = await sql`
      SELECT * FROM economic_events
      WHERE event_date >= ${startDate}::date
        AND event_date < ${startDate}::date + INTERVAL '7 days'
        AND currency = ANY(${currencies})
        AND impact = ANY(${impacts})
      ORDER BY event_date ASC, event_time ASC
    `;
    return rows as EconomicEvent[];
  }

  if (currencies && currencies.length > 0) {
    const rows = await sql`
      SELECT * FROM economic_events
      WHERE event_date >= ${startDate}::date
        AND event_date < ${startDate}::date + INTERVAL '7 days'
        AND currency = ANY(${currencies})
      ORDER BY event_date ASC, event_time ASC
    `;
    return rows as EconomicEvent[];
  }

  if (impacts && impacts.length > 0) {
    const rows = await sql`
      SELECT * FROM economic_events
      WHERE event_date >= ${startDate}::date
        AND event_date < ${startDate}::date + INTERVAL '7 days'
        AND impact = ANY(${impacts})
      ORDER BY event_date ASC, event_time ASC
    `;
    return rows as EconomicEvent[];
  }

  const rows = await sql`
    SELECT * FROM economic_events
    WHERE event_date >= ${startDate}::date
      AND event_date < ${startDate}::date + INTERVAL '7 days'
    ORDER BY event_date ASC, event_time ASC
  `;
  return rows as EconomicEvent[];
}

export async function getRecentEconomicEvents(days: number = 1): Promise<EconomicEvent[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM economic_events
    WHERE event_date >= CURRENT_DATE - INTERVAL '1 day' * ${days}
      AND event_date <= CURRENT_DATE + INTERVAL '1 day'
    ORDER BY event_date ASC, event_time ASC
  `;
  return rows as EconomicEvent[];
}
