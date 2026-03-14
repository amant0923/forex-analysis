#!/usr/bin/env python3
"""Settle pending bias outcomes by comparing predictions to actual price movements."""

import os
import sys
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from scraper.database import Database
from scraper.fmp_quotes import FmpQuoteFetcher, store_quotes

NEUTRAL_THRESHOLD = 0.1  # percentage


def settle():
    database_url = os.getenv("DATABASE_URL")
    fmp_key = os.getenv("FMP_API_KEY")

    if not database_url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)

    db = Database(database_url)

    # First refresh quotes so we have latest prices
    if fmp_key:
        try:
            fmp = FmpQuoteFetcher(api_key=fmp_key)
            quotes = fmp.fetch_all_quotes()
            if quotes:
                store_quotes(db, quotes)
        except Exception as e:
            print(f"Warning: Could not refresh quotes: {e}")

    # Get unsettled outcomes that are due
    cur = db.execute(
        """SELECT id, instrument, predicted_direction, open_price
           FROM bias_outcomes
           WHERE settled_at IS NULL AND settles_at <= NOW()
           ORDER BY settles_at ASC"""
    )
    pending = [dict(row) for row in cur.fetchall()]

    if not pending:
        print("No pending outcomes to settle.")
        db.close()
        return

    print(f"Settling {len(pending)} bias outcomes...")
    settled = 0

    for outcome in pending:
        price = db.get_instrument_price(outcome["instrument"])
        if price is None:
            print(f"  Skipping {outcome['instrument']} — no price available")
            continue

        open_price = float(outcome["open_price"])
        close_price = price
        change_pct = ((close_price - open_price) / open_price) * 100 if open_price != 0 else 0

        if change_pct > NEUTRAL_THRESHOLD:
            actual = "bullish"
        elif change_pct < -NEUTRAL_THRESHOLD:
            actual = "bearish"
        else:
            actual = "neutral"

        is_correct = (outcome["predicted_direction"] == actual)

        db.execute(
            """UPDATE bias_outcomes
               SET close_price = %s, price_change_pct = %s, actual_direction = %s,
                   is_correct = %s, settled_at = NOW()
               WHERE id = %s""",
            (close_price, round(change_pct, 4), actual, is_correct, outcome["id"]),
        )

        status = "CORRECT" if is_correct else "WRONG"
        print(f"  {outcome['instrument']}: predicted {outcome['predicted_direction']}, "
              f"actual {actual} ({change_pct:+.2f}%) — {status}")
        settled += 1

    print(f"\nSettled {settled}/{len(pending)} outcomes")
    db.close()


if __name__ == "__main__":
    settle()
