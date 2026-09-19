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

# Matches the multiple sets shown on the reference dashboard's PER/PBR band charts.
PER_MULTIPLES = [7, 9, 10, 15, 20]
PBR_MULTIPLES = [1, 1.25, 1.5, 1.7, 2]


def load_json(path: str, default):
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def latest_non_null(rows: list[dict], field: str):
    """Most recent period (rows are newest-first) with a non-null value for field."""
    for row in rows:
        value = row.get(field)
        if value is not None:
            return value
    return None


def build_valuation_band(eps_or_bps, multiples: list[float]) -> dict | None:
    if not eps_or_bps:
        return None
    return {"base": eps_or_bps, "levels": [{"multiple": m, "value": round(eps_or_bps * m, 2)} for m in multiples]}


def main() -> int:
    companies = load_json(COMPANIES_PATH, [])
    order_backlog = load_json(ORDER_BACKLOG_PATH, {})
    raw = load_json(RAW_PATH, {"fetched_at": None, "companies": []})
    raw_by_id = {c["id"]: c for c in raw.get("companies", [])}

    out_companies = []
    for company in companies:
        raw_entry = raw_by_id.get(company["id"], {})
        fin_rows = raw_entry.get("financials", [])

        financials_status = raw_entry.get("financials_status", "no_api_key")
        financials = [
            {
                "period": row["period"],
                "revenue": row.get("revenue"),
                "costOfSales": row.get("cost_of_sales"),
                "sga": row.get("sga"),
                "operatingProfit": row.get("operating_profit"),
                "netIncome": row.get("net_income"),
            }
            for row in fin_rows
        ]
        inventory = [
            {
                "period": row["period"],
                "inventory": row.get("inventory"),
                "inventoryToRevenue": (
                    round(row["inventory"] / row["revenue"], 3)
                    if row.get("inventory") is not None and row.get("revenue")
                    else None
                ),
            }
            for row in fin_rows
            if row.get("inventory") is not None
        ]
        cash_flow = [
            {
                "period": row["period"],
                "cfo": row.get("cfo"),
                "cfi": row.get("cfi"),
                "cff": row.get("cff"),
                "fcf": (row["cfo"] + row["capex"]) if row.get("cfo") is not None and row.get("capex") is not None
                else (row["cfo"] + row["cfi"]) if row.get("cfo") is not None and row.get("cfi") is not None
                else None,
            }
            for row in fin_rows
            if row.get("cfo") is not None or row.get("cfi") is not None or row.get("cff") is not None
        ]
        capex_series = [
            {
                "period": row["period"],
                "revenue": row.get("revenue"),
                "capex": row.get("capex"),
                "capexToRevenue": (
                    round(abs(row["capex"]) / row["revenue"], 3)
                    if row.get("capex") is not None and row.get("revenue")
                    else None
                ),
            }
            for row in fin_rows
            if row.get("capex") is not None
        ]
        tangible_assets = [
            {
                "period": row["period"],
                "tangibleAssets": row.get("tangible_assets"),
                "capex": row.get("capex"),
            }
            for row in fin_rows
            if row.get("tangible_assets") is not None
        ]
        employees = [
            {
                "period": row["period"],
                "male": (row.get("employees") or {}).get("male"),
                "female": (row.get("employees") or {}).get("female"),
            }
            for row in fin_rows
            if row.get("employees")
        ]

        backlog_rows = order_backlog.get(company["id"], [])
        backlog = [
            {"period": row["period"], "backlogKrw100m": row["backlog_krw_100m"]}
            for row in backlog_rows
        ]

        order_disclosures_status = raw_entry.get("order_disclosures_status", "no_api_key" if not fin_rows else "error")
        order_disclosures = [
            {"date": row["rcept_dt"], "title": row["report_nm"], "url": row["url"]}
            for row in raw_entry.get("order_disclosures", [])
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

        consensus_status = raw_entry.get("consensus_status", "error")
        consensus_raw = raw_entry.get("consensus")
        consensus = None
        if consensus_raw:
            consensus = {
                "periods": consensus_raw["periods"],
                "revenue": consensus_raw["revenue"],
                "operatingProfit": consensus_raw["operating_profit"],
            }

        # fin_rows is newest-first (see dart.fetch_recent_statements), so the
        # first row with a value is the most recent trailing figure.
        latest_net_income = latest_non_null(fin_rows, "net_income")
        latest_equity = latest_non_null(fin_rows, "equity")
        latest_shares = latest_non_null(fin_rows, "shares_outstanding")
        eps = round(latest_net_income / latest_shares, 2) if latest_net_income and latest_shares else None
        bps = round(latest_equity / latest_shares, 2) if latest_equity and latest_shares else None

        price_history_status = raw_entry.get("price_history_status", "error")
        price_history = [
            {"date": row["date"], "close": row["close"]}
            for row in raw_entry.get("price_history", [])
        ]
        market_cap_history = (
            [{"date": row["date"], "marketCap": round(row["close"] * latest_shares)} for row in price_history]
            if latest_shares
            else []
        )

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
                "cashFlow": cash_flow,
                "capex": capex_series,
                "tangibleAssets": tangible_assets,
                "employees": employees,
                "orderBacklog": backlog,
                "orderDisclosuresStatus": order_disclosures_status,
                "orderDisclosures": order_disclosures,
                "investorFlowStatus": investor_flow_status,
                "investorFlow": investor_flow,
                "consensusStatus": consensus_status,
                "consensus": consensus,
                "priceHistoryStatus": price_history_status,
                "priceHistory": price_history,
                "marketCapHistory": market_cap_history,
                "perBand": build_valuation_band(eps, PER_MULTIPLES),
                "pbrBand": build_valuation_band(bps, PBR_MULTIPLES),
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
