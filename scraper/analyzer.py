import json
from datetime import datetime, timedelta

from scraper.ai_provider import AIProvider

NEUTRAL_BIAS = {
    "daily":  {"direction": "neutral", "summary": "Insufficient data", "key_drivers": [], "supporting_articles": [], "confidence": 0, "confidence_rationale": "No articles available"},
    "1week":  {"direction": "neutral", "summary": "Insufficient data", "key_drivers": [], "supporting_articles": [], "confidence": 0, "confidence_rationale": "No articles available"},
    "1month": {"direction": "neutral", "summary": "Insufficient data", "key_drivers": [], "supporting_articles": [], "confidence": 0, "confidence_rationale": "No articles available"},
    "3month": {"direction": "neutral", "summary": "Insufficient data", "key_drivers": [], "supporting_articles": [], "confidence": 0, "confidence_rationale": "No articles available"},
}

# ── Improvement #3: Instrument-specific analysis context ──────────────────────
INSTRUMENT_CONTEXT = {
    "DXY": "The US Dollar Index measures USD against a basket of 6 currencies. Key drivers: Fed policy, US economic data (NFP, CPI, GDP), Treasury yields, risk sentiment. Strengthen on hawkish Fed, strong data, risk-off flows.",
    "EURUSD": "Euro vs US Dollar — the most liquid forex pair. Key drivers: ECB vs Fed policy divergence, eurozone PMIs, German data, inflation differentials. Inversely correlated with DXY.",
    "GBPUSD": "British Pound vs US Dollar. Key drivers: BoE policy, UK inflation/employment data, Brexit-related developments, gilt yields. Sensitive to political risk.",
    "USDJPY": "US Dollar vs Japanese Yen — a carry trade and risk sentiment barometer. Key drivers: US-Japan yield differential, BoJ policy (YCC), risk appetite. Rises on risk-on, falls on risk-off.",
    "EURJPY": "Euro vs Japanese Yen — a risk sentiment cross. Key drivers: ECB vs BoJ policy, eurozone growth, global risk appetite. Highly correlated with equity markets.",
    "GBPJPY": "British Pound vs Japanese Yen — the most volatile major cross. Key drivers: BoE vs BoJ policy, UK data, risk sentiment. Amplifies GBP and JPY moves.",
    "EURGBP": "Euro vs British Pound. Key drivers: ECB vs BoE policy divergence, relative economic performance of eurozone vs UK. Low volatility, mean-reverting.",
    "XAUUSD": "Gold priced in USD — the ultimate safe haven. Key drivers: real yields (TIPS), USD strength, geopolitical risk, central bank gold buying, VIX. Inversely correlated with real rates and DXY.",
    "XAGUSD": "Silver priced in USD. Key drivers: same as gold PLUS industrial demand (solar, electronics). More volatile than gold, higher beta to risk sentiment.",
    "GER40": "Germany's DAX 40 index. Key drivers: eurozone PMIs, ECB policy, German industrial production, global trade flows, auto sector earnings.",
    "US30": "Dow Jones Industrial Average — 30 large-cap US stocks. Key drivers: US economic data, Fed policy, earnings season, value/cyclical rotation.",
    "NAS100": "Nasdaq 100 — US tech-heavy index. Key drivers: Fed policy (rate sensitivity), big tech earnings, AI/semiconductor developments, growth expectations.",
    "SP500": "S&P 500 — broad US equity benchmark. Key drivers: Fed policy, US economic data, earnings season, credit conditions, VIX.",
    "AUDUSD": "Australian Dollar vs US Dollar — a commodity-linked currency. Key drivers: RBA policy, Australian employment/CPI data, iron ore and copper prices, China economic data (Australia's largest trading partner), risk sentiment.",
    "USDCAD": "US Dollar vs Canadian Dollar — heavily influenced by oil prices. Key drivers: BoC vs Fed policy divergence, crude oil prices (Canada is a major oil exporter), Canadian employment data, US-Canada trade dynamics.",
    "NZDUSD": "New Zealand Dollar vs US Dollar — a commodity and dairy-linked currency. Key drivers: RBNZ policy, NZ GDP/CPI data, global dairy prices (GDT auctions), China demand, risk appetite. Highly correlated with AUDUSD.",
    "USDCHF": "US Dollar vs Swiss Franc — a safe-haven pair. Key drivers: SNB policy, Swiss CPI data, risk sentiment (CHF strengthens in risk-off), US-Swiss yield differential. Inversely correlated with EURUSD in most environments.",
    "BTCUSD": "Bitcoin vs US Dollar — the dominant cryptocurrency. Key drivers: crypto regulation news, institutional adoption (ETF flows), halving cycle, DXY strength (inverse correlation), risk appetite, on-chain metrics, macro liquidity conditions.",
    "ETHUSD": "Ethereum vs US Dollar — the second-largest cryptocurrency. Key drivers: Ethereum network upgrades, DeFi/NFT activity, staking yields, institutional adoption, correlation with BTC, broader crypto regulation, gas fees and network usage.",
    "USOIL": "WTI Crude Oil (West Texas Intermediate). Key drivers: OPEC+ production decisions, US crude inventories (EIA weekly report), global demand outlook (China PMIs), geopolitical risk (Middle East), US shale production, strategic petroleum reserve.",
}

