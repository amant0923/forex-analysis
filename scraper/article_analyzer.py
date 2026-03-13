import json
import anthropic

SYSTEM_PROMPT = """You are a senior forex and CFD research analyst at a top investment bank.
You produce institutional-quality analysis of news articles for trading professionals.
You must respond in valid JSON only — no markdown, no explanation outside the JSON."""

ARTICLE_ANALYSIS_PROMPT = """Analyze these news articles and produce summaries and impact analyses.

For each article, generate:
1. A 2-3 paragraph institutional-quality summary
2. For each instrument the article affects, a structured impact analysis

Articles to analyze:
{articles_text}

Instruments each article is tagged with:
{instruments_text}

Respond ONLY with this exact JSON structure:
{{
  "articles": [
    {{
      "id": <article_id>,
      "summary": "2-3 paragraph summary of the article. Write like a Goldman Sachs morning brief — authoritative, concise, factual.",
      "impacts": [
        {{
          "instrument": "EURUSD",
          "event": "1 sentence: what happened",
          "mechanism": "1-2 sentences: the cause-effect chain explaining WHY this affects the instrument",
          "impact_direction": "bullish" | "bearish" | "neutral",
          "impact_timeframes": ["daily", "1week"],
          "confidence": "high" | "medium" | "low",
          "commentary": "3-4 sentence analyst paragraph. Write like a research note — explain the reasoning chain from event to market impact, reference historical precedent if relevant, note any caveats."
        }}
      ]
    }}
  ]
}}

Rules:
- summary must be 2-3 paragraphs, professional tone, no fluff
- event is factual: what happened in the article
- mechanism explains the economic transmission channel (e.g. "Higher rates attract capital inflows, strengthening the currency")
- impact_timeframes: which timeframes this is most relevant to
- confidence: high = direct and clear causal link, medium = indirect or contested, low = speculative
- commentary should read like a research analyst's note — authoritative but measured
- Only include instruments that are actually listed in the instruments_text for each article"""


class ArticleAnalyzer:
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-6"):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model

    def analyze_batch(self, articles: list[dict], article_instruments: dict[int, list[str]]) -> list[dict]:
        """Analyze a batch of articles (up to 10 at a time).

        Args:
            articles: list of article dicts with id, title, content, source, published_at
            article_instruments: mapping of article_id -> list of instrument codes

        Returns:
            list of dicts with id, summary, impacts
        """
        if not articles:
            return []

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
            response = self.client.messages.create(
                model=self.model,
                max_tokens=16000,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = response.content[0].text.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            result = json.loads(raw)
            return result.get("articles", [])
        except (json.JSONDecodeError, Exception) as e:
            print(f"[ArticleAnalyzer] Error: {e}")
            return []
