"""Daily OHLC prices via Stooq's CSV export. No API key required.

Stooq symbols used by this project: ^kospi, ^spx, ^ndq, cl.f (WTI crude),
gc.f (gold). If a symbol stops resolving, Stooq returns a one-line
"N/D" (no data) body instead of a CSV table, which is treated as an
error here rather than silently producing a zero value.
"""

import csv
import io

from .http import get_text


def fetch(params: dict) -> dict:
    symbol = params["symbol"]
    url = f"https://stooq.com/q/d/l/?s={symbol}&i=d"
    text = get_text(url)
    rows = [row for row in csv.reader(io.StringIO(text)) if row]
    if len(rows) < 2 or rows[0][0].lower() != "date":
        raise RuntimeError(f"stooq: no usable data for symbol {symbol!r} (got: {text[:80]!r})")

    header, *data_rows = rows
    date_idx = header.index("Date")
    close_idx = header.index("Close")

    last = data_rows[-1]
    value = float(last[close_idx])

    change_pct = None
    if len(data_rows) >= 2:
        prev_close = float(data_rows[-2][close_idx])
        if prev_close:
            change_pct = (value - prev_close) / prev_close * 100

    return {"value": value, "change_pct": change_pct, "as_of": last[date_idx]}
