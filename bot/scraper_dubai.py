"""Scrapers para Dubizzle y DubiCars.

- Dubizzle: Playwright (Incapsula) + __NEXT_DATA__
- DubiCars: HTTP + JSON-LD (Schema.org ItemList)
"""

from __future__ import annotations

import json
import logging
import random
import re
import time
from typing import Any

import httpx
from playwright.sync_api import sync_playwright

log = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

NEXT_DATA_RE = re.compile(
    r'<script id="__NEXT_DATA__"[^>]*>(.+?)</script>', re.S
)
LD_JSON_RE = re.compile(
    r'<script type="application/ld\+json">(.+?)</script>', re.S
)


def _slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


# =========================================================
# Dubizzle — Playwright + __NEXT_DATA__
# =========================================================
def _dubizzle_url(search: dict[str, Any]) -> str:
    marca = _slug(search["marca"])
    modelo = _slug(search["modelo"])
    base = f"https://uae.dubizzle.com/motors/used-cars/{marca}/{modelo}/"
    params = (
        f"?price__gte={search['precio_min_aed']}"
        f"&price__lte={search['precio_max_aed']}"
        f"&year__gte={search['ano_min']}"
        f"&year__lte={search['ano_max']}"
        f"&kilometers__lte={search['km_max']}"
    )
    return base + params


def _dubizzle_hits_from_next(d: dict) -> list[dict]:
    try:
        actions = d["props"]["pageProps"]["reduxWrapperActionsGIPP"]
    except (KeyError, TypeError):
        return []
    for a in actions:
        if (
            isinstance(a, dict)
            and a.get("type", "").endswith("fetchListingDataForQuery/fulfilled")
        ):
            payload = a.get("payload") or {}
            hits = payload.get("hits") or []
            if isinstance(hits, list):
                return hits
    return []


def _extract_detail(hit: dict, slug_target: str) -> Any:
    for section in (hit.get("details_v2") or {}).values():
        if not isinstance(section, list):
            continue
        for f in section:
            if f.get("slug") == slug_target:
                v = f.get("value")
                if isinstance(v, dict):
                    return v.get("en")
                return v
    return None


SPEC_LABEL_TO_KEY = {
    "gcc specs": "gcc",
    "american specs": "american",
    "canadian specs": "canadian",
    "european specs": "european",
    "japanese specs": "japanese",
    "other specs": "other",
}


def _normalize_spec(label: str | None) -> str | None:
    if not label:
        return None
    return SPEC_LABEL_TO_KEY.get(label.strip().lower())


def _build_listings_from_hits(hits: list[dict], search: dict[str, Any]) -> list[dict]:
    out: list[dict] = []
    wanted_specs: set[str] = {s for s in (search.get("especificaciones") or []) if s}
    for h in hits:
        try:
            url_field = h.get("absolute_url")
            if isinstance(url_field, dict):
                detail_url = url_field.get("en") or h.get("permalink")
            else:
                detail_url = h.get("permalink") or url_field
            if not detail_url:
                continue

            name = h.get("name") or {}
            titulo = name.get("en") if isinstance(name, dict) else str(name)

            photos = h.get("photos") or {}
            foto = None
            if isinstance(photos, dict):
                foto = photos.get("main") or photos.get("medium") or photos.get("micro")

            precio = h.get("price")
            if not precio:
                continue

            year = _extract_detail(h, "year")
            km = _extract_detail(h, "kilometers")
            spec_raw = _extract_detail(h, "regional_specs")
            spec_key = _normalize_spec(spec_raw)

            # Filtro por specs configuradas
            if wanted_specs and (spec_key is None or spec_key not in wanted_specs):
                continue

            out.append({
                "listing_id": f"dubizzle:{h.get('id') or h.get('uuid') or h.get('objectID')}",
                "fuente": "Dubizzle",
                "titulo": titulo or f"{search['marca']} {search['modelo']}",
                "precio_aed": float(precio),
                "ano": int(year) if year else None,
                "km": int(km) if km else None,
                "url": detail_url,
                "foto_url": foto,
                "regional_specs": spec_key,
            })
        except Exception as e:
            log.debug("Dubizzle hit skip: %s", e)
            continue
    return out


