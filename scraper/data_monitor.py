"""
Monitor economic data from FRED/BLS/EIA and detect notable values.
Triggers chart generation when data is noteworthy.
"""

import os
from dataclasses import dataclass


@dataclass
class NotableResult:
    is_notable: bool
    description: str
    series_name: str
    current_value: float
    comparison: str  # "new_high", "new_low", "large_change", "threshold"


def detect_notable(
    series_name: str,
    current_value: float,
    historical_values: list[float],
    lookback_label: str = "on record",
) -> NotableResult | None:
    """
    Check if a new data point is notable compared to history.
    Returns NotableResult if notable, None otherwise.
    """
    if not historical_values:
        return None

    hist_max = max(historical_values)
    hist_min = min(historical_values)
    hist_mean = sum(historical_values) / len(historical_values)

    # New all-time high
    if current_value > hist_max:
        return NotableResult(
            is_notable=True,
            description=f"{series_name} hits highest level {lookback_label} at {current_value:.1f}",
            series_name=series_name,
            current_value=current_value,
            comparison="new_high",
        )

    # New all-time low
    if current_value < hist_min:
        return NotableResult(
            is_notable=True,
            description=f"{series_name} falls to lowest level {lookback_label} at {current_value:.1f}",
            series_name=series_name,
            current_value=current_value,
            comparison="new_low",
        )

    # Large deviation from mean (> 2 standard deviations)
    if len(historical_values) >= 5:
        import statistics
        stdev = statistics.stdev(historical_values)
        if stdev > 0 and abs(current_value - hist_mean) > 2 * stdev:
            direction = "surges" if current_value > hist_mean else "plunges"
            return NotableResult(
                is_notable=True,
                description=f"{series_name} {direction} to {current_value:.1f}, well beyond recent range",
                series_name=series_name,
                current_value=current_value,
                comparison="large_change",
            )

    return None


def fetch_fred_series(series_id: str, api_key: str | None = None) -> tuple[list[str], list[float]] | None:
    """
    Fetch a data series from FRED API.
    Returns (dates, values) or None on error.
    """
    key = api_key or os.environ.get("FRED_API_KEY")
    if not key:
        print("FRED_API_KEY not set")
        return None

    try:
        from fredapi import Fred
        fred = Fred(api_key=key)
        series = fred.get_series(series_id)
        dates = [d.strftime("%Y-%m") for d in series.index[-60:]]  # Last 60 data points
        values = [float(v) for v in series.values[-60:] if not (v != v)]  # Filter NaN
        return dates, values
    except Exception as e:
        print(f"FRED fetch error for {series_id}: {e}")
        return None


# Mapping of FRED series to monitor with instrument impacts
MONITORED_SERIES = [
    {
        "series_id": "UNRATE",
        "name": "US Unemployment Rate",
        "source": "BLS",
        "instruments": ["DXY", "XAUUSD", "US30", "SP500"],
        "y_format": "percent",
    },
    {
        "series_id": "CPIAUCSL",
        "name": "US Consumer Price Index",
        "source": "BLS",
        "instruments": ["DXY", "XAUUSD", "EURUSD", "US30"],
        "y_format": "number",
    },
    {
        "series_id": "GDP",
        "name": "US Real GDP",
        "source": "BEA",
        "instruments": ["DXY", "US30", "NAS100", "SP500"],
        "y_format": "currency",
    },
    {
        "series_id": "FEDFUNDS",
        "name": "Federal Funds Rate",
        "source": "Federal Reserve",
        "instruments": ["DXY", "EURUSD", "XAUUSD", "US30"],
        "y_format": "percent",
    },
]
