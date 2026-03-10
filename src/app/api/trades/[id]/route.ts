import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getTradeWithDetails, updateTrade, deleteTrade, getAccount } from "@/lib/journal-queries";
import { calculatePnl, calculateRR } from "@/lib/pnl-calc";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const trade = await getTradeWithDetails(Number(id), user.id);
  if (!trade) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(trade);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Recalculate P&L if prices changed
  if (body.exit_price || body.entry_price || body.stop_loss) {
    // Fetch current trade to get full data
    const existing = await getTradeWithDetails(Number(id), user.id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const entryPrice = body.entry_price || existing.entry_price;
    const exitPrice = body.exit_price || existing.exit_price;
    const stopLoss = body.stop_loss !== undefined ? body.stop_loss : existing.stop_loss;

    if (exitPrice) {
      const account = await getAccount(existing.account_id, user.id);
      const accountSize = account?.account_size || 0;

      const pnl = calculatePnl(
        existing.instrument,
        existing.direction,
        entryPrice,
        exitPrice,
        existing.lot_size,
        accountSize
      );

      body.pnl_pips = pnl.pnl_pips;
      body.pnl_ticks = pnl.pnl_ticks;
      body.pnl_dollars = pnl.pnl_dollars;
      body.account_pct_impact = pnl.account_pct_impact;

      if (stopLoss) {
        body.rr_ratio = calculateRR(existing.direction, entryPrice, exitPrice, stopLoss);
      }
    }
  }

  const trade = await updateTrade(Number(id), user.id, body);
  if (!trade) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(trade);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const deleted = await deleteTrade(Number(id), user.id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
