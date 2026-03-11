"""Send daily Telegram reports to connected users."""

import os
from datetime import datetime
import requests

TELEGRAM_API = "https://api.telegram.org/bot{token}/sendMessage"
MAX_MESSAGE_LENGTH = 4096

DIRECTION_EMOJI = {
    "bullish": "🟢",
    "bearish": "🔴",
    "neutral": "⚪",
}


class TelegramReporter:
    def __init__(self, database, bot_token: str):
        self.db = database
        self.bot_token = bot_token
        self.api_url = TELEGRAM_API.format(token=bot_token)
        self.site_url = os.getenv("SITE_URL", "tradeora.com")

    def get_connected_users(self) -> list[dict]:
        """Get all users with telegram connected and instruments selected."""
        cur = self.db.execute(
            """SELECT id, telegram_chat_id, telegram_instruments, telegram_confidence_filter
               FROM users
               WHERE telegram_chat_id IS NOT NULL
                 AND array_length(telegram_instruments, 1) > 0"""
        )
        return [dict(row) for row in cur.fetchall()]

    def get_instrument_data(self, instrument: str, confidence_filter: list[str]) -> dict:
        """Get bias and today's articles for an instrument, with confidence filtering."""
        # Get latest daily bias
        cur = self.db.execute(
            """SELECT direction, summary
               FROM biases
               WHERE instrument = %s AND timeframe = 'daily'
               ORDER BY generated_at DESC LIMIT 1""",
            (instrument,),
        )
        bias_row = cur.fetchone()
        bias = dict(bias_row) if bias_row else None

        # Get today's articles matching confidence filter
        cur = self.db.execute(
            """SELECT DISTINCT a.id, a.title, a.published_at, aa.impact_direction, aa.confidence
               FROM articles a
               JOIN article_instruments ai ON a.id = ai.article_id
               LEFT JOIN article_analyses aa ON a.id = aa.article_id AND aa.instrument = %s
               WHERE ai.instrument = %s
                 AND a.published_at >= CURRENT_DATE
                 AND (aa.confidence IS NULL OR aa.confidence = ANY(%s))
               ORDER BY a.published_at DESC""",
            (instrument, instrument, confidence_filter),
        )
        articles = [dict(row) for row in cur.fetchall()]
        is_fallback = False

        # If no articles today, get the single most recent one
        if not articles:
            cur = self.db.execute(
                """SELECT DISTINCT a.id, a.title, a.published_at, aa.impact_direction, aa.confidence
                   FROM articles a
                   JOIN article_instruments ai ON a.id = ai.article_id
                   LEFT JOIN article_analyses aa ON a.id = aa.article_id AND aa.instrument = %s
                   WHERE ai.instrument = %s
                   ORDER BY a.published_at DESC
                   LIMIT 1""",
                (instrument, instrument),
            )
            articles = [dict(row) for row in cur.fetchall()]
            is_fallback = True

        return {"bias": bias, "articles": articles, "is_fallback": is_fallback}

    def build_instrument_block(self, instrument: str, data: dict) -> str:
        """Build the report text for one instrument."""
        bias = data["bias"]
        articles = data["articles"]
        is_fallback = data.get("is_fallback", False)

        direction = bias["direction"] if bias else "neutral"
        emoji = DIRECTION_EMOJI.get(direction, "⚪")
        direction_label = direction.capitalize()

        lines = [f"{emoji} <b>{instrument}</b> — {direction_label}"]

        # Bias summary (skip "Insufficient data" type summaries)
        if bias and bias.get("summary"):
            summary = bias["summary"]
            lower = summary.lower()
            if "insufficient data" not in lower and "no data" not in lower:
                if len(summary) > 150:
                    summary = summary[:147] + "..."
                lines.append(f"<i>{summary}</i>")

        # Articles
        if articles:
            lines.append("")
            if is_fallback:
                lines.append("📰 <b>Latest:</b>")
            else:
                lines.append(f"📰 <b>Today ({len(articles)}):</b>")

            for article in articles:
                title = article["title"]
                if len(title) > 75:
                    title = title[:72] + "..."
                lines.append(f"  • {title}")
        else:
            lines.append("\n<i>No recent articles</i>")

        return "\n".join(lines)

    def build_report(self, instruments: list[str], confidence_filter: list[str]) -> list[str]:
        """Build full report, splitting into multiple messages if needed."""
        today = datetime.utcnow().strftime("%a, %b %d")

        # Filter label
        if len(confidence_filter) == 3:
            filter_label = "All"
        else:
            filter_label = ", ".join(c.capitalize() for c in confidence_filter)

        header = f"📊 <b>Tradeora Daily</b> — {today}\n📋 Filter: {filter_label} impact\n🟢 Bullish  🔴 Bearish  ⚪ Neutral\n"

        blocks = []
        for inst in instruments:
            data = self.get_instrument_data(inst, confidence_filter)
            block = self.build_instrument_block(inst, data)
            blocks.append(block)

        footer = f"\n🔗 <b>Full analysis:</b> {self.site_url}"

        # Try to fit everything in one message
        separator = "\n\n━━━━━━━━━━━━━━━\n\n"
        full_report = header + "\n" + separator.join(blocks) + "\n" + footer

        if len(full_report) <= MAX_MESSAGE_LENGTH:
            return [full_report]

        # Split into per-instrument messages
        messages = []
        for i, block in enumerate(blocks):
            if i == 0:
                msg = header + "\n" + block
            else:
                msg = block
            if i == len(blocks) - 1:
                msg += "\n" + footer
            if len(msg) > MAX_MESSAGE_LENGTH:
                msg = msg[: MAX_MESSAGE_LENGTH - 3] + "..."
            messages.append(msg)

        return messages

    def send_message(self, chat_id: str, text: str) -> bool:
        """Send a message via Telegram Bot API."""
        try:
            resp = requests.post(
                self.api_url,
                json={
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": True,
                },
                timeout=10,
            )
            if resp.status_code != 200:
                print(f"    Telegram API error: {resp.status_code} {resp.text[:200]}")
                return False
            return True
        except Exception as e:
            print(f"    Telegram send failed: {e}")
            return False

    def send_reports(self):
        """Send daily reports to all connected users."""
        users = self.get_connected_users()
        print(f"  {len(users)} users with Telegram connected")

        success = 0
        failed = 0

        for user in users:
            chat_id = user["telegram_chat_id"]
            instruments = user["telegram_instruments"]
            confidence_filter = user.get("telegram_confidence_filter") or ["high", "medium", "low"]

            if not instruments:
                continue

            print(f"  Sending to user {user['id']} ({len(instruments)} instruments)...")
            messages = self.build_report(instruments, confidence_filter)

            all_sent = True
            for msg in messages:
                if not self.send_message(chat_id, msg):
                    all_sent = False

            if all_sent:
                success += 1
            else:
                failed += 1

        print(f"  Reports sent: {success} success, {failed} failed")
