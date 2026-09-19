"""DART(전자공시) OpenAPI client — financial statements + inventory.

Free, but requires an API key (issued in ~1 min at https://opendart.fss.or.kr).
Read from the `DART_API_KEY` env var; when it's unset the caller should skip
this source entirely rather than fail (see fetch_company_data.py).

Only two endpoints are used, both extremely stable/well-documented parts of
the DART OpenAPI:
  - corpCode.xml       : stock_code -> corp_code lookup table (a zip download)
  - fnlttSinglAcntAll   : 단일회사 전체 재무제표 (연결/별도, 계정과목별 금액)

Note on "quarterly" figures: DART's income-statement accounts (매출액,
영업이익, 당기순이익) are reported cumulative-to-date for reprt_code 11013/
11012/11014 (Q1 / half-year / 9-month), not as a discrete single quarter.
This module returns the cumulative amount as disclosed and labels each row
with its report period (e.g. "2025 3Q 누적") — it does not attempt to
back out a discrete quarter by subtraction, since that requires the prior
period's cumulative figure to also be clean, restated data.
"""

import io
import os
import xml.etree.ElementTree as ET
import zipfile

from .http import get_json, USER_AGENT
import urllib.request

BASE_URL = "https://opendart.fss.or.kr/api"

# 사업연도 보고서 코드: 1분기, 반기, 3분기, 사업(연간)보고서
REPORT_CODES = [
    ("11013", "1Q 누적"),
    ("11012", "반기 누적"),
    ("11014", "3Q 누적"),
    ("11011", "연간"),
]

REVENUE_NAMES = {"매출액", "수익(매출액)", "영업수익"}
OPERATING_PROFIT_NAMES = {"영업이익", "영업이익(손실)"}
NET_INCOME_NAMES = {"당기순이익", "당기순이익(손실)", "분기순이익", "분기순이익(손실)"}
INVENTORY_NAMES = {"재고자산"}


def _corp_code_cache_path() -> str:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_dir, "data", "corp_code_cache.xml")


def load_corp_code_map(api_key: str) -> dict[str, str]:
    """Return {stock_code: corp_code}, downloading+caching corpCode.xml once."""
    cache_path = _corp_code_cache_path()
    if os.path.exists(cache_path):
        with open(cache_path, "rb") as f:
            xml_bytes = f.read()
    else:
        url = f"{BASE_URL}/corpCode.xml?crtfc_key={api_key}"
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=30) as resp:
            zip_bytes = resp.read()
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            xml_bytes = zf.read("CORPCODE.xml")
        os.makedirs(os.path.dirname(cache_path), exist_ok=True)
        with open(cache_path, "wb") as f:
            f.write(xml_bytes)

    root = ET.fromstring(xml_bytes)
    mapping: dict[str, str] = {}
    for item in root.findall("list"):
        stock_code = (item.findtext("stock_code") or "").strip()
        corp_code = (item.findtext("corp_code") or "").strip()
        if stock_code:
            mapping[stock_code] = corp_code
    return mapping


def _pick_amount(rows: list[dict], names: set[str]) -> int | None:
    for row in rows:
        if row.get("account_nm") in names and row.get("fs_div") == "CFS":
            amount = row.get("thstrm_amount")
            if amount not in (None, ""):
                try:
                    return int(amount.replace(",", ""))
                except ValueError:
                    return None
    # fall back to 별도재무제표 (OFS) if no consolidated figure was disclosed
    for row in rows:
        if row.get("account_nm") in names and row.get("fs_div") == "OFS":
            amount = row.get("thstrm_amount")
            if amount not in (None, ""):
                try:
                    return int(amount.replace(",", ""))
                except ValueError:
                    return None
    return None


def fetch_financial_statement(
    api_key: str, corp_code: str, bsns_year: str, reprt_code: str
) -> dict | None:
    """One report period's revenue/operating profit/net income/inventory.

    Returns None when DART has nothing filed for that (corp, year, report)
    combination yet (a very common, expected case — e.g. the current
    quarter hasn't been filed), rather than raising.
    """
    url = (
        f"{BASE_URL}/fnlttSinglAcntAll.json?crtfc_key={api_key}"
        f"&corp_code={corp_code}&bsns_year={bsns_year}&reprt_code={reprt_code}&fs_div=CFS"
    )
    data = get_json(url)
    if data.get("status") != "000":
        return None
    rows = data.get("list", [])
    if not rows:
        return None

    return {
        "revenue": _pick_amount(rows, REVENUE_NAMES),
        "operating_profit": _pick_amount(rows, OPERATING_PROFIT_NAMES),
        "net_income": _pick_amount(rows, NET_INCOME_NAMES),
        "inventory": _pick_amount(rows, INVENTORY_NAMES),
    }


def fetch_recent_statements(
    api_key: str, corp_code: str, years: list[str], max_periods: int
) -> list[dict]:
    """Walk years (newest first) x report codes (newest first), stop at max_periods."""
    out: list[dict] = []
    for year in years:
        for reprt_code, label in REPORT_CODES[::-1]:
            result = fetch_financial_statement(api_key, corp_code, year, reprt_code)
            if result is None:
                continue
            out.append({"period": f"{year} {label}", "bsns_year": year, **result})
            if len(out) >= max_periods:
                return out
    return out
