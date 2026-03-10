import { getDb } from "./db";
import type { UserTier, TierLimits } from "@/types";

const TIER_LIMITS: Record<UserTier, TierLimits> = {
  free: {
    max_trades_per_day: null,
    max_playbooks: null,
    max_screenshots_per_trade: 10,
    max_accounts: null,
    max_ai_analyses_per_day: null,
    history_days: null,
    has_chat: true,
    has_weekly_report: true,
    has_monthly_report: true,
    has_csv_export: true,
  },
  essential: {
    max_trades_per_day: null,
    max_playbooks: null,
    max_screenshots_per_trade: 10,
    max_accounts: null,
    max_ai_analyses_per_day: null,
    history_days: null,
    has_chat: true,
    has_weekly_report: true,
    has_monthly_report: true,
    has_csv_export: true,
  },
  premium: {
    max_trades_per_day: null,
    max_playbooks: null,
    max_screenshots_per_trade: 10,
    max_accounts: null,
    max_ai_analyses_per_day: null,
    history_days: null,
    has_chat: true,
    has_weekly_report: true,
    has_monthly_report: true,
    has_csv_export: true,
  },
};

export function getTierLimits(tier: UserTier): TierLimits {
  return TIER_LIMITS[tier] || TIER_LIMITS.free;
}

export function isUnlimited(limit: number | null): boolean {
  return limit === null;
}

export async function countTodayTrades(userId: number): Promise<number> {
  const sql = getDb();
  const rows = await sql`
    SELECT COUNT(*)::int as count FROM trades
    WHERE user_id = ${userId}
    AND created_at >= CURRENT_DATE
  `;
  return rows[0]?.count || 0;
}

export async function countTodayAnalyses(userId: number): Promise<number> {
  const sql = getDb();
  const rows = await sql`
    SELECT COUNT(*)::int as count FROM trade_ai_reviews r
    JOIN trades t ON t.id = r.trade_id
    WHERE t.user_id = ${userId}
    AND r.generated_at >= CURRENT_DATE
  `;
  return rows[0]?.count || 0;
}

export async function countPlaybooks(userId: number): Promise<number> {
  const sql = getDb();
  const rows = await sql`
    SELECT COUNT(*)::int as count FROM playbooks
    WHERE user_id = ${userId}
  `;
  return rows[0]?.count || 0;
}

export async function countAccounts(userId: number): Promise<number> {
  const sql = getDb();
  const rows = await sql`
    SELECT COUNT(*)::int as count FROM trading_accounts
    WHERE user_id = ${userId}
  `;
  return rows[0]?.count || 0;
}

export async function countScreenshots(tradeId: number): Promise<number> {
  const sql = getDb();
  const rows = await sql`
    SELECT COUNT(*)::int as count FROM trade_screenshots
    WHERE trade_id = ${tradeId}
  `;
  return rows[0]?.count || 0;
}