# ── Improvement #7: Cross-instrument consistency groups ───────────────────────
CROSS_INSTRUMENT_RULES = {
    "DXY": "If DXY is bullish, EURUSD/GBPUSD should generally be bearish, and XAUUSD should face headwinds. If DXY is bearish, the opposite applies. Flag any contradictions.",
    "EURUSD": "EURUSD should generally be inverse to DXY. If both are bullish, explain the divergence.",
    "GBPUSD": "GBPUSD should generally be inverse to DXY. Consistent direction with EURUSD unless UK-specific factors diverge.",
    "USDJPY": "USDJPY rises on risk-on (when US30/NAS100/SP500 are bullish) and falls on risk-off. If USDJPY is bullish but indices are bearish, explain the divergence.",
    "EURJPY": "EURJPY correlates with risk appetite. Should generally align with equity index direction. If EURJPY is bullish, equity indices should not be strongly bearish.",
    "GBPJPY": "GBPJPY is the highest-beta risk cross. Should amplify the direction of USDJPY and equity indices.",
    "EURGBP": "EURGBP reflects relative eurozone vs UK strength. Should be consistent with the relative bias of EURUSD vs GBPUSD.",
    "XAUUSD": "Gold is inversely correlated with DXY and real yields. If DXY is strongly bullish, gold should face pressure unless geopolitical risk overrides.",
    "XAGUSD": "Silver follows gold but with higher beta. Should generally align with XAUUSD direction but can diverge on industrial demand.",
    "GER40": "GER40 correlates with global risk sentiment and eurozone economic health. Should generally align with US30/SP500 direction.",
    "US30": "US30 reflects US economic health and risk appetite. Should align with SP500 and generally correlate with NAS100.",
    "NAS100": "NAS100 is rate-sensitive. If Fed is hawkish (DXY bullish), NAS100 should face headwinds. Divergence from US30 suggests tech-specific factors.",
    "SP500": "SP500 is the broadest US equity measure. Should generally align with US30. If SP500 is bearish but USDJPY is bullish, explain the divergence.",
    "AUDUSD": "AUDUSD is a risk-on commodity currency. Should generally align with equity index direction and inverse to DXY. Strengthens on positive China data and rising commodity prices.",
    "USDCAD": "USDCAD is inversely correlated with crude oil prices. If USOIL is bullish, USDCAD should face downward pressure (CAD strengthens). Should partially align with DXY direction.",
    "NZDUSD": "NZDUSD is highly correlated with AUDUSD. If AUDUSD is bullish, NZDUSD should generally be bullish too. Inverse to DXY. Risk-on currency.",
    "USDCHF": "USDCHF tends to move with DXY. CHF is a safe haven — if risk-off sentiment is high and XAUUSD is bullish, USDCHF should face downward pressure. Generally inversely correlated with EURUSD.",
    "BTCUSD": "BTC tends to correlate with risk appetite. If NAS100 is strongly bullish, BTC often follows. Inversely correlated with DXY in most environments. Crypto-specific news can override macro correlations.",
    "ETHUSD": "ETH is highly correlated with BTC. If BTCUSD is bullish, ETHUSD should generally be bullish. ETH-specific catalysts (upgrades, DeFi activity) can cause divergence.",
    "USOIL": "Oil prices inversely affect USDCAD (CAD is petrocurrency). Rising oil tends to be inflationary, potentially supporting DXY if it leads to hawkish Fed. Geopolitical risk premium should align with XAUUSD direction.",
}

SYSTEM_PROMPT = """You are a senior forex and CFD fundamental analyst at a top-tier investment bank.
You analyze news articles, economic events, and price context to determine market bias for financial instruments.
Your analysis must be rigorous, evidence-based, and internally consistent with cross-market dynamics.
You must respond in valid JSON only — no markdown, no explanation outside the JSON."""

