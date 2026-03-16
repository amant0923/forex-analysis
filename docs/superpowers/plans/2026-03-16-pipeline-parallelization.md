# Pipeline Parallelization & Schedule Update

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce pipeline runtime from ~1h20m to ~20-30m by parallelizing AI calls, batch translations for cost efficiency, and update cron to every 8 hours.

**Architecture:** Use `concurrent.futures.ThreadPoolExecutor` for parallelism. Step 2.5 (article analysis) runs batches concurrently with max 3 workers. Step 5 (bias generation) uses wave-based execution — instruments grouped by dependency so cross-instrument context is preserved, with max 4 concurrent within each wave. Step 6.5 (translations) batches 8 biases per AI call instead of 1. Cron changes from `0 6,14,22` to `0 0,8,16`.

**Tech Stack:** Python 3.11, concurrent.futures (stdlib), psycopg2, Anthropic/OpenAI/Google AI SDKs

---

## Key Design Decisions

### Thread safety
- `Database` uses `autocommit=True` and creates a new cursor per `execute()` call. psycopg2 connections are thread-safe (access is serialized internally). Since AI calls dominate runtime (30-60s each vs <100ms for DB), DB serialization is not a bottleneck.
- `AIProvider.complete()` uses HTTP clients (anthropic, openai, google) which are thread-safe for concurrent requests.
- `generated_biases` dict is shared across waves but writes only happen within a wave, and waves are sequential. Within a wave, threads only read from previous waves — no race conditions.

### Rate limit safety
- Anthropic Tier 1: 50 RPM, 40K input TPM. With max 4 concurrent bias calls, peak is ~4 requests in rapid succession then waiting 30-60s for responses. Well within limits.
- Article analysis: max 3 concurrent, each batch is one large request. ~3 requests in burst then waiting.
- Translation: batching 8 biases per call reduces 80 calls to ~10 calls. Minimal rate pressure.

### Wave groups for Step 5 (bias generation)
Instruments are ordered so that cross-instrument context flows correctly:
1. **DXY** — foundation, affects all USD pairs
2. **USD majors** — EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD, NZDUSD, USDCHF (reference DXY)
3. **Crosses** — EURJPY, GBPJPY, EURGBP (reference majors)
4. **Commodities + Crypto** — XAUUSD, XAGUSD, USOIL, BTCUSD, ETHUSD (reference DXY, indices)
5. **Indices** — GER40, US30, NAS100, SP500 (reference DXY, USD pairs)

## File Map

- Modify: `.github/workflows/daily-scrape.yml` — cron schedule
- Modify: `scraper/main.py` — parallelize Steps 2.5, 5, and 6.5
- Modify: `scraper/translate_biases.py` — batch translation (8 per call)

---

## Chunk 1: Cron Schedule + Step 2.5 Parallelization

### Task 1: Update cron schedule

**Files:**
- Modify: `.github/workflows/daily-scrape.yml:5`

- [ ] **Step 1: Update the cron expression**

Change line 5 from:
```yaml
    - cron: '0 6,14,22 * * *'
```
To:
```yaml
    - cron: '0 0,8,16 * * *'
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/daily-scrape.yml
git commit -m "chore: change scraper schedule to every 8h starting at 00:00 UTC"
```

### Task 2: Parallelize Step 2.5 (article analysis)

**Files:**
- Modify: `scraper/main.py:98-148`

- [ ] **Step 1: Add ThreadPoolExecutor import**

At top of `scraper/main.py`, add:
```python
from concurrent.futures import ThreadPoolExecutor, as_completed
```

- [ ] **Step 2: Extract batch processing into a function**

Add this function before `run()` in `scraper/main.py`:

```python
def _analyze_article_batch(batch, db, article_analyzer):
    """Process a single batch of articles for analysis. Thread-safe."""
    article_instruments = {}
    for a in batch:
        cur = db.execute(
            "SELECT instrument FROM article_instruments WHERE article_id = %s",
            (a["id"],),
        )
        article_instruments[a["id"]] = [row["instrument"] for row in cur.fetchall()]

    results, art_provider, art_model = article_analyzer.analyze_batch(batch, article_instruments)

    stored = 0
    for art_result in results:
        aid = art_result.get("id")
        if not aid:
            continue
        summary = art_result.get("summary", "")
        if summary:
            db.update_article_summary(aid, summary)
        for impact in art_result.get("impacts", []):
            try:
                db.insert_article_analysis(
                    article_id=aid,
                    instrument=impact["instrument"],
                    event=impact["event"],
                    mechanism=impact["mechanism"],
                    impact_direction=impact["impact_direction"],
                    impact_timeframes=impact.get("impact_timeframes", []),
                    confidence=impact.get("confidence", "medium"),
                    commentary=impact["commentary"],
                    model_provider=art_provider,
                    model_name=art_model,
                )
            except Exception as e:
                print(f"    Error storing analysis for article {aid}: {e}")
        stored += 1
    return stored
```