def scrape_dubizzle(search: dict[str, Any]) -> list[dict[str, Any]]:
    url = _dubizzle_url(search)
    log.info("Dubizzle URL: %s", url)
    html = None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
            )
            ctx = browser.new_context(
                user_agent=USER_AGENT,
                viewport={"width": 1366, "height": 900},
                locale="en-US",
            )
            page = ctx.new_page()
            try:
                page.goto(url, timeout=45000, wait_until="domcontentloaded")
                try:
                    page.wait_for_load_state("networkidle", timeout=10000)
                except Exception:
                    pass
                html = page.content()
            finally:
                ctx.close()
                browser.close()
    except Exception as e:
        log.exception("Dubizzle Playwright error: %s", e)
        return []

    if not html:
        return []
    m = NEXT_DATA_RE.search(html)
    if not m:
        log.warning("Dubizzle: no __NEXT_DATA__ (anti-bot)")
        return []
    try:
        d = json.loads(m.group(1))
    except Exception:
        log.warning("Dubizzle: __NEXT_DATA__ parse failed")
        return []

    hits = _dubizzle_hits_from_next(d)
    log.info("Dubizzle: %d hits", len(hits))
    return _build_listings_from_hits(hits, search)


# =========================================================
# DubiCars — JSON-LD ItemList
# =========================================================
def _dubicars_url(search: dict[str, Any]) -> str:
    marca = _slug(search["marca"])
    modelo = _slug(search["modelo"])
    return f"https://www.dubicars.com/uae/used/{marca}/{modelo}"


def _dubicars_fetch(url: str) -> str | None:
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
    }
    try:
        with httpx.Client(timeout=30, follow_redirects=True, headers=headers) as c:
            r = c.get(url)
            if r.status_code != 200:
                log.warning("DubiCars HTTP %s for %s", r.status_code, url)
                return None
            return r.text
    except Exception as e:
        log.warning("DubiCars fetch error: %s", e)
        return None


DUBICARS_PRICE_RE = re.compile(
    r'class="[^"]*text-dark[^"]*"[^>]*>\s*AED\s*([\d,]+)', re.I
)
DUBICARS_URL_RE = re.compile(
    r'href="(https?://www\.dubicars\.com/\d{4}-[^"]+\.html)"'
)
DUBICARS_YEAR_SLUG_RE = re.compile(r'/(\d{4})-')


def _build_ld_meta(html: str) -> dict[str, dict[str, Any]]:
    """ItemList del JSON-LD nos da name + year + km + image fiables (NO precio)."""
    out: dict[str, dict[str, Any]] = {}
    for m in LD_JSON_RE.finditer(html):
        try:
            d = json.loads(m.group(1).strip())
        except Exception:
            continue
        graph = d.get("@graph") or [d]
        for it in graph:
            if not isinstance(it, dict) or it.get("@type") != "ItemList":
                continue
            for el in it.get("itemListElement", []):
                car = el.get("item") or {}
                if not isinstance(car, dict):
                    continue
                url_ = car.get("url")
                if not url_:
                    continue
                year = car.get("vehicleModelDate")
                km_field = car.get("mileageFromOdometer")
                km = None
                if isinstance(km_field, dict):
                    try:
                        km = int(km_field.get("value")) if km_field.get("value") else None
                    except Exception:
                        km = None
                image = car.get("image")
                if isinstance(image, list):
                    image = image[0] if image else None
                try:
                    ano = int(year) if year else None
                except Exception:
                    ano = None
                out[url_] = {
                    "name": car.get("name"),
                    "ano": ano,
                    "km": km,
                    "image": image,
                }
            break
    return out


