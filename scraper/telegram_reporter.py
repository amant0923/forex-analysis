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
        self.site_url = os.getenv("SITE_URL", "forexpulse.com")

    def get_connected_users(self) -> list[dict]:
        """Get all users with telegram connected and instruments selected."""
        cur = self.db.execute(
            """SELECT id, telegram_chat_id, telegram_instruments
               FROM users
               WHERE telegram_chat_id IS NOT NULL
                 AND array_length(telegram_instruments, 1) > 0"""
        )
        return [dict(row) for row in cur.fetchall()]

    def get_todays_data(self, instrument: str) -> dict:
        """Get today's bias and articles for an instrument."""
        # Get latest daily bias
        cur = self.db.execute(
            """SELECT direction, summary, key_drivers
               FROM biases
               WHERE instrument = %s AND timeframe = 'daily'
               ORDER BY generated_at DESC LIMIT 1""",
            (instrument,),
        )
        bias_row = cur.fetchone()
        bias = dict(bias_row) if bias_row else None

        # Get today's articles with analyses
        cur = self.db.execute(
            """SELECT a.id, a.title, aa.impact_direction, aa.confidence
               FROM articles a
               JOIN article_instruments ai ON a.id = ai.article_id
               LEFT JOIN article_analyses aa ON a.id = aa.article_id AND aa.instrument = %s
               WHERE ai.instrument = %s
                 AND a.published_at >= CURRENT_DATE
               ORDER BY a.published_at DESC""",
            (instrument, instrument),
        )
        articles = [dict(row) for row in cur.fetchall()]

        return {"bias": bias, "articles": articles}

    def build_instrument_block(self, instrument: str, data: dict) -> str:
        """Build the report text for one instrument."""
        bias = data["bias"]
        articles = data["articles"]

        if not bias and not articles:
            return f"⚪ <b>{instrument}</b> — No update today"

        direction = bias["direction"] if bias else "neutral"
        emoji = DIRECTION_EMOJI.get(direction, "⚪")
        direction_label = direction.capitalize()

        lines = [f"{emoji} <b>{instrument}</b> — {direction_label} (1D)"]

        # Add summary from bias
        if bias and bias.get("summary"):
            summary = bias["summary"]
            if len(summary) > 120:
                summary = summary[:117] + "..."
            lines.append(summary)

        # Add all headlines
        if articles:
            lines.append("")
            lines.append("Headlines:")
            for article in articles:
                a_dir = article.get("impact_direction")
                a_conf = article.get("confidence")
                a_emoji = DIRECTION_EMOJI.get(a_dir, "—") if a_dir else "—"
                conf_label = a_conf.capitalize() if a_conf else ""
                title = article["title"]
                if len(title) > 80:
                    title = title[:77] + "..."
                badge = f" {a_emoji} {conf_label}" if a_dir else ""
                lines.append(f'→ "{title}"{badge}')

        lines.append(f"🔗 {self.site_url}/{instrument}")

        return "\n".join(lines)

    def build_report(self, instruments: list[str]) -> list[str]:
        """Build full report, splitting into multiple messages if needed."""
        today = datetime.utcnow().strftime("%b %d")
        header = f"📊 <b>ForexPulse Daily</b> — {today}\n"

        blocks = []
        for inst in instruments:
            data = self.get_todays_data(inst)
            block = self.build_instrument_block(inst, data)
            blocks.append(block)

        footer = f"\n🔗 {self.site_url}"

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

            if not instruments:
                continue

            print(f"  Sending to user {user['id']} ({len(instruments)} instruments)...")
            messages = self.build_report(instruments)

            all_sent = True
            for msg in messages:
                if not self.send_message(chat_id, msg):
                    all_sent = False

            if all_sent:
                success += 1
            else:
                failed += 1

        print(f"  Reports sent: {success} success, {failed} failed")
