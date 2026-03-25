"""Tests for the polling orchestrator."""
import pytest
from unittest.mock import MagicMock


def test_poller_skips_known_urls():
    from scraper.poller import filter_new_articles
    mock_db = MagicMock()
    mock_db.is_url_known.side_effect = lambda url: url == "https://known.com/article"
    articles = [
        {"url": "https://known.com/article", "title": "Old"},
        {"url": "https://new.com/article", "title": "New"},
    ]
    result = filter_new_articles(articles, mock_db)
    assert len(result) == 1
    assert result[0]["title"] == "New"

def test_poller_deduplicates_within_batch():
    from scraper.poller import deduplicate_batch
    articles = [
        {"title": "Fed raises rates by 25bp", "url": "https://a.com/1"},
        {"title": "Fed raises rates by 25bp", "url": "https://b.com/1"},
        {"title": "Iran rejects ceasefire", "url": "https://c.com/1"},
    ]
    result = deduplicate_batch(articles, existing_headlines=[])
    assert len(result) == 2
