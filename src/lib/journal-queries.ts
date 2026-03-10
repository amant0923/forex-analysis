import { getDb } from "./db";
import type {
  TradingAccount,
  Playbook,
  PlaybookRule,
  PlaybookWithRules,
  Trade,
  TradeWithDetails,
  TradeScreenshot,
  TradeAiReview,
  JournalStats,
} from "@/types";

// --- Trading Accounts ---

export async function getAccounts(userId: number): Promise<TradingAccount[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM trading_accounts
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return rows as TradingAccount[];
}

export async function getAccount(id: number, userId: number): Promise<TradingAccount | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM trading_accounts
    WHERE id = ${id} AND user_id = ${userId}
  `;
  return rows.length > 0 ? (rows[0] as TradingAccount) : null;
}

export async function createAccount(
  userId: number,
  data: { name: string; broker?: string; account_size: number; currency?: string; leverage?: number }
): Promise<TradingAccount> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO trading_accounts (user_id, name, broker, account_size, currency, leverage)
    VALUES (${userId}, ${data.name}, ${data.broker || null}, ${data.account_size}, ${data.currency || "USD"}, ${data.leverage || null})
    RETURNING *
  `;
  return rows[0] as TradingAccount;
}

export async function updateAccount(
  id: number,
  userId: number,
  data: { name?: string; broker?: string; account_size?: number; currency?: string; leverage?: number }
): Promise<TradingAccount | null> {
  const sql = getDb();
  const rows = await sql`
    UPDATE trading_accounts
    SET name = COALESCE(${data.name ?? null}, name),
        broker = COALESCE(${data.broker ?? null}, broker),
        account_size = COALESCE(${data.account_size ?? null}, account_size),
        currency = COALESCE(${data.currency ?? null}, currency),
        leverage = COALESCE(${data.leverage ?? null}, leverage),
        updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `;
  return rows.length > 0 ? (rows[0] as TradingAccount) : null;
}

export async function deleteAccount(id: number, userId: number): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`
    DELETE FROM trading_accounts
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING id
  `;
  return rows.length > 0;
}

// --- Playbooks ---

