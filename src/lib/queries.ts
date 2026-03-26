import { getDb } from "./db";
import type { Instrument, Article, ArticleAnalysis, Bias, InstrumentWithBias, InstrumentQuote, EconomicEvent, TrackRecordStats, BiasOutcome, LiveArticle } from "@/types";
import { getInstrumentSentiment } from "./sentiment";

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

export async function getInstrumentQuotes(): Promise<Record<string, InstrumentQuote>> {
  const sql = getDb();
  const rows = await sql`SELECT * FROM instrument_quotes`;
  const map: Record<string, InstrumentQuote> = {};
  for (const row of rows) {
    map[row.instrument as string] = {
      instrument: row.instrument as string,
      price: Number(row.price),
      change: Number(row.change),
      change_pct: Number(row.change_pct),
      day_high: Number(row.day_high),
      day_low: Number(row.day_low),
      updated_at: row.updated_at as string,
    };
  }
  return map;
}

export async function getInstrumentsWithBiases(): Promise<InstrumentWithBias[]> {
  const instruments = await getInstruments();
  const quotes = await getInstrumentQuotes();
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
      quote: quotes[inst.code] ?? null,
      sentiment: await getInstrumentSentiment(inst.code),
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

export async function getRecentArticlesAll(
  days: number = 7,
  limit: number = 30
): Promise<(Article & { instruments: string[]; analyses: { instrument: string; impact_direction: string; confidence: string }[] })[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT a.*,
      COALESCE(
        (SELECT array_agg(DISTINCT ai2.instrument ORDER BY ai2.instrument) FROM article_instruments ai2 WHERE ai2.article_id = a.id),
        ARRAY[]::text[]
      ) as instruments,
      COALESCE(
        (SELECT json_agg(json_build_object('instrument', aa.instrument, 'impact_direction', aa.impact_direction, 'confidence', aa.confidence))
         FROM article_analyses aa WHERE aa.article_id = a.id),
        '[]'::json
      ) as analyses
    FROM articles a
    WHERE a.published_at >= NOW() - INTERVAL '1 day' * ${days}
    ORDER BY a.published_at DESC
    LIMIT ${limit}
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

export async function getTrackRecordStats(): Promise<TrackRecordStats> {
  const sql = getDb();

  // Overall stats
  const overallRows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE is_correct IS NOT NULL) as total,
      COUNT(*) FILTER (WHERE is_correct = true) as correct,
      MIN(generated_at) FILTER (WHERE is_correct IS NOT NULL) as first_prediction
    FROM bias_outcomes
  `;
  const total = Number(overallRows[0].total);
  const correct = Number(overallRows[0].correct);

  // Current streak
  const streakRows = await sql`
    SELECT is_correct FROM bias_outcomes
    WHERE is_correct IS NOT NULL
    ORDER BY settled_at DESC
  `;
  let current_streak = 0;
  let streak_type: "win" | "loss" | null = null;
  if (streakRows.length > 0) {
    streak_type = streakRows[0].is_correct ? "win" : "loss";
    for (const row of streakRows) {
      if (row.is_correct === (streak_type === "win")) {
        current_streak++;
      } else {
        break;
      }
    }
  }

  // By timeframe
  const tfRows = await sql`
    SELECT timeframe,
      COUNT(*) FILTER (WHERE is_correct IS NOT NULL) as total,
      COUNT(*) FILTER (WHERE is_correct = true) as correct
    FROM bias_outcomes
    GROUP BY timeframe
    ORDER BY
      CASE timeframe
        WHEN 'daily' THEN 1
        WHEN '1week' THEN 2
        WHEN '1month' THEN 3
        WHEN '3month' THEN 4
      END
  `;

  // By instrument
  const instRows = await sql`
    SELECT instrument,
      COUNT(*) FILTER (WHERE is_correct IS NOT NULL) as total,
      COUNT(*) FILTER (WHERE is_correct = true) as correct
    FROM bias_outcomes
    GROUP BY instrument
    ORDER BY instrument
  `;

  // Recent settled (last 50)
  const recentRows = await sql`
    SELECT * FROM bias_outcomes
    WHERE is_correct IS NOT NULL
    ORDER BY settled_at DESC
    LIMIT 50
  `;

  // Pending
  const pendingRows = await sql`
    SELECT * FROM bias_outcomes
    WHERE settled_at IS NULL
    ORDER BY settles_at ASC
    LIMIT 30
  `;

  return {
    overall: {
      total,
      correct,
      accuracy: total > 0 ? Math.round((correct / total) * 1000) / 10 : 0,
      current_streak,
      streak_type,
      first_prediction: overallRows[0].first_prediction as string | null,
    },
    by_timeframe: tfRows.map((r: any) => ({
      timeframe: r.timeframe,
      total: Number(r.total),
      correct: Number(r.correct),
      accuracy: Number(r.total) > 0 ? Math.round((Number(r.correct) / Number(r.total)) * 1000) / 10 : 0,
    })),
    by_instrument: instRows.map((r: any) => ({
      instrument: r.instrument,
      total: Number(r.total),
      correct: Number(r.correct),
      accuracy: Number(r.total) > 0 ? Math.round((Number(r.correct) / Number(r.total)) * 1000) / 10 : 0,
    })),
    recent: recentRows.map((r: any) => ({
      ...r,
      open_price: Number(r.open_price),
      close_price: r.close_price ? Number(r.close_price) : null,
      price_change_pct: r.price_change_pct ? Number(r.price_change_pct) : null,
    })) as BiasOutcome[],
    pending: pendingRows.map((r: any) => ({
      ...r,
      open_price: Number(r.open_price),
      close_price: r.close_price ? Number(r.close_price) : null,
      price_change_pct: r.price_change_pct ? Number(r.price_change_pct) : null,
    })) as BiasOutcome[],
  };
}

export async function getLiveFeedArticles(instrument?: string): Promise<LiveArticle[]> {
  const sql = getDb();

  if (instrument) {
    const rows = await sql`
      SELECT a.id, a.title, a.source, a.summary, a.url, a.channel_posted_at,
             td.source_tier,
             COALESCE(
               (SELECT json_agg(json_build_object(
                 'code', aa.instrument,
                 'direction', aa.impact_direction,
                 'confidence', aa.confidence
               )) FROM article_analyses aa WHERE aa.article_id = a.id),
               '[]'::json
             ) as instruments
      FROM articles a
      LEFT JOIN telegram_drafts td ON td.article_id = a.id
      WHERE a.posted_to_channel = TRUE
        AND a.channel_posted_at > NOW() - INTERVAL '24 hours'
        AND EXISTS (
          SELECT 1 FROM article_instruments ai
          WHERE ai.article_id = a.id AND ai.instrument = ${instrument}
        )
      ORDER BY a.channel_posted_at DESC
      LIMIT 50
    `;
    return rows as LiveArticle[];
  }

  const rows = await sql`
    SELECT a.id, a.title, a.source, a.summary, a.url, a.channel_posted_at,
           td.source_tier,
           COALESCE(
             (SELECT json_agg(json_build_object(
               'code', aa.instrument,
               'direction', aa.impact_direction,
               'confidence', aa.confidence
             )) FROM article_analyses aa WHERE aa.article_id = a.id),
             '[]'::json
           ) as instruments
    FROM articles a
    LEFT JOIN telegram_drafts td ON td.article_id = a.id
    WHERE a.posted_to_channel = TRUE
      AND a.channel_posted_at > NOW() - INTERVAL '24 hours'
    ORDER BY a.channel_posted_at DESC
    LIMIT 50
  `;
  return rows as LiveArticle[];
}

export async function getPollerHealth(): Promise<{ last_run: string; articles_found: number } | null> {
  const sql = getDb();
  const rows = await sql`SELECT last_run, articles_found FROM poller_heartbeat WHERE id = 1`;
  if (rows.length === 0) return null;
  return { last_run: rows[0].last_run as string, articles_found: Number(rows[0].articles_found) };
}
