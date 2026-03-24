import json

from scraper.ai_provider import AIProvider

SYSTEM_PROMPT = """You are a forex/CFD analyst. Analyze news articles and return valid JSON only."""

ARTICLE_ANALYSIS_PROMPT = """Analyze these articles. For each: summarize it and assess impact on tagged instruments.

{articles_text}

Tagged instruments:
{instruments_text}

Return this JSON exactly:
{{
  "articles": [
    {{
      "id": 123,
      "summary": "2-3 sentence summary of what happened and why it matters.",
      "impacts": [
        {{
          "instrument": "EURUSD",
          "event": "what happened",
          "mechanism": "why it affects this instrument",
          "impact_direction": "bullish",
          "impact_timeframes": ["daily", "1week"],
          "confidence": "high",
          "commentary": "1-2 sentence analysis of the market implication."
        }}
      ]
    }}
  ]
}}

Example for one article:
{{
  "articles": [
    {{
      "id": 999,
      "summary": "The Fed held rates at 5.5% but signaled two cuts in 2025. Markets rallied on the dovish pivot, with Treasury yields dropping sharply.",
      "impacts": [
        {{
          "instrument": "DXY",
          "event": "Fed holds rates, signals 2025 cuts",
          "mechanism": "Dovish forward guidance weakens USD as rate differential narrows",
          "impact_direction": "bearish",
          "impact_timeframes": ["daily", "1week", "1month"],
          "confidence": "high",
          "commentary": "Clear dovish shift from the Fed. USD likely to weaken as markets price in earlier cuts."
        }},
        {{
          "instrument": "XAUUSD",
          "event": "Fed signals rate cuts",
          "mechanism": "Lower real yields reduce opportunity cost of holding gold",
          "impact_direction": "bullish",
          "impact_timeframes": ["1week", "1month"],
          "confidence": "high",
          "commentary": "Gold benefits directly from falling real yields and a weaker dollar."
        }}
      ]
    }}
  ]
}}

Rules:
- impact_direction: "bullish", "bearish", or "neutral"
- confidence: "high" (direct causal link), "medium" (indirect), "low" (speculative)
- Only include instruments listed in tagged instruments for each article
- summary: concise, factual, no filler"""


class ArticleAnalyzer:
    def __init__(self, provider: AIProvider):
        self.provider = provider

    def analyze_batch(self, articles: list[dict], article_instruments: dict[int, list[str]]) -> tuple[list[dict], str, str]:
        """Analyze a batch of articles (up to 10 at a time).

        Args:
            articles: list of article dicts with id, title, content, source, published_at
            article_instruments: mapping of article_id -> list of instrument codes

        Returns:
            (list of dicts with id/summary/impacts, model_provider, model_name)
        """
        if not articles:
            return [], None, None

        articles_text = "\n\n---\n\n".join(
            f"[ARTICLE ID={a['id']}]\nTitle: {a['title']}\nSource: {a.get('source', 'Unknown')}\nDate: {str(a.get('published_at', ''))[:10]}\nContent:\n{str(a.get('content', ''))[:800]}"
            for a in articles
        )

        instruments_text = "\n".join(
            f"Article {aid}: {', '.join(insts)}"
            for aid, insts in article_instruments.items()
            if insts
        )

        prompt = ARTICLE_ANALYSIS_PROMPT.format(
            articles_text=articles_text,
            instruments_text=instruments_text,
        )

        try:
            raw, provider_name, model_name = self.provider.complete(
                system=SYSTEM_PROMPT,
                user=prompt,
                max_tokens=6000,
            )
            result = json.loads(raw)
            return result.get("articles", []), provider_name, model_name
        except Exception as e:
            print(f"[ArticleAnalyzer] Error: {e}")
            return [], None, None