export async function getPlaybooks(userId: number): Promise<Playbook[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM playbooks WHERE user_id = ${userId} ORDER BY created_at DESC
  `;
  return rows as Playbook[];
}

export async function getPlaybookWithRules(id: number, userId: number): Promise<PlaybookWithRules | null> {
  const sql = getDb();
  const pbRows = await sql`
    SELECT * FROM playbooks WHERE id = ${id} AND user_id = ${userId}
  `;
  if (pbRows.length === 0) return null;

  const ruleRows = await sql`
    SELECT * FROM playbook_rules WHERE playbook_id = ${id} ORDER BY sort_order
  `;

  return {
    ...(pbRows[0] as Playbook),
    rules: ruleRows as PlaybookRule[],
  };
}

export async function createPlaybook(
  userId: number,
  data: { name: string; description?: string; instrument?: string; timeframe?: string; rules: { category: string; rule_text: string }[] }
): Promise<PlaybookWithRules> {
  const sql = getDb();
  const pbRows = await sql`
    INSERT INTO playbooks (user_id, name, description, instrument, timeframe)
    VALUES (${userId}, ${data.name}, ${data.description || null}, ${data.instrument || null}, ${data.timeframe || null})
    RETURNING *
  `;
  const pb = pbRows[0] as Playbook;

  const rules: PlaybookRule[] = [];
  for (let i = 0; i < data.rules.length; i++) {
    const r = data.rules[i];
    const ruleRows = await sql`
      INSERT INTO playbook_rules (playbook_id, category, rule_text, sort_order)
      VALUES (${pb.id}, ${r.category}, ${r.rule_text}, ${i})
      RETURNING *
    `;
    rules.push(ruleRows[0] as PlaybookRule);
  }

  return { ...pb, rules };
}

export async function updatePlaybook(
  id: number,
  userId: number,
  data: { name?: string; description?: string; instrument?: string; timeframe?: string; rules?: { category: string; rule_text: string }[] }
): Promise<PlaybookWithRules | null> {
  const sql = getDb();
  const pbRows = await sql`
    UPDATE playbooks
    SET name = COALESCE(${data.name ?? null}, name),
        description = COALESCE(${data.description ?? null}, description),
        instrument = COALESCE(${data.instrument ?? null}, instrument),
        timeframe = COALESCE(${data.timeframe ?? null}, timeframe),
        updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `;
  if (pbRows.length === 0) return null;

  if (data.rules) {
    await sql`DELETE FROM playbook_rules WHERE playbook_id = ${id}`;
    for (let i = 0; i < data.rules.length; i++) {
      const r = data.rules[i];
      await sql`
        INSERT INTO playbook_rules (playbook_id, category, rule_text, sort_order)
        VALUES (${id}, ${r.category}, ${r.rule_text}, ${i})
      `;
    }
  }

  return getPlaybookWithRules(id, userId);
}

export async function deletePlaybook(id: number, userId: number): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`
    DELETE FROM playbooks WHERE id = ${id} AND user_id = ${userId} RETURNING id
  `;
  return rows.length > 0;
}

export async function getPlaybooksWithStats(userId: number) {
  const sql = getDb();
  const rows = await sql`
    SELECT p.*,
      COUNT(t.id)::int as trade_count,
      COUNT(CASE WHEN t.pnl_dollars > 0 THEN 1 END)::int as wins,
      COALESCE(SUM(t.pnl_dollars), 0)::decimal as total_pnl,
      COALESCE(AVG(CASE WHEN t.rr_ratio IS NOT NULL THEN t.rr_ratio END), 0)::decimal as avg_rr
    FROM playbooks p
    LEFT JOIN trades t ON t.playbook_id = p.id
    WHERE p.user_id = ${userId}
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `;
  return rows;
}

// --- Trades ---

export async function getTrades(
  userId: number,
  options: {
    instrument?: string;
    playbook_id?: number;
    start_date?: string;
    end_date?: string;
    direction?: string;
    limit?: number;
    offset?: number;
    history_days?: number | null;
  } = {}
): Promise<Trade[]> {
  const sql = getDb();

  const rows = await sql`
    SELECT * FROM trades
    WHERE user_id = ${userId}
    ${options.instrument ? sql`AND instrument = ${options.instrument}` : sql``}
    ${options.playbook_id ? sql`AND playbook_id = ${options.playbook_id}` : sql``}
    ${options.direction ? sql`AND direction = ${options.direction}` : sql``}
    ${options.start_date ? sql`AND opened_at >= ${options.start_date}` : sql``}
    ${options.end_date ? sql`AND opened_at <= ${options.end_date}` : sql``}
    ${options.history_days ? sql`AND opened_at >= NOW() - INTERVAL '1 day' * ${options.history_days}` : sql``}
    ORDER BY opened_at DESC
    LIMIT ${options.limit || 50}
    OFFSET ${options.offset || 0}
  `;
  return rows as Trade[];
}

export async function getTradeWithDetails(id: number, userId: number): Promise<TradeWithDetails | null> {
  const sql = getDb();
  const tradeRows = await sql`
    SELECT t.*,
      p.name as playbook_name,
      a.name as account_name
    FROM trades t
    LEFT JOIN playbooks p ON p.id = t.playbook_id
    LEFT JOIN trading_accounts a ON a.id = t.account_id
    WHERE t.id = ${id} AND t.user_id = ${userId}
  `;
  if (tradeRows.length === 0) return null;

  const screenshots = await sql`
    SELECT * FROM trade_screenshots WHERE trade_id = ${id} ORDER BY uploaded_at
  `;
  const reviewRows = await sql`
    SELECT * FROM trade_ai_reviews WHERE trade_id = ${id}
  `;

  return {
    ...(tradeRows[0] as Trade),
    playbook_name: (tradeRows[0] as any).playbook_name ?? null,
    account_name: (tradeRows[0] as any).account_name ?? null,
    screenshots: screenshots as TradeScreenshot[],
    ai_review: reviewRows.length > 0 ? (reviewRows[0] as TradeAiReview) : null,
  };
}

export async function createTrade(userId: number, data: Partial<Trade>): Promise<Trade> {
  const sql = getDb();
  const rows = await sql`
    INSERT INTO trades (
      user_id, account_id, playbook_id, instrument, direction,
      entry_price, exit_price, stop_loss, take_profit, lot_size,
      opened_at, closed_at, pnl_pips, pnl_ticks, pnl_dollars,
      rr_ratio, account_pct_impact, session, timeframe_traded,
      emotion_before, emotion_after, rule_adherence_score,
      rule_adherence_details, notes
    ) VALUES (
      ${userId}, ${data.account_id!}, ${data.playbook_id || null},
      ${data.instrument!}, ${data.direction!},
      ${data.entry_price!}, ${data.exit_price || null},
      ${data.stop_loss || null}, ${data.take_profit || null},
      ${data.lot_size!}, ${data.opened_at!}, ${data.closed_at || null},
      ${data.pnl_pips || null}, ${data.pnl_ticks || null},
      ${data.pnl_dollars || null}, ${data.rr_ratio || null},
      ${data.account_pct_impact || null}, ${data.session || null},
      ${data.timeframe_traded || null}, ${data.emotion_before || null},
      ${data.emotion_after || null}, ${data.rule_adherence_score || null},
      ${data.rule_adherence_details ? JSON.stringify(data.rule_adherence_details) : null},
      ${data.notes || null}
    ) RETURNING *
  `;
  return rows[0] as Trade;
}

export async function updateTrade(id: number, userId: number, data: Partial<Trade>): Promise<Trade | null> {
  const sql = getDb();
  const rows = await sql`
    UPDATE trades SET
      exit_price = COALESCE(${data.exit_price ?? null}, exit_price),
      stop_loss = COALESCE(${data.stop_loss ?? null}, stop_loss),
      take_profit = COALESCE(${data.take_profit ?? null}, take_profit),
      closed_at = COALESCE(${data.closed_at ?? null}, closed_at),
      pnl_pips = COALESCE(${data.pnl_pips ?? null}, pnl_pips),
      pnl_ticks = COALESCE(${data.pnl_ticks ?? null}, pnl_ticks),
      pnl_dollars = COALESCE(${data.pnl_dollars ?? null}, pnl_dollars),
      rr_ratio = COALESCE(${data.rr_ratio ?? null}, rr_ratio),
      account_pct_impact = COALESCE(${data.account_pct_impact ?? null}, account_pct_impact),
      emotion_after = COALESCE(${data.emotion_after ?? null}, emotion_after),
      notes = COALESCE(${data.notes ?? null}, notes),
      updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `;
  return rows.length > 0 ? (rows[0] as Trade) : null;
}

export async function deleteTrade(id: number, userId: number): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`
    DELETE FROM trades WHERE id = ${id} AND user_id = ${userId} RETURNING id
  `;
  return rows.length > 0;
}

export async function getJournalStats(userId: number, historyDays: number | null): Promise<JournalStats> {
  const sql = getDb();

  const rows = await sql`
    SELECT
      COUNT(*)::int as total_trades,
      COUNT(CASE WHEN pnl_dollars > 0 THEN 1 END)::int as wins,
      COALESCE(AVG(CASE WHEN rr_ratio IS NOT NULL THEN rr_ratio END), 0)::decimal as avg_rr,
      COALESCE(SUM(CASE WHEN closed_at >= CURRENT_DATE THEN pnl_dollars ELSE 0 END), 0)::decimal as pnl_today,
      COALESCE(SUM(CASE WHEN closed_at >= CURRENT_DATE - INTERVAL '7 days' THEN pnl_dollars ELSE 0 END), 0)::decimal as pnl_week,
      COALESCE(SUM(CASE WHEN closed_at >= CURRENT_DATE - INTERVAL '30 days' THEN pnl_dollars ELSE 0 END), 0)::decimal as pnl_month
    FROM trades
    WHERE user_id = ${userId} AND closed_at IS NOT NULL
    ${historyDays ? sql`AND opened_at >= NOW() - INTERVAL '1 day' * ${historyDays}` : sql``}
  `;

  const r = rows[0];
  return {
    total_trades: r.total_trades,
    win_rate: r.total_trades > 0 ? (r.wins / r.total_trades) * 100 : 0,
    avg_rr: Number(r.avg_rr),
    pnl_today: Number(r.pnl_today),
    pnl_week: Number(r.pnl_week),
    pnl_month: Number(r.pnl_month),
  };
}
