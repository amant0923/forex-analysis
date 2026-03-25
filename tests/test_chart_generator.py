"""Tests for chart generation."""
import pytest
import os
from unittest.mock import patch, MagicMock


def test_generate_chart_creates_file(tmp_path):
    from scraper.chart_generator import generate_chart

    output_path = str(tmp_path / "test_chart.png")
    generate_chart(
        title="US Unemployment Duration",
        subtitle="Average weeks, seasonally adjusted",
        x_labels=["2020", "2021", "2022", "2023", "2024", "2025", "2026"],
        y_values=[15.0, 20.0, 18.0, 19.5, 22.0, 24.0, 25.7],
        source="BLS",
        output_path=output_path,
        highlight_last=True,
    )
    assert os.path.exists(output_path)
    assert os.path.getsize(output_path) > 1000  # Should be a real image


def test_chart_has_reasonable_dimensions(tmp_path):
    from scraper.chart_generator import generate_chart
    from PIL import Image

    output_path = str(tmp_path / "test_chart.png")
    generate_chart(
        title="Test",
        subtitle="Test sub",
        x_labels=["A", "B", "C"],
        y_values=[1, 2, 3],
        source="Test",
        output_path=output_path,
    )
    # bbox_inches="tight" crops whitespace, so dimensions are approximate
    img = Image.open(output_path)
    w, h = img.size
    assert 600 <= w <= 900, f"Width {w} out of expected range"
    assert 350 <= h <= 600, f"Height {h} out of expected range"
