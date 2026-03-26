"""
Main polling orchestrator.
Runs every 1-3 minutes via cron. Checks sources for new articles,
scores them, deduplicates, and either auto-posts or queues for approval.
"""

import os
import sys
from pathlib import Path

# Ensure project root is on Python path (needed when called directly by cron)
_project_root = str(Path(__file__).resolve().parent.parent)
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from scraper.database import Database
from scraper.sources import SOURCES
from scraper.rss_scraper import RssScraper
from scraper.quality_filter import score_article
from scraper.dedup import is_duplicate_headline
from scraper.categorizer import categorize_article
from scraper.image_scraper import extract_og_image
from scraper.channel_poster import format_breaking_news, send_channel_message
from scraper.approval_flow import send_draft_for_review, process_auto_posts
from scraper.heartbeat import write_heartbeat


def filter_new_articles(articles: list[dict], db: Database) -> list[dict]:
    """Filter out articles whose URLs are already in the database."""
    new = []
    for article in articles:
        if not db.is_url_known(article["url"]):
            new.append(article)
    return new


def deduplicate_batch(articles: list[dict], existing_headlines: list[str]) -> list[dict]:
    """Remove duplicate headlines within a batch and against recent DB headlines."""
    seen_headlines = list(existing_headlines)
    unique = []
    for article in articles:
        if not is_duplicate_headline(article["title"], seen_headlines):
            unique.append(article)
            seen_headlines.append(article["title"])
    return unique


