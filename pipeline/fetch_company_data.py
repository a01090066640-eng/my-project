#!/usr/bin/env python3
"""Fetch everything the company dashboard needs, one company at a time.

Split from `build_company_dashboard_data.py` for the same reason as
`fetch_all.py`/`build_dashboard_data.py`: this step touches flaky external
services, the build step is pure JSON reshaping.

Sources, each independently best-effort (one failing never sinks the
others, or the run):
  - DART (financials, inventory, cash flow, CAPEX, employees, shares,
    order disclosures) — needs DART_API_KEY (free). Skipped entirely,
    per company, when unset (status "no_api_key").
  - Naver investor flow (외국인/기관/개인 순매매) — no key needed.
  - WiseReport/Naver consensus (매출·영업이익 컨센서스) — no key needed,
    lower-confidence scraper (see sources/naver_consensus.py).
  - Yahoo Finance price history (시가총액, PER/PBR 밴드용) — no key needed.

Usage: python3 pipeline/fetch_company_data.py
"""

import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sources import dart, naver_consensus, naver_investor, yahoo  # noqa: E402

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COMPANIES_PATH = os.path.join(BASE_DIR, "config", "companies.json")
RAW_PATH = os.path.join(BASE_DIR, "data", "company_raw.json")

FINANCIAL_YEARS = ["2025", "2024"]
MAX_PERIODS = 6
ORDER_DISCLOSURE_LOOKBACK_DAYS = 730


def fetch_dart_section(company: dict, api_key: str, corp_code_map: dict[str, str]) -> dict:
    section: dict = {}
    if not api_key:
        section["financials_status"] = "no_api_key"
        return section

    corp_code = corp_code_map.get(company["stock_code"])
    if not corp_code:
        section["financials_status"] = "error"
        section["financials_error"] = "corp_code not found for stock_code"
        return section

    try:
        section["financials"] = dart.fetch_recent_statements(
            api_key, corp_code, FINANCIAL_YEARS, MAX_PERIODS, with_headcount=True
        )
        section["financials_status"] = "ok"
    except Exception as exc:  # noqa: BLE001
        section["financials_status"] = "error"
        section["financials_error"] = str(exc)
        print(f"[warn] dart financials {company['id']}: {exc}", file=sys.stderr)
    time.sleep(0.5)

    try:
        end_de = datetime.now(timezone.utc).strftime("%Y%m%d")
        bgn_de = (datetime.now(timezone.utc) - timedelta(days=ORDER_DISCLOSURE_LOOKBACK_DAYS)).strftime("%Y%m%d")
        section["order_disclosures"] = dart.fetch_order_disclosures(api_key, corp_code, bgn_de, end_de)
        section["order_disclosures_status"] = "ok"
    except Exception as exc:  # noqa: BLE001
        section["order_disclosures_status"] = "error"
        section["order_disclosures_error"] = str(exc)
        print(f"[warn] dart order disclosures {company['id']}: {exc}", file=sys.stderr)
    time.sleep(0.5)

    return section


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
        entry.update(fetch_dart_section(company, api_key, corp_code_map))

        try:
            entry["investor_flow"] = naver_investor.fetch_flow(company["stock_code"], pages=2)
            entry["investor_flow_status"] = "ok"
        except Exception as exc:  # noqa: BLE001
            entry["investor_flow_status"] = "error"
            entry["investor_flow_error"] = str(exc)
            print(f"[warn] naver investor flow {company['id']}: {exc}", file=sys.stderr)

        try:
            entry["consensus"] = naver_consensus.fetch_consensus(company["stock_code"])
            entry["consensus_status"] = "ok" if entry["consensus"] else "error"
        except Exception as exc:  # noqa: BLE001
            entry["consensus_status"] = "error"
            entry["consensus_error"] = str(exc)
            print(f"[warn] naver consensus {company['id']}: {exc}", file=sys.stderr)

        try:
            ticker = company.get("market_ticker", f"{company['stock_code']}.KS")
            entry["price_history"] = yahoo.fetch_price_history(ticker, range_="10y", interval="1wk")
            entry["price_history_status"] = "ok"
        except Exception as exc:  # noqa: BLE001
            entry["price_history_status"] = "error"
            entry["price_history_error"] = str(exc)
            print(f"[warn] yahoo price history {company['id']}: {exc}", file=sys.stderr)

        results.append(entry)
        time.sleep(1)  # be polite

    os.makedirs(os.path.dirname(RAW_PATH), exist_ok=True)
    with open(RAW_PATH, "w", encoding="utf-8") as f:
        json.dump({"fetched_at": fetched_at, "companies": results}, f, ensure_ascii=False, indent=2)
        f.write("\n")

    def ok_count(key: str) -> int:
        return sum(1 for r in results if r.get(key) == "ok")

    print(
        "Financials ok: {}/{}, order disclosures ok: {}/{}, investor flow ok: {}/{}, "
        "consensus ok: {}/{}, price history ok: {}/{}".format(
            ok_count("financials_status"),
            len(results),
            ok_count("order_disclosures_status"),
            len(results),
            ok_count("investor_flow_status"),
            len(results),
            ok_count("consensus_status"),
            len(results),
            ok_count("price_history_status"),
            len(results),
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
