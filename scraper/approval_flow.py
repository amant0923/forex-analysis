"""
Draft approval flow for Telegram channel posts.
Sends drafts to admin's private chat with Approve/Skip buttons.
Auto-posts drafts older than 15 minutes.
"""

import json
import os
import requests
from scraper.channel_poster import send_channel_message


def send_draft_for_review(
    admin_chat_id: str,
    draft_id: int,
    formatted_message: str,
    relevance_score: int,
    source_name: str,
    source_tier: int,
    instruments: list[str],
    bot_token: str | None = None,
) -> int | None:
    """
    Send a draft to the admin's private Telegram chat with inline buttons.
    Returns the Telegram message_id or None on failure.
    """
    token = bot_token or os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        return None

    # Build preview message
    instrument_str = ", ".join(instruments[:5])
    preview = (
        f"\U0001F4DD DRAFT \u2014 tap to approve\n\n"
        f"{formatted_message}\n\n"
        f"\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n"
        f"Score: {relevance_score} | Source: {source_name} (Tier {source_tier})\n"
        f"Instruments: {instrument_str}"
    )

    # Inline keyboard with Approve/Skip (compact format, Telegram 64-byte limit)
    keyboard = {
        "inline_keyboard": [[
            {"text": "\u2705 Approve", "callback_data": f"approve:{draft_id}"},
            {"text": "\u274C Skip", "callback_data": f"skip:{draft_id}"},
        ]]
    }

    try:
        resp = requests.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={
                "chat_id": admin_chat_id,
                "text": preview[:4096],
                "reply_markup": keyboard,
                "disable_web_page_preview": True,
            },
            timeout=15,
        )
        if resp.status_code == 200:
            return resp.json()["result"]["message_id"]
        else:
            print(f"Failed to send draft: {resp.status_code} {resp.text}")
            return None
    except Exception as e:
        print(f"Error sending draft: {e}")
        return None


def process_auto_posts(db, channel_id: str, bot_token: str | None = None, timeout_minutes: int = 15) -> int:
    """
    Auto-post any drafts that have been pending longer than timeout_minutes.
    Returns count of auto-posted messages.
    """
    expired_drafts = db.get_pending_drafts(older_than_minutes=timeout_minutes)
    posted = 0

    for draft in expired_drafts:
        success = send_channel_message(
            channel_id=channel_id,
            text=draft["formatted_message"],
            image_url=draft.get("image_url"),
            chart_path=draft.get("chart_path"),
            bot_token=bot_token,
        )
        if success:
            db.update_draft_status(draft["id"], "auto_posted")
            if draft.get("article_id"):
                db.mark_article_posted(draft["article_id"])
            posted += 1

    return posted
