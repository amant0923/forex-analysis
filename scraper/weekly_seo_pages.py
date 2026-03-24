#!/usr/bin/env python3
"""Generate weekly SEO analysis summaries for each instrument."""

import os
import sys
import json
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from scraper.ai_provider import AIProvider
from scraper.database import Database

INSTRUMENTS = [
    "DXY", "EURUSD", "GBPUSD", "USDJPY", "EURJPY", "GBPJPY", "EURGBP",
    "AUDUSD", "USDCAD", "NZDUSD", "USDCHF",
    "XAUUSD", "XAGUSD", "GER40", "US30", "NAS100", "SP500",
    "BTCUSD", "ETHUSD", "USOIL",
]

SEO_SYSTEM = """You are a senior forex analyst writing weekly market analysis for publication on a financial research website.
Write in an authoritative but accessible style. Optimize for the search query "[instrument] fundamental analysis this week".
Respond in valid JSON only."""

SEO_PROMPT = """Write a weekly fundamental analysis summary for {instrument} covering {week_start} to {week_end}.

Bias trajectory this week:
{bias_trajectory}

Key articles this week ({article_count} total):
{articles_text}

Respond with this JSON structure:
{{
  "summary": "500-800 word SEO-optimized analysis. Include: what moved the instrument this week, key drivers, outlook for next week. Write in 4-5 paragraphs with subheadings.",
  "key_themes": ["theme 1", "theme 2", "theme 3"],
  "meta_description": "150-160 character meta description for SEO"
}}"""


def generate_weekly_summaries():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)

    ai_provider = AIProvider()
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")
    if anthropic_key:
        ai_provider.add_anthropic(anthropic_key)
    if openai_key:
        ai_provider.add_openai(openai_key)
    if gemini_key:
        ai_provider.add_google(gemini_key)

    if not ai_provider._providers:
        print("ERROR: No AI API keys set")
        sys.exit(1)

    db = Database(database_url)

    # Calculate last week's date range (Monday to Sunday)
    today = datetime.now(timezone.utc).date()
    last_sunday = today - timedelta(days=today.weekday() + 1)
    last_monday = last_sunday - timedelta(days=6)

    week_start = last_monday.isoformat()
    week_end = last_sunday.isoformat()

    print(f"Generating weekly summaries for {week_start} to {week_end}")

    for instrument in INSTRUMENTS:
        # Check if already generated
        cur = db.execute(
            "SELECT id FROM weekly_summaries WHERE instrument = %s AND week_start = %s",
            (instrument, week_start),
        )
        if cur.fetchone():
            print(f"  {instrument}: already generated, skipping")
            continue

        # Get bias trajectory for the week
        cur = db.execute(
            """SELECT timeframe, direction, confidence, generated_at::date as gen_date
               FROM biases
               WHERE instrument = %s
                 AND generated_at >= %s AND generated_at <= %s::date + 1
               ORDER BY generated_at""",
            (instrument, week_start, week_end),
        )
        bias_rows = [dict(r) for r in cur.fetchall()]

        trajectory = {}
        for row in bias_rows:
            day = str(row["gen_date"])
            if day not in trajectory:
                trajectory[day] = {}
            trajectory[day][row["timeframe"]] = {
                "direction": row["direction"],
                "confidence": row.get("confidence") or 0,
            }

        trajectory_text = json.dumps(trajectory, indent=2, default=str) if trajectory else "No bias data available for this week."

        # Get articles for the week
        cur = db.execute(
            """SELECT DISTINCT a.title, a.source, a.published_at::date as pub_date
               FROM articles a
               JOIN article_instruments ai ON a.id = ai.article_id
               WHERE ai.instrument = %s
                 AND a.published_at >= %s AND a.published_at <= %s::date + 1
               ORDER BY a.published_at DESC
               LIMIT 20""",
            (instrument, week_start, week_end),
        )
        articles = [dict(r) for r in cur.fetchall()]
        article_count = len(articles)

        if article_count == 0 and not bias_rows:
            print(f"  {instrument}: no data, skipping")
            continue

        articles_text = "\n".join(
            f"- [{str(a['pub_date'])}] {a['source']}: {a['title']}"
            for a in articles
        ) or "No articles available."

        prompt = SEO_PROMPT.format(
            instrument=instrument,
            week_start=week_start,
            week_end=week_end,
            bias_trajectory=trajectory_text,
            articles_text=articles_text,
            article_count=article_count,
        )

        try:
            raw, _, _ = ai_provider.complete(
                system=SEO_SYSTEM,
                user=prompt,
                max_tokens=2000,
            )
            result = json.loads(raw)

            db.execute(
                """INSERT INTO weekly_summaries
                   (instrument, week_start, week_end, summary, key_themes, bias_trajectory, article_count)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)
                   ON CONFLICT (instrument, week_start) DO UPDATE SET
                     summary = EXCLUDED.summary,
                     key_themes = EXCLUDED.key_themes,
                     bias_trajectory = EXCLUDED.bias_trajectory,
                     article_count = EXCLUDED.article_count,
                     generated_at = NOW()""",
                (
                    instrument,
                    week_start,
                    week_end,
                    result.get("summary", ""),
                    json.dumps(result.get("key_themes", [])),
                    json.dumps(trajectory),
                    article_count,
                ),
            )
            print(f"  {instrument}: generated ({article_count} articles)")

        except Exception as e:
            print(f"  {instrument}: error — {e}")

    db.close()
    print("Weekly summary generation complete!")


if __name__ == "__main__":
    generate_weekly_summaries()
