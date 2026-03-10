import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getTrades, getJournalStats, createTrade, getAccount } from "@/lib/journal-queries";
import { getTierLimits, countTodayTrades } from "@/lib/tier-limits";
import { calculatePnl, calculateRR } from "@/lib/pnl-calc";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const instrument = searchParams.get("instrument") || undefined;
  const playbook_id = searchParams.get("playbook_id") ? Number(searchParams.get("playbook_id")) : undefined;
  const start_date = searchParams.get("start_date") || undefined;
  const end_date = searchParams.get("end_date") || undefined;
  const direction = searchParams.get("direction") || undefined;
  const page = Number(searchParams.get("page") || "1");
  const limit = 50;
  const offset = (page - 1) * limit;

  const limits = getTierLimits(user.tier);
  const history_days = limits.history_days;

  const [trades, stats] = await Promise.all([
    getTrades(user.id, { instrument, playbook_id, start_date, end_date, direction, limit, offset, history_days }),
    getJournalStats(user.id, history_days),
  ]);

  return NextResponse.json({ trades, stats });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limits = getTierLimits(user.tier);
  if (limits.max_trades_per_day !== null) {
    const todayCount = await countTodayTrades(user.id);
    if (todayCount >= limits.max_trades_per_day) {
      return NextResponse.json(
        { error: `Daily trade limit reached (${limits.max_trades_per_day})` },
        { status: 403 }
      );
    }
  }

  const body = await req.json();

  if (!body.account_id || !body.instrument || !body.direction || !body.entry_price || !body.lot_size || !body.opened_at) {
    return NextResponse.json(
      { error: "Required fields: account_id, instrument, direction, entry_price, lot_size, opened_at" },
      { status: 400 }
    );
  }

  // Auto-calculate P&L if exit_price is provided
  if (body.exit_price) {
    const account = await getAccount(body.account_id, user.id);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const pnl = calculatePnl(
      body.instrument,
      body.direction,
      body.entry_price,
      body.exit_price,
      body.lot_size,
      account.account_size
    );

    body.pnl_pips = pnl.pnl_pips;
    body.pnl_ticks = pnl.pnl_ticks;
    body.pnl_dollars = pnl.pnl_dollars;
    body.account_pct_impact = pnl.account_pct_impact;

    if (body.stop_loss) {
      body.rr_ratio = calculateRR(body.direction, body.entry_price, body.exit_price, body.stop_loss);
    }
  }

  const trade = await createTrade(user.id, body);
  return NextResponse.json(trade, { status: 201 });
}