- [ ] **Step 3: Replace the Step 2.5 loop with parallel execution**

Replace the Step 2.5 section (lines ~98-148) with:

```python
    # Step 2.5: Per-article analysis
    print("\nStep 2.5: Generating per-article AI analysis...")
    article_analyzer = ArticleAnalyzer(provider=ai_provider)
    unanalyzed = db.get_unanalyzed_articles(days=7)
    print(f"  {len(unanalyzed)} articles need analysis")

    # Split into batches of 8
    batches = [unanalyzed[i:i + 8] for i in range(0, len(unanalyzed), 8)]
    total_analyzed = 0

    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(_analyze_article_batch, batch, db, article_analyzer): i
            for i, batch in enumerate(batches)
        }
        for future in as_completed(futures):
            batch_num = futures[future] + 1
            try:
                count = future.result()
                total_analyzed += count
                print(f"  Batch {batch_num}/{len(batches)}: analyzed {count} articles")
            except Exception as e:
                print(f"  Batch {batch_num}/{len(batches)}: failed — {e}")

    print(f"  Total: {total_analyzed} articles analyzed")
```

- [ ] **Step 4: Test locally (dry run)**

```bash
cd /Users/a/Desktop/forex-analysis
python -c "from scraper.main import run; print('imports OK')"
```

- [ ] **Step 5: Commit**

```bash
git add scraper/main.py
git commit -m "perf: parallelize article analysis with 3 concurrent batches"
```

---

## Chunk 2: Step 5 Wave-Based Bias Generation

### Task 3: Parallelize Step 5 (bias generation) with waves

**Files:**
- Modify: `scraper/main.py:180-269`

- [ ] **Step 1: Add wave configuration**

Add this constant after `TIMEFRAME_SETTLE_DAYS` (line ~28) in `scraper/main.py`:

```python
# Instrument waves for parallel bias generation.
# Each wave runs in parallel; waves run sequentially so cross-instrument
# context from earlier waves is available to later ones.
INSTRUMENT_WAVES = [
    ["DXY"],                                                    # Foundation
    ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "NZDUSD", "USDCHF"],  # USD majors
    ["EURJPY", "GBPJPY", "EURGBP"],                            # Crosses
    ["XAUUSD", "XAGUSD", "USOIL", "BTCUSD", "ETHUSD"],        # Commodities + Crypto
    ["GER40", "US30", "NAS100", "SP500"],                       # Indices
]
```

- [ ] **Step 2: Extract single-instrument bias analysis into a function**

Add this function before `run()`:

```python
def _analyze_instrument_bias(instrument, db, analyzer, now, all_quotes, econ_by_instrument, track_records, generated_biases):
    """Analyze bias for a single instrument. Thread-safe (reads generated_biases, no writes)."""
    articles_for_inst = db.get_articles_for_instrument(instrument, days=90)
    print(f"    {instrument}: {len(articles_for_inst)} articles in last 90 days")

    if not articles_for_inst:
        print(f"    {instrument}: skipped — no articles")
        return instrument, None, None, None

    bias, bias_provider, bias_model = analyzer.analyze(
        instrument=instrument,
        articles=articles_for_inst,
        economic_events=econ_by_instrument.get(instrument, []),
        price_data=all_quotes.get(instrument),
        track_record=track_records.get(instrument),
        other_biases=generated_biases,
    )

    # Store biases and outcomes
    for timeframe, result in bias.items():
        bias_id = db.insert_bias(
            instrument=instrument,
            timeframe=timeframe,
            direction=result["direction"],
            summary=result.get("summary", ""),
            key_drivers=result.get("key_drivers", []),
            supporting_articles=result.get("supporting_articles", []),
            generated_at=now,
            model_provider=bias_provider,
            model_name=bias_model,
            confidence=result.get("confidence"),
            confidence_rationale=result.get("confidence_rationale"),
        )
        if bias_id:
            price = db.get_instrument_price(instrument)
            if price:
                from datetime import timedelta
                settle_days = TIMEFRAME_SETTLE_DAYS.get(timeframe, 7)
                settles_at = (datetime.utcnow() + timedelta(days=settle_days)).isoformat()
                db.insert_bias_outcome(
                    bias_id=bias_id,
                    instrument=instrument,
                    timeframe=timeframe,
                    predicted_direction=result["direction"],
                    open_price=price,
                    generated_at=now,
                    settles_at=settles_at,
                )

    d = bias.get("daily", {}).get("direction", "?").upper()
    w = bias.get("1week", {}).get("direction", "?").upper()
    m = bias.get("1month", {}).get("direction", "?").upper()
    q = bias.get("3month", {}).get("direction", "?").upper()
    dc = bias.get("daily", {}).get("confidence", "?")
    wc = bias.get("1week", {}).get("confidence", "?")
    print(f"    {instrument}: Daily={d}({dc}%) 1W={w}({wc}%) 1M={m} 3M={q}")

    return instrument, bias, bias_provider, bias_model
```

