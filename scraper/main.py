#!/usr/bin/env python3
"""Daily forex analysis pipeline. Run via GitHub Actions or manually."""

import os
import sys
from datetime import datetime
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from scraper.rss_scraper import RssScraper
from scraper.analyzer import Analyzer
from scraper.database import Database

INSTRUMENTS = ["DXY", "EURUSD", "GBPUSD", "GER40", "US30", "NAS100", "SP500"]
TIMEFRAME_DAYS = {"daily": 1, "1week": 7, "1month": 30, "3month": 90}


def run():
    print(f"\n{'='*60}")
    print(f"Forex Analysis Pipeline — {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC")
    print(f"{'='*60}\n")

    database_url = os.getenv("DATABASE_URL")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")

    if not database_url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)
    if not anthropic_key:
        print("ERROR: ANTHROPIC_API_KEY not set")
        sys.exit(1)

    db = Database(database_url)
    rss = RssScraper()
    analyzer = Analyzer(api_key=anthropic_key)

    # Step 1: Scrape
    print("Step 1: Scraping RSS feeds...")
    articles = rss.scrape()
    print(f"  Found {len(articles)} relevant articles")

    # Step 2: Store
    print("\nStep 2: Storing articles...")
    stored = 0
    for article in articles:
        result = db.insert_article(
            title=article["title"],
            content=article["content"],
            url=article["url"],
            source=article["source"],
            published_at=article["published_at"],
            instruments=article["instruments"],
        )
        if result:
            stored += 1
    print(f"  Stored {stored} new articles ({len(articles) - stored} duplicates)")

    # Step 3: Analyze
    print("\nStep 3: Generating AI bias analysis...")
    now = datetime.utcnow().isoformat()

    for instrument in INSTRUMENTS:
        print(f"\n  Analyzing {instrument}...")
        articles_for_inst = db.get_articles_for_instrument(instrument, days=90)
        print(f"    {len(articles_for_inst)} articles in last 90 days")

        if not articles_for_inst:
            print(f"    Skipping — no articles")
            continue

        bias = analyzer.analyze(instrument, articles_for_inst)

        for timeframe, result in bias.items():
            db.insert_bias(
                instrument=instrument,
                timeframe=timeframe,
                direction=result["direction"],
                summary=result.get("summary", ""),
                key_drivers=result.get("key_drivers", []),
                supporting_articles=result.get("supporting_articles", []),
                generated_at=now,
            )

        d = bias.get("daily", {}).get("direction", "?").upper()
        w = bias.get("1week", {}).get("direction", "?").upper()
        m = bias.get("1month", {}).get("direction", "?").upper()
        q = bias.get("3month", {}).get("direction", "?").upper()
        print(f"    Daily: {d} | 1W: {w} | 1M: {m} | 3M: {q}")

    db.close()
    print(f"\nPipeline complete!")


if __name__ == "__main__":
    run()