ANALYSIS_PROMPT = """Analyze the following data for {instrument} and determine the fundamental bias for each timeframe.

═══ INSTRUMENT CONTEXT ═══
{instrument_context}

═══ CROSS-MARKET CONSISTENCY ═══
{cross_instrument_rule}
{other_biases_context}

═══ CURRENT PRICE CONTEXT ═══
{price_context}

═══ UPCOMING ECONOMIC EVENTS ═══
{economic_events}

═══ HISTORICAL ACCURACY (YOUR PAST PERFORMANCE) ═══
{track_record_context}

═══ NEWS ARTICLES ═══
Articles are ordered by recency. WEIGHT RECENT ARTICLES MORE HEAVILY — a headline from today matters more than one from 5 days ago. Each article shows [RECENCY_WEIGHT] indicating relative importance.

{news_text}

═══ OUTPUT FORMAT ═══
Respond ONLY with this exact JSON structure:
{{
  "daily": {{
    "direction": "bullish" | "bearish" | "neutral",
    "confidence": <integer 1-100>,
    "confidence_rationale": "1 sentence: why confidence is high/low (e.g. strong consensus vs mixed signals)",
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

═══ RULES ═══
- Daily bias: based on last 24h of news only. Weight today's articles highest.
- 1week bias: based on last 7 days of news. Weight this week's articles highest.
- 1month bias: based on last 30 days, consider macro trends and central bank trajectory.
- 3month bias: based on all articles, consider monetary policy cycles and structural shifts.
- confidence: 1-100 score. High (70-100) when multiple sources agree and align with price action. Medium (40-69) when signals are mixed. Low (1-39) when data is sparse or contradictory.
- supporting_articles MUST reference real article IDs from the list above
- key_drivers should be 2-4 concrete factors (e.g. "ECB hawkish stance", "Weak US NFP data")
- INTEGRATE economic event data: if NFP, CPI, or rate decisions are imminent, factor their expected impact into confidence and direction
- CHECK CROSS-MARKET CONSISTENCY: ensure your bias is coherent with related instruments. If contradicting, explain why in the summary.
- CONSIDER PRICE ACTION: if price is trending opposite to news sentiment, note the divergence and adjust confidence accordingly
- LEARN FROM TRACK RECORD: if your past accuracy for this instrument/timeframe is low, be more cautious with confidence scores"""


def _days_ago(published_at) -> int:
    """Calculate how many days ago an article was published."""
    try:
        if isinstance(published_at, str):
            pub = datetime.fromisoformat(published_at.replace("Z", "+00:00")).replace(tzinfo=None)
        else:
            pub = published_at.replace(tzinfo=None) if published_at.tzinfo else published_at
        delta = datetime.utcnow() - pub
        return max(0, delta.days)
    except Exception:
        return 30  # default to old


def _recency_weight(days: int) -> str:
    """Improvement #6: Sentiment decay weighting label."""
    if days == 0:
        return "TODAY — HIGHEST WEIGHT"
    elif days == 1:
        return "YESTERDAY — HIGH WEIGHT"
    elif days <= 3:
        return "RECENT — MEDIUM-HIGH WEIGHT"
    elif days <= 7:
        return "THIS WEEK — MEDIUM WEIGHT"
    elif days <= 14:
        return "LAST 2 WEEKS — LOW-MEDIUM WEIGHT"
    elif days <= 30:
        return "THIS MONTH — LOW WEIGHT"
    else:
        return "OLDER — LOWEST WEIGHT"


