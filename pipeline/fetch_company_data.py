#!/usr/bin/env python3
"""Fetch financials + inventory (DART) and investor flow (Naver) per company.

Split from `build_company_dashboard_data.py` for the same reason as
`fetch_all.py`/`build_dashboard_data.py`: this step touches flaky external
services, the build step is pure JSON reshaping.

DART needs an API key (free, https://opendart.fss.or.kr). Without
`DART_API_KEY` set, financials/inventory are skipped entirely (status
"no_api_key") — investor flow (Naver, no key needed) still runs.

Usage: python3 pipeline/fetch_company_data.py
"""

import json
import os
import sys
import time
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sources import dart, naver_investor  # noqa: E402

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COMPANIES_PATH = os.path.join(BASE_DIR, "config", "companies.json")
RAW_PATH = os.path.join(BASE_DIR, "data", "company_raw.json")

FINANCIAL_YEARS = ["2025", "2024"]
MAX_PERIODS = 6


def main() -> int:
    with open(COMPANIES_PATH, encoding="utf-8") as f:
        companies = json.load(f)

    api_key = os.environ.get("DART_API_KEY", "").strip()
    corp_code_map: dict[str, str] = {}
    if api_key:
        try:
            corp_code_map = dart.load_corp_code_map(api_key)
        except Exception as exc:  # noqa: BLE001 - one bad source must not sink the run
            print(f"[warn] dart corp code lookup failed: {exc}", file=sys.stderr)

    fetched_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    results = []

    for company in companies:
        entry = {"id": company["id"], "stock_code": company["stock_code"]}

        if not api_key:
            entry["financials_status"] = "no_api_key"
        else:
            corp_code = corp_code_map.get(company["stock_code"])
            if not corp_code:
                entry["financials_status"] = "error"
                entry["financials_error"] = "corp_code not found for stock_code"
            else:
                try:
                    statements = dart.fetch_recent_statements(
                        api_key, corp_code, FINANCIAL_YEARS, MAX_PERIODS
                    )
                    entry["financials_status"] = "ok"
                    entry["financials"] = statements
                except Exception as exc:  # noqa: BLE001
                    entry["financials_status"] = "error"
                    entry["financials_error"] = str(exc)
                    print(f"[warn] dart financials {company['id']}: {exc}", file=sys.stderr)
            time.sleep(0.5)  # be polite to a free, key-gated API

        try:
            entry["investor_flow"] = naver_investor.fetch_flow(company["stock_code"], pages=2)
            entry["investor_flow_status"] = "ok"
        except Exception as exc:  # noqa: BLE001
            entry["investor_flow_status"] = "error"
            entry["investor_flow_error"] = str(exc)
            print(f"[warn] naver investor flow {company['id']}: {exc}", file=sys.stderr)

        results.append(entry)
        time.sleep(1)  # be polite

    os.makedirs(os.path.dirname(RAW_PATH), exist_ok=True)
    with open(RAW_PATH, "w", encoding="utf-8") as f:
        json.dump({"fetched_at": fetched_at, "companies": results}, f, ensure_ascii=False, indent=2)
        f.write("\n")

    ok_financials = sum(1 for r in results if r.get("financials_status") == "ok")
    ok_flow = sum(1 for r in results if r.get("investor_flow_status") == "ok")
    print(f"Financials ok: {ok_financials}/{len(results)}, investor flow ok: {ok_flow}/{len(results)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
