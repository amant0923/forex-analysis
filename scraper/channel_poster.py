"""
Format and send messages to the public Tradeora Telegram channel.
"""

import os
import requests

def _html_escape(text: str) -> str:
    """Escape HTML special chars for Telegram parse_mode=HTML."""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


DIRECTION_EMOJI = {
    "bullish": "\U0001F4C8",   # chart increasing
    "bearish": "\U0001F4C9",   # chart decreasing
    "neutral": "\u2796",       # heavy minus sign
}

SITE_URL = os.environ.get("SITE_URL", "tradeora.com")


def _format_bias_line(instrument: str, bias: dict) -> str:
    """Format a single instrument bias line."""
    direction = bias["direction"].capitalize()
    confidence = bias["confidence"]
    emoji = DIRECTION_EMOJI.get(bias["direction"].lower(), "")
    return f"{instrument:<8} {emoji} {direction} ({confidence}%)"


def _format_impact_section(biases: dict) -> str:
    """Format the Impact section with all instrument biases."""
    if not biases:
        return ""
    lines = ["", "Impact:"]
    # Limit to top 5 instruments to stay within Telegram char limit
    for instrument, bias in list(biases.items())[:5]:
        lines.append(_format_bias_line(instrument, bias))
    return "\n".join(lines)


def _format_footer(primary_instrument: str | None = None) -> str:
    """Format the branded footer."""
    link_instrument = primary_instrument or ""
    link = f"{SITE_URL}/{link_instrument}" if link_instrument else SITE_URL
    return (
        f"\nFull analysis \u2192 {link}"
        f"\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501"
        f"\n\U0001F4CA {SITE_URL} | Free 14-day trial"
    )


def _extract_summary(content: str, max_sentences: int = 3) -> str:
    """Extract the first 2-3 meaningful sentences from article content."""
    if not content or len(content.strip()) < 20:
        return ""
    # Clean up the content
    text = content.strip()
    # Split into sentences (simple approach)
    import re
    sentences = re.split(r'(?<=[.!?])\s+', text)
    # Filter out very short fragments and navigation text
    good_sentences = []
    for s in sentences:
        s = s.strip()
        if len(s) < 15:
            continue
        # Skip navigation/boilerplate
        if any(skip in s.lower() for skip in ["subscribe", "sign up", "click here",
               "read more", "share this", "follow us", "cookie", "privacy policy"]):
            continue
        good_sentences.append(s)
        if len(good_sentences) >= max_sentences:
            break
    return " ".join(good_sentences)


def format_breaking_news(
    title: str,
    source: str,
    biases: dict,
    article_url: str,
    is_urgent: bool = True,
    content: str = "",
    rewritten_summary: str | None = None,
) -> str:
    """Format a breaking news post for the channel."""
    primary = next(iter(biases), None) if biases else None

    # Use AI-rewritten summary if available, otherwise fall back to extraction
    summary = rewritten_summary or _extract_summary(content)

    if rewritten_summary:
        # Kobeissi style: no prefix emoji on headline, just the rewritten content
        parts = [
            "TRADEORA",
            "",
            _html_escape(summary),
        ]
    else:
        prefix = "\U0001F534 BREAKING: " if is_urgent else "\U0001F4F0 "
        safe_title = _html_escape(title)
        parts = [
            "TRADEORA",
            "",
            f"{prefix}{safe_title}",
        ]
        if summary:
            parts.append("")
            parts.append(_html_escape(summary))

    impact = _format_impact_section(biases)
    if impact:
        parts.append(impact)

    parts.append(f"\nSource: {source}")
    parts.append(_format_footer(primary))

    message = "\n".join(parts)

    # Truncate if exceeds Telegram limit
    if len(message) > 4096:
        return message[:4093] + "..."

    return message


def format_data_release(
    title: str,
    detail: str,
    source: str,
    biases: dict,
) -> str:
    """Format a data release post (for auto-generated chart posts)."""
    primary = next(iter(biases), None) if biases else None

    parts = [
        "TRADEORA",
        "",
        f"\U0001F4CA {title}",
        "",
        detail,
    ]

    impact = _format_impact_section(biases)
    if impact:
        parts.append(impact)

    parts.append(f"\nSource: {source}")
    parts.append(_format_footer(primary))

    message = "\n".join(parts)
    return message[:4096]


def send_channel_message(
    channel_id: str,
    text: str,
    image_url: str | None = None,
    chart_path: str | None = None,
    bot_token: str | None = None,
) -> bool:
    """
    Post a message to the public Telegram channel.
    Optionally attach an image (URL) or chart (local file path).
    """
    token = bot_token or os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        print("TELEGRAM_BOT_TOKEN not set, skipping channel post")
        return False

    base_url = f"https://api.telegram.org/bot{token}"

    try:
        if chart_path and os.path.exists(chart_path):
            # Send chart as photo with caption (Telegram photo caption limit: 1024 chars)
            caption = text[:1024]
            with open(chart_path, "rb") as f:
                resp = requests.post(
                    f"{base_url}/sendPhoto",
                    data={"chat_id": channel_id, "caption": caption, "parse_mode": "HTML"},
                    files={"photo": f},
                    timeout=15,
                )
        elif image_url:
            # Send image URL as photo with caption (1024 char limit)
            caption = text[:1024]
            resp = requests.post(
                f"{base_url}/sendPhoto",
                json={"chat_id": channel_id, "photo": image_url, "caption": caption, "parse_mode": "HTML"},
                timeout=15,
            )
        else:
            # Text-only message
            resp = requests.post(
                f"{base_url}/sendMessage",
                json={"chat_id": channel_id, "text": text, "parse_mode": "HTML",
                      "disable_web_page_preview": True},
                timeout=15,
            )

        if resp.status_code == 200:
            return True
        else:
            print(f"Telegram API error: {resp.status_code} {resp.text}")
            return False

    except Exception as e:
        print(f"Failed to send channel message: {e}")
        return False
