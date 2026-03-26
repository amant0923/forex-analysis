"""
Rewrite article content into Kobeissi-style punchy summaries using Gemini Flash.
Cost: ~$0.001 per article (~$1/month at 30 articles/day).
"""

import os
from scraper.ai_provider import AIProvider

SYSTEM_PROMPT = """You are a financial news editor for a Telegram channel called Tradeora.
Your job is to rewrite article content into a concise, punchy summary like The Kobeissi Letter.

Rules:
- Write 2-4 short paragraphs, each one key fact or insight
- Lead with the most important number or event
- Include specific data: percentages, dollar amounts, dates, comparisons
- Add historical context when possible ("the highest since...", "the largest since...")
- Each paragraph should be 1-2 sentences max
- NO opinions, NO predictions, NO "analysts say"
- NO filler words like "notably", "importantly", "interestingly"
- NO introductions like "Here's what happened:" or "Let's break this down"
- Just state the facts, punchy and direct
- If the article has no meaningful data/facts, respond with just "SKIP"

Example output style:
"Foreign holdings of US Treasuries surged +$34.8 billion in January, to $9.3 trillion, the 2nd-highest on record.

Japan, the largest foreign-owner, purchased +$39.8 billion, bringing the total to $1.2 trillion, the highest since July 2022."
"""


def rewrite_for_channel(title: str, content: str) -> str | None:
    """
    Rewrite article content into Kobeissi-style summary using Gemini Flash.
    Returns the rewritten text, or None if the article should be skipped.
    """
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_key:
        return None

    if not content or len(content.strip()) < 50:
        return None

    provider = AIProvider()
    provider.add_google(gemini_key, model="gemini-2.0-flash")

    user_prompt = f"""Rewrite this article for our Telegram channel:

Title: {title}

Content: {content[:2000]}

Write 2-4 punchy paragraphs with specific data points. If there's no meaningful data/news, respond with just "SKIP"."""

    try:
        response, _, _ = provider.complete(SYSTEM_PROMPT, user_prompt, max_tokens=300)
        response = response.strip()

        if response.upper() == "SKIP" or len(response) < 20:
            return None

        return response
    except Exception as e:
        print(f"Content rewrite failed: {e}")
        return None
