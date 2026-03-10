"""Fetch live quotes from FMP Stable API + Yahoo Finance fallback."""

import urllib.request
import json

FMP_STABLE = "https://financialmodelingprep.com/stable"

# Instruments available on FMP Starter plan (one-at-a-time)
FMP_SYMBOLS = {
    "EURUSD": "EURUSD",
    "GBPUSD": "GBPUSD",
    "US30": "%5EDJI",
    "SP500": "%5EGSPC",
}

# Instruments that need Yahoo Finance (not on FMP Starter)
YAHOO_SYMBOLS = {
    "DXY": "DX-Y.NYB",
    "NAS100": "%5ENDX",
    "GER40": "%5EGDAXI",
}

YAHOO_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=1d&interval=1d"


class FmpQuoteFetcher:
    def __init__(self, api_key: str):
        self.api_key = api_key

    def fetch_all_quotes(self) -> list[dict]:
        """Fetch quotes for all 7 instruments."""
        quotes = []
        for instrument, symbol in FMP_SYMBOLS.items():
            q = self._fetch_fmp_quote(instrument, symbol)
            if q:
                quotes.append(q)
        for instrument, symbol in YAHOO_SYMBOLS.items():
            q = self._fetch_yahoo_quote(instrument, symbol)
            if q:
                quotes.append(q)
        return quotes

    def _fetch_fmp_quote(self, instrument: str, symbol: str) -> dict | None:
        """Fetch single quote from FMP stable API."""
        url = f"{FMP_STABLE}/quote?symbol={symbol}&apikey={self.api_key}"
        data = self._get_json(url)
        if not data or len(data) == 0:
            return None
        q = data[0]
        return {
            "instrument": instrument,
            "price": q.get("price", 0),
            "change": q.get("change", 0),
            "change_pct": q.get("changePercentage", 0),
            "day_high": q.get("dayHigh", 0),
            "day_low": q.get("dayLow", 0),
        }

    def _fetch_yahoo_quote(self, instrument: str, symbol: str) -> dict | None:
        """Fetch quote from Yahoo Finance as fallback."""
        url = YAHOO_URL.format(symbol=symbol)
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            })
            resp = urllib.request.urlopen(req, timeout=10)
            data = json.loads(resp.read().decode("utf-8"))
            result = data.get("chart", {}).get("result", [])
            if not result:
                return None
            meta = result[0].get("meta", {})
            price = meta.get("regularMarketPrice", 0)
            prev_close = meta.get("previousClose") or meta.get("chartPreviousClose", 0)
            change = price - prev_close if prev_close else 0
            change_pct = (change / prev_close * 100) if prev_close else 0
            return {
                "instrument": instrument,
                "price": price,
                "change": round(change, 4),
                "change_pct": round(change_pct, 4),
                "day_high": meta.get("regularMarketDayHigh", 0),
                "day_low": meta.get("regularMarketDayLow", 0),
            }
        except Exception as e:
            print(f"[Yahoo] Failed to fetch {instrument}: {e}")
            return None

    def _get_json(self, url: str):
        """Fetch URL and return parsed JSON."""
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            resp = urllib.request.urlopen(req, timeout=10)
            return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            print(f"[FMP] Failed to fetch {url.split('apikey=')[0]}: {e}")
            return None


def store_quotes(db, quotes: list[dict]):
    """Store quotes in instrument_quotes table."""
    for q in quotes:
        db.execute(
            """
            INSERT INTO instrument_quotes (instrument, price, change, change_pct, day_high, day_low, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (instrument) DO UPDATE SET
                price = EXCLUDED.price,
                change = EXCLUDED.change,
                change_pct = EXCLUDED.change_pct,
                day_high = EXCLUDED.day_high,
                day_low = EXCLUDED.day_low,
                updated_at = NOW()
            """,
            (q["instrument"], q["price"], q["change"], q["change_pct"], q["day_high"], q["day_low"]),
        )
    print(f"[FMP] Stored {len(quotes)} quotes")