def _dubicars_parse_html(html: str, search: dict[str, Any]) -> list[dict[str, Any]]:
    """Empareja precios visibles con URLs por posición en el HTML.

    El JSON-LD del list page tiene un campo `offers.price` poco fiable.
    El precio visible `<strong class="...text-dark">AED X,XXX</strong>` es el real.
    """
    ld_meta = _build_ld_meta(html)

    # Posiciones de precios visibles
    prices_pos: list[tuple[int, int]] = []
    for m in DUBICARS_PRICE_RE.finditer(html):
        try:
            v = int(m.group(1).replace(",", ""))
        except Exception:
            continue
        if v >= 10000:  # filtra cuotas mensuales (AED 3,147 etc.)
            prices_pos.append((m.start(), v))

    # Posiciones de URLs canónicas (dedup preservando orden de aparición)
    urls_pos: list[tuple[int, str]] = []
    seen_url: set[str] = set()
    for m in DUBICARS_URL_RE.finditer(html):
        u = m.group(1)
        if u in seen_url:
            continue
        seen_url.add(u)
        urls_pos.append((m.start(), u))

    results: list[dict[str, Any]] = []
    used: set[str] = set()
    for pp, precio in prices_pos:
        # Coger la URL canónica más cercana ANTES (cada card lista la URL antes del precio)
        candidate = None
        for up, u in urls_pos:
            if up < pp and u not in used:
                candidate = u
            elif up >= pp:
                break
        if not candidate:
            continue
        used.add(candidate)

        if "per-month" in candidate or "-pm-" in candidate:
            continue

        meta = ld_meta.get(candidate, {})
        titulo = meta.get("name") or f"{search['marca']} {search['modelo']}"
        ano = meta.get("ano")
        if ano is None:
            ym = DUBICARS_YEAR_SLUG_RE.search(candidate.rsplit("/", 1)[-1])
            if ym:
                try:
                    ano = int(ym.group(1))
                except Exception:
                    ano = None
        listing_id = "dubicars:" + candidate.rstrip("/").rsplit("/", 1)[-1].replace(".html", "")
        results.append({
            "listing_id": listing_id,
            "fuente": "DubiCars",
            "titulo": str(titulo),
            "precio_aed": float(precio),
            "ano": ano,
            "km": meta.get("km"),
            "url": candidate,
            "foto_url": meta.get("image"),
        })
    return results


def _passes_filters(item: dict, search: dict) -> bool:
    """DubiCars no soporta filtros server-side via URL. Filtramos cliente-side."""
    if item["precio_aed"] < search["precio_min_aed"] or item["precio_aed"] > search["precio_max_aed"]:
        return False
    if item.get("ano") is not None:
        if item["ano"] < search["ano_min"] or item["ano"] > search["ano_max"]:
            return False
    if item.get("km") is not None and item["km"] > search["km_max"]:
        return False
    return True


DETAIL_PRICE_RE = re.compile(r'"price"\s*:\s*"?(\d{4,})"?')


def _dubicars_verify_price(detail_url: str) -> int | None:
    """Fetcheo de detail page para sacar el precio real (más fiable que el del list)."""
    html = _dubicars_fetch(detail_url)
    if not html:
        return None
    # Busca el primer "price": ... grande dentro de la página
    candidates = [int(m.group(1)) for m in DETAIL_PRICE_RE.finditer(html)]
    # Filtra valores que parecen precio total real (> 20k AED)
    real = [c for c in candidates if c >= 20000]
    if not real:
        return None
    return min(real)  # el más bajo "real" suele ser el price total


def scrape_dubicars(search: dict[str, Any]) -> list[dict[str, Any]]:
    url = _dubicars_url(search)
    log.info("DubiCars URL: %s", url)
    html = _dubicars_fetch(url)
    if not html:
        return []
    listings = _dubicars_parse_html(html, search)
    log.info("DubiCars: %d listings raw (HTML parse)", len(listings))

    # Filtro precio/año/km
    filtered = [l for l in listings if _passes_filters(l, search)]
    log.info("DubiCars: %d tras filtro", len(filtered))
    return filtered


# =========================================================
# Orquestador
# =========================================================
def scrape_search(search: dict[str, Any], fuentes: dict[str, bool]) -> list[dict[str, Any]]:
    all_listings: list[dict[str, Any]] = []
    if fuentes.get("dubizzle", True):
        try:
            all_listings += scrape_dubizzle(search)
        except Exception as e:
            log.exception("Dubizzle error: %s", e)
        time.sleep(random.uniform(1.5, 3.0))
    if fuentes.get("dubicars", True):
        try:
            all_listings += scrape_dubicars(search)
        except Exception as e:
            log.exception("DubiCars error: %s", e)
        time.sleep(random.uniform(1.0, 2.0))
    return all_listings
