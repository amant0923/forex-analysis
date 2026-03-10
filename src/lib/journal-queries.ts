import { getDb } from "./db";
import type { TradingAccount } from "@/types";

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
