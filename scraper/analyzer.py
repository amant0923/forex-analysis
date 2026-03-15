import json

from scraper.ai_provider import AIProvider

NEUTRAL_BIAS = {
    "daily":  {"direction": "neutral", "summary": "Insufficient data", "key_drivers": [], "supporting_articles": []},
    "1week":  {"direction": "neutral", "summary": "Insufficient data", "key_drivers": [], "supporting_articles": []},
    "1month": {"direction": "neutral", "summary": "Insufficient data", "key_drivers": [], "supporting_articles": []},
    "3month": {"direction": "neutral", "summary": "Insufficient data", "key_drivers": [], "supporting_articles": []},
}

SYSTEM_PROMPT = """You are a professional forex and CFD market analyst specializing in fundamental analysis.
You analyze news articles and economic events to determine market bias for financial instruments.
You must respond in valid JSON only — no markdown, no explanation outside the JSON."""

ANALYSIS_PROMPT = """Analyze the following recent news articles for {instrument} and determine the fundamental bias for each timeframe.

Instrument: {instrument}

Articles (each has an ID you must reference in supporting_articles):
{news_text}

Respond ONLY with this exact JSON structure:
{{
  "daily": {{
    "direction": "bullish" | "bearish" | "neutral",
    "summary": "2-3 sentence overview of key drivers for today",
    "key_drivers": ["driver 1", "driver 2", "driver 3"],
    "supporting_articles": [
      {{"article_id": <id>, "relevance": "1 sentence explaining why this article supports the bias"}}
    ]
  }},
  "1week": {{ same structure }},
  "1month": {{ same structure }},
  "3month": {{ same structure }}
}}

Rules:
- Daily bias: based on last 24h of news only
- 1week bias: based on last 7 days of news
- 1month bias: based on last 30 days, consider macro trends
- 3month bias: based on all articles, consider monetary policy trajectory
- supporting_articles MUST reference real article IDs from the list above
- key_drivers should be 2-4 concrete factors (e.g. "ECB hawkish stance", "Weak US NFP data")"""


class Analyzer:
    def __init__(self, provider: AIProvider):
        self.provider = provider

    def analyze(self, instrument: str, articles: list[dict]) -> tuple[dict, str, str]:
        """Analyze articles for an instrument.

        Returns:
            (bias_dict, model_provider, model_name)
        """
        if not articles:
            return NEUTRAL_BIAS, None, None

        news_text = "\n\n".join(
            f"[ID={a['id']}] [{str(a['published_at'])[:10]}] {a['source']}: {a['title']}\n{str(a.get('content', ''))[:500]}"
            for a in articles[:40]
        )

        prompt = ANALYSIS_PROMPT.format(instrument=instrument, news_text=news_text)

        try:
            raw, provider_name, model_name = self.provider.complete(
                system=SYSTEM_PROMPT,
                user=prompt,
                max_tokens=2048,
            )
            return json.loads(raw), provider_name, model_name
        except (json.JSONDecodeError, Exception) as e:
            print(f"[Analyzer] Error analyzing {instrument}: {e}")
            return NEUTRAL_BIAS, None, None
