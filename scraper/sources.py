"""
Curated news sources for real-time monitoring.
33 sources across 4 tiers, each with instrument mapping and (for Tier 0) keyword gates.
"""

SOURCES = [
    # ═══════════════════════════════════════════════
    # TIER 0 — Origin Sources (19) — Auto-post with keyword gate
    # ═══════════════════════════════════════════════

    # Central Banks (8)
    {
        "name": "Federal Reserve",
        "url": "https://www.federalreserve.gov/feeds/press_all.xml",
        "tier": 0,
        "category": "central_bank",
        "instruments": ["DXY", "EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "US30", "NAS100", "SP500"],
        "keywords": ["rate", "interest", "monetary policy", "inflation", "fomc", "mpc",
                     "quantitative", "tightening", "easing", "balance sheet", "forward guidance",
                     "statement", "press conference", "federal funds"],
        "scrape_mode": "rss",
    },
    {
        "name": "ECB",
        "url": "https://www.ecb.europa.eu/rss/press.html",
        "tier": 0,
        "category": "central_bank",
        "instruments": ["EURUSD", "EURJPY", "EURGBP", "GER40"],
        "keywords": ["rate", "interest", "monetary policy", "inflation", "governing council",
                     "quantitative", "tightening", "easing", "statement", "press conference"],
        "scrape_mode": "rss",
    },
    {
        "name": "Bank of England",
        "url": "https://www.bankofengland.co.uk/rss/news",
        "tier": 0,
        "category": "central_bank",
        "instruments": ["GBPUSD", "GBPJPY", "EURGBP"],
        "keywords": ["rate", "interest", "monetary policy", "inflation", "mpc",
                     "quantitative", "tightening", "easing", "statement"],
        "scrape_mode": "rss",
    },
    {
        "name": "Bank of Japan",
        "url": "https://www.boj.or.jp/en/whatsnew/index.htm",
        "tier": 0,
        "category": "central_bank",
        "instruments": ["USDJPY", "EURJPY", "GBPJPY"],
        "keywords": ["rate", "interest", "monetary policy", "inflation", "yield curve",
                     "quantitative", "easing", "statement", "yen"],
        "scrape_mode": "html",  # BOJ doesn't have reliable English RSS
    },
    {
        "name": "Reserve Bank of Australia",
        "url": "https://www.rba.gov.au/rss/rss-cb-media-releases.xml",
        "tier": 0,
        "category": "central_bank",
        "instruments": ["AUDUSD"],
        "keywords": ["rate", "interest", "monetary policy", "inflation", "statement", "cash rate"],
        "scrape_mode": "rss",
    },
    {
        "name": "Bank of Canada",
        "url": "https://www.bankofcanada.ca/content_type/press-releases/feed/",
        "tier": 0,
        "category": "central_bank",
        "instruments": ["USDCAD"],
        "keywords": ["rate", "interest", "monetary policy", "inflation", "statement",
                     "overnight rate"],
        "scrape_mode": "rss",
    },
    {
        "name": "Reserve Bank of New Zealand",
        "url": "https://www.rbnz.govt.nz/rss.xml",
        "tier": 0,
        "category": "central_bank",
        "instruments": ["NZDUSD"],
        "keywords": ["rate", "interest", "monetary policy", "inflation", "statement", "ocr"],
        "scrape_mode": "rss",
    },
    {
        "name": "Swiss National Bank",
        "url": "https://www.snb.ch/en/ifor/media/id/media_releases",
        "tier": 0,
        "category": "central_bank",
        "instruments": ["USDCHF"],
        "keywords": ["rate", "interest", "monetary policy", "inflation", "statement"],
        "scrape_mode": "html",
    },

    # US Economic Data (6)
    {
        "name": "Bureau of Labor Statistics",
        "url": "https://www.bls.gov/feed/bls_latest.rss",
        "tier": 0,
        "category": "us_data",
        "instruments": ["DXY", "EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "US30", "NAS100", "SP500"],
        "keywords": ["employment", "unemployment", "nonfarm", "payroll", "cpi",
                     "consumer price", "ppi", "producer price", "inflation", "jobs"],
        "scrape_mode": "rss",
    },
    {
        "name": "Bureau of Economic Analysis",
        "url": "https://www.bea.gov/news/current-releases",
        "tier": 0,
        "category": "us_data",
        "instruments": ["DXY", "US30", "NAS100", "SP500", "XAUUSD"],
        "keywords": ["gdp", "gross domestic", "pce", "personal consumption", "economic growth"],
        "scrape_mode": "html",
    },
    {
        "name": "US Census Bureau",
        "url": "https://www.census.gov/economic-indicators/indicator.xml",
        "tier": 0,
        "category": "us_data",
        "instruments": ["DXY", "US30", "NAS100", "SP500"],
        "keywords": ["retail sales", "housing starts", "trade balance", "trade deficit",
                     "durable goods", "new home"],
        "scrape_mode": "rss",
    },
    {
        "name": "US Treasury",
        "url": "https://home.treasury.gov/system/files/136/treasury-rss.xml",
        "tier": 0,
        "category": "us_data",
        "instruments": ["DXY", "XAUUSD"],
        "keywords": ["sanctions", "debt ceiling", "auction", "fiscal", "tariff"],
        "scrape_mode": "rss",
    },
    {
        "name": "White House",
        "url": "https://news.google.com/rss/search?q=site:whitehouse.gov&hl=en-US&gl=US&ceid=US:en",
        "tier": 0,
        "category": "us_data",
        "instruments": ["DXY", "XAUUSD", "USOIL", "US30", "NAS100", "SP500"],
        "keywords": ["tariff", "trade", "executive order", "sanctions", "emergency",
                     "war", "military", "tax", "economic"],
        "scrape_mode": "rss",
    },
    {
        "name": "US State Department",
        "url": "https://www.state.gov/rss-feed/press-releases/feed/",
        "tier": 0,
        "category": "us_data",
        "instruments": ["XAUUSD", "USOIL"],
        "keywords": ["sanctions", "ceasefire", "peace talks", "military", "conflict",
                     "nuclear", "treaty"],
        "scrape_mode": "rss",
    },

    # European Data (2)
    {
        "name": "Eurostat",
        "url": "https://ec.europa.eu/eurostat/en/web/main/news/euro-indicators",
        "tier": 0,
        "category": "eu_data",
        "instruments": ["EURUSD", "EURJPY", "GER40"],
        "keywords": ["gdp", "inflation", "hicp", "cpi", "unemployment", "employment"],
        "scrape_mode": "html",
    },
    {
        "name": "UK ONS",
        "url": "https://www.ons.gov.uk/rss",
        "tier": 0,
        "category": "uk_data",
        "instruments": ["GBPUSD", "GBPJPY"],
        "keywords": ["gdp", "inflation", "cpi", "unemployment", "employment", "retail"],
        "scrape_mode": "rss",
    },

    # Institutional (3)
    {
        "name": "EIA Weekly Petroleum",
        "url": "https://www.eia.gov/petroleum/supply/weekly/",
        "tier": 0,
        "category": "energy",
        "instruments": ["USOIL", "USDCAD"],
        "keywords": ["inventory", "crude", "petroleum", "oil", "stockpile", "gasoline",
                     "distillate"],
        "scrape_mode": "html",
    },
    {
        "name": "OPEC",
        "url": "https://www.opec.org/opec_web/en/press_room/28.htm",
        "tier": 0,
        "category": "energy",
        "instruments": ["USOIL", "USDCAD"],
        "keywords": ["production", "output", "cut", "quota", "supply", "barrel",
                     "compliance"],
        "scrape_mode": "html",
    },
    {
        "name": "SEC",
        "url": "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=PRESS&dateb=&owner=include&count=40&search_text=&action=getcompany",
        "tier": 0,
        "category": "regulation",
        "instruments": ["BTCUSD", "ETHUSD", "NAS100", "SP500"],
        "keywords": ["etf", "bitcoin", "ethereum", "crypto", "digital asset",
                     "blockchain", "token"],
        "scrape_mode": "html",
    },

    # ═══════════════════════════════════════════════
    # TIER 1 — Wire Services (5) — Review via phone
    # ═══════════════════════════════════════════════
    {
        "name": "Reuters",
        "url": "https://news.google.com/rss/search?q=source:Reuters+when:1d&hl=en-US&gl=US&ceid=US:en",
        "tier": 1,
        "category": "wire",
        "instruments": ["DXY", "EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "USOIL", "US30", "NAS100", "SP500"],
        "scrape_mode": "rss",
    },
    {
        "name": "AP News",
        "url": "https://news.google.com/rss/search?q=site:apnews.com&hl=en-US&gl=US&ceid=US:en",
        "tier": 1,
        "category": "wire",
        "instruments": ["XAUUSD", "USOIL", "DXY", "US30", "NAS100", "SP500"],
        "scrape_mode": "rss",
    },

    {
        "name": "DOD/Pentagon",
        "url": "https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?max=20&ContentType=1&Site=945",
        "tier": 1,
        "category": "wire",
        "instruments": ["XAUUSD", "USOIL", "DXY", "US30", "SP500"],
        "scrape_mode": "rss",
    },

    # ═══════════════════════════════════════════════
    # TIER 2 — Quality Outlets (5) — Review via phone
    # ═══════════════════════════════════════════════
    {
        "name": "Wall Street Journal",
        "url": "https://feeds.a.dj.com/rss/RSSWorldNews.xml",
        "tier": 2,
        "category": "outlet",
        "instruments": ["DXY", "US30", "NAS100", "SP500", "XAUUSD", "USOIL"],
        "scrape_mode": "rss",
    },
    {
        "name": "Financial Times",
        "url": "https://www.ft.com/rss/home",
        "tier": 2,
        "category": "outlet",
        "instruments": ["EURUSD", "GBPUSD", "GER40", "EURGBP"],
        "scrape_mode": "rss",
    },
    {
        "name": "CNBC Markets",
        "url": "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258",
        "tier": 2,
        "category": "outlet",
        "instruments": ["US30", "NAS100", "SP500", "DXY"],
        "scrape_mode": "rss",
    },
    {
        "name": "Axios",
        "url": "https://api.axios.com/feed/",
        "tier": 2,
        "category": "outlet",
        "instruments": ["DXY", "US30", "NAS100", "SP500"],
        "scrape_mode": "rss",
    },
    {
        "name": "Al Jazeera",
        "url": "https://www.aljazeera.com/xml/rss/all.xml",
        "tier": 2,
        "category": "outlet",
        "instruments": ["XAUUSD", "USOIL", "DXY"],
        "scrape_mode": "rss",
    },

    # ═══════════════════════════════════════════════
    # TIER 3 — Specialist Sources (6) — Review via phone
    # ═══════════════════════════════════════════════
    {
        "name": "ForexLive",
        "url": "https://www.forexlive.com/feed",
        "tier": 3,
        "category": "forex",
        "instruments": ["DXY", "EURUSD", "GBPUSD", "USDJPY", "EURJPY", "GBPJPY",
                       "EURGBP", "AUDUSD", "USDCAD", "NZDUSD", "USDCHF"],
        "scrape_mode": "rss",
    },
    {
        "name": "FXStreet",
        "url": "https://www.fxstreet.com/rss",
        "tier": 3,
        "category": "forex",
        "instruments": ["DXY", "EURUSD", "GBPUSD", "USDJPY", "EURJPY", "GBPJPY",
                       "EURGBP", "AUDUSD", "USDCAD", "NZDUSD", "USDCHF"],
        "scrape_mode": "rss",
    },
    {
        "name": "Kitco",
        "url": "https://www.kitco.com/rss/",
        "tier": 3,
        "category": "metals",
        "instruments": ["XAUUSD", "XAGUSD"],
        "scrape_mode": "rss",
    },
    {
        "name": "OilPrice",
        "url": "https://oilprice.com/rss",
        "tier": 3,
        "category": "energy",
        "instruments": ["USOIL"],
        "scrape_mode": "rss",
    },
    {
        "name": "CoinDesk",
        "url": "https://www.coindesk.com/arc/outboundfeeds/rss/",
        "tier": 3,
        "category": "crypto",
        "instruments": ["BTCUSD", "ETHUSD"],
        "scrape_mode": "rss",
    },
    {
        "name": "The Block",
        "url": "https://www.theblock.co/rss.xml",
        "tier": 3,
        "category": "crypto",
        "instruments": ["BTCUSD", "ETHUSD"],
        "scrape_mode": "rss",
    },
]


def get_sources_by_tier(tier: int) -> list[dict]:
    """Return sources matching the given tier."""
    return [s for s in SOURCES if s["tier"] == tier]


def get_poll_interval(tier: int) -> int:
    """Return poll interval in seconds for a given tier."""
    if tier == 0:
        return 60   # 1 minute
    return 180       # 3 minutes


def get_all_rss_urls() -> list[str]:
    """Return flat list of RSS URLs for backward compatibility with feeds.py."""
    return [s["url"] for s in SOURCES if s["scrape_mode"] == "rss"]
