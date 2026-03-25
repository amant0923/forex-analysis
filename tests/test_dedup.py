"""Tests for headline deduplication."""
import pytest
from scraper.dedup import is_duplicate_headline, tokenize


def test_exact_match_is_duplicate():
    assert is_duplicate_headline(
        "Fed raises rates by 25bp",
        ["Fed raises rates by 25bp"]
    ) is True


def test_very_similar_is_duplicate():
    # Nearly identical headlines (only minor word change)
    assert is_duplicate_headline(
        "Fed raises interest rates by 25bp today",
        ["Fed raises interest rates by 25bp"]
    ) is True


def test_similar_but_different_info_not_duplicate():
    # Same topic but significantly different content below 90%
    assert is_duplicate_headline(
        "Fed raises rates by 25bp and signals potential June cut in surprise move",
        ["Fed raises rates by 25bp"]
    ) is False


def test_completely_different_not_duplicate():
    assert is_duplicate_headline(
        "Iran rejects ceasefire talks",
        ["Gold hits record high", "S&P 500 closes at new all-time high"]
    ) is False


def test_empty_existing_headlines():
    assert is_duplicate_headline(
        "Fed raises rates",
        []
    ) is False


def test_tokenize_strips_punctuation():
    tokens = tokenize("BREAKING: Fed raises rates!")
    assert "breaking" not in tokens  # Common word removed
    assert "fed" in tokens
    assert "rates" in tokens
