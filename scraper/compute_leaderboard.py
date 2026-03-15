#!/usr/bin/env python3
"""Compute daily leaderboard snapshots from trading journal data."""

import os
import sys
import math
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from scraper.database import Database


def compute_leaderboard():
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)

    db = Database(database_url)

    # Get all users who opted in and have 10+ closed trades
    cur = db.execute("""
        SELECT u.id, u.display_name
        FROM users u
        WHERE u.leaderboard_opt_in = true
          AND u.display_name IS NOT NULL
          AND u.display_name != ''
          AND (
            SELECT COUNT(*) FROM trades t
            WHERE t.user_id = u.id AND t.closed_at IS NOT NULL
          ) >= 10
    """)
    users = cur.fetchall()

    if not users:
        print("No eligible users for leaderboard")
        return

    print(f"Computing leaderboard for {len(users)} eligible users...")

    entries = []

    for user in users:
        user_id = user["id"]
        display_name = user["display_name"]

        # Get closed trades
        cur = db.execute("""
            SELECT pnl_dollars, rr_ratio, closed_at
            FROM trades
            WHERE user_id = %s AND closed_at IS NOT NULL
            ORDER BY closed_at ASC
        """, (user_id,))
        trades = cur.fetchall()

        if len(trades) < 10:
            continue

        total_trades = len(trades)

        # Win rate: trades with positive PnL
        wins = sum(1 for t in trades if t["pnl_dollars"] is not None and float(t["pnl_dollars"]) > 0)
        win_rate = (wins / total_trades) * 100

        # Average R:R
        rr_values = [float(t["rr_ratio"]) for t in trades if t["rr_ratio"] is not None]
        avg_rr = sum(rr_values) / len(rr_values) if rr_values else None

        # Consistency score: 100 - normalized stddev of weekly returns
        # Group trades by week and compute weekly PnL
        weekly_pnl: dict[str, float] = {}
        for t in trades:
            if t["pnl_dollars"] is not None and t["closed_at"] is not None:
                closed = t["closed_at"]
                if isinstance(closed, str):
                    closed = datetime.fromisoformat(closed.replace("Z", "+00:00"))
                week_key = closed.strftime("%Y-W%W")
                weekly_pnl[week_key] = weekly_pnl.get(week_key, 0) + float(t["pnl_dollars"])

        consistency_score = None
        if len(weekly_pnl) >= 2:
            values = list(weekly_pnl.values())
            mean = sum(values) / len(values)
            variance = sum((v - mean) ** 2 for v in values) / len(values)
            stddev = math.sqrt(variance)
            # Normalize: higher stddev = lower score, cap between 0-100
            max_stddev = abs(mean) * 3 if mean != 0 else 1000
            normalized = min(stddev / max_stddev, 1.0) if max_stddev > 0 else 0
            consistency_score = round((1 - normalized) * 100, 2)

        entries.append({
            "user_id": user_id,
            "display_name": display_name,
            "total_trades": total_trades,
            "win_rate": round(win_rate, 2),
            "consistency_score": consistency_score,
            "avg_rr": round(avg_rr, 2) if avg_rr is not None else None,
        })

    # Rank by composite score: 50% win_rate + 30% consistency + 20% avg_rr
    for entry in entries:
        wr_component = (entry["win_rate"] / 100) * 50
        cs_component = ((entry["consistency_score"] or 50) / 100) * 30
        rr_component = min((entry["avg_rr"] or 1) / 5, 1) * 20  # Cap at 5R
        entry["composite"] = wr_component + cs_component + rr_component

    entries.sort(key=lambda e: e["composite"], reverse=True)

    # Assign ranks
    for i, entry in enumerate(entries):
        entry["rank"] = i + 1

    # Insert into leaderboard_snapshots
    today = datetime.now().strftime("%Y-%m-%d")

    for entry in entries:
        db.execute("""
            INSERT INTO leaderboard_snapshots
                (user_id, display_name, total_trades, win_rate, consistency_score, avg_rr, rank, snapshot_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_id, snapshot_date)
            DO UPDATE SET
                display_name = EXCLUDED.display_name,
                total_trades = EXCLUDED.total_trades,
                win_rate = EXCLUDED.win_rate,
                consistency_score = EXCLUDED.consistency_score,
                avg_rr = EXCLUDED.avg_rr,
                rank = EXCLUDED.rank
        """, (
            entry["user_id"],
            entry["display_name"],
            entry["total_trades"],
            entry["win_rate"],
            entry["consistency_score"],
            entry["avg_rr"],
            entry["rank"],
            today,
        ))

    print(f"Leaderboard updated: {len(entries)} entries for {today}")


if __name__ == "__main__":
    compute_leaderboard()
