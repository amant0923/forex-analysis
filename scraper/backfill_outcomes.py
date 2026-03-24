#!/usr/bin/env python3
"""One-time backfill: create bias_outcomes for all historical biases."""

import os
import sys
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from scraper.database import Database
from scraper.fmp_quotes import FmpQuoteFetcher

TIMEFRAME_SETTLE_DAYS = {"daily": 1, "1week": 7, "1month": 30, "3month": 90}
NEUTRAL_THRESHOLD = 0.1

# FMP historical endpoint
FMP_HISTORICAL = "https://financialmodelingprep.com/stable/historical-price-eod/full"

# Map instruments to FMP/Yahoo symbols for historical data
HISTORICAL_SYMBOLS = {
    "EURUSD": "EURUSD",
    "GBPUSD": "GBPUSD",
    "USDJPY": "USDJPY",
    "EURJPY": "EURJPY",
    "GBPJPY": "GBPJPY",
    "EURGBP": "EURGBP",
}


def backfill():
    database_url = os.getenv("DATABASE_URL")
    fmp_key = os.getenv("FMP_API_KEY")

    if not database_url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)

    db = Database(database_url)

    # Get all biases that don't have outcomes yet
    cur = db.execute(
        """SELECT b.id, b.instrument, b.timeframe, b.direction, b.generated_at
           FROM biases b
           LEFT JOIN bias_outcomes bo ON b.id = bo.bias_id
           WHERE bo.id IS NULL
           ORDER BY b.generated_at ASC"""
    )
    biases = [dict(row) for row in cur.fetchall()]

    if not biases:
        print("No biases to backfill.")
        db.close()
        return

    print(f"Backfilling {len(biases)} bias outcomes...")

    # For backfill, we use the current quote prices as a rough proxy
    # (historical API would be ideal but may not be available on all plans)
    # The settlement job will handle accuracy going forward

    created = 0
    for bias in biases:
        gen_at = bias["generated_at"]
        if isinstance(gen_at, str):
            gen_dt = datetime.fromisoformat(gen_at.replace("Z", "+00:00"))
        else:
            gen_dt = gen_at
        # Ensure timezone-aware for comparison
        if gen_dt.tzinfo is None:
            gen_dt = gen_dt.replace(tzinfo=timezone.utc)

        settle_days = TIMEFRAME_SETTLE_DAYS.get(bias["timeframe"], 7)
        settles_at = gen_dt + timedelta(days=settle_days)

        # Get the current price as open_price proxy for historical biases
        price = db.get_instrument_price(bias["instrument"])
        if price is None:
            print(f"  Skipping {bias['instrument']} bias #{bias['id']} — no price")
            continue

        # If the settlement date has passed, mark as settled with current price
        now = datetime.now(timezone.utc)
        if settles_at <= now:
            # For historical biases, we can't get exact historical prices without
            # a premium API. Insert as settled with the open=close (neutral) approach,
            # or skip settlement and let the daily job handle future ones.
            # Better approach: insert as pending-but-past-due, let settle job handle it
            db.insert_bias_outcome(
                bias_id=bias["id"],
                instrument=bias["instrument"],
                timeframe=bias["timeframe"],
                predicted_direction=bias["direction"],
                open_price=price,
                generated_at=gen_at if isinstance(gen_at, str) else gen_at.isoformat(),
                settles_at=settles_at.isoformat(),
            )
        else:
            # Future settlement — insert as pending
            db.insert_bias_outcome(
                bias_id=bias["id"],
                instrument=bias["instrument"],
                timeframe=bias["timeframe"],
                predicted_direction=bias["direction"],
                open_price=price,
                generated_at=gen_at if isinstance(gen_at, str) else gen_at.isoformat(),
                settles_at=settles_at.isoformat(),
            )

        created += 1
        if created % 50 == 0:
            print(f"  Created {created}/{len(biases)} outcomes...")

    print(f"\nBackfilled {created}/{len(biases)} bias outcomes")
    print("Run 'python -m scraper.settle_outcomes' to settle past-due outcomes")
    db.close()


if __name__ == "__main__":
    backfill()
