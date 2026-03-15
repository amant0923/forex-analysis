"""Translate bias summaries to Spanish using AI."""

import json


TRANSLATE_SYSTEM = """You are a professional financial translator specializing in forex and CFD market analysis.
Translate the following market analysis text from English to Spanish.
Maintain financial terminology accuracy. Use formal but accessible language.
Respond in valid JSON only."""

TRANSLATE_PROMPT = """Translate this bias analysis to Spanish:

Summary: {summary}

Key drivers: {key_drivers}

Respond with this JSON:
{{
  "summary": "translated summary in Spanish",
  "key_drivers": ["translated driver 1", "translated driver 2"]
}}"""


def translate_recent_biases(db, ai_provider, locale="es", limit=100):
    """Translate recent untranslated biases to the target locale."""
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

    translated = 0
    for bias in biases:
        try:
            drivers = bias.get("key_drivers", [])
            if isinstance(drivers, str):
                drivers = json.loads(drivers)

            prompt = TRANSLATE_PROMPT.format(
                summary=bias["summary"],
                key_drivers=json.dumps(drivers),
            )

            raw, _, _ = ai_provider.complete(
                system=TRANSLATE_SYSTEM,
                user=prompt,
                max_tokens=1500,
            )
            result = json.loads(raw)

            db.execute(
                """INSERT INTO bias_translations (bias_id, locale, summary, key_drivers)
                   VALUES (%s, %s, %s, %s)
                   ON CONFLICT (bias_id, locale) DO UPDATE SET
                     summary = EXCLUDED.summary,
                     key_drivers = EXCLUDED.key_drivers""",
                (
                    bias["id"],
                    locale,
                    result.get("summary", ""),
                    json.dumps(result.get("key_drivers", [])),
                ),
            )
            translated += 1
        except Exception as e:
            print(f"    Translation error for bias {bias['id']}: {e}")

    print(f"  Translated {translated} biases to {locale}")
