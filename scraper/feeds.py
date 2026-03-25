"""
RSS feed list. Now sourced from sources.py.
Kept for backward compatibility with rss_scraper.py morning batch.
"""
from scraper.sources import get_all_rss_urls

RSS_FEEDS = get_all_rss_urls()