- [ ] **Step 3: Replace the Step 5 instrument loop with wave-based parallel execution**

Replace the Step 5 section (lines ~180-269) with:

```python
    # Step 5: Generate AI bias analysis (with economic events, price context, track record)
    print("\nStep 5: Generating AI bias analysis (with economic events, price context, track record)...")
    now = datetime.utcnow().isoformat()

    # Pre-load track record stats per instrument
    print("  Loading historical accuracy data...")
    track_records = {}
    for instrument in INSTRUMENTS:
        track_records[instrument] = db.get_instrument_track_record(instrument)

    # Build economic events index by instrument
    from scraper.economic_calendar import CURRENCY_INSTRUMENTS as ECON_CURRENCY_MAP
    econ_by_instrument = {inst: [] for inst in INSTRUMENTS}
    for ev in all_economic_events:
        currency = ev.get("currency", "")
        for inst in ECON_CURRENCY_MAP.get(currency, []):
            if inst in econ_by_instrument:
                econ_by_instrument[inst].append(ev)

    # Wave-based parallel execution: each wave completes before the next starts,
    # so cross-instrument context accumulates correctly.
    generated_biases = {}

    for wave_num, wave_instruments in enumerate(INSTRUMENT_WAVES, 1):
        # Filter to instruments that exist in INSTRUMENTS list
        wave = [inst for inst in wave_instruments if inst in INSTRUMENTS]
        if not wave:
            continue

        print(f"\n  Wave {wave_num}/{len(INSTRUMENT_WAVES)}: {', '.join(wave)}")

        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = {
                executor.submit(
                    _analyze_instrument_bias,
                    inst, db, analyzer, now, all_quotes,
                    econ_by_instrument, track_records, generated_biases,
                ): inst
                for inst in wave
            }
            for future in as_completed(futures):
                inst = futures[future]
                try:
                    instrument, bias, _, _ = future.result()
                    if bias:
                        # Record for cross-instrument context in subsequent waves
                        generated_biases[instrument] = {
                            tf: data.get("direction", "neutral")
                            for tf, data in bias.items()
                        }
                except Exception as e:
                    print(f"    {inst}: failed — {e}")
```

- [ ] **Step 4: Test imports**

```bash
python -c "from scraper.main import run; print('imports OK')"
```

- [ ] **Step 5: Commit**

```bash
git add scraper/main.py
git commit -m "perf: wave-based parallel bias generation (4 concurrent per wave)"
```

---

## Chunk 3: Translation Batching

### Task 4: Batch translations (8 per AI call)

**Files:**
- Modify: `scraper/translate_biases.py`

- [ ] **Step 1: Replace the entire translate_biases.py with batched version**

The current code makes 1 AI call per bias. With 80 biases per run, that's 80 API calls just for translations. Batching 8 biases per call reduces this to 10 calls.

Replace the full content of `scraper/translate_biases.py` with:

