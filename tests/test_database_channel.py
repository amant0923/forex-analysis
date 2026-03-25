"""Tests for new channel-related database methods."""
import pytest
from unittest.mock import MagicMock


def test_insert_draft_returns_id():
    from scraper.database import Database
    db = Database.__new__(Database)
    mock_cur = MagicMock()
    mock_cur.fetchone.return_value = {"id": 42}
    db.execute = MagicMock(return_value=mock_cur)

    result = db.insert_draft(
        article_id=1, formatted_message="test", image_url=None,
        chart_path=None, relevance_score=72, source_tier=1
    )
    assert result == 42
    assert "INSERT INTO telegram_drafts" in db.execute.call_args[0][0]


def test_get_pending_drafts_filters_by_age():
    from scraper.database import Database
    db = Database.__new__(Database)
    mock_cur = MagicMock()
    mock_cur.fetchall.return_value = [{"id": 1, "formatted_message": "test"}]
    db.execute = MagicMock(return_value=mock_cur)

    result = db.get_pending_drafts(older_than_minutes=15)
    assert len(result) == 1
    assert "status = 'pending'" in db.execute.call_args[0][0]


def test_upsert_heartbeat():
    from scraper.database import Database
    db = Database.__new__(Database)
    db.execute = MagicMock()

    db.upsert_heartbeat(articles_found=5, errors=None)
    sql = db.execute.call_args[0][0]
    assert "ON CONFLICT" in sql
    assert "poller_heartbeat" in sql
