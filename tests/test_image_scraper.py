"""Tests for og:image extraction."""
import pytest
from unittest.mock import patch, MagicMock
from scraper.image_scraper import extract_og_image, is_generic_logo

SAMPLE_HTML = """
<html><head>
<meta property="og:image" content="https://example.com/article-photo.jpg" />
</head><body></body></html>
"""

SAMPLE_HTML_NO_OG = """
<html><head><title>Test</title></head><body></body></html>
"""

SAMPLE_HTML_GENERIC = """
<html><head>
<meta property="og:image" content="https://www.reuters.com/pf/resources/images/reuters/logo.png" />
</head><body></body></html>
"""


def test_extract_og_image_success():
    with patch("scraper.image_scraper.requests.get") as mock_get:
        mock_get.return_value = MagicMock(
            status_code=200, text=SAMPLE_HTML, headers={"content-type": "text/html"}
        )
        result = extract_og_image("https://example.com/article")
        assert result == "https://example.com/article-photo.jpg"


def test_extract_og_image_no_tag():
    with patch("scraper.image_scraper.requests.get") as mock_get:
        mock_get.return_value = MagicMock(
            status_code=200, text=SAMPLE_HTML_NO_OG, headers={"content-type": "text/html"}
        )
        result = extract_og_image("https://example.com/article")
        assert result is None


def test_extract_og_image_generic_logo_filtered():
    with patch("scraper.image_scraper.requests.get") as mock_get:
        mock_get.return_value = MagicMock(
            status_code=200, text=SAMPLE_HTML_GENERIC, headers={"content-type": "text/html"}
        )
        result = extract_og_image("https://www.reuters.com/article")
        assert result is None  # Generic logo should be filtered


def test_is_generic_logo():
    assert is_generic_logo("https://site.com/logo.png", "site.com") is True
    assert is_generic_logo("https://site.com/articles/photo.jpg", "site.com") is False


def test_extract_og_image_timeout():
    with patch("scraper.image_scraper.requests.get") as mock_get:
        mock_get.side_effect = Exception("timeout")
        result = extract_og_image("https://example.com/article")
        assert result is None
