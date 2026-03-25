"""Tests for notable data detection."""
import pytest
from scraper.data_monitor import detect_notable, NotableResult


def test_new_high_detected():
    result = detect_notable(
        series_name="Unemployment Duration",
        current_value=25.7,
        historical_values=[15.0, 18.0, 20.0, 22.0, 24.0],
    )
    assert result is not None
    assert result.is_notable is True
    assert "high" in result.description.lower()


def test_not_notable_normal_value():
    result = detect_notable(
        series_name="CPI",
        current_value=3.1,
        historical_values=[2.8, 3.0, 3.2, 3.1, 2.9, 3.0],
    )
    assert result is None or result.is_notable is False


def test_large_change_detected():
    result = detect_notable(
        series_name="Crude Inventories",
        current_value=-10.0,  # Large draw
        historical_values=[-2.0, 1.5, -1.0, 0.5, -3.0],
    )
    assert result is not None
    assert result.is_notable is True
