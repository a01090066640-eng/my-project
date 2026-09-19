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
COST_OF_SALES_NAMES = {"매출원가"}
SGA_NAMES = {"판매비와관리비", "판매비와관리비(물류원가등포함)"}
OPERATING_PROFIT_NAMES = {"영업이익", "영업이익(손실)"}
NET_INCOME_NAMES = {"당기순이익", "당기순이익(손실)", "분기순이익", "분기순이익(손실)"}
INVENTORY_NAMES = {"재고자산"}
TANGIBLE_ASSETS_NAMES = {"유형자산"}
EQUITY_NAMES = {"자본총계"}
CFO_NAMES = {"영업활동으로인한현금흐름", "영업활동현금흐름", "영업활동으로인한순현금흐름"}
CFI_NAMES = {"투자활동으로인한현금흐름", "투자활동현금흐름", "투자활동으로인한순현금흐름"}
CFF_NAMES = {"재무활동으로인한현금흐름", "재무활동현금흐름", "재무활동으로인한순현금흐름"}
CAPEX_NAMES = {"유형자산의취득", "유형자산의증가"}

# reprt_code -> report label, defined once; reused by both quarterly and
# disclosure-window helpers below.
_ACCOUNT_FIELDS = {
    "revenue": REVENUE_NAMES,
    "cost_of_sales": COST_OF_SALES_NAMES,
    "sga": SGA_NAMES,
    "operating_profit": OPERATING_PROFIT_NAMES,
    "net_income": NET_INCOME_NAMES,
    "inventory": INVENTORY_NAMES,
    "tangible_assets": TANGIBLE_ASSETS_NAMES,
    "equity": EQUITY_NAMES,
    "cfo": CFO_NAMES,
    "cfi": CFI_NAMES,
    "cff": CFF_NAMES,
    "capex": CAPEX_NAMES,
}


