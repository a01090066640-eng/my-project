"""Tiny stdlib-only HTTP helpers shared by every source fetcher.

Kept dependency-free on purpose so the pipeline needs nothing beyond the
Python standard library in CI.
"""

import json
import urllib.error
import urllib.request

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


def _request(url: str, timeout: int) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read()
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"HTTP {exc.code} fetching {url}: {exc.reason}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"failed to reach {url}: {exc.reason}") from exc


def get_json(url: str, timeout: int = 15) -> dict:
    return json.loads(_request(url, timeout).decode("utf-8"))


def get_text(url: str, timeout: int = 15) -> str:
    return _request(url, timeout).decode("utf-8")
