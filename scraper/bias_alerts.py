"""Detect bias direction flips and store alerts."""

import json


def detect_bias_changes(db):
    """Compare newly generated biases against previous ones. Insert alerts for flips.

    A "flip" is when the direction changes between runs (e.g., bullish -> bearish).
    Neutral -> bullish/bearish and vice versa also count.
    """
    instruments = db.execute(
        "SELECT DISTINCT code FROM instruments ORDER BY code"
    ).fetchall()

    timeframes = ["daily", "1week", "1month", "3month"]
    alerts = []

    for row in instruments:
        instrument = row["code"]
        for tf in timeframes:
            # Get the two most recent biases for this instrument+timeframe
            cur = db.execute(
                """SELECT id, direction, confidence, key_drivers, generated_at
                   FROM biases
                   WHERE instrument = %s AND timeframe = %s
                   ORDER BY generated_at DESC
                   LIMIT 2""",
                (instrument, tf),
            )
            rows = cur.fetchall()
            if len(rows) < 2:
                continue

            new_bias = rows[0]
            old_bias = rows[1]

            new_dir = new_bias["direction"]
            old_dir = old_bias["direction"]

            if new_dir == old_dir:
                continue

            # Direction changed — create alert
            # Get the top 3 supporting articles from the new bias
            key_articles = []
            try:
                cur = db.execute(
                    """SELECT sa.value->>'article_id' as article_id,
                              sa.value->>'relevance' as relevance
                       FROM biases b,
                            jsonb_array_elements(b.supporting_articles) sa
                       WHERE b.id = %s
                       LIMIT 3""",
                    (new_bias["id"],),
                )
                for art_row in cur.fetchall():
                    aid = art_row.get("article_id")
                    if aid:
                        title_cur = db.execute(
                            "SELECT title FROM articles WHERE id = %s",
                            (int(aid),),
                        )
                        title_row = title_cur.fetchone()
                        key_articles.append({
                            "article_id": int(aid),
                            "title": title_row["title"] if title_row else "",
                            "relevance": art_row.get("relevance", ""),
                        })
            except Exception:
                pass

            db.execute(
                """INSERT INTO bias_alerts
                   (instrument, timeframe, previous_direction, new_direction,
                    confidence, previous_confidence, key_articles)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (
                    instrument,
                    tf,
                    old_dir,
                    new_dir,
                    new_bias.get("confidence") or 0,
                    old_bias.get("confidence") or 0,
                    json.dumps(key_articles),
                ),
            )
            alerts.append(f"{instrument} {tf}: {old_dir} -> {new_dir}")

    if alerts:
        print(f"  Bias alerts: {len(alerts)} direction changes detected")
        for a in alerts:
            print(f"    ⚠️  {a}")
    else:
        print("  No bias direction changes detected")

    return alerts
