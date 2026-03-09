import pytest
from unittest.mock import patch, MagicMock
from scraper.analyzer import Analyzer

MOCK_ARTICLES = [
    {"id": 1, "title": "ECB signals rate hike", "content": "ECB hawkish.", "source": "FXStreet", "published_at": "2026-03-09T10:00:00"},
    {"id": 2, "title": "USD weakens on jobs data", "content": "NFP miss.", "source": "CNBC", "published_at": "2026-03-09T09:00:00"},
]


def make_mock_response(text: str):
    mock = MagicMock()
    mock.content = [MagicMock(text=text)]
    return mock


def test_analyze_returns_all_timeframes():
    analyzer = Analyzer(api_key="fake")
    resp = make_mock_response('''{
        "daily": {"direction": "bullish", "summary": "...", "key_drivers": ["ECB"], "supporting_articles": [{"article_id": 1, "relevance": "test"}]},
        "1week": {"direction": "bullish", "summary": "...", "key_drivers": ["ECB"], "supporting_articles": []},
        "1month": {"direction": "neutral", "summary": "...", "key_drivers": [], "supporting_articles": []},
        "3month": {"direction": "bearish", "summary": "...", "key_drivers": [], "supporting_articles": []}
    }''')
    with patch.object(analyzer.client.messages, "create", return_value=resp):
        result = analyzer.analyze("EURUSD", MOCK_ARTICLES)
    assert all(tf in result for tf in ["daily", "1week", "1month", "3month"])
    assert result["daily"]["direction"] in ("bullish", "bearish", "neutral")


def test_analyze_returns_neutral_on_empty_articles():
    analyzer = Analyzer(api_key="fake")
    result = analyzer.analyze("EURUSD", [])
    assert result["daily"]["direction"] == "neutral"


def test_analyze_handles_malformed_json():
    analyzer = Analyzer(api_key="fake")
    resp = make_mock_response("This is not JSON")
    with patch.object(analyzer.client.messages, "create", return_value=resp):
        result = analyzer.analyze("EURUSD", MOCK_ARTICLES)
    assert result["daily"]["direction"] in ("bullish", "bearish", "neutral")
