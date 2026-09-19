"""Foreign exchange rates via open.er-api.com. No API key required.

This source only returns the latest snapshot rate, not a day-over-day
change, so `fetch_all.py` derives `change_pct` from the indicator's own
history once at least two data points exist.
"""

from datetime import datetime, timezone

from .http import get_json


def fetch(params: dict) -> dict:
    base = params["base"]
    target = params["target"]
    url = f"https://open.er-api.com/v6/latest/{base}"
    data = get_json(url)
    if data.get("result") != "success":
        raise RuntimeError(f"fx: unexpected response for base={base}: {data!r}")
    rates = data.get("rates", {})
    if target not in rates:
        raise RuntimeError(f"fx: {target!r} missing from rates for base={base}")
    as_of = (data.get("time_last_update_utc") or "")[:16] or datetime.now(timezone.utc).strftime(
        "%Y-%m-%d"
    )
    return {"value": rates[target], "change_pct": None, "as_of": as_of}
