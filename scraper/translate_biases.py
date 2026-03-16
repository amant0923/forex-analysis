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
