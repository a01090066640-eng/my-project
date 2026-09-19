#!/usr/bin/env python3
"""Turn pipeline/data/latest.json + history into src/data/liveData.json.

This is the "rules engine" step: no network calls, just pure
transforms from the raw fetch results into the shapes the React
dashboard (src/types.ts) expects. Safe to re-run any time.

Usage: python3 pipeline/build_dashboard_data.py
"""

import csv
import json
import os
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LATEST_PATH = os.path.join(BASE_DIR, "data", "latest.json")
HISTORY_DIR = os.path.join(BASE_DIR, "data", "history")
OUTPUT_PATH = os.path.join(os.path.dirname(BASE_DIR), "src", "data", "liveData.json")

CRITICAL_MULTIPLIER = 2  # >= 2x the configured threshold_pct is "critical", else "serious"


def format_value(value: float, unit: str, change_pct: float | None) -> str:
    if unit == "USD":
        base = f"${value:,.2f}"
    elif unit == "pt":
        base = f"{value:,.2f}pt"
    elif unit == "KRW":
        base = f"{value:,.2f} KRW"
    else:
        base = f"{value:,.2f} {unit}"
    if change_pct is not None:
        sign = "+" if change_pct >= 0 else ""
        base += f" ({sign}{change_pct:.2f}%)"
    return base


def load_history_tail(indicator_id: str, n: int = 1) -> list[dict]:
    path = os.path.join(HISTORY_DIR, f"{indicator_id}.csv")
    if not os.path.exists(path):
        return []
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    return rows[-n:] if rows else []


def build_action_items(indicators: list[dict]) -> list[dict]:
    items = []
    for ind in indicators:
        if ind["status"] != "error":
            continue
        last = load_history_tail(ind["id"], 1)
        last_known = last[0]["as_of"] if last else "기록 없음"
        items.append(
            {
                "id": f"error-{ind['id']}",
                "severity": "serious",
                "category": ind["category"],
                "title": f"{ind['title']} — 데이터 수집 실패",
                "latestDate": last_known,
                "staleness": "마지막 성공 기준" if last else "한 번도 성공한 적 없음",
                "sourceSchedule": f"소스: {ind.get('id')}",
                "jobName": "pipeline.fetch_all",
                "jobStatus": "다른 지표는 정상적으로 갱신되었습니다",
                "note": ind.get("error", "원인 불명"),
                "command": "python3 pipeline/fetch_all.py",
            }
        )
    return items


def build_recent_updates(indicators: list[dict]) -> list[dict]:
    changed = [ind for ind in indicators if ind["status"] == "ok" and ind.get("updated")]
    items = [
        {
            "id": f"update-{ind['id']}",
            "category": ind["category"],
            "title": ind["title"],
            "latestLabel": ind["as_of"],
            "updatedLabel": ind["fetched_at"][:10],
        }
        for ind in changed
    ]
    return [{"cadence": "일간", "count": len(items), "items": items}]


def build_notable_indicators(indicators: list[dict]) -> tuple[list[dict], dict]:
    by_category: dict[str, list[dict]] = {}
    counts = {"critical": 0, "serious": 0, "info": 0}

    for ind in indicators:
        if ind["status"] != "ok" or ind.get("change_pct") is None:
            continue
        change_pct = ind["change_pct"]
        threshold = ind["threshold_pct"]
        magnitude = abs(change_pct)
        if magnitude >= threshold * CRITICAL_MULTIPLIER:
            severity = "critical"
        elif magnitude >= threshold:
            severity = "serious"
        else:
            continue

        counts[severity] += 1
        direction = "급등" if change_pct >= 0 else "급락"
        by_category.setdefault(ind["category"], []).append(
            {
                "id": f"notable-{ind['id']}",
                "category": ind["category"],
                "severity": severity,
                "title": f"{ind['title']} 1일 {direction}",
                "value": format_value(ind["value"], ind["unit"], change_pct),
                "asOf": ind["as_of"],
                "updatedAsOf": ind["fetched_at"][:10],
                "detail": f"{ind['as_of']} 기준",
            }
        )

    groups = [{"category": cat, "items": items} for cat, items in by_category.items()]
    counts["total"] = counts["critical"] + counts["serious"] + counts["info"]
    return groups, counts


def build_category_statuses(indicators: list[dict]) -> list[dict]:
    by_category: dict[str, list[dict]] = {}
    for ind in indicators:
        by_category.setdefault(ind["category"], []).append(ind)

    statuses = []
    for cat, inds in by_category.items():
        failed = [ind for ind in inds if ind["status"] == "error"]
        status: dict = {
            "id": cat,
            "name": cat,
            "icon": "📊",
            "status": "delayed" if failed else "ok",
            "total": len(inds),
            "cadenceBreakdown": f"일간 {len(inds)}",
        }
        # Omit rather than null these when there's nothing delayed: the frontend
        # type (src/types.ts CategoryStatus) declares them optional (`?: number` /
        # `?: string`, i.e. `| undefined`), not `| null`, matching how the sample
        # data in mockData.ts leaves them out entirely for "ok" categories.
        if failed:
            status["delayedCount"] = len(failed)
            status["delayedNote"] = ", ".join(f["title"] for f in failed)
        statuses.append(status)
    return statuses


def main() -> int:
    if not os.path.exists(LATEST_PATH):
        raise SystemExit(
            "pipeline/data/latest.json not found — run fetch_all.py first."
        )

    with open(LATEST_PATH, encoding="utf-8") as f:
        latest = json.load(f)
    indicators = latest["indicators"]

    action_items = build_action_items(indicators)
    recent_updates = build_recent_updates(indicators)
    notable_groups, notable_counts = build_notable_indicators(indicators)
    category_statuses = build_category_statuses(indicators)

    ok_count = sum(1 for ind in indicators if ind["status"] == "ok")
    error_count = len(indicators) - ok_count

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    output = {
        "dashboardMeta": {
            "title": "내 지표 대시보드",
            "subtitle": "매일 자동 수집되는 암호화폐·환율·주가지수·원자재 지표",
            "generatedAt": generated_at,
            "dataMode": "live",
        },
        "actionItems": action_items,
        "recentUpdates": recent_updates,
        "notableIndicators": notable_groups,
        "investmentIdeas": [],
        "categoryStatuses": category_statuses,
        "totals": {
            "totalIndicators": len(indicators),
            "delayedIndicators": error_count,
            "notableCount": notable_counts,
        },
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Wrote {OUTPUT_PATH} ({ok_count}/{len(indicators)} indicators ok)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