class Analyzer:
    def __init__(self, provider: AIProvider):
        self.provider = provider

    def analyze(
        self,
        instrument: str,
        articles: list[dict],
        economic_events: list[dict] | None = None,
        price_data: dict | None = None,
        track_record: dict | None = None,
        other_biases: dict | None = None,
    ) -> tuple[dict, str, str]:
        """Analyze articles for an instrument with full context.

        Args:
            instrument: Instrument code (e.g. "EURUSD")
            articles: List of article dicts with id, title, content, source, published_at
            economic_events: Upcoming economic events relevant to this instrument
            price_data: Current price, change, change_pct for context
            track_record: Past accuracy stats {timeframe: {total, correct, accuracy}}
            other_biases: Already-generated biases for other instruments {instrument: {timeframe: direction}}

        Returns:
            (bias_dict, model_provider, model_name)
        """
        if not articles:
            return NEUTRAL_BIAS, None, None

        # ── Improvement #6: Sort by recency and add decay weights ─────────
        sorted_articles = sorted(
            articles[:40],
            key=lambda a: a.get("published_at", ""),
            reverse=True,  # newest first
        )

        news_text = "\n\n".join(
            f"[ID={a['id']}] [{str(a['published_at'])[:10]}] [RECENCY_WEIGHT: {_recency_weight(_days_ago(a['published_at']))}] {a['source']}: {a['title']}\n{str(a.get('content', ''))[:500]}"
            for a in sorted_articles
        )

        # ── Improvement #3: Instrument-specific context ───────────────────
        instrument_context = INSTRUMENT_CONTEXT.get(instrument, f"{instrument} — analyze based on available news and fundamental factors.")

        # ── Improvement #7: Cross-instrument consistency ──────────────────
        cross_rule = CROSS_INSTRUMENT_RULES.get(instrument, "Ensure your bias is consistent with broader market dynamics.")

        other_biases_text = "No other instrument biases generated yet for this run."
        if other_biases:
            lines = []
            for inst, tf_data in other_biases.items():
                for tf, direction in tf_data.items():
                    lines.append(f"  {inst} {tf}: {direction}")
            if lines:
                other_biases_text = "Already-generated biases this session (check for consistency):\n" + "\n".join(lines)

        # ── Improvement #1: Price data as second input ────────────────────
        price_context = "No price data available."
        if price_data:
            price = price_data.get("price", "N/A")
            change = price_data.get("change", 0)
            change_pct = price_data.get("change_pct", 0)
            day_high = price_data.get("day_high", "N/A")
            day_low = price_data.get("day_low", "N/A")
            trend = "up" if change > 0 else "down" if change < 0 else "flat"
            price_context = (
                f"Current price: {price} | Day change: {change:+.4f} ({change_pct:+.2f}%) — trending {trend}\n"
                f"Day range: {day_low} - {day_high}\n"
                f"NOTE: If price action diverges from news sentiment, lower your confidence and note the divergence."
            )

        # ── Improvement #2: Economic calendar integration ─────────────────
        econ_text = "No upcoming high-impact economic events for this instrument."
        if economic_events:
            event_lines = []
            for ev in economic_events[:10]:  # max 10 events
                impact_marker = "!!!" if ev.get("impact") == "high" else "!!" if ev.get("impact") == "medium" else "!"
                actual = f" Actual: {ev['actual']}" if ev.get("actual") else ""
                forecast = f" Forecast: {ev['forecast']}" if ev.get("forecast") else ""
                previous = f" Previous: {ev['previous']}" if ev.get("previous") else ""
                event_lines.append(
                    f"  {impact_marker} [{ev['event_date']}] {ev['currency']} {ev['event_name']}{actual}{forecast}{previous}"
                )
            if event_lines:
                econ_text = (
                    "Upcoming and recent economic events (!!! = high impact, !! = medium, ! = low):\n"
                    + "\n".join(event_lines)
                    + "\nINTEGRATE THESE: factor upcoming events into direction and confidence. Imminent high-impact events increase uncertainty."
                )

        # ── Improvement #4: Track record feedback loop ────────────────────
        track_text = "No historical accuracy data available yet."
        if track_record:
            lines = []
            for tf, stats in track_record.items():
                if stats.get("total", 0) >= 5:
                    acc = stats.get("accuracy", 0)
                    total = stats["total"]
                    label = "STRONG" if acc >= 65 else "MODERATE" if acc >= 55 else "WEAK"
                    lines.append(f"  {tf}: {acc:.1f}% accuracy ({stats.get('correct', 0)}/{total}) — {label}")
            if lines:
                track_text = (
                    f"Your historical accuracy for {instrument}:\n"
                    + "\n".join(lines)
                    + "\nADJUST CONFIDENCE: if your accuracy for a timeframe is below 55%, lower confidence by 10-15 points and be more cautious."
                )

        # ── Build final prompt ────────────────────────────────────────────
        prompt = ANALYSIS_PROMPT.format(
            instrument=instrument,
            instrument_context=instrument_context,
            cross_instrument_rule=cross_rule,
            other_biases_context=other_biases_text,
            price_context=price_context,
            economic_events=econ_text,
            track_record_context=track_text,
            news_text=news_text,
        )

        try:
            raw, provider_name, model_name = self.provider.complete(
                system=SYSTEM_PROMPT,
                user=prompt,
                max_tokens=3000,
            )
            result = json.loads(raw)

            # Ensure confidence fields exist with defaults
            for tf in ("daily", "1week", "1month", "3month"):
                if tf in result:
                    result[tf].setdefault("confidence", 50)
                    result[tf].setdefault("confidence_rationale", "")

            return result, provider_name, model_name
        except (json.JSONDecodeError, Exception) as e:
            print(f"[Analyzer] Error analyzing {instrument}: {e}")
            return NEUTRAL_BIAS, None, None
