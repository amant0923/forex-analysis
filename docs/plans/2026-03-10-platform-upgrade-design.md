# Platform Upgrade Design — Live Quotes, TradingView Charts, Sentiment

**Date:** 2026-03-10
**Data Sources:** FMP Starter Plan (quotes), TradingView Widget (charts), Existing AI analysis (sentiment)
**Scope:** Add live prices, interactive charts, and sentiment scoring across all 7 instruments

---

## 1. Data Layer

### FMP Live Quotes
New table `instrument_quotes`:
- instrument, price, change, change_pct, day_high, day_low, updated_at
- Fetched via FMP Forex Quote + Stock Quote endpoints
- Pipeline fetches every run + on-demand refresh via API route

FMP symbol mapping:
- EURUSD → EURUSD, GBPUSD → GBPUSD, DXY → DX-Y.NYB
- US30 → ^DJI, NAS100 → ^NDX, SP500 → ^GSPC, GER40 → ^GDAXI

### Sentiment System (derived from existing data)
Per-instrument sentiment: weighted aggregate of recent article impact_directions
- High confidence = 3x weight, medium = 2x, low = 1x
- Normalised to 0-100 (0 = extreme bearish, 100 = extreme bullish)

Market-wide sentiment (Fear & Greed):
- Composite average of all 7 instrument scores weighted by article volume
- Labels: Extreme Fear (0-20), Fear (20-40), Neutral (40-60), Greed (60-80), Extreme Greed (80-100)

### TradingView Charts
Embedded widgets — no data storage needed.
Symbol mapping:
- EURUSD → FX:EURUSD, GBPUSD → FX:GBPUSD, DXY → TVC:DXY
- US30 → TVC:DJI, NAS100 → NASDAQ:NDX, SP500 → SP:SPX, GER40 → XETR:DAX

## 2. Dashboard Changes

### Instrument Cards
- Top-right: current price + daily % change (green/red)
- Below bias strip: sentiment bar showing bullish % (e.g. "Sentiment: 74% bullish")

### Market Sentiment Strip (new section, above instrument cards)
- Fear & Greed gauge: 0-100 score with label
- Color gradient red → green
- Driver summary text (e.g. "5 of 7 instruments bullish")

### Expanded Accordion
- Compact TradingView widget (300px) above existing timeframe tabs
- Existing bias tabs + headlines stay below

## 3. Instrument Detail Page

- Full-size TradingView widget (500px) between header and timeframe tabs
- Price + change shown in header next to instrument name
- Sentiment section: visual gauge + breakdown (X bullish, Y bearish, Z neutral articles)

## 4. New Files

- `scraper/fmp_quotes.py` — FMP API client
- `drizzle/0004_instrument_quotes.sql` — quotes table
- `src/components/tradingview-widget.tsx` — embed (compact + full)
- `src/components/sentiment-gauge.tsx` — reusable sentiment bar
- `src/components/market-sentiment.tsx` — Fear & Greed strip
- `src/lib/sentiment.ts` — sentiment calculation

## 5. Modified Files

- `src/types/index.ts` — Quote + Sentiment types
- `src/lib/queries.ts` — quote + sentiment queries
- `src/components/dashboard-client.tsx` — prices, sentiment, chart in accordion
- `src/app/(dashboard)/page.tsx` — fetch quotes + sentiment
- `src/app/(dashboard)/[instrument]/page.tsx` — full chart + sentiment
- `scraper/main.py` — FMP quote fetch step
