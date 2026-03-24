import feedparser
import urllib.request
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from bs4 import BeautifulSoup
from scraper.feeds import RSS_FEEDS
from scraper.categorizer import categorize_article

MAX_CONTENT_LENGTH = 3000


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
            summary = entry.get("summary", "") or ""
            url = entry.get("link", "")
            if not url:
                return None
            try:
                published_at = parsedate_to_datetime(entry.get("published", "")).isoformat()
            except Exception:
                published_at = datetime.now(timezone.utc).isoformat()

            # Try to get full article content
            content = self._fetch_full_content(url, summary)

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

    def _fetch_full_content(self, url: str, fallback: str) -> str:
        """Fetch the full article text from the URL. Falls back to RSS summary."""
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            })
            resp = urllib.request.urlopen(req, timeout=8)
            html = resp.read().decode("utf-8", errors="replace")
            soup = BeautifulSoup(html, "html.parser")

            # Remove script, style, nav, footer, header elements
            for tag in soup(["script", "style", "nav", "footer", "header", "aside", "iframe"]):
                tag.decompose()

            # Try common article selectors
            article_el = (
                soup.find("article")
                or soup.find(class_="article-body")
                or soup.find(class_="article-content")
                or soup.find(class_="story-body")
                or soup.find(class_="post-content")
                or soup.find(id="article-body")
            )

            if article_el:
                paragraphs = article_el.find_all("p")
            else:
                paragraphs = soup.find_all("p")

            text = " ".join(p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True))

            if len(text) > 200:
                return text[:MAX_CONTENT_LENGTH]
        except Exception:
            pass

        # Strip HTML from fallback summary
        if "<" in fallback:
            soup = BeautifulSoup(fallback, "html.parser")
            return soup.get_text(strip=True)[:MAX_CONTENT_LENGTH]
        return fallback[:MAX_CONTENT_LENGTH]
