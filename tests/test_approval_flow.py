"""Tests for the draft approval flow."""
import pytest
from unittest.mock import patch, MagicMock
from scraper.approval_flow import send_draft_for_review, process_auto_posts


def test_send_draft_for_review_sends_with_buttons():
    with patch("scraper.approval_flow.requests.post") as mock_post:
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {"result": {"message_id": 123}}
        )
        msg_id = send_draft_for_review(
            admin_chat_id="12345",
            draft_id=1,
            formatted_message="TRADEORA\n\nBREAKING: Test",
            relevance_score=72,
            source_name="Reuters",
            source_tier=1,
            instruments=["XAUUSD", "USOIL"],
            bot_token="test_token",
        )
        assert msg_id == 123
        call_args = mock_post.call_args
        payload = call_args[1].get("json") or call_args[0][1] if len(call_args[0]) > 1 else call_args[1]["json"]
        assert "reply_markup" in payload


def test_process_auto_posts_posts_expired_drafts():
    mock_db = MagicMock()
    mock_db.get_pending_drafts.return_value = [
        {"id": 1, "article_id": 10, "formatted_message": "test", "image_url": None, "chart_path": None}
    ]

    with patch("scraper.approval_flow.send_channel_message", return_value=True) as mock_send:
        count = process_auto_posts(mock_db, channel_id="@test", bot_token="tok")
        assert count == 1
        mock_db.update_draft_status.assert_called_with(1, "auto_posted")
        mock_db.mark_article_posted.assert_called_with(10)


def test_process_auto_posts_no_expired():
    mock_db = MagicMock()
    mock_db.get_pending_drafts.return_value = []

    with patch("scraper.approval_flow.send_channel_message") as mock_send:
        count = process_auto_posts(mock_db, channel_id="@test", bot_token="tok")
        assert count == 0
        mock_send.assert_not_called()
