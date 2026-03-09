import pytest
import os
from scraper.database import Database

# These tests require a real Postgres connection.
# Set TEST_DATABASE_URL env var to run them, otherwise skip.
pytestmark = pytest.mark.skipif(
    not os.getenv("TEST_DATABASE_URL"),
    reason="TEST_DATABASE_URL not set"
)


@pytest.fixture
def db():
    d = Database(os.getenv("TEST_DATABASE_URL"))
    yield d
    # Clean up test data
    d.execute("DELETE FROM biases")
    d.execute("DELETE FROM article_instruments")
    d.execute("DELETE FROM articles")
    d.close()


def test_insert_article_returns_id(db):
    article_id = db.insert_article(
        title="ECB holds rates",
        content="ECB decided to hold.",
        url="https://test.com/ecb-1",
        source="Reuters",
        published_at="2026-03-09T10:00:00",
        instruments=["EURUSD", "DXY"]
    )
    assert isinstance(article_id, int)
    assert article_id > 0


def test_duplicate_url_returns_none(db):
    url = "https://test.com/dup-1"
    db.insert_article("Title", "Content", url, "Src", "2026-03-09T10:00:00", ["DXY"])
    result = db.insert_article("Title", "Content", url, "Src", "2026-03-09T10:00:00", ["DXY"])
    assert result is None


def test_insert_and_get_bias(db):
    db.insert_bias(
        instrument="EURUSD",
        timeframe="1week",
        direction="bullish",
        summary="ECB hawkish",
        key_drivers=["ECB rate hike"],
        supporting_articles=[{"article_id": 1, "relevance": "test"}],
        generated_at="2026-03-09T12:00:00"
    )
    assert True
