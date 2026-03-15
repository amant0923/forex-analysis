import { getDb } from "./db";
import type { CommunityBias, LeaderboardEntry } from "@/types";

export async function getCommunityBias(instrument: string, timeframe: string): Promise<CommunityBias> {
  const sql = getDb();
  const rows = await sql`
    SELECT direction, COUNT(*)::int as count
    FROM community_bias_votes
    WHERE instrument = ${instrument}
      AND timeframe = ${timeframe}
      AND voted_at >= NOW() - INTERVAL '24 hours'
    GROUP BY direction
  `;

  const result: CommunityBias = { instrument, bullish: 0, bearish: 0, neutral: 0, total: 0 };
  for (const row of rows) {
    const dir = row.direction as "bullish" | "bearish" | "neutral";
    result[dir] = Number(row.count);
    result.total += Number(row.count);
  }
  return result;
}

export async function getAllCommunityBias(timeframe: string): Promise<CommunityBias[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT instrument, direction, COUNT(*)::int as count
    FROM community_bias_votes
    WHERE timeframe = ${timeframe}
      AND voted_at >= NOW() - INTERVAL '24 hours'
    GROUP BY instrument, direction
    ORDER BY instrument
  `;

  const map: Record<string, CommunityBias> = {};
  for (const row of rows) {
    const inst = row.instrument as string;
    if (!map[inst]) {
      map[inst] = { instrument: inst, bullish: 0, bearish: 0, neutral: 0, total: 0 };
    }
    const dir = row.direction as "bullish" | "bearish" | "neutral";
    map[inst][dir] = Number(row.count);
    map[inst].total += Number(row.count);
  }
  return Object.values(map);
}

export async function castVote(
  userId: number,
  instrument: string,
  timeframe: string,
  direction: string
): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO community_bias_votes (user_id, instrument, timeframe, direction, voted_at)
    VALUES (${userId}, ${instrument}, ${timeframe}, ${direction}, NOW())
    ON CONFLICT (user_id, instrument, timeframe)
    DO UPDATE SET direction = ${direction}, voted_at = NOW()
  `;
}

export async function getUserVotes(userId: number): Promise<{ instrument: string; timeframe: string; direction: string }[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT instrument, timeframe, direction
    FROM community_bias_votes
    WHERE user_id = ${userId}
      AND voted_at >= NOW() - INTERVAL '24 hours'
  `;
  return rows as { instrument: string; timeframe: string; direction: string }[];
}

export async function getLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT rank, display_name, total_trades, win_rate, consistency_score, avg_rr, snapshot_date
    FROM leaderboard_snapshots
    WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM leaderboard_snapshots)
    ORDER BY rank ASC
    LIMIT ${limit}
  `;
  return rows.map((r: any) => ({
    rank: Number(r.rank),
    display_name: r.display_name,
    total_trades: Number(r.total_trades),
    win_rate: Number(r.win_rate),
    consistency_score: r.consistency_score !== null ? Number(r.consistency_score) : null,
    avg_rr: r.avg_rr !== null ? Number(r.avg_rr) : null,
    snapshot_date: r.snapshot_date,
  })) as LeaderboardEntry[];
}

export async function updateCommunitySettings(
  userId: number,
  optIn: boolean,
  displayName: string
): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE users
    SET leaderboard_opt_in = ${optIn}, display_name = ${displayName}
    WHERE id = ${userId}
  `;
}

export async function getCommunitySettings(userId: number): Promise<{ leaderboard_opt_in: boolean; display_name: string | null }> {
  const sql = getDb();
  const rows = await sql`
    SELECT leaderboard_opt_in, display_name FROM users WHERE id = ${userId}
  `;
  if (rows.length === 0) {
    return { leaderboard_opt_in: false, display_name: null };
  }
  return {
    leaderboard_opt_in: rows[0].leaderboard_opt_in ?? false,
    display_name: rows[0].display_name ?? null,
  };
}
