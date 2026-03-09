import feedparser
from datetime import datetime
from email.utils import parsedate_to_datetime
from scraper.feeds import RSS_FEEDS
from scraper.categorizer import categorize_article


class RssScraper:
    def __init__(self, feeds: list[str] | None = None):
        self.feeds = feeds or RSS_FEEDS

    def scrape(self) -> list[dict]:
        articles = []
        for feed_url in self.feeds:
            try:
                feed = feedparser.parse(feed_url)
                source = feed.get("feed", {}).get("title", feed_url)
                for entry in feed.get("entries", []):
                    article = self._parse_entry(entry, source)
                    if article and article["instruments"]:
                        articles.append(article)
            except Exception as e:
                print(f"[RSS] Error fetching {feed_url}: {e}")
        return articles

    def _parse_entry(self, entry: dict, source: str) -> dict | None:
        try:
            title = entry.get("title", "")
            content = entry.get("summary", "") or ""
            url = entry.get("link", "")
            if not url:
                return None
            try:
                published_at = parsedate_to_datetime(entry.get("published", "")).isoformat()
            except Exception:
                published_at = datetime.utcnow().isoformat()
            instruments = categorize_article(title, content)
            return {
                "title": title,
                "content": content,
                "url": url,
                "source": source,
                "published_at": published_at,
                "instruments": instruments,
            }
        except Exception as e:
            print(f"[RSS] Error parsing entry: {e}")
            return None
