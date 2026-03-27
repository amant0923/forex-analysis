import feedparser
import requests
import urllib.request
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from urllib.parse import urlparse
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

            # Detect paywall-only content (e.g. FT subscription banner)
            paywall_markers = ["per month", "cancel anytime", "digital access",
                               "free trial", "complete access", "unlimited access",
                               "premium content", "already a member", "log in to read",
                               "unlock this article"]
            text_lower = text.lower()
            paywall_hits = sum(1 for m in paywall_markers if m in text_lower)
            if paywall_hits >= 2:
                # Content is mostly paywall text, fall back to RSS summary
                pass
            elif len(text) > 200:
                return text[:MAX_CONTENT_LENGTH]
        except Exception:
            pass

        # Strip HTML from fallback summary
        if "<" in fallback:
            soup = BeautifulSoup(fallback, "html.parser")
            return soup.get_text(strip=True)[:MAX_CONTENT_LENGTH]
        return fallback[:MAX_CONTENT_LENGTH]

    def poll_sources(self, sources: list[dict]) -> list[dict]:
        """
        Poll a list of sources (from sources.py format).
        Returns new articles with source metadata.
        """
        articles = []
        for source in sources:
            try:
                if source.get("scrape_mode") == "html":
                    new_articles = self._poll_html_source(source)
                else:
                    new_articles = self._poll_rss_source(source)
                articles.extend(new_articles)
            except Exception as e:
                print(f"Error polling {source['name']}: {e}")
        return articles

    def _poll_rss_source(self, source: dict) -> list[dict]:
        """Poll a single RSS source and return articles."""
        feed = feedparser.parse(source["url"])
        articles = []
        for entry in feed.entries:
            parsed = self._parse_entry(entry, source["name"])
            if parsed:
                parsed["source_tier"] = source["tier"]
                parsed["source_keywords"] = source.get("keywords")
                parsed["source_name"] = source["name"]
                parsed["source_instruments"] = source["instruments"]
                articles.append(parsed)
        return articles

    def _poll_html_source(self, source: dict) -> list[dict]:
        """Poll a source by scraping its HTML page for new items."""
        try:
            resp = requests.get(source["url"], timeout=10, headers={
                "User-Agent": "Mozilla/5.0 (compatible; Tradeora/1.0)"
            })
            if resp.status_code != 200:
                return []

            soup = BeautifulSoup(resp.text, "html.parser")
            articles = []
            links = (
                soup.select("article a[href]") or
                soup.select(".press-release a[href]") or
                soup.select(".news-item a[href]") or
                soup.select("li a[href]")
            )

            for link in links[:10]:
                title = link.get_text(strip=True)
                href = link.get("href", "")
                if not title or len(title) < 10:
                    continue
                if href.startswith("/"):
                    parsed_url = urlparse(source["url"])
                    href = f"{parsed_url.scheme}://{parsed_url.netloc}{href}"

                articles.append({
                    "title": title,
                    "content": "",
                    "url": href,
                    "source": source["name"],
                    "published_at": datetime.now(timezone.utc).isoformat(),
                    "instruments": source["instruments"],
                    "source_tier": source["tier"],
                    "source_keywords": source.get("keywords"),
                    "source_name": source["name"],
                    "source_instruments": source["instruments"],
                })

            return articles
        except Exception as e:
            print(f"HTML scrape error for {source['name']}: {e}")
            return []
