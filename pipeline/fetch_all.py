#!/usr/bin/env python3
"""Fetch every configured indicator and append changed values to history.

Run this first, then `build_dashboard_data.py` to turn the raw history
into the dashboard's JSON data file. Split into two steps so the
"fetch from the internet" part (flaky, rate-limited) is separate from
the "compute derived views" part (pure, cheap to re-run).

Usage: python3 pipeline/fetch_all.py
"""

import csv
import json
import os
import sys
import time
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sources import coingecko, fx, yahoo  # noqa: E402

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, "config", "indicators.json")
HISTORY_DIR = os.path.join(BASE_DIR, "data", "history")
LATEST_PATH = os.path.join(BASE_DIR, "data", "latest.json")

SOURCES = {"coingecko": coingecko.fetch, "fx": fx.fetch, "yahoo": yahoo.fetch}

HISTORY_FIELDS = ["fetched_at", "as_of", "value", "change_pct"]


def load_history(indicator_id: str) -> list[dict]:
    path = os.path.join(HISTORY_DIR, f"{indicator_id}.csv")
    if not os.path.exists(path):
        return []
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def append_history(indicator_id: str, row: dict) -> bool:
    """Append a row only if the value or as-of date actually changed.

    Mirrors the "원장 내용이 실제로 바뀐 것만" behaviour from the reference
    dashboard: a re-fetch that returns the same value never grows the
    history file, it just gets skipped.
    """
    os.makedirs(HISTORY_DIR, exist_ok=True)
    path = os.path.join(HISTORY_DIR, f"{indicator_id}.csv")
    history = load_history(indicator_id)
    if history:
        last = history[-1]
        if last["as_of"] == row["as_of"] and last["value"] == str(row["value"]):
            return False

    write_header = not os.path.exists(path)
    with open(path, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=HISTORY_FIELDS)
        if write_header:
            writer.writeheader()
        writer.writerow(row)
    return True


def derive_change_pct_from_history(indicator_id: str, current_value: float) -> float | None:
    history = load_history(indicator_id)
    if not history:
        return None
    try:
        prev_value = float(history[-1]["value"])
    except (KeyError, ValueError):
        return None
    if not prev_value:
        return None
    return (current_value - prev_value) / prev_value * 100


def main() -> int:
    with open(CONFIG_PATH, encoding="utf-8") as f:
        indicators = json.load(f)

    fetched_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    results = []

    for ind in indicators:
        entry = {
            "id": ind["id"],
            "category": ind["category"],
            "title": ind["title"],
            "unit": ind["unit"],
            "threshold_pct": ind["threshold_pct"],
            "fetched_at": fetched_at,
        }
        try:
            fetch_fn = SOURCES[ind["source"]]
            data = fetch_fn(ind["params"])
            change_pct = data["change_pct"]
            if change_pct is None:
                change_pct = derive_change_pct_from_history(ind["id"], data["value"])

            row = {
                "fetched_at": fetched_at,
                "as_of": data["as_of"],
                "value": data["value"],
                "change_pct": "" if change_pct is None else round(change_pct, 4),
            }
            updated = append_history(ind["id"], row)

            entry.update(
                {
                    "status": "ok",
                    "value": data["value"],
                    "change_pct": change_pct,
                    "as_of": data["as_of"],
                    "updated": updated,
                }
            )
        except Exception as exc:  # noqa: BLE001 - one bad source must not sink the run
            entry.update({"status": "error", "error": str(exc)})
            print(f"[warn] {ind['id']}: {exc}", file=sys.stderr)

        results.append(entry)
        time.sleep(1)  # be polite to free, unauthenticated APIs

    os.makedirs(os.path.dirname(LATEST_PATH), exist_ok=True)
    with open(LATEST_PATH, "w", encoding="utf-8") as f:
        json.dump({"fetched_at": fetched_at, "indicators": results}, f, ensure_ascii=False, indent=2)
        f.write("\n")

    ok = sum(1 for r in results if r["status"] == "ok")
    print(f"Fetched {ok}/{len(results)} indicators successfully.")
    failed = [r["id"] for r in results if r["status"] == "error"]
    if failed:
        print(f"Failed: {failed}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
