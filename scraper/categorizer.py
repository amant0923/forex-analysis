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
    "AUDUSD": [
        "audusd", "aud/usd", "aussie dollar", "australian dollar",
        "reserve bank of australia", "rba", "australia gdp",
        "australia cpi", "australia inflation", "australia employment",
        "australia jobs", "iron ore", "australia economy",
    ],
    "USDCAD": [
        "usdcad", "usd/cad", "loonie", "canadian dollar",
        "bank of canada", "boc rate", "canada gdp", "canada cpi",
        "canada inflation", "canada employment", "canada jobs",
        "canada economy", "macklem",
    ],
    "NZDUSD": [
        "nzdusd", "nzd/usd", "kiwi dollar", "new zealand dollar",
        "reserve bank of new zealand", "rbnz", "new zealand gdp",
        "new zealand cpi", "nz inflation", "nz economy",
        "dairy prices", "fonterra", "gdt auction",
    ],
    "USDCHF": [
        "usdchf", "usd/chf", "swissie", "swiss franc",
        "swiss national bank", "snb", "switzerland cpi",
        "swiss inflation", "swiss economy", "jordan snb",
    ],
    "BTCUSD": [
        "btcusd", "btc/usd", "bitcoin", "btc price", "btc rally",
        "bitcoin etf", "bitcoin halving", "crypto market",
        "cryptocurrency", "bitcoin futures", "bitcoin spot",
        "bitcoin mining", "bitcoin regulation",
    ],
    "ETHUSD": [
        "ethusd", "eth/usd", "ethereum", "eth price",
        "ethereum etf", "ethereum upgrade", "defi protocol", "defi market",
        "ethereum staking", "eth 2.0", "ethereum network",
    ],
    "USOIL": [
        "usoil", "wti", "crude oil", "oil price", "oil futures",
        "oil rally", "oil drops", "brent crude", "opec",
        "opec+", "oil inventory", "eia crude", "oil production",
        "oil demand", "petroleum", "energy market",
        "oil supply", "drilling rig", "shale oil",
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

    # Commodity currencies
    "commodity prices": ["AUDUSD", "USDCAD", "NZDUSD"],
    "commodity currencies": ["AUDUSD", "USDCAD", "NZDUSD"],

    # China data affects AUD/NZD
    "china gdp": ["AUDUSD", "NZDUSD"],
    "china pmi": ["AUDUSD", "NZDUSD"],
    "china economy": ["AUDUSD", "NZDUSD"],
    "china trade": ["AUDUSD", "NZDUSD"],

    # Oil affects CAD
    "oil prices": ["USDCAD", "USOIL"],
    "crude oil": ["USDCAD", "USOIL"],
    "opec meeting": ["USDCAD", "USOIL"],
    "opec production": ["USDCAD", "USOIL"],
    "energy prices": ["USOIL"],

    # Crypto themes
    "crypto regulation": ["BTCUSD", "ETHUSD"],
    "crypto market": ["BTCUSD", "ETHUSD"],
    "bitcoin etf": ["BTCUSD"],
    "crypto crash": ["BTCUSD", "ETHUSD"],
    "crypto rally": ["BTCUSD", "ETHUSD"],
    "digital assets": ["BTCUSD", "ETHUSD"],
    "blockchain": ["BTCUSD", "ETHUSD"],

    # Safe haven includes CHF
    "swiss franc": ["USDCHF"],
}


def categorize_article(title: str, content: str) -> list[str]:
    import re
    text = f"{title} {content}".lower()
    matched = set()

    # Direct instrument keyword matching (word-boundary to avoid substring traps
    # like "ether" in "whether", "defi" in "deficit", "oil" in "turmoil")
    for instrument, keywords in INSTRUMENT_KEYWORDS.items():
        for kw in keywords:
            if re.search(r'\b' + re.escape(kw) + r'\b', text):
                matched.add(instrument)
                break

    # Thematic keyword matching
    for theme, instruments in THEMATIC_KEYWORDS.items():
        if re.search(r'\b' + re.escape(theme) + r'\b', text):
            matched.update(instruments)

    return list(matched)
