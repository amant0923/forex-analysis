"""Tests for Telegram channel message formatting."""
import pytest
from scraper.channel_poster import format_breaking_news, format_data_release


def test_format_breaking_news_with_bias():
    result = format_breaking_news(
        title="Iran rejects US ceasefire talks, says negotiations are illogical",
        source="Reuters",
        biases={"XAUUSD": {"direction": "bullish", "confidence": 78},
                "USOIL": {"direction": "bullish", "confidence": 82}},
        article_url="https://reuters.com/article/123",
    )
    assert "TRADEORA" in result
    assert "BREAKING" in result
    assert "Iran rejects" in result
    assert "XAUUSD" in result
    assert "Bullish (78%)" in result
    assert "tradeora.com" in result
    assert len(result) <= 4096


def test_format_breaking_news_no_bias():
    result = format_breaking_news(
        title="New technology council announced",
        source="WSJ",
        biases={},
        article_url="https://wsj.com/article/456",
    )
    assert "TRADEORA" in result
    assert "Impact:" not in result  # No biases, no impact section
    assert "tradeora.com" in result


def test_format_data_release():
    result = format_data_release(
        title="US unemployment duration hits 4-year high",
        detail="Average duration jumped +2 weeks to 25.7 weeks in February",
        source="BLS",
        biases={"DXY": {"direction": "bearish", "confidence": 74},
                "XAUUSD": {"direction": "bullish", "confidence": 81}},
    )
    assert "TRADEORA" in result
    assert "unemployment" in result.lower()
    assert "DXY" in result
    assert "Bearish (74%)" in result


def test_message_under_telegram_limit():
    # Even with many instruments, message should stay under 4096
    biases = {f"INST{i}": {"direction": "bullish", "confidence": 50} for i in range(20)}
    result = format_breaking_news(
        title="X" * 200,
        source="Reuters",
        biases=biases,
        article_url="https://example.com",
    )
    assert len(result) <= 4096
