"""Saca stats de mercado España desde AutoScout24.es.

Estrategia: parse __NEXT_DATA__ via HTTP (sin Playwright). coches.net
da 403, autocasion y milanuncios también. AutoScout24 funciona limpio.
"""

from __future__ import annotations

import json
import logging
import re
import statistics
from typing import Any
from urllib.parse import quote_plus

import httpx

from config_loader import get_cached_price, save_cached_price

log = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

NEXT_DATA_RE = re.compile(
    r'<script[^>]+id="__NEXT_DATA__"[^>]*>(.+?)</script>', re.S
)


def _slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def _cache_key(marca: str, modelo: str, ano: int) -> str:
    return f"{_slug(marca)}_{_slug(modelo)}_{ano}"


def _autoscout_url(marca: str, modelo: str, ano: int) -> str:
    marca_s = quote_plus(marca.lower().replace(" ", "-"))
    modelo_s = quote_plus(modelo.lower().replace(" ", "-"))
    return (
        f"https://www.autoscout24.es/lst/{marca_s}/{modelo_s}"
        f"?atype=C&cy=E&fregfrom={ano}&fregto={ano}&sort=price&desc=0"
    )


def _fetch_listings(marca: str, modelo: str, ano: int) -> list[dict[str, Any]]:
    url = _autoscout_url(marca, modelo, ano)
    log.info("AutoScout24 URL: %s", url)
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "es-ES,es;q=0.9",
    }
    try:
        with httpx.Client(timeout=30, follow_redirects=True, headers=headers) as c:
            r = c.get(url)
            if r.status_code != 200:
                log.warning("AutoScout24 HTTP %s", r.status_code)
                return []
            html = r.text
    except Exception as e:
        log.warning("AutoScout24 fetch error: %s", e)
        return []

    m = NEXT_DATA_RE.search(html)
    if not m:
        log.warning("AutoScout24: no __NEXT_DATA__")
        return []
    try:
        d = json.loads(m.group(1))
    except Exception:
        log.warning("AutoScout24: __NEXT_DATA__ JSON parse failed")
        return []
    listings = d.get("props", {}).get("pageProps", {}).get("listings") or []
    if not isinstance(listings, list):
        return []
    return listings


def fetch_spain_stats(marca: str, modelo: str, ano: int) -> dict[str, Any] | None:
    if not ano:
        return None
    key = _cache_key(marca, modelo, ano)

    cached = get_cached_price(key)
    if cached:
        log.info("Cache hit Spain price %s", key)
        return cached

    listings = _fetch_listings(marca, modelo, ano)
    prices: list[int] = []
    for l in listings:
        if not isinstance(l, dict):
            continue
        p = l.get("price") or {}
        if not isinstance(p, dict):
            continue
        formatted = p.get("priceFormatted") or ""
        match = re.search(r"([\d.]+)", formatted.replace(",", "."))
        if match:
            try:
                prices.append(int(match.group(1).replace(".", "")))
            except Exception:
                pass

    prices = [p for p in prices if 3000 <= p <= 300000]
    if len(prices) < 3:
        log.warning("Solo %d precios para %s — sin stats", len(prices), key)
        return None

    stats = {
        "mediana": int(statistics.median(prices)),
        "minimo": int(min(prices)),
        "maximo": int(max(prices)),
        "media": int(statistics.mean(prices)),
        "num_anuncios": len(prices),
        "fuente": "autoscout24.es",
    }
    try:
        save_cached_price(key, stats, hours=24)
    except Exception:
        log.exception("No se pudo cachear price stats")
    return stats
