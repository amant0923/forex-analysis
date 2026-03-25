"""Poller heartbeat for health monitoring."""


def write_heartbeat(db, articles_found: int, errors: str | None = None):
    """Write a heartbeat to the database."""
    try:
        db.upsert_heartbeat(articles_found=articles_found, errors=errors)
    except Exception as e:
        print(f"Failed to write heartbeat: {e}")