```python
"""Translate bias summaries to Spanish using AI, batched for efficiency."""

import json


TRANSLATE_SYSTEM = """You are a professional financial translator specializing in forex and CFD market analysis.
Translate market analysis text from English to Spanish.
Maintain financial terminology accuracy. Use formal but accessible language.
Respond in valid JSON only."""

TRANSLATE_BATCH_PROMPT = """Translate these bias analyses to Spanish.

{biases_text}

Respond with this JSON (one entry per bias, matching the IDs above):
{{
  "translations": [
    {{
      "id": <bias_id>,
      "summary": "translated summary in Spanish",
      "key_drivers": ["translated driver 1", "translated driver 2"]
    }}
  ]
}}"""


def translate_recent_biases(db, ai_provider, locale="es", limit=100):
    """Translate recent untranslated biases to the target locale, in batches."""
    cur = db.execute(
        """SELECT b.id, b.summary, b.key_drivers
           FROM biases b
           LEFT JOIN bias_translations bt ON b.id = bt.bias_id AND bt.locale = %s
           WHERE bt.id IS NULL AND b.summary IS NOT NULL
           ORDER BY b.generated_at DESC
           LIMIT %s""",
        (locale, limit),
    )
    biases = [dict(row) for row in cur.fetchall()]
    print(f"  {len(biases)} biases need {locale} translation")

    if not biases:
        return

    translated = 0
    batch_size = 8

    for i in range(0, len(biases), batch_size):
        batch = biases[i:i + batch_size]

        # Build batch text
        entries = []
        for b in batch:
            drivers = b.get("key_drivers", [])
            if isinstance(drivers, str):
                drivers = json.loads(drivers)
            entries.append(
                f"[ID={b['id']}]\nSummary: {b['summary']}\nKey drivers: {json.dumps(drivers)}"
            )
        biases_text = "\n\n---\n\n".join(entries)

        try:
            prompt = TRANSLATE_BATCH_PROMPT.format(biases_text=biases_text)
            raw, _, _ = ai_provider.complete(
                system=TRANSLATE_SYSTEM,
                user=prompt,
                max_tokens=8000,
            )
            result = json.loads(raw)

            for item in result.get("translations", []):
                try:
                    db.execute(
                        """INSERT INTO bias_translations (bias_id, locale, summary, key_drivers)
                           VALUES (%s, %s, %s, %s)
                           ON CONFLICT (bias_id, locale) DO UPDATE SET
                             summary = EXCLUDED.summary,
                             key_drivers = EXCLUDED.key_drivers""",
                        (
                            item["id"],
                            locale,
                            item.get("summary", ""),
                            json.dumps(item.get("key_drivers", [])),
                        ),
                    )
                    translated += 1
                except Exception as e:
                    print(f"    Store error for bias {item.get('id')}: {e}")

            print(f"  Batch {i // batch_size + 1}: translated {len(result.get('translations', []))} biases")
        except Exception as e:
            print(f"  Batch {i // batch_size + 1}: failed — {e}")

    print(f"  Translated {translated}/{len(biases)} biases to {locale}")
```

- [ ] **Step 2: Test imports**

```bash
python -c "from scraper.translate_biases import translate_recent_biases; print('OK')"
```

- [ ] **Step 3: Commit**

```bash
git add scraper/translate_biases.py
git commit -m "perf: batch translations 8 per AI call (reduces ~80 calls to ~10)"
```

---

## Chunk 4: Final Integration & Verification

### Task 5: Integration test

- [ ] **Step 1: Run full pipeline locally to verify**

```bash
cd /Users/a/Desktop/forex-analysis
export DATABASE_URL="$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-)"
python -m scraper.main
```

Watch for:
- Article batches completing in parallel (out-of-order batch numbers)
- Waves completing sequentially with instruments in parallel within each wave
- Translation batches of 8

- [ ] **Step 2: Trigger GitHub Actions run**

```bash
gh workflow run "Daily Forex Analysis"
```

Monitor at https://github.com/amant0923/forex-analysis/actions

- [ ] **Step 3: Final commit with all changes pushed**

```bash
git push
```

---

## Expected Runtime Improvement

| Step | Before | After | Why |
|------|--------|-------|-----|
| 2.5 Article analysis | ~15 min (13 serial batches) | ~5 min (3 concurrent) | 3x parallelism |
| 5 Bias generation | ~40 min (20 serial calls) | ~15 min (5 waves, 4 concurrent) | 4x per wave |
| 6.5 Translations | ~20 min (80 serial calls) | ~3 min (10 batched calls) | 8x batching |
| **Total** | **~1h20m** | **~25m** | **~3x faster** |

API cost stays the same (same total tokens) — batching translations actually reduces cost slightly due to fewer request overhead tokens.
