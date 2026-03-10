# Trading Journal + AI Trade Analyst — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a trading journal with AI-powered trade analysis to ForexPulse, with 3-tier subscription gating.

**Architecture:** New database tables + API routes + pages added to existing Next.js app. Raw SQL queries via Neon serverless client (matching existing pattern). All new pages under `(dashboard)` route group. AI features use Claude Sonnet via `@anthropic-ai/sdk`.

**Tech Stack:** Next.js 16, React 19, Neon Postgres, NextAuth v4, Tailwind CSS 4, shadcn/ui, Vercel Blob, Anthropic SDK

**Spec:** `docs/superpowers/specs/2026-03-10-trading-journal-design.md`

---

## Chunk 1: Foundation (Database + Auth + Types)

### Task 1: Database Migration — New Tables

**Files:**
- Create: `drizzle/0005_trading_journal.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Trading accounts
CREATE TABLE trading_accounts (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  broker TEXT,
  account_size DECIMAL(18, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  leverage INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_trading_accounts_user ON trading_accounts(user_id);

-- Playbooks
CREATE TABLE playbooks (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  instrument TEXT REFERENCES instruments(code) ON DELETE SET NULL,
  timeframe TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_playbooks_user ON playbooks(user_id);

-- Playbook rules
CREATE TABLE playbook_rules (
  id SERIAL PRIMARY KEY,
  playbook_id INT NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('entry', 'exit', 'risk')),
  rule_text TEXT NOT NULL,
  sort_order INT DEFAULT 0
);
CREATE INDEX idx_playbook_rules_playbook ON playbook_rules(playbook_id, sort_order);

-- Trades
CREATE TABLE trades (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id INT NOT NULL REFERENCES trading_accounts(id) ON DELETE RESTRICT,
  playbook_id INT REFERENCES playbooks(id) ON DELETE SET NULL,
  instrument TEXT NOT NULL REFERENCES instruments(code),
  direction TEXT NOT NULL CHECK (direction IN ('buy', 'sell')),
  entry_price DECIMAL(18, 6) NOT NULL,
  exit_price DECIMAL(18, 6),
  stop_loss DECIMAL(18, 6),
  take_profit DECIMAL(18, 6),
  lot_size DECIMAL(10, 4) NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  pnl_pips DECIMAL(10, 2),
  pnl_ticks DECIMAL(10, 2),
  pnl_dollars DECIMAL(18, 2),
  rr_ratio DECIMAL(6, 2),
  account_pct_impact DECIMAL(8, 4),
  session TEXT CHECK (session IN ('london', 'new_york', 'asia', 'overlap')),
  timeframe_traded TEXT,
  emotion_before TEXT CHECK (emotion_before IN ('confident', 'calm', 'anxious', 'FOMO', 'revenge', 'uncertain')),
  emotion_after TEXT CHECK (emotion_after IN ('satisfied', 'frustrated', 'relieved', 'regretful', 'neutral')),
  rule_adherence_score INT,
  rule_adherence_details JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (pnl_pips IS NULL OR pnl_ticks IS NULL)
);
CREATE INDEX idx_trades_user_opened ON trades(user_id, opened_at DESC);
CREATE INDEX idx_trades_user_instrument ON trades(user_id, instrument);
CREATE INDEX idx_trades_user_playbook ON trades(user_id, playbook_id);
CREATE INDEX idx_trades_user_closed ON trades(user_id, closed_at DESC);

-- Trade screenshots
CREATE TABLE trade_screenshots (
  id SERIAL PRIMARY KEY,
  trade_id INT NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  label TEXT CHECK (label IN ('entry', 'exit', 'setup', 'other')),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_trade_screenshots_trade ON trade_screenshots(trade_id);

-- AI reviews
CREATE TABLE trade_ai_reviews (
  id SERIAL PRIMARY KEY,
  trade_id INT NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  verdict TEXT CHECK (verdict IN ('good', 'acceptable', 'poor')),
  bias_alignment TEXT CHECK (bias_alignment IN ('with', 'against', 'neutral')),
  bias_alignment_explanation TEXT,
  rule_adherence_review TEXT,
  risk_assessment TEXT,
  timing_analysis TEXT,
  psychology_flag TEXT,
  suggestions JSONB,
  bias_snapshot JSONB,
  events_snapshot JSONB,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trade_id)
);

-- Chat messages
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id, created_at DESC);

-- Chat summaries for context windowing
CREATE TABLE chat_summaries (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  messages_covered_up_to INT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] **Step 2: Run migration against database**

Run: `psql $DATABASE_URL -f drizzle/0005_trading_journal.sql`
Expected: All tables created without errors.

- [ ] **Step 3: Commit**

```bash
git add drizzle/0005_trading_journal.sql
git commit -m "feat: add trading journal database tables"
```

---

### Task 2: TypeScript Types for Journal

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add new types**

Append to `src/types/index.ts`:

```typescript
// Trading Journal Types

export interface TradingAccount {
  id: number;
  user_id: number;
  name: string;
  broker: string | null;
  account_size: number;
  currency: string;
  leverage: number | null;
  created_at: string;
  updated_at: string;
}

