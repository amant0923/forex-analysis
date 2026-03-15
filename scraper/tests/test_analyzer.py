import pytest
from unittest.mock import patch, MagicMock
from scraper.ai_provider import AIProvider
from scraper.analyzer import Analyzer

MOCK_ARTICLES = [
    {"id": 1, "title": "ECB signals rate hike", "content": "ECB hawkish.", "source": "FXStreet", "published_at": "2026-03-09T10:00:00"},
    {"id": 2, "title": "USD weakens on jobs data", "content": "NFP miss.", "source": "CNBC", "published_at": "2026-03-09T09:00:00"},
]


def make_provider_with_response(text: str) -> AIProvider:
    """Create an AIProvider mock that returns the given text."""
    provider = AIProvider()
    provider.complete = MagicMock(return_value=(text, "anthropic", "claude-sonnet-4-6"))
    return provider


def test_analyze_returns_all_timeframes():
    resp_text = '''{
        "daily": {"direction": "bullish", "summary": "...", "key_drivers": ["ECB"], "supporting_articles": [{"article_id": 1, "relevance": "test"}]},
        "1week": {"direction": "bullish", "summary": "...", "key_drivers": ["ECB"], "supporting_articles": []},
        "1month": {"direction": "neutral", "summary": "...", "key_drivers": [], "supporting_articles": []},
        "3month": {"direction": "bearish", "summary": "...", "key_drivers": [], "supporting_articles": []}
    }'''
    provider = make_provider_with_response(resp_text)
    analyzer = Analyzer(provider=provider)
    result, prov, model = analyzer.analyze("EURUSD", MOCK_ARTICLES)
    assert all(tf in result for tf in ["daily", "1week", "1month", "3month"])
    assert result["daily"]["direction"] in ("bullish", "bearish", "neutral")
    assert prov == "anthropic"
    assert model == "claude-sonnet-4-6"


def test_analyze_returns_neutral_on_empty_articles():
    provider = make_provider_with_response("{}")
    analyzer = Analyzer(provider=provider)
    result, prov, model = analyzer.analyze("EURUSD", [])
    assert result["daily"]["direction"] == "neutral"
    assert prov is None
    assert model is None


def test_analyze_handles_malformed_json():
    provider = AIProvider()
    provider.complete = MagicMock(return_value=("This is not JSON", "openai", "gpt-4o"))
    analyzer = Analyzer(provider=provider)
    result, prov, model = analyzer.analyze("EURUSD", MOCK_ARTICLES)
    assert result["daily"]["direction"] in ("bullish", "bearish", "neutral")
