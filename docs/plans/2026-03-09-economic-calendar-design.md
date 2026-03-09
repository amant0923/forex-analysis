# Economic Calendar Feature Design

**Date:** 2026-03-09
**Data Source:** FinnHub `/calendar/economic` API (free tier, FINNHUB_API_KEY already in .env.example)
**Scope:** Events for USD, EUR, GBP only — mapped to the 7 tracked instruments

---

## 1. Data Layer

New table `economic_events`:
- id, event_name, country (US/EU/GB), currency (USD/EUR/GBP)
- date, time, impact (high/medium/low)
- actual, forecast, previous, unit
- Instrument mapping: USD → DXY/US30/NAS100/SP500, EUR → EURUSD/GER40, GBP → GBPUSD

Daily pipeline step: fetch from FinnHub, filter to USD/EUR/GBP, store in table. Weekly lookahead for upcoming events.

## 2. Dashboard — Upcoming Events Strip

Compact section below market summary strip, above instrument cards:
- Next 5-7 events (today + tomorrow)
- Each: time (local tz), country flag, event name, impact dot (red/orange/gray)
- Past events: actual vs forecast with green/red coloring
- "View Full Calendar" link → /calendar

## 3. Full Calendar Page (`/calendar`)

ForexFactory-style table:
- Columns: Date/Time | Country (flag) | Event | Impact | Actual | Forecast | Previous
- Rows grouped by day with date header
- High-impact: red left border accent
- Past events: green if beat forecast, red if missed
- Future events: "—" in actual column

Filters:
- Currency pills: USD | EUR | GBP (toggle, all default on)
- Impact pills: High | Medium | Low (default High+Medium)
- Instrument pills on each event showing affected instruments

Week selector: Previous Week | This Week | Next Week

## 4. Empty/Error States

- No events for filters: "No events match your filters"
- API down: show cached data with "Last updated X hours ago"
- No data yet: "Economic calendar data will populate after the next pipeline run"

## Files

- Create: `drizzle/0003_economic_events.sql`
- Create: `scraper/economic_calendar.py`
- Create: `src/app/(dashboard)/calendar/page.tsx`
- Create: `src/components/upcoming-events.tsx`
- Modify: `scraper/main.py`
- Modify: `src/lib/queries.ts`
- Modify: `src/types/index.ts`
- Modify: `src/components/dashboard-client.tsx`
