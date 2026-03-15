#!/usr/bin/env python3
"""Daily forex analysis pipeline. Run via GitHub Actions or manually."""

import os
import sys
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from scraper.rss_scraper import RssScraper
from scraper.reddit_scraper import RedditScraper
from scraper.ai_provider import AIProvider
from scraper.analyzer import Analyzer
from scraper.article_analyzer import ArticleAnalyzer
from scraper.database import Database
from scraper.economic_calendar import EconomicCalendarScraper, store_events
from scraper.fmp_quotes import FmpQuoteFetcher, store_quotes
from scraper.telegram_reporter import TelegramReporter

INSTRUMENTS = ["DXY", "EURUSD", "GBPUSD", "USDJPY", "EURJPY", "GBPJPY", "EURGBP", "XAUUSD", "XAGUSD", "GER40", "US30", "NAS100", "SP500"]
TIMEFRAME_DAYS = {"daily": 1, "1week": 7, "1month": 30, "3month": 90}
TIMEFRAME_SETTLE_DAYS = {"daily": 1, "1week": 7, "1month": 30, "3month": 90}


def run():
    print(f"\n{'='*60}")
    print(f"Forex Analysis Pipeline — {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC")
    print(f"{'='*60}\n")

    database_url = os.getenv("DATABASE_URL")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")

    if not database_url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)

    # Build AI provider with failover chain
    ai_provider = AIProvider()
    if anthropic_key:
        ai_provider.add_anthropic(anthropic_key)
    if openai_key:
        ai_provider.add_openai(openai_key)
    if gemini_key:
        ai_provider.add_google(gemini_key)

    if not ai_provider._providers:
        print("ERROR: No AI API keys set (need at least one of ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY)")
        sys.exit(1)

    provider_names = [p[0] for p in ai_provider._providers]
    print(f"AI providers: {', '.join(provider_names)} (failover order)")

    db = Database(database_url)
    rss = RssScraper()
    analyzer = Analyzer(provider=ai_provider)

    # Step 1: Scrape RSS
    print("Step 1: Scraping RSS feeds...")
    articles = rss.scrape()
    print(f"  Found {len(articles)} articles from RSS")

    # Step 1b: Scrape Reddit
    print("\nStep 1b: Scraping Reddit...")
    try:
        reddit = RedditScraper()
        reddit_articles = reddit.scrape()
        articles.extend(reddit_articles)
        print(f"  Found {len(reddit_articles)} articles from Reddit")
    except Exception as e:
        print(f"  Warning: Reddit scrape failed: {e}")

    print(f"  Total: {len(articles)} relevant articles")

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
    article_analyzer = ArticleAnalyzer(provider=ai_provider)
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

        results, art_provider, art_model = article_analyzer.analyze_batch(batch, article_instruments)

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
                        model_provider=art_provider,
                        model_name=art_model,
                    )
                except Exception as e:
                    print(f"    Error storing analysis for article {aid}: {e}")

        print(f"    Analyzed {len(results)} articles")

    # Step 3: Economic Calendar (moved before bias analysis so events are available)
    print("\nStep 3: Scraping economic calendar...")
    all_economic_events = []
    try:
        cal_scraper = EconomicCalendarScraper()
        all_economic_events = cal_scraper.fetch_current_and_next_week()
        print(f"  Found {len(all_economic_events)} economic events")
        if all_economic_events:
            store_events(db, all_economic_events)
    except Exception as e:
        print(f"  Warning: Economic calendar scrape failed: {e}")

    # Step 4: Live Quotes (moved before bias analysis so price context is available)
    print("\nStep 4: Fetching live quotes...")
    all_quotes = {}
    fmp_key = os.getenv("FMP_API_KEY")
    if fmp_key:
        try:
            fmp = FmpQuoteFetcher(api_key=fmp_key)
            quotes = fmp.fetch_all_quotes()
            print(f"  Fetched {len(quotes)} quotes")
            if quotes:
                store_quotes(db, quotes)
                for q in quotes:
                    all_quotes[q["instrument"]] = q
        except Exception as e:
            print(f"  Warning: FMP quote fetch failed: {e}")
    else:
        print("  Skipped — FMP_API_KEY not set")

    # Step 5: Generate AI bias analysis (with full context from steps 3-4)
    print("\nStep 5: Generating AI bias analysis (with economic events, price context, track record)...")
    now = datetime.utcnow().isoformat()

    # Pre-load track record stats per instrument
    print("  Loading historical accuracy data...")
    track_records = {}
    for instrument in INSTRUMENTS:
        track_records[instrument] = db.get_instrument_track_record(instrument)

    # Build economic events index by instrument
    from scraper.economic_calendar import CURRENCY_INSTRUMENTS as ECON_CURRENCY_MAP
    econ_by_instrument = {inst: [] for inst in INSTRUMENTS}
    for ev in all_economic_events:
        currency = ev.get("currency", "")
        for inst in ECON_CURRENCY_MAP.get(currency, []):
            if inst in econ_by_instrument:
                econ_by_instrument[inst].append(ev)

    # Track biases as they're generated for cross-instrument consistency
    generated_biases = {}

    for instrument in INSTRUMENTS:
        print(f"\n  Analyzing {instrument}...")
        articles_for_inst = db.get_articles_for_instrument(instrument, days=90)
        print(f"    {len(articles_for_inst)} articles in last 90 days")

        if not articles_for_inst:
            print(f"    Skipping — no articles")
            continue

        # Get price context for this instrument
        price_data = all_quotes.get(instrument)

        # Get economic events for this instrument
        instrument_events = econ_by_instrument.get(instrument, [])

        # Get track record for this instrument
        instrument_track_record = track_records.get(instrument)

        bias, bias_provider, bias_model = analyzer.analyze(
            instrument=instrument,
            articles=articles_for_inst,
            economic_events=instrument_events,
            price_data=price_data,
            track_record=instrument_track_record,
            other_biases=generated_biases,
        )

        # Store biases for cross-instrument consistency in next iterations
        generated_biases[instrument] = {}

        for timeframe, result in bias.items():
            generated_biases[instrument][timeframe] = result.get("direction", "neutral")

            bias_id = db.insert_bias(
                instrument=instrument,
                timeframe=timeframe,
                direction=result["direction"],
                summary=result.get("summary", ""),
                key_drivers=result.get("key_drivers", []),
                supporting_articles=result.get("supporting_articles", []),
                generated_at=now,
                model_provider=bias_provider,
                model_name=bias_model,
                confidence=result.get("confidence"),
                confidence_rationale=result.get("confidence_rationale"),
            )
            if bias_id:
                price = db.get_instrument_price(instrument)
                if price:
                    settle_days = TIMEFRAME_SETTLE_DAYS.get(timeframe, 7)
                    settles_at = (datetime.utcnow() + timedelta(days=settle_days)).isoformat()
                    db.insert_bias_outcome(
                        bias_id=bias_id,
                        instrument=instrument,
                        timeframe=timeframe,
                        predicted_direction=result["direction"],
                        open_price=price,
                        generated_at=now,
                        settles_at=settles_at,
                    )

        d = bias.get("daily", {}).get("direction", "?").upper()
        w = bias.get("1week", {}).get("direction", "?").upper()
        m = bias.get("1month", {}).get("direction", "?").upper()
        q = bias.get("3month", {}).get("direction", "?").upper()
        dc = bias.get("daily", {}).get("confidence", "?")
        wc = bias.get("1week", {}).get("confidence", "?")
        print(f"    Daily: {d} ({dc}%) | 1W: {w} ({wc}%) | 1M: {m} | 3M: {q}")

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
