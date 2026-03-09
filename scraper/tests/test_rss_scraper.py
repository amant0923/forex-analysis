import pytest
from unittest.mock import patch
from scraper.rss_scraper import RssScraper


MOCK_FEED = {
    "feed": {"title": "Test Feed"},
    "entries": [
        {
            "title": "ECB raises rates by 25bps",
            "summary": "The European Central Bank raised interest rates.",
            "link": "https://example.com/ecb-rates",
            "published": "Mon, 09 Mar 2026 10:00:00 GMT",
        },
        {
            "title": "Local sports results",
            "summary": "Football scores from the weekend.",
            "link": "https://example.com/sports",
            "published": "Mon, 09 Mar 2026 09:00:00 GMT",
        },
    ],
}


def test_scrape_returns_list():
    scraper = RssScraper(feeds=["https://fake.com/rss"])
    with patch("scraper.rss_scraper.feedparser.parse", return_value=MOCK_FEED):
        articles = scraper.scrape()
    assert isinstance(articles, list)


def test_scrape_article_has_required_fields():
    scraper = RssScraper(feeds=["https://fake.com/rss"])
    with patch("scraper.rss_scraper.feedparser.parse", return_value=MOCK_FEED):
        articles = scraper.scrape()
    assert len(articles) >= 1
    a = articles[0]
    assert all(k in a for k in ["title", "content", "url", "source", "published_at", "instruments"])


def test_scrape_handles_feed_error_gracefully():
    scraper = RssScraper(feeds=["https://fake.com/rss"])
    with patch("scraper.rss_scraper.feedparser.parse", side_effect=Exception("Network error")):
        articles = scraper.scrape()
    assert articles == []
