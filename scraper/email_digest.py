"""Send daily email digests with bias summaries."""

import os

try:
    import resend
except ImportError:
    resend = None

DIRECTION_EMOJI = {"bullish": "🟢", "bearish": "🔴", "neutral": "⚪"}


def send_email_digests(db):
    """Send daily email digest to all opted-in users."""
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        print("  Skipped — RESEND_API_KEY not set")
        return

    if not resend:
        print("  Skipped — resend package not installed (pip install resend)")
        return

    resend.api_key = api_key
    site_url = os.getenv("SITE_URL", "https://tradeora.com")
    from_email = os.getenv("EMAIL_FROM", "Tradeora <digest@tradeora.com>")

    # Get opted-in users
    cur = db.execute(
        """SELECT id, email, name FROM users
           WHERE email_digest_enabled = TRUE AND email IS NOT NULL"""
    )
    users = [dict(row) for row in cur.fetchall()]
    print(f"  {len(users)} users opted in for email digest")

    if not users:
        return

    # Build bias summary
    cur = db.execute(
        """SELECT DISTINCT ON (instrument)
              instrument, direction, confidence, summary
           FROM biases
           WHERE timeframe = '1week'
           ORDER BY instrument, generated_at DESC"""
    )
    biases = [dict(row) for row in cur.fetchall()]

    # Get recent alerts
    cur = db.execute(
        """SELECT instrument, timeframe, previous_direction, new_direction
           FROM bias_alerts
           WHERE created_at >= CURRENT_DATE
           ORDER BY created_at DESC
           LIMIT 5"""
    )
    alerts = [dict(row) for row in cur.fetchall()]

    # Build HTML email
    bias_rows = ""
    for b in biases:
        emoji = DIRECTION_EMOJI.get(b["direction"], "⚪")
        conf = b.get("confidence") or 0
        bias_rows += f"""
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #1a1a1a;color:#fff;font-weight:600">{b['instrument']}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #1a1a1a;color:{'#4ade80' if b['direction']=='bullish' else '#f87171' if b['direction']=='bearish' else '#6b7280'}">{emoji} {b['direction'].capitalize()}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #1a1a1a;color:#888">{conf}%</td>
        </tr>"""

    alerts_html = ""
    if alerts:
        alerts_html = "<h3 style='color:#fff;margin:20px 0 10px'>⚠️ Bias Changes Today</h3><ul style='color:#ccc;padding-left:20px'>"
        for a in alerts:
            alerts_html += f"<li>{a['instrument']} ({a['timeframe']}): {a['previous_direction']} → <strong>{a['new_direction']}</strong></li>"
        alerts_html += "</ul>"

    html = f"""
    <div style="background:#09090b;color:#fff;font-family:Arial,sans-serif;padding:32px;max-width:600px;margin:0 auto">
      <h1 style="font-size:24px;margin-bottom:4px">📊 Tradeora Daily</h1>
      <p style="color:#666;margin-bottom:24px">Your morning fundamental analysis briefing</p>

      <table style="width:100%;border-collapse:collapse;background:#111;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#1a1a1a">
            <th style="text-align:left;padding:10px 12px;color:#888;font-size:12px;font-weight:500">Instrument</th>
            <th style="text-align:left;padding:10px 12px;color:#888;font-size:12px;font-weight:500">1W Bias</th>
            <th style="text-align:left;padding:10px 12px;color:#888;font-size:12px;font-weight:500">Confidence</th>
          </tr>
        </thead>
        <tbody>{bias_rows}</tbody>
      </table>

      {alerts_html}

      <div style="margin-top:24px;text-align:center">
        <a href="{site_url}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
          View Full Analysis →
        </a>
      </div>

      <p style="color:#444;font-size:11px;margin-top:24px;text-align:center">
        For informational purposes only — not financial advice.<br>
        <a href="{site_url}/settings" style="color:#444">Unsubscribe from daily digest</a>
      </p>
    </div>
    """

    success = 0
    failed = 0
    for user in users:
        try:
            resend.Emails.send({
                "from": from_email,
                "to": [user["email"]],
                "subject": "📊 Tradeora Daily — Your Fundamental Analysis Briefing",
                "html": html,
            })
            success += 1
        except Exception as e:
            print(f"    Failed to send to {user['email']}: {e}")
            failed += 1

    print(f"  Emails sent: {success} success, {failed} failed")