export interface Playbook {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  instrument: string | null;
  timeframe: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaybookRule {
  id: number;
  playbook_id: number;
  category: "entry" | "exit" | "risk";
  rule_text: string;
  sort_order: number;
}

export interface PlaybookWithRules extends Playbook {
  rules: PlaybookRule[];
}

export interface Trade {
  id: number;
  user_id: number;
  account_id: number;
  playbook_id: number | null;
  instrument: string;
  direction: "buy" | "sell";
  entry_price: number;
  exit_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  lot_size: number;
  opened_at: string;
  closed_at: string | null;
  pnl_pips: number | null;
  pnl_ticks: number | null;
  pnl_dollars: number | null;
  rr_ratio: number | null;
  account_pct_impact: number | null;
  session: "london" | "new_york" | "asia" | "overlap" | null;
  timeframe_traded: string | null;
  emotion_before: "confident" | "calm" | "anxious" | "FOMO" | "revenge" | "uncertain" | null;
  emotion_after: "satisfied" | "frustrated" | "relieved" | "regretful" | "neutral" | null;
  rule_adherence_score: number | null;
  rule_adherence_details: { rule_id: number; followed: boolean }[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradeScreenshot {
  id: number;
  trade_id: number;
  url: string;
  label: "entry" | "exit" | "setup" | "other" | null;
  uploaded_at: string;
}

export interface TradeAiReview {
  id: number;
  trade_id: number;
  verdict: "good" | "acceptable" | "poor";
  bias_alignment: "with" | "against" | "neutral";
  bias_alignment_explanation: string | null;
  rule_adherence_review: string | null;
  risk_assessment: string | null;
  timing_analysis: string | null;
  psychology_flag: string | null;
  suggestions: string[];
  bias_snapshot: Record<string, unknown> | null;
  events_snapshot: Record<string, unknown> | null;
  generated_at: string;
}

export interface TradeWithDetails extends Trade {
  screenshots: TradeScreenshot[];
  ai_review: TradeAiReview | null;
  playbook_name: string | null;
  account_name: string | null;
}

export interface JournalStats {
  total_trades: number;
  win_rate: number;
  avg_rr: number;
  pnl_today: number;
  pnl_week: number;
  pnl_month: number;
}

export type UserTier = "free" | "essential" | "premium";

export interface TierLimits {
  max_trades_per_day: number | null;
  max_playbooks: number | null;
  max_screenshots_per_trade: number;
  max_accounts: number | null;
  max_ai_analyses_per_day: number | null;
  history_days: number | null;
  has_chat: boolean;
  has_weekly_report: boolean;
  has_monthly_report: boolean;
  has_csv_export: boolean;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add TypeScript types for trading journal"
```

---

### Task 3: Auth — Add Tier to Session

**Files:**
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Extend auth to include tier in JWT and session**

In `src/lib/auth.ts`, update the `authorize` function to also fetch `tier` from the database row and return it. Add `callbacks` for `jwt` and `session` to pass tier through.

The authorize function should return: `{ id: String(user.id), email: user.email, name: user.name, tier: user.tier || "free" }`

Add callbacks:
```typescript
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id;
      token.tier = (user as any).tier || "free";
    }
    return token;
  },
  async session({ session, token }) {
    if (session.user) {
      (session.user as any).id = token.id;
      (session.user as any).tier = token.tier || "free";
    }
    return session;
  },
},
```

- [ ] **Step 2: Add NextAuth type augmentation**

Create `src/types/next-auth.d.ts`:
```typescript
import type { UserTier } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      tier: UserTier;
    };
  }
  interface User {
    tier?: UserTier;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    tier: UserTier;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.ts src/types/next-auth.d.ts
git commit -m "feat: add user tier to NextAuth JWT and session"
```

---

### Task 4: Tier Limits Utility

**Files:**
- Create: `src/lib/tier-limits.ts`

- [ ] **Step 1: Create tier limits config and checker**

```typescript
import { getDb } from "./db";
import type { UserTier, TierLimits } from "@/types";

const TIER_LIMITS: Record<UserTier, TierLimits> = {
  free: {
    max_trades_per_day: 5,
    max_playbooks: 0,
    max_screenshots_per_trade: 1,
    max_accounts: 1,
    max_ai_analyses_per_day: 1,
    history_days: 7,
    has_chat: false,
    has_weekly_report: false,
    has_monthly_report: false,
    has_csv_export: false,
  },
  essential: {
    max_trades_per_day: 5,
    max_playbooks: 5,
    max_screenshots_per_trade: 3,
    max_accounts: 3,
    max_ai_analyses_per_day: 10,
    history_days: 7,
    has_chat: false,
    has_weekly_report: true,
    has_monthly_report: false,
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/tier-limits.ts
git commit -m "feat: add tier limits config and counting utilities"
```

---

### Task 5: Auth Helper for API Routes

**Files:**
- Create: `src/lib/api-auth.ts`

- [ ] **Step 1: Create reusable auth helper**

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import type { UserTier } from "@/types";

interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  tier: UserTier;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = session.user as any;
  return {
    id: Number(user.id),
    email: user.email,
    name: user.name || null,
    tier: (user.tier as UserTier) || "free",
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api-auth.ts
git commit -m "feat: add API route auth helper with tier info"
```

---

## Chunk 2: Trading Accounts (CRUD + UI)

### Task 6: Trading Accounts Query Layer

**Files:**
- Create: `src/lib/journal-queries.ts`

- [ ] **Step 1: Create journal queries file with account functions**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/journal-queries.ts
git commit -m "feat: add trading accounts query layer"
```

---

### Task 7: Trading Accounts API Routes

**Files:**
- Create: `src/app/api/accounts/route.ts`
- Create: `src/app/api/accounts/[id]/route.ts`

- [ ] **Step 1: Create list + create route**

`src/app/api/accounts/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getAccounts, createAccount } from "@/lib/journal-queries";
import { getTierLimits, countAccounts } from "@/lib/tier-limits";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await getAccounts(user.id);
  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limits = getTierLimits(user.tier);
  if (limits.max_accounts !== null) {
    const count = await countAccounts(user.id);
    if (count >= limits.max_accounts) {
      return NextResponse.json({ error: `Account limit reached (${limits.max_accounts})` }, { status: 403 });
    }
  }

  const body = await req.json();
  if (!body.name || !body.account_size) {
    return NextResponse.json({ error: "Name and account size are required" }, { status: 400 });
  }

  const account = await createAccount(user.id, body);
  return NextResponse.json(account, { status: 201 });
}
```

- [ ] **Step 2: Create single account route (get/update/delete)**

`src/app/api/accounts/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getAccount, updateAccount, deleteAccount } from "@/lib/journal-queries";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const account = await getAccount(Number(id), user.id);
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(account);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const account = await updateAccount(Number(id), user.id, body);
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(account);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const deleted = await deleteAccount(Number(id), user.id);
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Cannot delete account with existing trades" }, { status: 409 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/accounts/
git commit -m "feat: add trading accounts API routes"
```

---

### Task 8: Trading Accounts UI Page

**Files:**
- Create: `src/app/(dashboard)/journal/accounts/page.tsx`
- Create: `src/components/accounts-manager.tsx`

- [ ] **Step 1: Create accounts manager client component**

`src/components/accounts-manager.tsx` — A client component with:
- Table listing accounts (name, broker, size, currency, leverage)
- "Add Account" button that opens an inline form
- Edit/Delete buttons per row
- Form fields: name (text), broker (text), account_size (number), currency (select: USD/EUR/GBP), leverage (number)
- Fetch from `/api/accounts`, POST/PUT/DELETE via fetch
- Show tier limit warning when at max accounts

- [ ] **Step 2: Create accounts page (server component wrapper)**

`src/app/(dashboard)/journal/accounts/page.tsx`:
```typescript
import { AccountsManager } from "@/components/accounts-manager";

