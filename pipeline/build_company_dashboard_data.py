#!/usr/bin/env python3
"""Turn company_raw.json (+ companies.json + order_backlog.json) into
src/data/companyData.json for the frontend.

Usage: python3 pipeline/build_company_dashboard_data.py
"""

import json
import os
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COMPANIES_PATH = os.path.join(BASE_DIR, "config", "companies.json")
ORDER_BACKLOG_PATH = os.path.join(BASE_DIR, "config", "order_backlog.json")
RAW_PATH = os.path.join(BASE_DIR, "data", "company_raw.json")
OUTPUT_PATH = os.path.join(
    os.path.dirname(BASE_DIR), "src", "data", "companyData.json"
)


def load_json(path: str, default):
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def main() -> int:
    companies = load_json(COMPANIES_PATH, [])
    order_backlog = load_json(ORDER_BACKLOG_PATH, {})
    raw = load_json(RAW_PATH, {"fetched_at": None, "companies": []})
    raw_by_id = {c["id"]: c for c in raw.get("companies", [])}

    out_companies = []
    for company in companies:
        raw_entry = raw_by_id.get(company["id"], {})

        financials_status = raw_entry.get("financials_status", "no_api_key")
        financials = [
            {
                "period": row["period"],
                "revenue": row.get("revenue"),
                "operatingProfit": row.get("operating_profit"),
                "netIncome": row.get("net_income"),
            }
            for row in raw_entry.get("financials", [])
        ]
        inventory = [
            {"period": row["period"], "inventory": row.get("inventory")}
            for row in raw_entry.get("financials", [])
            if row.get("inventory") is not None
        ]

        backlog_rows = order_backlog.get(company["id"], [])
        backlog = [
            {"period": row["period"], "backlogKrw100m": row["backlog_krw_100m"]}
            for row in backlog_rows
        ]

        investor_flow_status = raw_entry.get("investor_flow_status", "error")
        investor_flow = [
            {
                "date": row["date"],
                "foreignNet": row["foreign_net"],
                "institutionNet": row["institution_net"],
                "individualNet": row["individual_net"],
            }
            for row in raw_entry.get("investor_flow", [])
        ]

        out_companies.append(
            {
                "id": company["id"],
                "name": company["name"],
                "stockCode": company["stock_code"],
                "sector": company["sector"],
                "hasOrderBacklog": company.get("has_order_backlog", False),
                "financialsStatus": financials_status,
                "financials": financials,
                "inventory": inventory,
                "orderBacklog": backlog,
                "investorFlowStatus": investor_flow_status,
                "investorFlow": investor_flow,
            }
        )

    output = {
        "generatedAt": raw.get("fetched_at")
        or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "companies": out_companies,
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Wrote {len(out_companies)} companies to {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
