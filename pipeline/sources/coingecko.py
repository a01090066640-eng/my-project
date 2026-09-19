"""CoinGecko simple-price source. No API key required."""

from datetime import datetime, timezone

from .http import get_json


def fetch(params: dict) -> dict:
    coin_id = params["coin_id"]
    url = (
        "https://api.coingecko.com/api/v3/simple/price"
        f"?ids={coin_id}&vs_currencies=usd&include_24hr_change=true"
    )
    data = get_json(url)
    if coin_id not in data:
        raise RuntimeError(f"coingecko: no data for {coin_id!r} in response {data!r}")
    entry = data[coin_id]
    return {
        "value": entry["usd"],
        "change_pct": entry.get("usd_24h_change"),
        "as_of": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    }
