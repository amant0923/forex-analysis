"""Fetch live quotes from Financial Modeling Prep API."""

import urllib.request
import json

FMP_BASE = "https://financialmodelingprep.com/api/v3"

# FMP symbols for our instruments
FMP_FOREX_PAIRS = {
    "EURUSD": "EURUSD",
    "GBPUSD": "GBPUSD",
}

FMP_INDEX_SYMBOLS = {
    "DXY": "DX-Y.NYB",
    "US30": "^DJI",
    "NAS100": "^NDX",
    "SP500": "^GSPC",
    "GER40": "^GDAXI",
}


class FmpQuoteFetcher:
    def __init__(self, api_key: str):
        self.api_key = api_key

    def fetch_all_quotes(self) -> list[dict]:
        """Fetch quotes for all 7 instruments."""
        quotes = []
        quotes.extend(self._fetch_forex_quotes())
        quotes.extend(self._fetch_index_quotes())
        return quotes

    def _fetch_forex_quotes(self) -> list[dict]:
        """Fetch forex quotes via FMP forex quote endpoint."""
        results = []
        for instrument, symbol in FMP_FOREX_PAIRS.items():
            url = f"{FMP_BASE}/fx/{symbol}?apikey={self.api_key}"
            data = self._get_json(url)
            if data and len(data) > 0:
                q = data[0]
                results.append({
                    "instrument": instrument,
                    "price": q.get("bid") or q.get("ask") or 0,
                    "change": q.get("changes", 0),
                    "change_pct": q.get("changesPercentage", 0),
                    "day_high": q.get("dayHigh", 0),
                    "day_low": q.get("dayLow", 0),
                })
        return results

    def _fetch_index_quotes(self) -> list[dict]:
        """Fetch index quotes via FMP stock quote endpoint."""
        symbols = ",".join(FMP_INDEX_SYMBOLS.values())
        url = f"{FMP_BASE}/quote/{symbols}?apikey={self.api_key}"
        data = self._get_json(url)
        if not data:
            return []

        # Build reverse lookup
        symbol_to_instrument = {v: k for k, v in FMP_INDEX_SYMBOLS.items()}
        results = []
        for q in data:
            instrument = symbol_to_instrument.get(q.get("symbol"))
            if instrument:
                results.append({
                    "instrument": instrument,
                    "price": q.get("price", 0),
                    "change": q.get("change", 0),
                    "change_pct": q.get("changesPercentage", 0),
                    "day_high": q.get("dayHigh", 0),
                    "day_low": q.get("dayLow", 0),
                })
        return results

    def _get_json(self, url: str):
        """Fetch URL and return parsed JSON."""
        try:
            req = urllib.request.Request(url)
            resp = urllib.request.urlopen(req, timeout=10)
            return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            print(f"[FMP] Failed to fetch {url}: {e}")
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
