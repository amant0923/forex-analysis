import json
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Optional


class Database:
    def __init__(self, database_url: str):
        self.database_url = database_url
        self._connect()

    def _connect(self):
        self.conn = psycopg2.connect(self.database_url, cursor_factory=RealDictCursor)
        self.conn.autocommit = True

    def execute(self, query: str, params: tuple = ()):
        try:
            cur = self.conn.cursor()
            cur.execute(query, params)
            return cur
        except (psycopg2.OperationalError, psycopg2.InterfaceError):
            # Reconnect on dropped connections (common with Neon free tier)
            self._connect()
            cur = self.conn.cursor()
            cur.execute(query, params)
            return cur

    def insert_article(
        self,
        title: str,
        content: str,
        url: str,
        source: str,
        published_at: str,
        instruments: list[str],
    ) -> Optional[int]:
        try:
            # PostgreSQL cannot store NUL bytes in text columns
            title = title.replace("\x00", "") if title else title
            content = content.replace("\x00", "") if content else content
            cur = self.execute(
                """INSERT INTO articles (title, content, url, source, published_at)
                   VALUES (%s, %s, %s, %s, %s) RETURNING id""",
                (title, content, url, source, published_at),
            )
            article_id = cur.fetchone()["id"]
            for instrument in instruments:
                self.execute(
                    "INSERT INTO article_instruments (article_id, instrument) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    (article_id, instrument),
                )
            return article_id
        except psycopg2.IntegrityError:
            return None

    def get_articles_for_instrument(self, instrument: str, days: int) -> list[dict]:
        cur = self.execute(
            """SELECT a.id, a.title, a.content, a.source, a.published_at, a.url
               FROM articles a
               JOIN article_instruments ai ON a.id = ai.article_id
               WHERE ai.instrument = %s
                 AND a.published_at >= NOW() - INTERVAL '%s days'
               ORDER BY a.published_at DESC""",
            (instrument, days),
        )
        return [dict(row) for row in cur.fetchall()]

    def insert_bias(
        self,
        instrument: str,
        timeframe: str,
        direction: str,
        summary: str,
        key_drivers: list[str],
        supporting_articles: list[dict],
        generated_at: str,
    ):
        cur = self.execute(
            """INSERT INTO biases (instrument, timeframe, direction, summary, key_drivers, supporting_articles, generated_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s)
               RETURNING id""",
            (instrument, timeframe, direction, summary,
             json.dumps(key_drivers), json.dumps(supporting_articles), generated_at),
        )
        row = cur.fetchone()
        return row["id"] if row else None

    def insert_bias_outcome(self, bias_id, instrument, timeframe, predicted_direction, open_price, generated_at, settles_at):
        """Insert a pending bias outcome when a new bias is generated."""
        self.execute(
            """INSERT INTO bias_outcomes (bias_id, instrument, timeframe, predicted_direction, open_price, generated_at, settles_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s)
               ON CONFLICT (bias_id) DO NOTHING""",
            (bias_id, instrument, timeframe, predicted_direction, open_price, generated_at, settles_at),
        )

    def get_instrument_price(self, instrument):
        """Get the latest price for an instrument from instrument_quotes."""
        cur = self.execute(
            "SELECT price FROM instrument_quotes WHERE instrument = %s",
            (instrument,),
        )
        row = cur.fetchone()
        return float(row["price"]) if row else None

    def update_article_summary(self, article_id: int, summary: str):
        self.execute(
            "UPDATE articles SET summary = %s WHERE id = %s",
            (summary, article_id),
        )

    def insert_article_analysis(
        self,
        article_id: int,
        instrument: str,
        event: str,
        mechanism: str,
        impact_direction: str,
        impact_timeframes: list[str],
        confidence: str,
        commentary: str,
    ):
        self.execute(
            """INSERT INTO article_analyses
               (article_id, instrument, event, mechanism, impact_direction, impact_timeframes, confidence, commentary)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
               ON CONFLICT (article_id, instrument) DO UPDATE SET
                 event = EXCLUDED.event,
                 mechanism = EXCLUDED.mechanism,
                 impact_direction = EXCLUDED.impact_direction,
                 impact_timeframes = EXCLUDED.impact_timeframes,
                 confidence = EXCLUDED.confidence,
                 commentary = EXCLUDED.commentary,
                 generated_at = NOW()""",
            (article_id, instrument, event, mechanism, impact_direction,
             json.dumps(impact_timeframes), confidence, commentary),
        )

    def get_unanalyzed_articles(self, days: int = 7) -> list[dict]:
        """Get articles from last N days that don't have a summary yet."""
        cur = self.execute(
            """SELECT a.id, a.title, a.content, a.source, a.published_at, a.url
               FROM articles a
               WHERE a.summary IS NULL
                 AND a.published_at >= NOW() - INTERVAL '%s days'
               ORDER BY a.published_at DESC
               LIMIT 100""",
            (days,),
        )
        return [dict(row) for row in cur.fetchall()]

    def close(self):
        self.conn.close()
