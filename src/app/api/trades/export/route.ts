import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { getTrades } from "@/lib/journal-queries";
import { getTierLimits } from "@/lib/tier-limits";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limits = getTierLimits(user.tier);
  if (!limits.has_csv_export) {
    return NextResponse.json({ error: "CSV export not available on your plan" }, { status: 403 });
  }

  const trades = await getTrades(user.id, {
    limit: 10000,
    history_days: limits.history_days,
  });

  const headers = [
    "Date",
    "Instrument",
    "Direction",
    "Entry",
    "Exit",
    "SL",
    "TP",
    "Lot Size",
    "P&L Pips",
    "P&L Ticks",
    "P&L $",
    "R:R",
    "Session",
    "Timeframe",
    "Emotion Before",
    "Emotion After",
    "Notes",
  ];

  const escapeCSV = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = trades.map((t) =>
    [
      t.opened_at,
      t.instrument,
      t.direction,
      t.entry_price,
      t.exit_price,
      t.stop_loss,
      t.take_profit,
      t.lot_size,
      t.pnl_pips,
      t.pnl_ticks,
      t.pnl_dollars,
      t.rr_ratio,
      t.session,
      t.timeframe_traded,
      t.emotion_before,
      t.emotion_after,
      t.notes,
    ]
      .map(escapeCSV)
      .join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="trades-export-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
