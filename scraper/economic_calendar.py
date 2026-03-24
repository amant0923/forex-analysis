"""Scrape ForexFactory economic calendar for USD, EUR, GBP events."""

import re
import urllib.request
from datetime import datetime, date, timedelta

FOREXFACTORY_URL = "https://www.forexfactory.com/calendar?week={}"
TARGET_CURRENCIES = {"USD", "EUR", "GBP", "JPY", "AUD", "CAD", "NZD", "CHF"}

IMPACT_MAP = {
    "red": "high",
    "ora": "high",
    "yel": "medium",
    "gra": "low",
}

# Map currencies to instruments
CURRENCY_INSTRUMENTS = {
    "USD": ["DXY", "USDJPY", "USDCAD", "USDCHF", "XAUUSD", "XAGUSD", "US30", "NAS100", "SP500", "BTCUSD", "ETHUSD", "USOIL"],
    "EUR": ["EURUSD", "EURJPY", "EURGBP", "GER40"],
    "GBP": ["GBPUSD", "GBPJPY", "EURGBP"],
    "JPY": ["USDJPY", "EURJPY", "GBPJPY"],
    "AUD": ["AUDUSD"],
    "CAD": ["USDCAD", "USOIL"],
    "NZD": ["NZDUSD"],
    "CHF": ["USDCHF"],
}

CURRENCY_COUNTRY = {
    "USD": "US",
    "EUR": "EU",
    "GBP": "GB",
    "JPY": "JP",
    "AUD": "AU",
    "CAD": "CA",
    "NZD": "NZ",
    "CHF": "CH",
}


class EconomicCalendarScraper:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }

    def fetch_week(self, week: str = "this") -> list[dict]:
        """Fetch economic events for a given week.

        Args:
            week: "this", "next", or a date string like "mar9.2026"

        Returns:
            List of event dicts with keys: event_name, country, currency,
            event_date, event_time, impact, actual, forecast, previous
        """
        url = FOREXFACTORY_URL.format(week)
        req = urllib.request.Request(url, headers=self.headers)

        try:
            resp = urllib.request.urlopen(req, timeout=15)
            html = resp.read().decode("utf-8", errors="replace")
        except Exception as e:
            print(f"[EconomicCalendar] Failed to fetch {url}: {e}")
            return []

        return self._parse_html(html)

    def fetch_current_and_next_week(self) -> list[dict]:
        """Fetch events for this week and next week."""
        events = []
        for week in ("this", "next"):
            week_events = self.fetch_week(week)
            events.extend(week_events)
            print(f"[EconomicCalendar] {week} week: {len(week_events)} events")
        # Deduplicate by (event_name, event_date, currency)
        seen = set()
        unique = []
        for e in events:
            key = (e["event_name"], e["event_date"], e["currency"])
            if key not in seen:
                seen.add(key)
                unique.append(e)
        return unique

    def _parse_html(self, html: str) -> list[dict]:
        """Parse ForexFactory calendar HTML into event dicts."""
        events = []
        current_date = None

        rows = re.findall(
            r'<tr[^>]*class="[^"]*calendar__row[^"]*"[^>]*>(.*?)</tr>',
            html,
            re.DOTALL,
        )

        for row in rows:
            # Extract date if present
            date_match = re.search(
                r'class="[^"]*calendar__date[^"]*"[^>]*>.*?<span[^>]*>(.*?)</span>',
                row,
                re.DOTALL,
            )
            if date_match:
                date_str = re.sub(r"<[^>]+>", "", date_match.group(1)).strip()
                parsed_date = self._parse_date(date_str)
                if parsed_date:
                    current_date = parsed_date

            if not current_date:
                continue

            # Extract currency
            currency_match = re.search(
                r'class="[^"]*calendar__currency[^"]*"[^>]*>(.*?)</td>',
                row,
                re.DOTALL,
            )
            if not currency_match:
                continue
            currency = re.sub(r"<[^>]+>", "", currency_match.group(1)).strip()
            if currency not in TARGET_CURRENCIES:
                continue

            # Extract event name
            event_match = re.search(
                r'class="[^"]*calendar__event[^"]*"[^>]*>(.*?)</td>',
                row,
                re.DOTALL,
            )
            if not event_match:
                continue
            event_name = re.sub(r"<[^>]+>", "", event_match.group(1)).strip()
            if not event_name:
                continue

            # Extract time
            time_match = re.search(
                r'class="[^"]*calendar__time[^"]*"[^>]*>(.*?)</td>',
                row,
                re.DOTALL,
            )
            event_time = ""
            if time_match:
                event_time = re.sub(r"<[^>]+>", "", time_match.group(1)).strip()

            # Extract impact
            impact_match = re.search(r'icon--ff-impact-(\w+)', row)
            impact_raw = impact_match.group(1) if impact_match else "gra"
            impact = IMPACT_MAP.get(impact_raw, "low")

            # Extract actual, forecast, previous
            actual = self._extract_cell(row, "actual")
            forecast = self._extract_cell(row, "forecast")
            previous = self._extract_cell(row, "previous")

            events.append({
                "event_name": event_name,
                "country": CURRENCY_COUNTRY.get(currency, ""),
                "currency": currency,
                "event_date": current_date.isoformat(),
                "event_time": event_time,
                "impact": impact,
                "actual": actual,
                "forecast": forecast,
                "previous": previous,
            })

        return events

    def _extract_cell(self, row: str, cell_type: str) -> str:
        """Extract a cell value (actual, forecast, previous) from a row."""
        match = re.search(
            rf'class="[^"]*calendar__{cell_type}[^"]*"[^>]*>(.*?)</td>',
            row,
            re.DOTALL,
        )
        if not match:
            return ""
        return re.sub(r"<[^>]+>", "", match.group(1)).strip()

    def _parse_date(self, date_str: str) -> date | None:
        """Parse ForexFactory date string like 'Mon Mar 9' into a date."""
        date_str = date_str.strip()
        if not date_str:
            return None
        # Remove day name prefix
        parts = date_str.split()
        if len(parts) < 2:
            return None
        month_day = " ".join(parts[-2:])  # "Mar 9"
        try:
            parsed = datetime.strptime(month_day, "%b %d")
            year = datetime.now().year
            result = parsed.replace(year=year).date()
            # If the date is more than 6 months in the past, assume next year
            if result < date.today() - timedelta(days=180):
                result = result.replace(year=year + 1)
            return result
        except ValueError:
            return None


def store_events(db, events: list[dict]):
    """Store events in the economic_events table."""
    for event in events:
        db.execute(
            """
            INSERT INTO economic_events (event_name, country, currency, event_date, event_time, impact, actual, forecast, previous, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (event_name, event_date, currency) DO UPDATE SET
                event_time = EXCLUDED.event_time,
                impact = EXCLUDED.impact,
                actual = EXCLUDED.actual,
                forecast = EXCLUDED.forecast,
                previous = EXCLUDED.previous,
                updated_at = NOW()
            """,
            (
                event["event_name"],
                event["country"],
                event["currency"],
                event["event_date"],
                event["event_time"],
                event["impact"],
                event["actual"] or None,
                event["forecast"] or None,
                event["previous"] or None,
            ),
        )
    print(f"[EconomicCalendar] Stored {len(events)} events")