export const dynamic = "force-dynamic";

export default function AccountsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Trading Accounts</h1>
      <AccountsManager />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/journal/accounts/ src/components/accounts-manager.tsx
git commit -m "feat: add trading accounts management page"
```

---

## Chunk 3: Playbooks (CRUD + UI)

### Task 9: Playbooks Query Layer

**Files:**
- Modify: `src/lib/journal-queries.ts`

- [ ] **Step 1: Add playbook query functions**

Append to `src/lib/journal-queries.ts`:

```typescript
import type { TradingAccount, Playbook, PlaybookRule, PlaybookWithRules } from "@/types";

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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/journal-queries.ts
git commit -m "feat: add playbook query layer with stats"
```

---

### Task 10: Playbooks API Routes

**Files:**
- Create: `src/app/api/playbooks/route.ts`
- Create: `src/app/api/playbooks/[id]/route.ts`

- [ ] **Step 1: Create list + create route**

`src/app/api/playbooks/route.ts` — follows same pattern as accounts route. GET returns `getPlaybooksWithStats(user.id)`. POST checks tier limit via `countPlaybooks` + `getTierLimits`. Validates `name` required, `rules` array required.

- [ ] **Step 2: Create single playbook route**

`src/app/api/playbooks/[id]/route.ts` — GET returns `getPlaybookWithRules`. PUT updates. DELETE deletes. All scoped by `user.id`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/playbooks/
git commit -m "feat: add playbook API routes"
```

---

### Task 11: Playbooks UI Pages

**Files:**
- Create: `src/app/(dashboard)/playbooks/page.tsx`
- Create: `src/app/(dashboard)/playbooks/add/page.tsx`
- Create: `src/app/(dashboard)/playbooks/[id]/page.tsx`
- Create: `src/components/playbook-form.tsx`
- Create: `src/components/playbook-card.tsx`

- [ ] **Step 1: Create playbook card component**

Shows: name, instrument badge, timeframe, trade count, win rate, total P&L. Links to detail page.

- [ ] **Step 2: Create playbook form component**

Client component with: name, description, instrument selector, timeframe selector, dynamic rule builder (add/remove rules, each with category dropdown + text input). Used for both create and edit.

- [ ] **Step 3: Create playbooks list page**

Server page that fetches playbooks with stats, renders grid of playbook cards + "Create Playbook" button. Shows "Upgrade to Essential" message for free tier users.