def run():
    """Main polling loop — called by cron every 1-3 minutes."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not set, exiting")
        sys.exit(1)

    db = Database(database_url)
    scraper = RssScraper()

    channel_id = os.environ.get("TELEGRAM_CHANNEL_ID")
    admin_chat_id = os.environ.get("TELEGRAM_ADMIN_CHAT_ID")
    bot_token = os.environ.get("TELEGRAM_BOT_TOKEN")

    if not channel_id:
        print("TELEGRAM_CHANNEL_ID not set, exiting")
        sys.exit(1)

    errors = []
    articles_found = 0

    try:
        # 1. Auto-post any expired drafts (pending > 15 min)
        auto_posted = process_auto_posts(db, channel_id, bot_token)
        if auto_posted:
            print(f"Auto-posted {auto_posted} expired drafts")

        # 2. Poll all sources
        raw_articles = scraper.poll_sources(SOURCES)
        print(f"Polled {len(SOURCES)} sources, found {len(raw_articles)} articles")

        # 3. Filter out known URLs
        new_articles = filter_new_articles(raw_articles, db)
        print(f"After URL filter: {len(new_articles)} new articles")

        if not new_articles:
            write_heartbeat(db, 0)
            return

        # 4. Deduplicate against recent headlines
        recent_headlines = db.get_recent_headlines(hours=2)
        unique_articles = deduplicate_batch(new_articles, recent_headlines)
        print(f"After dedup: {len(unique_articles)} unique articles")
        articles_found = len(unique_articles)

        # 5. Score, categorize, and process each article
        for article in unique_articles:
            # Categorize if not already done by source mapping
            instruments = article.get("instruments") or categorize_article(
                article["title"], article.get("content", "")
            )

            # Score the article
            score_result = score_article(
                title=article["title"],
                content=article.get("content", ""),
                source_tier=article.get("source_tier", 3),
                source_keywords=article.get("source_keywords"),
                matched_instruments=instruments,
            )

            # Store article in DB regardless of score
            try:
                article_id = db.insert_article(
                    title=article["title"],
                    content=article.get("content", ""),
                    url=article["url"],
                    source=article.get("source_name", article.get("source", "")),
                    published_at=article.get("published_at"),
                    instruments=instruments,
                )
            except Exception as e:
                print(f"Failed to store article '{article['title'][:50]}': {e}")
                continue

            # Skip channel posting if below threshold
            if score_result["score"] < 40:
                print(f"  Skip (score {score_result['score']}): {article['title'][:60]}")
                continue

            # Look up current biases for matched instruments
            biases = {}
            for inst in instruments[:5]:
                bias = db.get_latest_bias(inst)
                if bias:
                    biases[inst] = {"direction": bias["direction"], "confidence": bias["confidence"]}

            # Format the message (include article content for context)
            message = format_breaking_news(
                title=article["title"],
                source=article.get("source_name", article.get("source", "")),
                biases=biases,
                article_url=article["url"],
                is_urgent=score_result["is_urgent"],
                content=article.get("content", ""),
            )

            # Get article image
            image_url = extract_og_image(article["url"])

            if score_result["auto_post"]:
                # Tier 0 with keyword match — post directly
                success = send_channel_message(channel_id, message, image_url=image_url, bot_token=bot_token)
                if success:
                    db.mark_article_posted(article_id)
                    print(f"  AUTO-POSTED: {article['title'][:60]}")
                else:
                    print(f"  Failed to auto-post: {article['title'][:60]}")
            else:
                # Tier 1-3 — send draft for review
                draft_id = db.insert_draft(
                    article_id=article_id,
                    formatted_message=message,
                    image_url=image_url,
                    chart_path=None,
                    relevance_score=score_result["score"],
                    source_tier=article.get("source_tier", 3),
                )
                if admin_chat_id:
                    send_draft_for_review(
                        admin_chat_id=admin_chat_id,
                        draft_id=draft_id,
                        formatted_message=message,
                        relevance_score=score_result["score"],
                        source_name=article.get("source_name", ""),
                        source_tier=article.get("source_tier", 3),
                        instruments=instruments,
                        bot_token=bot_token,
                    )
                    print(f"  QUEUED: {article['title'][:60]}")

    except Exception as e:
        errors.append(str(e))
        print(f"Poller error: {e}")

    # 6. Check for notable economic data (runs only if FRED_API_KEY is set)
    if os.environ.get("FRED_API_KEY"):
        try:
            from scraper.data_monitor import MONITORED_SERIES, fetch_fred_series, detect_notable
            from scraper.chart_generator import generate_chart
            import tempfile

            for series_config in MONITORED_SERIES:
                result = fetch_fred_series(series_config["series_id"])
                if not result:
                    continue
                dates, values = result
                if len(values) < 2:
                    continue

                notable = detect_notable(
                    series_name=series_config["name"],
                    current_value=values[-1],
                    historical_values=values[:-1],
                )
                if notable and notable.is_notable:
                    # Generate chart
                    chart_path = os.path.join(tempfile.gettempdir(), f"tradeora_{series_config['series_id']}.png")
                    generate_chart(
                        title=notable.description,
                        subtitle=series_config["name"],
                        x_labels=dates[-20:],  # Last 20 data points
                        y_values=values[-20:],
                        source=series_config["source"],
                        output_path=chart_path,
                        y_format=series_config.get("y_format", "number"),
                    )

                    # Look up biases for affected instruments
                    biases = {}
                    for inst in series_config["instruments"][:5]:
                        bias = db.get_latest_bias(inst)
                        if bias:
                            biases[inst] = {"direction": bias["direction"], "confidence": bias["confidence"]}

                    from scraper.channel_poster import format_data_release
                    message = format_data_release(
                        title=notable.description,
                        detail=f"Latest value: {values[-1]:.1f} (previous: {values[-2]:.1f})",
                        source=series_config["source"],
                        biases=biases,
                    )
                    send_channel_message(channel_id, message, chart_path=chart_path, bot_token=bot_token)
                    print(f"  DATA CHART: {notable.description}")
        except Exception as e:
            errors.append(f"Data monitor: {e}")
            print(f"Data monitor error: {e}")

    # 7. Write heartbeat
    write_heartbeat(db, articles_found, "; ".join(errors) if errors else None)


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
    run()
