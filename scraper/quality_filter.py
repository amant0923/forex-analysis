"""
Rule-based article relevance scoring.
No AI — pure keyword matching and heuristics.
Threshold: 40+ to post to Telegram channel.
"""

import re

URGENCY_KEYWORDS = [
    "breaking", "emergency", "rate decision", "declares", "sanctions",
    "invasion", "war ", "shoots down", "nuclear", "default", "collapse",
    "unprecedented", "record high", "record low", "all-time",
    "crashes", "surges", "plunges", "soars", "tanks",
]

NOISE_PATTERNS = [
    r"\d+ things to watch",
    r"\d+ stocks to",
    r"\d+ reasons",
    r"what to expect",
    r"what to watch",
    r"analyst says",
    r"analysts say",
    r"preview:",
    r"opinion:",
    r"editorial:",
    r"podcast:",
    r"video:",
    r"webinar",
    r"subscribe to",
    r"sign up for",
]


THEMATIC_KEYWORDS = [
    "rate hike", "rate cut", "inflation", "deflation", "recession",
    "tariff", "sanctions", "trade war", "quantitative easing", "tapering",
    "yield curve", "inverted", "default", "stimulus", "bailout",
    "gdp", "employment", "unemployment", "nonfarm", "cpi", "ppi",
]


def score_article(
    title: str,
    content: str,
    source_tier: int,
    source_keywords: list[str] | None = None,
    matched_instruments: list[str] | None = None,
    existing_headlines: list[str] | None = None,
    published_at: str | None = None,
) -> dict:
    """
    Score an article for channel posting relevance.

    Returns dict with:
        score (int): 0-100 relevance score
        auto_post (bool): whether this should auto-post (Tier 0 + keyword match only)
        is_urgent (bool): contains urgency keywords
        reasons (list[str]): scoring breakdown
    """
    score = 0
    reasons = []
    title_lower = title.lower()
    content_lower = (content or "").lower()
    text = f"{title_lower} {content_lower}"

    # 1. Source tier score
    tier_scores = {0: 40, 1: 30, 2: 20, 3: 15}
    tier_score = tier_scores.get(source_tier, 10)
    score += tier_score
    reasons.append(f"tier {source_tier}: +{tier_score}")

    # 2. Instrument match
    instruments = matched_instruments or []
    if instruments:
        if len(instruments) >= 2:
            score += 20
            reasons.append(f"direct instrument match ({len(instruments)}): +20")
        else:
            score += 15
            reasons.append(f"instrument match (1): +15")
    else:
        reasons.append("no instrument match: +0")

    # 3. Urgency keywords
    is_urgent = False
    for kw in URGENCY_KEYWORDS:
        if kw in text:
            score += 15
            is_urgent = True
            reasons.append(f"urgency '{kw}': +15")
            break

    # 4. Thematic keyword match
    for kw in THEMATIC_KEYWORDS:
        if kw in text:
            score += 10
            reasons.append(f"thematic '{kw}': +10")
            break

    # 5. Recency bonus
    if published_at:
        try:
            from datetime import datetime, timezone
            pub = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
            age_minutes = (datetime.now(timezone.utc) - pub).total_seconds() / 60
            if age_minutes < 30:
                score += 10
                reasons.append("recency (<30 min): +10")
        except (ValueError, TypeError):
            pass

    # 6. Noise penalty
    for pattern in NOISE_PATTERNS:
        if re.search(pattern, text):
            score -= 30
            reasons.append(f"noise pattern '{pattern}': -30")
            break

    # 5. Tier 0 keyword gate for auto-post
    keyword_match = False
    if source_tier == 0 and source_keywords:
        for kw in source_keywords:
            if kw.lower() in text:
                keyword_match = True
                break

    auto_post = source_tier == 0 and keyword_match

    return {
        "score": max(0, score),
        "auto_post": auto_post,
        "is_urgent": is_urgent,
        "reasons": reasons,
    }