- [ ] **Step 4: Create playbook add page**

Renders PlaybookForm in create mode.

- [ ] **Step 5: Create playbook detail/edit page**

Fetches playbook with rules, renders PlaybookForm in edit mode + stats summary.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/playbooks/ src/components/playbook-form.tsx src/components/playbook-card.tsx
git commit -m "feat: add playbook management pages"
```

---

## Chunk 4: Trade Logging (CRUD + UI)

### Task 12: Trade Query Layer

**Files:**
- Modify: `src/lib/journal-queries.ts`

- [ ] **Step 1: Add trade query functions**

Append to `src/lib/journal-queries.ts`:

```typescript
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
    playbook_name: tradeRows[0].playbook_name ?? null,
    account_name: tradeRows[0].account_name ?? null,
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
  // Similar to createTrade but UPDATE with COALESCE pattern
  // Recalculate rr_ratio and account_pct_impact on edit
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
  const dateFilter = historyDays
    ? sql`AND closed_at >= NOW() - INTERVAL '1 day' * ${historyDays}`
    : sql``;

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
    ${dateFilter}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/journal-queries.ts
git commit -m "feat: add trade CRUD and journal stats queries"
```

---

### Task 13: P&L Calculation Utility

**Files:**
- Create: `src/lib/pnl-calc.ts`

- [ ] **Step 1: Create P&L calculator**

```typescript
const FOREX_INSTRUMENTS = ["EURUSD", "GBPUSD"];
const CFD_INSTRUMENTS = ["DXY", "GER40", "US30", "NAS100", "SP500"];

// Pip values: EURUSD/GBPUSD = 0.0001
const PIP_SIZE: Record<string, number> = {
  EURUSD: 0.0001,
  GBPUSD: 0.0001,
};

// Tick values vary by instrument
const TICK_SIZE: Record<string, number> = {
  DXY: 0.01,
  GER40: 1,
  US30: 1,
  NAS100: 0.25,
  SP500: 0.25,
};

export function isForex(instrument: string): boolean {
  return FOREX_INSTRUMENTS.includes(instrument);
}

export function isCFD(instrument: string): boolean {
  return CFD_INSTRUMENTS.includes(instrument);
}

export function calculatePnl(
  instrument: string,
  direction: "buy" | "sell",
  entryPrice: number,
  exitPrice: number,
  lotSize: number,
  accountSize: number
): {
  pnl_pips: number | null;
  pnl_ticks: number | null;
  pnl_dollars: number;
  rr_ratio: number | null;
  account_pct_impact: number;
} {
  const priceDiff = direction === "buy" ? exitPrice - entryPrice : entryPrice - exitPrice;

  let pnl_pips: number | null = null;
  let pnl_ticks: number | null = null;
  let pnl_dollars: number;

  if (isForex(instrument)) {
    const pipSize = PIP_SIZE[instrument] || 0.0001;
    pnl_pips = priceDiff / pipSize;
    // Standard lot = 100,000 units, pip value ~$10 for majors
    pnl_dollars = pnl_pips * lotSize * 10;
  } else {
    const tickSize = TICK_SIZE[instrument] || 1;
    pnl_ticks = priceDiff / tickSize;
    // Dollar per tick varies — simplified: priceDiff * lotSize * contract multiplier
    pnl_dollars = priceDiff * lotSize;
  }

  const account_pct_impact = accountSize > 0 ? (pnl_dollars / accountSize) * 100 : 0;

  return {
    pnl_pips: pnl_pips !== null ? Math.round(pnl_pips * 100) / 100 : null,
    pnl_ticks: pnl_ticks !== null ? Math.round(pnl_ticks * 100) / 100 : null,
    pnl_dollars: Math.round(pnl_dollars * 100) / 100,
    rr_ratio: null, // calculated separately when SL is provided
    account_pct_impact: Math.round(account_pct_impact * 10000) / 10000,
  };
}

