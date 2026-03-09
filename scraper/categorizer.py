INSTRUMENT_KEYWORDS: dict[str, list[str]] = {
    "DXY": [
        "dxy", "dollar index", "us dollar index", "usdx",
        "dollar strength", "dollar weakness", "federal reserve",
        "fed rate", "us cpi", "us inflation", "us jobs",
        "nonfarm payroll", "fomc", "fed chair", "powell",
    ],
    "EURUSD": [
        "eurusd", "eur/usd", "euro dollar", "euro zone", "ecb",
        "eurozone", "european central bank", "eu inflation",
        "eu gdp", "lagarde",
    ],
    "GBPUSD": [
        "gbpusd", "gbp/usd", "cable", "pound dollar", "sterling",
        "bank of england", "boe", "uk inflation", "uk gdp",
        "uk cpi", "uk economy", "bailey",
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
    ],
    "SP500": [
        "sp500", "s&p 500", "s&p500", "spx", "spy",
        "us stocks", "wall street", "us equity",
    ],
}


def categorize_article(title: str, content: str) -> list[str]:
    text = f"{title} {content}".lower()
    matched = []
    for instrument, keywords in INSTRUMENT_KEYWORDS.items():
        for kw in keywords:
            if kw in text:
                matched.append(instrument)
                break
    return matched
