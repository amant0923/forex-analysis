import json
import anthropic

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
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-6"):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model

    def analyze(self, instrument: str, articles: list[dict]) -> dict:
        if not articles:
            return NEUTRAL_BIAS

        news_text = "\n\n".join(
            f"[ID={a['id']}] [{str(a['published_at'])[:10]}] {a['source']}: {a['title']}\n{str(a.get('content', ''))[:500]}"
            for a in articles[:40]
        )

        prompt = ANALYSIS_PROMPT.format(instrument=instrument, news_text=news_text)

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = response.content[0].text.strip()
            # Strip markdown code fences if present
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            return json.loads(raw)
        except (json.JSONDecodeError, Exception) as e:
            print(f"[Analyzer] Error analyzing {instrument}: {e}")
            return NEUTRAL_BIAS
