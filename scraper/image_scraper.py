"""
Extract og:image from article URLs for Telegram post attachments.
Filters out generic site logos.
"""

import re
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup

# Known generic logo patterns per domain
GENERIC_LOGO_PATTERNS = [
    r"/logo",
    r"/brand",
    r"/favicon",
    r"/default",
    r"/placeholder",
    r"/icon",
    r"/resources/images",
    r"/pf/resources",
    r"/static/img/site",
]

# Government sources that rarely have useful images — skip entirely
SKIP_IMAGE_DOMAINS = [
    "federalreserve.gov",
    "bls.gov",
    "bea.gov",
    "census.gov",
    "treasury.gov",
    "whitehouse.gov",
    "state.gov",
    "ecb.europa.eu",
    "bankofengland.co.uk",
    "boj.or.jp",
    "rba.gov.au",
    "bankofcanada.ca",
    "rbnz.govt.nz",
    "snb.ch",
    "eia.gov",
    "opec.org",
    "sec.gov",
    "ec.europa.eu",
    "ons.gov.uk",
]


def is_generic_logo(image_url: str, domain: str) -> bool:
    """Check if an image URL looks like a generic site logo rather than article-specific."""
    image_lower = image_url.lower()
    for pattern in GENERIC_LOGO_PATTERNS:
        if re.search(pattern, image_lower):
            return True
    return False


def extract_og_image(article_url: str) -> str | None:
    """
    Fetch an article URL and extract the og:image meta tag.
    Returns None if: no og:image, generic logo, government source, or error.
    """
    try:
        domain = urlparse(article_url).netloc.lower()

        # Skip government/institutional sources
        for skip_domain in SKIP_IMAGE_DOMAINS:
            if skip_domain in domain:
                return None

        resp = requests.get(article_url, timeout=5, headers={
            "User-Agent": "Mozilla/5.0 (compatible; Tradeora/1.0)"
        })
        if resp.status_code != 200:
            return None

        soup = BeautifulSoup(resp.text, "html.parser")
        og_tag = soup.find("meta", property="og:image")
        if not og_tag or not og_tag.get("content"):
            return None

        image_url = og_tag["content"]

        # Filter generic logos
        if is_generic_logo(image_url, domain):
            return None

        return image_url

    except Exception:
        return None
