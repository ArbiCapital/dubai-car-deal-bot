"""Scrapea coches.net para sacar mediana de mercado España."""

from __future__ import annotations

import logging
import random
import re
import statistics
import time
from typing import Any
from urllib.parse import quote_plus

from playwright.sync_api import sync_playwright

from config_loader import get_cached_price, save_cached_price

log = logging.getLogger(__name__)


def _slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def _cache_key(marca: str, modelo: str, ano: int) -> str:
    return f"{_slug(marca)}_{_slug(modelo)}_{ano}"


def _coches_net_url(marca: str, modelo: str, ano: int) -> str:
    return (
        "https://www.coches.net/segunda-mano/"
        f"?MakeIds[]={quote_plus(marca)}"
        f"&ModelIds[]={quote_plus(modelo)}"
        f"&YearFrom={ano}&YearTo={ano}"
    )


def fetch_spain_stats(marca: str, modelo: str, ano: int) -> dict[str, Any] | None:
    if not ano:
        return None
    key = _cache_key(marca, modelo, ano)

    cached = get_cached_price(key)
    if cached:
        log.info("Cache hit Spain price %s", key)
        return cached

    url = _coches_net_url(marca, modelo, ano)
    log.info("coches.net URL: %s", url)
    precios: list[int] = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
            ctx = browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                ),
                viewport={"width": 1366, "height": 900},
                locale="es-ES",
            )
            page = ctx.new_page()
            try:
                page.goto(url, timeout=30000, wait_until="domcontentloaded")
                page.wait_for_load_state("networkidle", timeout=15000)
            except Exception:
                pass

            for _ in range(2):
                page.mouse.wheel(0, 2500)
                time.sleep(random.uniform(0.6, 1.2))

            html = page.content()
            ctx.close()
            browser.close()

        for m in re.finditer(r"(\d{1,3}(?:\.\d{3})+)\s*€", html):
            try:
                precios.append(int(m.group(1).replace(".", "")))
            except Exception:
                continue
    except Exception as e:
        log.exception("coches.net error: %s", e)
        return None

    precios = [p for p in precios if 3000 <= p <= 300000]
    if len(precios) < 3:
        log.warning("Sólo %d precios para %s — sin stats", len(precios), key)
        return None

    stats = {
        "mediana": int(statistics.median(precios)),
        "minimo": int(min(precios)),
        "maximo": int(max(precios)),
        "media": int(statistics.mean(precios)),
        "num_anuncios": len(precios),
        "fuente": "coches.net",
    }
    try:
        save_cached_price(key, stats, hours=24)
    except Exception:
        log.exception("No se pudo cachear price stats")
    return stats
