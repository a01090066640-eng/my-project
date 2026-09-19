"""Analyst consensus (매출액/영업이익 forecasts) via the WiseReport widget
Naver Finance embeds under its '컨센서스' tab (internally referred to as
report code cF1001).

LOWER CONFIDENCE than the other sources in this pipeline: this module's
author could not verify the page's exact table markup against a live
fetch (network access wasn't available while writing it), only that this
URL/host is the one commonly cited for that widget. Rather than hardcode
a guessed CSS class or table position, it scans every <table> on the page
for one whose row labels look like a FnGuide-style consensus table
(매출액/영업이익 rows, year-or-"(E)"-labeled columns) and reads off of
that — so a markup change is more likely to make it find nothing (handled
by the caller as a normal miss) than to silently misread the wrong table.

If this doesn't work against the real page, treat it as a bug to fix by
inspecting a live fetch, not a sign the approach is unfixable.
"""

import re
from html.parser import HTMLParser

from .http import get_text

URL_TMPL = "https://navercomp.wisereport.co.kr/v2/company/cF1001.aspx?cmp_cd={code}"

REVENUE_ROW_LABELS = ("매출액",)
OPERATING_PROFIT_ROW_LABELS = ("영업이익",)


class _AllTablesParser(HTMLParser):
    """Collects every <table> on the page as a list of rows of cell text."""

    def __init__(self) -> None:
        super().__init__()
        self._table_depth = 0
        self._current_table: list[list[str]] | None = None
        self._current_row: list[str] | None = None
        self._in_cell = False
        self._cell_text: list[str] = []
        self.tables: list[list[list[str]]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "table":
            if self._table_depth == 0:
                self._current_table = []
            self._table_depth += 1
        elif tag == "tr" and self._current_table is not None and self._table_depth == 1:
            self._current_row = []
        elif tag in ("td", "th") and self._current_row is not None:
            self._in_cell = True
            self._cell_text = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "table":
            self._table_depth = max(0, self._table_depth - 1)
            if self._table_depth == 0 and self._current_table is not None:
                if self._current_table:
                    self.tables.append(self._current_table)
                self._current_table = None
        elif tag in ("td", "th") and self._in_cell:
            self._in_cell = False
            if self._current_row is not None:
                self._current_row.append("".join(self._cell_text).strip())
        elif tag == "tr" and self._current_row is not None:
            if self._table_depth == 1 and self._current_table is not None:
                if any(self._current_row):
                    self._current_table.append(self._current_row)
            self._current_row = None

    def handle_data(self, data: str) -> None:
        if self._in_cell:
            self._cell_text.append(data)


def _to_number(text: str) -> float | None:
    text = text.strip()
    if not text or text in ("-", "N/A"):
        return None
    negative = text.startswith("-")
    digits = re.sub(r"[^0-9.]", "", text)
    if not digits:
        return None
    try:
        value = float(digits)
    except ValueError:
        return None
    return -value if negative else value


def _find_consensus_table(tables: list[list[list[str]]]) -> list[list[str]] | None:
    for table in tables:
        row_labels = [row[0] for row in table if row]
        has_revenue = any(any(lbl in cell for lbl in REVENUE_ROW_LABELS) for cell in row_labels)
        has_op = any(any(lbl in cell for lbl in OPERATING_PROFIT_ROW_LABELS) for cell in row_labels)
        if has_revenue and has_op and len(table) >= 2:
            return table
    return None


def fetch_consensus(stock_code: str) -> dict | None:
    """Annual revenue/operating-profit consensus, actuals + (E) forecast years.

    Returns {"periods": [label, ...], "revenue": [num|None, ...],
    "operating_profit": [num|None, ...]} aligned by index, or None if no
    matching table was found on the page.
    """
    html = get_text(URL_TMPL.format(code=stock_code), timeout=20)
    parser = _AllTablesParser()
    parser.feed(html)
    table = _find_consensus_table(parser.tables)
    if table is None:
        return None

    header = table[0]
    periods = header[1:]

    def row_values(labels: tuple[str, ...]) -> list[float | None]:
        for row in table[1:]:
            if row and any(lbl in row[0] for lbl in labels):
                return [_to_number(v) for v in row[1 : 1 + len(periods)]]
        return [None] * len(periods)

    return {
        "periods": periods,
        "revenue": row_values(REVENUE_ROW_LABELS),
        "operating_profit": row_values(OPERATING_PROFIT_ROW_LABELS),
    }
