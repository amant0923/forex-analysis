"""Scrape top posts from financial subreddits via Reddit's public JSON API."""

import json
import urllib.request
import time
from datetime import datetime, timezone
from scraper.categorizer import categorize_article

SUBREDDITS = [
    "forex",
    "Gold",
    "silverbugs",
    "economics",
    "StockMarket",
]

MIN_UPVOTES = 20


class RedditScraper:
    """Fetches top posts from financial subreddits (no API key needed)."""

    def __init__(self):
        self.headers = {
            "User-Agent": "ForexAnalysisBot/1.0 (educational project)",
        }

    def scrape(self) -> list[dict]:
        articles = []
        for sub in SUBREDDITS:
            try:
                posts = self._fetch_subreddit(sub)
                articles.extend(posts)
            except Exception as e:
                print(f"[Reddit] Error fetching r/{sub}: {e}")
            time.sleep(2)  # Rate limit: be polite
        return articles

    def _fetch_subreddit(self, subreddit: str) -> list[dict]:
        """Fetch top posts from the last day in a subreddit."""
        url = f"https://www.reddit.com/r/{subreddit}/top.json?t=day&limit=25"
        req = urllib.request.Request(url, headers=self.headers)
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.loads(resp.read().decode("utf-8"))

        articles = []
        for child in data.get("data", {}).get("children", []):
            post = child.get("data", {})

            # Skip low-quality posts
            if post.get("ups", 0) < MIN_UPVOTES:
                continue
            if post.get("is_self") and not post.get("selftext"):
                continue

            title = post.get("title", "")
            content = post.get("selftext", "") or ""
            # Truncate long self-posts
            if len(content) > 3000:
                content = content[:3000]

            permalink = post.get("permalink", "")
            url = f"https://www.reddit.com{permalink}" if permalink else ""
            if not url:
                continue

            created_utc = post.get("created_utc", 0)
            published_at = datetime.fromtimestamp(created_utc, tz=timezone.utc).isoformat() if created_utc else datetime.now(timezone.utc).isoformat()

            instruments = categorize_article(title, content)
            if not instruments:
                continue

            articles.append({
                "title": f"[r/{subreddit}] {title}",
                "content": content,
                "url": url,
                "source": f"Reddit r/{subreddit}",
                "published_at": published_at,
                "instruments": instruments,
            })

        return articles