export function calculateRR(
  direction: "buy" | "sell",
  entryPrice: number,
  exitPrice: number,
  stopLoss: number
): number | null {
  if (!stopLoss) return null;
  const risk = Math.abs(entryPrice - stopLoss);
  if (risk === 0) return null;
  const reward = direction === "buy" ? exitPrice - entryPrice : entryPrice - exitPrice;
  return Math.round((reward / risk) * 100) / 100;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/pnl-calc.ts
git commit -m "feat: add P&L calculation utility (pips/ticks/dollars)"
```

---

### Task 14: Trades API Routes

**Files:**
- Create: `src/app/api/trades/route.ts`
- Create: `src/app/api/trades/[id]/route.ts`
- Create: `src/app/api/trades/export/route.ts`

- [ ] **Step 1: Create trades list + create route**

`src/app/api/trades/route.ts`:
- GET: parse query params (instrument, playbook_id, start_date, end_date, direction, page), apply tier history_days limit, return trades + stats
- POST: check tier trade-per-day limit, validate required fields (account_id, instrument, direction, entry_price, lot_size, opened_at), auto-calculate P&L if exit_price provided, create trade

- [ ] **Step 2: Create single trade route**

`src/app/api/trades/[id]/route.ts`:
- GET: return `getTradeWithDetails`
- PUT: update trade, recalculate P&L if prices changed
- DELETE: delete trade + cascades screenshots/review

- [ ] **Step 3: Create CSV export route**

`src/app/api/trades/export/route.ts`:
- GET: check tier has_csv_export, fetch all trades within history limit, generate CSV string, return with `Content-Type: text/csv` and `Content-Disposition: attachment`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/trades/
git commit -m "feat: add trade CRUD and CSV export API routes"
```

---

### Task 15: Journal List Page

**Files:**
- Create: `src/app/(dashboard)/journal/page.tsx`
- Create: `src/components/journal-table.tsx`
- Create: `src/components/journal-stats-bar.tsx`

- [ ] **Step 1: Create journal stats bar**

Client component showing: total trades, win rate %, avg R:R, P&L today/week/month with green/red coloring. Fetched from `/api/trades` response.

- [ ] **Step 2: Create journal table**

Client component with:
- Sortable columns: date, instrument, direction, entry, exit, P&L, R:R
- Filter bar: instrument dropdown, playbook dropdown, date range picker, direction toggle
- Color-coded P&L (green positive, red negative)
- Direction badges (buy=blue, sell=red)
- Emotion icons
- Click row to navigate to `/journal/[id]`
- Pagination (50 per page)
- "Add Trade" button top right
- "Export CSV" button (hidden for free tier)

- [ ] **Step 3: Create journal page (server wrapper)**

```typescript
import { JournalStatsBar } from "@/components/journal-stats-bar";
import { JournalTable } from "@/components/journal-table";

export const dynamic = "force-dynamic";

export default function JournalPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Trading Journal</h1>
      <JournalStatsBar />
      <JournalTable />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/journal/page.tsx src/components/journal-table.tsx src/components/journal-stats-bar.tsx
git commit -m "feat: add journal list page with stats and filters"
```

---

### Task 16: Trade Entry Form

**Files:**
- Create: `src/app/(dashboard)/journal/add/page.tsx`
- Create: `src/components/trade-form.tsx`

- [ ] **Step 1: Create trade form client component**

`src/components/trade-form.tsx` — comprehensive form with sections:

**Edit mode:** Component reads `?edit=[id]` from search params. If present, fetches trade via `/api/trades/[id]` and pre-populates all fields. Submit uses PUT instead of POST.

**Trade Details Section:**
- Account selector (dropdown from `/api/accounts`)
- Instrument selector (7 buttons/dropdown) — DXY shows note: "Tracking only — most brokers don't offer DXY directly"
- Direction toggle (Buy/Sell)
- Entry price, exit price (number inputs)
- Stop loss, take profit (number inputs)
- Lot size (number input)
- Open/close timestamps (datetime-local inputs)

**Auto-Calculated Display (live updates):**
- P&L in pips or ticks (based on instrument type)
- P&L in dollars
- R:R ratio
- Account % impact

**Strategy Section (hidden for free tier):**
- Playbook selector (dropdown from `/api/playbooks`)
- When playbook selected: show rule checklist (checkboxes for each rule)
- Auto-calculates rule adherence score

**Context Section:**
- Session selector (London/New York/Asia/Overlap, optional)
- Timeframe selector (M1/M5/M15/H1/H4/D1)
- Emotion before (icon buttons: confident/calm/anxious/FOMO/revenge/uncertain)
- Emotion after (icon buttons: satisfied/frustrated/relieved/regretful/neutral)

**Notes & Screenshots:**
- Notes textarea
- Screenshot upload (drag & drop or click, respects tier limit)

**Submit:** POST to `/api/trades`, redirect to `/journal/[id]` on success.

- [ ] **Step 2: Create add trade page**

```typescript
import { TradeForm } from "@/components/trade-form";

export const dynamic = "force-dynamic";

export default function AddTradePage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Log Trade</h1>
      <TradeForm />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/journal/add/ src/components/trade-form.tsx
git commit -m "feat: add trade entry form with auto P&L calculation"
```

---

## Chunk 5: Trade Detail + Screenshots

### Task 17: Screenshot Upload API

**Files:**
- Create: `src/app/api/uploads/route.ts`

- [ ] **Step 1: Install Vercel Blob**

Run: `npm install @vercel/blob`

- [ ] **Step 2: Create upload endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getAuthUser } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  // Validate file type
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, and WebP allowed" }, { status: 400 });
  }

  // Validate file size (2MB)
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be under 2MB" }, { status: 400 });
  }

  const blob = await put(`trades/${user.id}/${Date.now()}-${file.name}`, file, {
    access: "public",
  });

  return NextResponse.json({ url: blob.url });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/uploads/route.ts package.json package-lock.json
