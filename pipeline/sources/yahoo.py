"""Yahoo Finance chart endpoint. No API key required.

Replaces an earlier Stooq-based source: Stooq's CSV export started
returning an HTML "robots" interstitial instead of data for scripted
requests (no symbol issue, all Stooq symbols failed identically), so
indices and commodities are fetched from Yahoo's public chart JSON
endpoint instead.
"""

from datetime import datetime, timezone

from .http import get_json


def fetch(params: dict) -> dict:
    symbol = params["symbol"]
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=5d"
    data = get_json(url)
    chart = data.get("chart", {})
    results = chart.get("result")
    if not results:
        raise RuntimeError(f"yahoo: no result for {symbol!r} (error={chart.get('error')!r})")

    meta = results[0].get("meta", {})
    value = meta.get("regularMarketPrice")
    prev_close = meta.get("chartPreviousClose", meta.get("previousClose"))
    if value is None:
        raise RuntimeError(f"yahoo: missing regularMarketPrice for {symbol!r}")

    change_pct = None
    if prev_close:
        change_pct = (value - prev_close) / prev_close * 100

    market_time = meta.get("regularMarketTime")
    as_of = (
        datetime.fromtimestamp(market_time, tz=timezone.utc).strftime("%Y-%m-%d")
        if market_time
        else datetime.now(timezone.utc).strftime("%Y-%m-%d")
    )

    return {"value": value, "change_pct": change_pct, "as_of": as_of}
