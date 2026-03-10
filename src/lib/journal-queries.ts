import { getDb } from "./db";
import type { TradingAccount, Playbook, PlaybookRule, PlaybookWithRules } from "@/types";

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
