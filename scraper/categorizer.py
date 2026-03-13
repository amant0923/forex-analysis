INSTRUMENT_KEYWORDS: dict[str, list[str]] = {
    "DXY": [
        "dxy", "dollar index", "us dollar index", "usdx",
        "dollar strength", "dollar weakness", "federal reserve",
        "fed rate", "us cpi", "us inflation", "us jobs",
        "nonfarm payroll", "fomc", "fed chair", "powell",
        "us treasury", "treasury yield", "us gdp",
        "us retail sales", "us pmi", "us manufacturing",
    ],
    "EURUSD": [
        "eurusd", "eur/usd", "euro dollar", "euro zone", "ecb",
        "eurozone", "european central bank", "eu inflation",
        "eu gdp", "lagarde", "euro pmi", "euro cpi",
        "euro area", "eu economy",
    ],
    "GBPUSD": [
        "gbpusd", "gbp/usd", "cable", "pound dollar", "sterling",
        "bank of england", "boe", "uk inflation", "uk gdp",
        "uk cpi", "uk economy", "bailey", "uk pmi",
        "uk retail sales", "uk unemployment",
    ],
    "GER40": [
        "ger40", "dax", "dax40", "german index", "frankfurt",
        "germany economy", "bundesbank", "german gdp",
        "german inflation", "german pmi",
    ],
    "US30": [
        "us30", "dow jones", "djia", "dow 30", "blue chip",
    ],
    "NAS100": [
        "nas100", "nasdaq", "nasdaq100", "ndx", "tech stocks", "qqq",
        "big tech", "faang", "magnificent seven",
    ],
    "SP500": [
        "sp500", "s&p 500", "s&p500", "spx", "spy",
        "us stocks", "wall street", "us equity",
    ],
    "USDJPY": [
        "usdjpy", "usd/jpy", "dollar yen", "bank of japan", "boj",
        "japanese yen", "japan gdp", "japan inflation", "japan cpi",
        "ueda", "yen weakness", "yen strength", "japan rate",
        "japan economy", "tokyo cpi", "japan pmi",
        "yen intervention", "japan wages",
    ],
    "EURJPY": [
        "eurjpy", "eur/jpy", "euro yen",
    ],
    "GBPJPY": [
        "gbpjpy", "gbp/jpy", "pound yen",
    ],
    "EURGBP": [
        "eurgbp", "eur/gbp", "euro pound", "euro sterling",
    ],
    "XAUUSD": [
        "xauusd", "xau/usd", "gold price", "gold spot", "gold futures",
        "gold rally", "gold drops", "gold surges", "gold falls",
        "bullion", "safe haven gold", "gold demand",
        "gold trading", "gold market", "precious metal",
        "gold etf", "central bank gold", "gold reserve",
    ],
    "XAGUSD": [
        "xagusd", "xag/usd", "silver price", "silver spot", "silver futures",
        "silver rally", "silver drops", "silver surges", "silver falls",
        "silver market", "silver trading", "silver demand",
    ],
}

# Thematic keywords that map to multiple instruments at once.
# These catch articles about broad macro themes that affect
# specific instruments without naming them directly.
THEMATIC_KEYWORDS: dict[str, list[str]] = {
    # Safe-haven flows affect gold, yen, and dollar
    "safe haven": ["XAUUSD", "USDJPY"],
    "risk aversion": ["XAUUSD", "USDJPY"],
    "risk-off": ["XAUUSD", "USDJPY"],
    "flight to safety": ["XAUUSD", "USDJPY"],
    "geopolitical risk": ["XAUUSD", "USDJPY"],
    "geopolitical tension": ["XAUUSD", "USDJPY"],

    # Risk-on affects equity indices
    "risk appetite": ["US30", "NAS100", "SP500"],
    "risk-on": ["US30", "NAS100", "SP500"],

    # Carry trade directly affects JPY pairs
    "carry trade": ["USDJPY", "EURJPY", "GBPJPY"],
    "yield differential": ["USDJPY", "EURJPY", "GBPJPY"],

    # Interest rate themes
    "rate hike": ["DXY", "EURUSD", "GBPUSD", "USDJPY"],
    "rate cut": ["DXY", "EURUSD", "GBPUSD", "USDJPY"],
    "monetary policy": ["DXY", "EURUSD", "GBPUSD", "USDJPY"],
    "interest rate decision": ["DXY", "EURUSD", "GBPUSD", "USDJPY"],

    # Inflation themes
    "inflation data": ["DXY", "XAUUSD"],
    "consumer prices": ["DXY", "XAUUSD"],
    "cpi report": ["DXY", "XAUUSD"],

    # Dollar-specific themes
    "dollar rally": ["DXY", "EURUSD", "GBPUSD", "USDJPY", "XAUUSD"],
    "dollar selloff": ["DXY", "EURUSD", "GBPUSD", "USDJPY", "XAUUSD"],
    "dollar weakness": ["DXY", "EURUSD", "GBPUSD", "USDJPY", "XAUUSD"],

    # Commodity / metals themes
    "precious metals": ["XAUUSD", "XAGUSD"],
    "metals market": ["XAUUSD", "XAGUSD"],
    "gold and silver": ["XAUUSD", "XAGUSD"],
    "industrial metals": ["XAGUSD"],
}


def categorize_article(title: str, content: str) -> list[str]:
    text = f"{title} {content}".lower()
    matched = set()

    # Direct instrument keyword matching
    for instrument, keywords in INSTRUMENT_KEYWORDS.items():
        for kw in keywords:
            if kw in text:
                matched.add(instrument)
                break

    # Thematic keyword matching
    for theme, instruments in THEMATIC_KEYWORDS.items():
        if theme in text:
            matched.update(instruments)

    return list(matched)
