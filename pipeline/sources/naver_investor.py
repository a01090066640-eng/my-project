"""Foreign / institution net-trading (수급) from Naver Finance. No API key.

Naver's `finance.naver.com/item/frgn.naver` page has a plain HTML table with
one row per trading day: date, close price, volume, and net trading volume
by investor type (기관/외국인 순매매량, 외국인 보유율). It has no public JSON
API, so this parses the table with the standard-library `html.parser`
instead of pulling in a scraping dependency.

Column *order* on that page isn't something to hardcode positionally — this
matches header cells by the Korean substrings they contain ('기관', '외국인',
'거래량') so a layout tweak on Naver's end doesn't silently mislabel a
column. If none of the expected headers are found, it raises rather than
guessing.

개인(individual) net trading isn't published directly for a single stock;
it's derived the same way Korean HTS terminals show it — as the residual of
total volume minus foreign and institution net volume.
"""

import re
from html.parser import HTMLParser

from .http import get_text

URL_TMPL = "https://finance.naver.com/item/frgn.naver?code={code}&page={page}"


class _TableParser(HTMLParser):
    """Collects every <table class="type2"> as a list of row cell-text lists."""

    def __init__(self) -> None:
        super().__init__()
        self._in_target_table = 0
        self._table_depth = 0
        self._in_cell = False
        self._current_row: list[str] | None = None
        self._current_cell_text: list[str] = []
        self.rows: list[list[str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_d = dict(attrs)
        if tag == "table":
            classes = (attrs_d.get("class") or "").split()
            if "type2" in classes:
                self._in_target_table += 1
            elif self._in_target_table:
                self._table_depth += 1
        elif tag == "tr" and self._in_target_table and self._table_depth == 0:
            self._current_row = []
        elif tag in ("td", "th") and self._current_row is not None:
            self._in_cell = True
            self._current_cell_text = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "table" and self._in_target_table:
            if self._table_depth:
                self._table_depth -= 1
            else:
                self._in_target_table -= 1
        elif tag in ("td", "th") and self._in_cell:
            self._in_cell = False
            text = "".join(self._current_cell_text).strip()
            if self._current_row is not None:
                self._current_row.append(text)
        elif tag == "tr" and self._current_row is not None:
            if any(self._current_row):
                self.rows.append(self._current_row)
            self._current_row = None

    def handle_data(self, data: str) -> None:
        if self._in_cell:
            self._current_cell_text.append(data)


def _to_int(text: str) -> int | None:
    text = text.strip()
    if not text or text in ("-", "0"):
        return 0 if text == "0" else None
    negative = text.startswith("-") or "▼" in text
    digits = re.sub(r"[^0-9]", "", text)
    if not digits:
        return None
    value = int(digits)
    return -value if negative else value


def fetch_flow(stock_code: str, pages: int = 2) -> list[dict]:
    """Recent trading days' 외국인/기관 net volume, oldest first.

    Returns rows shaped like:
      {"date": "2026.09.18", "volume": 15594733, "foreign_net": -123456,
       "institution_net": 45678, "individual_net": 77778}
    """
    all_rows: list[list[str]] = []
    header: list[str] | None = None
    for page in range(1, pages + 1):
        html = get_text(URL_TMPL.format(code=stock_code, page=page))
        parser = _TableParser()
        parser.feed(html)
        if not parser.rows:
            continue
        if header is None:
            header = parser.rows[0]
        all_rows.extend(parser.rows[1:])

    if header is None or not all_rows:
        raise RuntimeError(f"naver_investor: no table rows for {stock_code!r}")

    def find_col(*keywords: str) -> int:
        for i, cell in enumerate(header):
            if all(k in cell for k in keywords):
                return i
        raise RuntimeError(f"naver_investor: column {keywords!r} not found in header {header!r}")

    date_col = find_col("날짜")
    volume_col = find_col("거래량")
    institution_col = find_col("기관", "순매매")
    foreign_col = find_col("외국인", "순매매")

    out: list[dict] = []
    for row in all_rows:
        if len(row) <= max(date_col, volume_col, institution_col, foreign_col):
            continue
        date = row[date_col].strip()
        if not date:
            continue
        volume = _to_int(row[volume_col])
        institution_net = _to_int(row[institution_col])
        foreign_net = _to_int(row[foreign_col])
        if volume is None or institution_net is None or foreign_net is None:
            continue
        individual_net = volume - institution_net - foreign_net
        out.append(
            {
                "date": date.replace(".", "-").rstrip("-"),
                "volume": volume,
                "foreign_net": foreign_net,
                "institution_net": institution_net,
                "individual_net": individual_net,
            }
        )

    out.reverse()  # Naver lists newest first; the dashboard wants oldest-first for charting
    return out