git commit -m "feat: add screenshot upload endpoint via Vercel Blob"
```

---

### Task 18: Trade Detail Page

**Files:**
- Create: `src/app/(dashboard)/journal/[id]/page.tsx`
- Create: `src/components/trade-detail.tsx`
- Create: `src/components/ai-review-panel.tsx`

- [ ] **Step 1: Create AI review panel component**

Client component that:
- Shows existing AI review if present (verdict badge, bias alignment, rule adherence, risk, timing, psychology flag, suggestions)
- Shows "Analyze This Trade" button if no review or user wants to re-analyze
- Button disabled with message if tier limit reached
- Calls `/api/ai/analyze-trade` on click, shows loading spinner, renders result

- [ ] **Step 2: Create trade detail component**

`src/components/trade-detail.tsx` — displays:
- Header: instrument, direction badge, open/close dates
- Price grid: entry, exit, SL, TP, lot size
- P&L summary: pips/ticks, dollars, R:R, account % impact (color-coded)
- Account + playbook info
- Session + timeframe badges
- Emotion tags (before/after with icons)
- Rule adherence (if playbook linked): checklist with check/cross per rule, score percentage
- Screenshots gallery (clickable to enlarge)
- ForexPulse bias at time of trade (fetched from biases table by instrument + date)
- Notes section
- AI Review Panel component
- Edit button → navigates to `/journal/add?edit=[id]` (reuse trade form)
- Delete button with confirmation

- [ ] **Step 3: Create trade detail page**

```typescript
import { getAuthUser } from "@/lib/api-auth";
import { getTradeWithDetails } from "@/lib/journal-queries";
import { TradeDetail } from "@/components/trade-detail";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TradeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return notFound();

  const { id } = await params;
  const trade = await getTradeWithDetails(Number(id), user.id);
  if (!trade) return notFound();

  return <TradeDetail trade={trade} tier={user.tier} />;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/journal/\[id\]/ src/components/trade-detail.tsx src/components/ai-review-panel.tsx
git commit -m "feat: add trade detail page with AI review panel"
```

---

## Chunk 6: AI Trade Analysis

### Task 19: Install Anthropic SDK

- [ ] **Step 1: Install**

Run: `npm install @anthropic-ai/sdk`

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @anthropic-ai/sdk dependency"
```

---

### Task 20: AI Analysis Service

**Files:**
- Create: `src/lib/ai-analysis.ts`

- [ ] **Step 1: Create AI analysis service**

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "./db";
import type { Trade, TradeAiReview, UserTier } from "@/types";

const client = new Anthropic();

interface AnalysisContext {
  trade: Trade;
  playbook_rules?: { category: string; rule_text: string; followed: boolean }[];
  bias_data?: { timeframe: string; direction: string; summary: string }[];
  economic_events?: { event_name: string; currency: string; impact: string; actual: string; forecast: string }[];
}

async function gatherContext(trade: Trade, tier: UserTier): Promise<AnalysisContext> {
  const sql = getDb();
  const ctx: AnalysisContext = { trade };

  // Playbook rules + adherence
  if (trade.playbook_id && trade.rule_adherence_details) {
    const rules = await sql`
      SELECT * FROM playbook_rules WHERE playbook_id = ${trade.playbook_id} ORDER BY sort_order
    `;
    ctx.playbook_rules = rules.map((r: any) => ({
      category: r.category,
      rule_text: r.rule_text,
      followed: trade.rule_adherence_details?.find((d: any) => d.rule_id === r.id)?.followed ?? false,
    }));
  }

  // Bias data (essential + premium only)
  if (tier !== "free") {
    const biases = await sql`
      SELECT timeframe, direction, summary FROM biases
      WHERE instrument = ${trade.instrument}
      AND generated_at <= ${trade.opened_at}
      ORDER BY generated_at DESC
      LIMIT 4
    `;
    ctx.bias_data = biases as any[];
  }

  // Economic events during trade window
  if (tier !== "free" && trade.opened_at) {
    const tradeDate = trade.opened_at.split("T")[0];
    const events = await sql`
      SELECT event_name, currency, impact, actual, forecast
      FROM economic_events
      WHERE event_date = ${tradeDate}
      AND impact IN ('high', 'medium')
    `;
    ctx.economic_events = events as any[];
  }

  return ctx;
}

