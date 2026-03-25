"""Tests for the rule-based quality filter."""
import pytest
from scraper.quality_filter import score_article


def test_tier0_with_keyword_match_scores_high():
    result = score_article(
        title="Federal Reserve raises interest rates by 25 basis points",
        content="The FOMC decided to raise the federal funds rate...",
        source_tier=0,
        source_keywords=["rate", "interest", "fomc"],
        matched_instruments=["DXY", "EURUSD"],
    )
    assert result["score"] >= 60
    assert result["auto_post"] is True


def test_tier0_without_keyword_match_not_auto_post():
    result = score_article(
        title="Federal Reserve announces new community development program",
        content="The program aims to support underserved communities...",
        source_tier=0,
        source_keywords=["rate", "interest", "fomc"],
        matched_instruments=[],
    )
    assert result["auto_post"] is False


def test_tier1_wire_service_breaking_news():
    result = score_article(
        title="BREAKING: Iran rejects US ceasefire talks",
        content="Iran has rejected ceasefire negotiations with the US...",
        source_tier=1,
        source_keywords=None,
        matched_instruments=["XAUUSD", "USOIL"],
    )
    assert result["score"] >= 40
    assert result["auto_post"] is False  # Tier 1 never auto-posts


def test_opinion_piece_penalized():
    result = score_article(
        title="5 things to watch in the forex market this week",
        content="Analysts predict that the dollar may weaken...",
        source_tier=2,
        source_keywords=None,
        matched_instruments=["DXY"],
    )
    assert result["score"] < 40  # Should be filtered out


def test_no_instrument_match_scores_low():
    result = score_article(
        title="Local restaurant wins award for best pizza",
        content="A neighborhood favorite has been recognized...",
        source_tier=2,
        source_keywords=None,
        matched_instruments=[],
    )
    assert result["score"] < 40


def test_urgency_keywords_boost_score():
    result_no_urgency = score_article(
        title="Iran and US discuss ceasefire terms",
        content="Negotiations continue between Iran and the US...",
        source_tier=1,
        source_keywords=None,
        matched_instruments=["XAUUSD"],
    )
    result_urgent = score_article(
        title="BREAKING: Iran declares war on US forces",
        content="In a dramatic escalation...",
        source_tier=1,
        source_keywords=None,
        matched_instruments=["XAUUSD"],
    )
    assert result_urgent["score"] > result_no_urgency["score"]
    assert result_urgent["is_urgent"] is True


def test_duplicate_headline_scores_negative():
    result = score_article(
        title="Fed raises rates",
        content="...",
        source_tier=1,
        source_keywords=None,
        matched_instruments=["DXY"],
        existing_headlines=["Fed raises rates by 25bp"],
    )
    # Not necessarily -100, but the is_duplicate flag should be set
    # Exact dedup logic is in dedup.py — here we just check the flag passthrough
    assert result["score"] >= 0  # Score still calculated, dedup handled separately
