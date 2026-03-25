"""Tests for source configuration."""
import pytest


def test_all_sources_have_required_fields():
    from scraper.sources import SOURCES
    required = {"name", "url", "tier", "category", "instruments"}
    for source in SOURCES:
        missing = required - set(source.keys())
        assert not missing, f"Source '{source.get('name', '?')}' missing: {missing}"


def test_tier_0_sources_have_keyword_gate():
    from scraper.sources import SOURCES
    for source in SOURCES:
        if source["tier"] == 0:
            assert "keywords" in source and len(source["keywords"]) > 0, \
                f"Tier 0 source '{source['name']}' missing keyword gate"


def test_source_count():
    from scraper.sources import SOURCES
    assert len(SOURCES) == 35


def test_tiers_are_valid():
    from scraper.sources import SOURCES
    for source in SOURCES:
        assert source["tier"] in (0, 1, 2, 3)


def test_get_sources_by_tier():
    from scraper.sources import get_sources_by_tier
    assert len(get_sources_by_tier(0)) == 19
    assert len(get_sources_by_tier(1)) == 5


def test_get_poll_interval():
    from scraper.sources import get_poll_interval
    assert get_poll_interval(0) == 60
    assert get_poll_interval(1) == 180