function buildPrompt(ctx: AnalysisContext): string {
  let prompt = `You are an expert trading analyst. Analyze this trade and provide structured feedback.

## Trade Data
- Instrument: ${ctx.trade.instrument}
- Direction: ${ctx.trade.direction}
- Entry: ${ctx.trade.entry_price}, Exit: ${ctx.trade.exit_price || "still open"}
- SL: ${ctx.trade.stop_loss || "none"}, TP: ${ctx.trade.take_profit || "none"}
- Lot Size: ${ctx.trade.lot_size}
- P&L: ${ctx.trade.pnl_dollars !== null ? "$" + ctx.trade.pnl_dollars : "N/A"} (${ctx.trade.pnl_pips !== null ? ctx.trade.pnl_pips + " pips" : ctx.trade.pnl_ticks + " ticks"})
- R:R: ${ctx.trade.rr_ratio || "N/A"}
- Session: ${ctx.trade.session || "not specified"}
- Timeframe: ${ctx.trade.timeframe_traded || "not specified"}
- Emotion Before: ${ctx.trade.emotion_before || "not specified"}
- Emotion After: ${ctx.trade.emotion_after || "not specified"}
- Notes: ${ctx.trade.notes || "none"}`;

  if (ctx.playbook_rules?.length) {
    prompt += `\n\n## Playbook Rules\n`;
    ctx.playbook_rules.forEach((r) => {
      prompt += `- [${r.followed ? "FOLLOWED" : "BROKEN"}] (${r.category}): ${r.rule_text}\n`;
    });
    prompt += `Rule Adherence Score: ${ctx.trade.rule_adherence_score}%`;
  }

  if (ctx.bias_data?.length) {
    prompt += `\n\n## ForexPulse Fundamental Bias (at time of trade)\n`;
    ctx.bias_data.forEach((b) => {
      prompt += `- ${b.timeframe}: ${b.direction} — ${b.summary}\n`;
    });
  }

  if (ctx.economic_events?.length) {
    prompt += `\n\n## Economic Events on Trade Day\n`;
    ctx.economic_events.forEach((e) => {
      prompt += `- ${e.event_name} (${e.currency}, ${e.impact} impact): Actual=${e.actual || "N/A"}, Forecast=${e.forecast || "N/A"}\n`;
    });
  }

  prompt += `\n\nRespond in JSON format:
{
  "verdict": "good" | "acceptable" | "poor",
  "bias_alignment": "with" | "against" | "neutral",
  "bias_alignment_explanation": "...",
  "rule_adherence_review": "...",
  "risk_assessment": "...",
  "timing_analysis": "...",
  "psychology_flag": "..." or null,
  "suggestions": ["...", "...", "..."]
}`;

  return prompt;
}