def _normalize(s: str) -> str:
    return (s or "").replace(" ", "").replace("　", "")


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
    normalized_names = {_normalize(n) for n in names}
    for wanted_div in ("CFS", "OFS"):
        for row in rows:
            if _normalize(row.get("account_nm", "")) in normalized_names and row.get("fs_div") == wanted_div:
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
    """One report period's full account set (revenue, cost lines, cash flow, CAPEX, ...).

    Returns None when DART has nothing filed for that (corp, year, report)
    combination yet (a very common, expected case — e.g. the current
    quarter hasn't been filed), rather than raising. Any individual account
    not found (or not applicable — e.g. CAPEX for a company that folds it
    into a different line) comes back as None in that field rather than
    failing the whole period.
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

    return {field: _pick_amount(rows, names) for field, names in _ACCOUNT_FIELDS.items()}


ORDER_DISCLOSURE_KEYWORDS = ("단일판매", "공급계약")


def fetch_order_disclosures(
    api_key: str, corp_code: str, bgn_de: str, end_de: str, max_pages: int = 5
) -> list[dict]:
    """수주공시: 단일판매·공급계약체결 disclosures via DART's 공시검색 (list.json).

    list.json is DART's most basic, most stable endpoint (공시검색 — search
    all disclosures for a company in a date range). It returns disclosure
    *metadata* only (title, date, receipt number) — not the contract amount,
    counterparty, or delivery date, which live inside the disclosure
    document body itself and would need a separate document-parsing step
    this module doesn't attempt. Each row here links to the DART original
    so a person can open it directly.
    """
    out: list[dict] = []
    for page_no in range(1, max_pages + 1):
        url = (
            f"{BASE_URL}/list.json?crtfc_key={api_key}&corp_code={corp_code}"
            f"&bgn_de={bgn_de}&end_de={end_de}&page_no={page_no}&page_count=100"
        )
        data = get_json(url)
        if data.get("status") != "000":
            break
        rows = data.get("list", [])
        for row in rows:
            report_nm = row.get("report_nm", "")
            if not any(kw in report_nm for kw in ORDER_DISCLOSURE_KEYWORDS):
                continue
            rcept_no = row.get("rcept_no", "")
            out.append(
                {
                    "rcept_dt": row.get("rcept_dt"),
                    "report_nm": report_nm,
                    "url": f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={rcept_no}",
                }
            )
        total_page = data.get("total_page", 1)
        if page_no >= total_page:
            break
    return out


def _first_int(row: dict, candidate_keys: list[str]) -> int | None:
    for key in candidate_keys:
        value = row.get(key)
        if value in (None, "", "-"):
            continue
        try:
            return int(str(value).replace(",", "").strip())
        except ValueError:
            continue
    return None


def fetch_employee_status(
    api_key: str, corp_code: str, bsns_year: str, reprt_code: str
) -> dict | None:
    """직원현황 (성별 인원수) — 정기보고서 주요정보 API `empSttus`.

    LOWER CONFIDENCE than the financial-statement fetchers above: this
    endpoint's exact field names weren't something this module's author
    could verify against a live account before writing it, only that
    `empSttus` is the DART API name for this report section. It tries a
    few plausible field-name variants DART uses elsewhere (`sm` for a
    total-count column, or the split 정규직/계약직 columns summed) and
    returns None per row it can't parse rather than guessing a number.
    Treat a wrong number here as a bug to report, not a data problem.
    """
    url = (
        f"{BASE_URL}/empSttus.json?crtfc_key={api_key}&corp_code={corp_code}"
        f"&bsns_year={bsns_year}&reprt_code={reprt_code}"
    )
    data = get_json(url)
    if data.get("status") != "000":
        return None
    rows = data.get("list", [])
    if not rows:
        return None

    by_gender: dict[str, int] = {}
    for row in rows:
        gender = row.get("sexdstn", "").strip()
        if gender not in ("남", "여"):
            continue
        count = _first_int(row, ["sm", "sm_co"])
        if count is None:
            rgllbr = _first_int(row, ["rgllbr_co"]) or 0
            cnttk = _first_int(row, ["cnttk_co"]) or 0
            count = (rgllbr + cnttk) or None
        if count is not None:
            by_gender[gender] = by_gender.get(gender, 0) + count

    if not by_gender:
        return None
    return {"male": by_gender.get("남"), "female": by_gender.get("여")}


def fetch_shares_outstanding(
    api_key: str, corp_code: str, bsns_year: str, reprt_code: str
) -> int | None:
    """발행주식총수 — 정기보고서 주요정보 API `stockTotqySttus`.

    Same lower-confidence caveat as fetch_employee_status: the field name
    holding the outstanding-share count is a best guess among DART's
    naming conventions, not a verified value. Scans for a row whose 구분
    (`se`) mentions 합계/총수 and pulls the first plausible count field.
    """
    url = (
        f"{BASE_URL}/stockTotqySttus.json?crtfc_key={api_key}&corp_code={corp_code}"
        f"&bsns_year={bsns_year}&reprt_code={reprt_code}"
    )
    data = get_json(url)
    if data.get("status") != "000":
        return None
    rows = data.get("list", [])
    for row in rows:
        se = row.get("se", "")
        if "합계" not in se and "총수" not in se:
            continue
        count = _first_int(row, ["istc_totqy", "now_to_isu_stock_totqy", "distb_stock_co"])
        if count is not None:
            return count
    return None


def fetch_recent_statements(
    api_key: str, corp_code: str, years: list[str], max_periods: int, with_headcount: bool = False
) -> list[dict]:
    """Walk years (newest first) x report codes (newest first), stop at max_periods.

    with_headcount=True also attaches employee/shares-outstanding fields
    (best-effort — see fetch_employee_status/fetch_shares_outstanding) for
    each period that has financial data, at the cost of two extra API
    calls per period.
    """
    out: list[dict] = []
    for year in years:
        for reprt_code, label in REPORT_CODES[::-1]:
            result = fetch_financial_statement(api_key, corp_code, year, reprt_code)
            if result is None:
                continue
            entry = {"period": f"{year} {label}", "bsns_year": year, **result}
            if with_headcount:
                try:
                    employees = fetch_employee_status(api_key, corp_code, year, reprt_code)
                except Exception:  # noqa: BLE001 - best-effort, never sink the period
                    employees = None
                try:
                    shares = fetch_shares_outstanding(api_key, corp_code, year, reprt_code)
                except Exception:  # noqa: BLE001
                    shares = None
                entry["employees"] = employees
                entry["shares_outstanding"] = shares
            out.append(entry)
            if len(out) >= max_periods:
                return out
    return out
