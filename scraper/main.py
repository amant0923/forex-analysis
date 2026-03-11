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
from scraper.article_analyzer import ArticleAnalyzer
from scraper.database import Database
from scraper.economic_calendar import EconomicCalendarScraper, store_events
from scraper.fmp_quotes import FmpQuoteFetcher, store_quotes
from scraper.telegram_reporter import TelegramReporter

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

    # Step 2.5: Per-article analysis
    print("\nStep 2.5: Generating per-article AI analysis...")
    article_analyzer = ArticleAnalyzer(api_key=anthropic_key)
    unanalyzed = db.get_unanalyzed_articles(days=7)
    print(f"  {len(unanalyzed)} articles need analysis")

    # Process in batches of 8
    for i in range(0, len(unanalyzed), 8):
        batch = unanalyzed[i:i + 8]
        batch_ids = [a["id"] for a in batch]
        print(f"  Batch {i // 8 + 1}: articles {batch_ids}")

        # Get instruments for each article in this batch
        article_instruments = {}
        for a in batch:
            cur = db.execute(
                "SELECT instrument FROM article_instruments WHERE article_id = %s",
                (a["id"],),
            )
            article_instruments[a["id"]] = [row["instrument"] for row in cur.fetchall()]

        results = article_analyzer.analyze_batch(batch, article_instruments)

        for art_result in results:
            aid = art_result.get("id")
            if not aid:
                continue
            # Store summary
            summary = art_result.get("summary", "")
            if summary:
                db.update_article_summary(aid, summary)

            # Store per-instrument impacts
            for impact in art_result.get("impacts", []):
                try:
                    db.insert_article_analysis(
                        article_id=aid,
                        instrument=impact["instrument"],
                        event=impact["event"],
                        mechanism=impact["mechanism"],
                        impact_direction=impact["impact_direction"],
                        impact_timeframes=impact.get("impact_timeframes", []),
                        confidence=impact.get("confidence", "medium"),
                        commentary=impact["commentary"],
                    )
                except Exception as e:
                    print(f"    Error storing analysis for article {aid}: {e}")

        print(f"    Analyzed {len(results)} articles")

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

    # Step 4: Economic Calendar
    print("\nStep 4: Scraping economic calendar...")
    try:
        cal_scraper = EconomicCalendarScraper()
        cal_events = cal_scraper.fetch_current_and_next_week()
        print(f"  Found {len(cal_events)} economic events")
        if cal_events:
            store_events(db, cal_events)
    except Exception as e:
        print(f"  Warning: Economic calendar scrape failed: {e}")

    # Step 5: Live Quotes
    print("\nStep 5: Fetching live quotes...")
    fmp_key = os.getenv("FMP_API_KEY")
    if fmp_key:
        try:
            fmp = FmpQuoteFetcher(api_key=fmp_key)
            quotes = fmp.fetch_all_quotes()
            print(f"  Fetched {len(quotes)} quotes")
            if quotes:
                store_quotes(db, quotes)
        except Exception as e:
            print(f"  Warning: FMP quote fetch failed: {e}")
    else:
        print("  Skipped — FMP_API_KEY not set")

    # Step 6: Send Telegram reports
    print("\nStep 6: Sending Telegram daily reports...")
    telegram_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if telegram_token:
        try:
            reporter = TelegramReporter(db, telegram_token)
            reporter.send_reports()
        except Exception as e:
            print(f"  Warning: Telegram reports failed: {e}")
    else:
        print("  Skipped — TELEGRAM_BOT_TOKEN not set")

    db.close()
    print(f"\nPipeline complete!")


if __name__ == "__main__":
    run()