export async function analyzeTradeWithAI(tradeId: number, userId: number, tier: UserTier): Promise<TradeAiReview> {
  const sql = getDb();

  // Fetch trade
  const tradeRows = await sql`SELECT * FROM trades WHERE id = ${tradeId} AND user_id = ${userId}`;
  if (tradeRows.length === 0) throw new Error("Trade not found");
  const trade = tradeRows[0] as Trade;

  // Gather context based on tier
  const ctx = await gatherContext(trade, tier);
  const prompt = buildPrompt(ctx);

  // Call Claude Sonnet
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse AI response");
  const result = JSON.parse(jsonMatch[0]);

  // Upsert review
  const reviewRows = await sql`
    INSERT INTO trade_ai_reviews (
      trade_id, verdict, bias_alignment, bias_alignment_explanation,
      rule_adherence_review, risk_assessment, timing_analysis,
      psychology_flag, suggestions, bias_snapshot, events_snapshot
    ) VALUES (
      ${tradeId}, ${result.verdict}, ${result.bias_alignment},
      ${result.bias_alignment_explanation || null},
      ${result.rule_adherence_review || null}, ${result.risk_assessment || null},
      ${result.timing_analysis || null}, ${result.psychology_flag || null},
      ${JSON.stringify(result.suggestions || [])},
      ${ctx.bias_data ? JSON.stringify(ctx.bias_data) : null},
      ${ctx.economic_events ? JSON.stringify(ctx.economic_events) : null}
    )
    ON CONFLICT (trade_id) DO UPDATE SET
      verdict = EXCLUDED.verdict,
      bias_alignment = EXCLUDED.bias_alignment,
      bias_alignment_explanation = EXCLUDED.bias_alignment_explanation,
      rule_adherence_review = EXCLUDED.rule_adherence_review,
      risk_assessment = EXCLUDED.risk_assessment,
      timing_analysis = EXCLUDED.timing_analysis,
      psychology_flag = EXCLUDED.psychology_flag,
      suggestions = EXCLUDED.suggestions,
      bias_snapshot = EXCLUDED.bias_snapshot,
      events_snapshot = EXCLUDED.events_snapshot,
      generated_at = NOW()
    RETURNING *
  `;

  return reviewRows[0] as TradeAiReview;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/ai-analysis.ts
git commit -m "feat: add AI trade analysis service with tier-based context"
```

---

### Task 21: AI Analysis API Route

**Files:**
- Create: `src/app/api/ai/analyze-trade/route.ts`

- [ ] **Step 1: Create analyze endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getTierLimits, countTodayAnalyses } from "@/lib/tier-limits";
import { analyzeTradeWithAI } from "@/lib/ai-analysis";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { trade_id } = await req.json();
  if (!trade_id) return NextResponse.json({ error: "trade_id required" }, { status: 400 });

  // Check tier limit
  const limits = getTierLimits(user.tier);
  if (limits.max_ai_analyses_per_day !== null) {
    const count = await countTodayAnalyses(user.id);
    if (count >= limits.max_ai_analyses_per_day) {
      return NextResponse.json({
        error: `AI analysis limit reached (${limits.max_ai_analyses_per_day}/day). Upgrade for more.`,
      }, { status: 403 });
    }
  }

  try {
    const review = await analyzeTradeWithAI(trade_id, user.id, user.tier);
    return NextResponse.json(review);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/ai/analyze-trade/
git commit -m "feat: add AI trade analysis API endpoint with tier gating"
```

---

## Chunk 7: AI Chat Assistant (Premium)

### Task 22: Chat Service

**Files:**
- Create: `src/lib/ai-chat.ts`

- [ ] **Step 1: Create chat service**

Handles:
- Fetching last 50 messages for user
- Fetching latest chat summary (if exists)
- Building system prompt with trade history context (summary stats, recent trades)
- Calling Claude Sonnet with conversation history
- Storing user + assistant messages
- Generating summary every 50 messages (store in chat_summaries)

Key function: `async function chat(userId: number, message: string): Promise<string>`

System prompt includes:
- User's overall stats (win rate, avg R:R, total P&L)
- Recent 20 trades summary (instrument, direction, P&L, date)
- Playbook names + win rates
- Current ForexPulse biases for all instruments
- Instruction to be a helpful trading coach

- [ ] **Step 2: Commit**

```bash
git add src/lib/ai-chat.ts
git commit -m "feat: add AI chat service with trade history context"
```

---

### Task 23: Chat API Route

**Files:**
- Create: `src/app/api/ai/chat/route.ts`

- [ ] **Step 1: Create chat endpoints**

POST: accepts `{ message: string }`, checks premium tier, calls chat service, returns `{ reply: string }`.
GET: returns chat history (last 50 messages) for rendering.

- [ ] **Step 2: Commit**

```bash
git add src/app/api/ai/chat/
git commit -m "feat: add AI chat API endpoints (premium)"
```

---

### Task 24: Chat UI Page

**Files:**
- Create: `src/app/(dashboard)/journal/chat/page.tsx`
- Create: `src/components/chat-interface.tsx`

- [ ] **Step 1: Create chat interface component**

Client component:
- Message list (scrollable, auto-scroll to bottom)
- User messages right-aligned (blue), assistant left-aligned (gray)
- Text input + send button at bottom
- Loading indicator while waiting for response
- Loads chat history on mount via GET `/api/ai/chat`
- Sends messages via POST `/api/ai/chat`
- Markdown rendering for assistant messages

- [ ] **Step 2: Create chat page**

Shows upgrade prompt for non-premium users, renders ChatInterface for premium.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/journal/chat/ src/components/chat-interface.tsx
git commit -m "feat: add AI chat assistant page (premium)"
```

---

## Chunk 8: Reports + Navigation

### Task 25: Reports Service + API

**Files:**
- Create: `src/lib/ai-reports.ts`
- Create: `src/app/api/ai/report/route.ts`

- [ ] **Step 1: Create reports service**

Two modes:
- **Basic stats report (essential):** Pure SQL aggregation — win rate, P&L, best/worst day, most traded instrument, avg R:R. No AI call. Returns structured JSON.
- **AI-powered report (premium):** Gathers all trades for period, feeds to Claude Sonnet with prompt asking for pattern detection, emotional analysis, bias alignment correlation, suggestions. Returns structured JSON.

- [ ] **Step 2: Create report API route**

GET with query params: `type=weekly|monthly`, `date=YYYY-MM-DD`. Checks tier. Returns report JSON.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai-reports.ts src/app/api/ai/report/
git commit -m "feat: add weekly/monthly report generation"
```

---

### Task 26: Reports UI Page

**Files:**
- Create: `src/app/(dashboard)/journal/reports/page.tsx`
- Create: `src/components/report-viewer.tsx`

- [ ] **Step 1: Create report viewer**

Client component:
- Toggle: Weekly / Monthly
- Date/week selector
- "Generate Report" button
- Renders report sections: summary stats, charts (win rate over time, P&L curve), AI insights (premium), pattern detection (premium)
- Upgrade prompt for features not in current tier

- [ ] **Step 2: Create reports page**

Server wrapper with tier check.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/journal/reports/ src/components/report-viewer.tsx
git commit -m "feat: add reports page with tier-gated features"
```

---

### Task 27: Navigation Updates

**Files:**
- Modify: `src/components/top-nav.tsx`

- [ ] **Step 1: Add journal navigation to TopNav**

Add a "Journal" dropdown/section to the existing TopNav with links:
- Journal (trade log) → `/journal`
- Add Trade → `/journal/add`
- Playbooks → `/playbooks`
- Accounts → `/journal/accounts`
- AI Chat → `/journal/chat`
- Reports → `/journal/reports`

Use the existing TopNav patterns (instrument dropdown style). Add a journal icon (BookOpen from lucide-react).

- [ ] **Step 2: Commit**

```bash
git add src/components/top-nav.tsx
git commit -m "feat: add journal navigation to TopNav"
```

---

### Task 28: Final Integration Test

- [ ] **Step 1: Run the dev server and verify all pages load**

Run: `npm run dev`

Verify:
- `/journal` — loads, shows empty state
- `/journal/add` — form renders with all fields
- `/journal/accounts` — can add an account
- `/playbooks` — shows upgrade message (free) or empty state
- `/journal/chat` — shows upgrade prompt (free) or chat (premium)
- `/journal/reports` — shows upgrade prompt or report generator

- [ ] **Step 2: Test the full trade flow**

1. Create a trading account
2. Create a playbook (essential/premium)
3. Log a trade with all fields
4. View trade detail
5. Run AI analysis on trade
6. Check journal stats update

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: trading journal integration complete"
```
