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


def _autoscout_url(marca: str, modelo: str, ano: int, page: int = 1) -> str:
    marca_s = quote_plus(marca.lower().replace(" ", "-"))
    modelo_s = quote_plus(modelo.lower().replace(" ", "-"))
    return (
        f"https://www.autoscout24.es/lst/{marca_s}/{modelo_s}"
        f"?atype=C&cy=E&fregfrom={ano}&fregto={ano}"
        # Excluir dañados / siniestrados (filtro nativo AutoScout)
        f"&damaged_listing=NO_DAMAGED_VEHICLES"
        # Solo coches que el vendedor lista como en buen estado / no de accidente
        f"&sort=price&desc=0&page={page}"
    )


def _fetch_one_page(marca: str, modelo: str, ano: int, page: int) -> list[dict[str, Any]]:
    url = _autoscout_url(marca, modelo, ano, page)
    log.info("AutoScout24 page %d: %s", page, url)
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "es-ES,es;q=0.9",
    }
    try:
        with httpx.Client(timeout=30, follow_redirects=True, headers=headers) as c:
            r = c.get(url)
            if r.status_code != 200:
                log.warning("AutoScout24 HTTP %s on page %d", r.status_code, page)
                return []
            html = r.text
    except Exception as e:
        log.warning("AutoScout24 fetch error page %d: %s", page, e)
        return []

    m = NEXT_DATA_RE.search(html)
    if not m:
        return []
    try:
        d = json.loads(m.group(1))
    except Exception:
        return []
    listings = d.get("props", {}).get("pageProps", {}).get("listings") or []
    return listings if isinstance(listings, list) else []


def _is_good_condition(listing: dict[str, Any]) -> bool:
    """Heurística: descarta coches en mal estado / siniestrados.

    Señales que descartamos:
    - priceLabel == 'very-good-price': AutoScout marca así precios anormalmente bajos
      (frecuentemente coches dañados, importados de subasta, etc.)
    - specialConditions con algo (no vacío)
    """
    sc = listing.get("specialConditions")
    if sc and isinstance(sc, (list, dict)) and len(sc) > 0:
        return False
    label = (listing.get("tracking") or {}).get("priceLabel", "")
    if label == "very-good-price":
        return False
    return True


def _fetch_listings(marca: str, modelo: str, ano: int, max_pages: int = 5) -> list[dict[str, Any]]:
    """Paginar AutoScout24 hasta `max_pages` o hasta que devuelva 0 listings."""
    all_listings: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    descartados_estado = 0
    for p in range(1, max_pages + 1):
        page_items = _fetch_one_page(marca, modelo, ano, p)
        if not page_items:
            break
        new = 0
        for item in page_items:
            id_ = str(item.get("id") or item.get("identifier") or item.get("url") or "")
            if not id_ or id_ in seen_ids:
                continue
            seen_ids.add(id_)
            if not _is_good_condition(item):
                descartados_estado += 1
                continue
            all_listings.append(item)
            new += 1
        if new == 0:
            break  # página repetida → fin
    log.info(
        "AutoScout24: %d listings únicos en %d páginas (%d descartados por estado/precio sospechoso)",
        len(all_listings), p, descartados_estado,
    )
    return all_listings


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

    # Filtro inicial de sanidad
    prices = [p for p in prices if 3000 <= p <= 500000]
    if len(prices) < 5:
        log.warning("Solo %d precios para %s — sin stats", len(prices), key)
        return None

    # Saneo: corto el 10% inferior y 10% superior (descarta outliers / cuotas EMI / coches dañados)
    prices.sort()
    cut = max(1, len(prices) // 10)
    saneado = prices[cut:-cut] if len(prices) > 2 * cut else prices
    if len(saneado) < 3:
        log.warning("Saneo dejó solo %d precios — uso lista cruda", len(saneado))
        saneado = prices

    stats = {
        "mediana": int(statistics.median(saneado)),
        "minimo": int(min(saneado)),
        "maximo": int(max(saneado)),
        "media": int(statistics.mean(saneado)),
        "num_anuncios": len(saneado),
        "fuente": "autoscout24.es",
    }
    log.info(
        "Spain stats %s: %d crudos → %d saneados, mín=%s med=%s máx=%s",
        key, len(prices), len(saneado), stats["minimo"], stats["mediana"], stats["maximo"],
    )
    try:
        save_cached_price(key, stats, hours=24)
    except Exception:
        log.exception("No se pudo cachear price stats")
    return stats
