"""Scrapers para Dubizzle y DubiCars usando Playwright."""

from __future__ import annotations

import logging
import random
import re
import time
from typing import Any
from urllib.parse import quote_plus

from playwright.sync_api import Page, sync_playwright

log = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


def _slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def _to_int(s: str) -> int | None:
    if not s:
        return None
    digits = re.sub(r"[^\d]", "", s)
    return int(digits) if digits else None


# =========================================================
# Dubizzle (uae.dubizzle.com)
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


DUBIZZLE_SELECTORS = {
    "card": "li[aria-label='Listing']",
    "link": "a[href*='/motors/used-cars/']",
    "title": "h2",
    "price": "[aria-label='Price']",
    "details": "[aria-label='Sub Title']",
    "image": "img",
}


def scrape_dubizzle(page: Page, search: dict[str, Any], limit: int = 40) -> list[dict[str, Any]]:
    url = _dubizzle_url(search)
    log.info("Dubizzle URL: %s", url)
    try:
        page.goto(url, timeout=30000, wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle", timeout=15000)
    except Exception as e:
        log.warning("Dubizzle navigation failed: %s", e)
        return []

    for _ in range(3):
        page.mouse.wheel(0, 2500)
        time.sleep(random.uniform(0.8, 1.5))

    cards = page.locator(DUBIZZLE_SELECTORS["card"])
    n = cards.count()
    log.info("Dubizzle: %d cards encontrados", n)
    results: list[dict[str, Any]] = []
    for i in range(min(n, limit)):
        try:
            c = cards.nth(i)
            link_el = c.locator(DUBIZZLE_SELECTORS["link"]).first
            href = link_el.get_attribute("href") or ""
            if not href:
                continue
            full = href if href.startswith("http") else f"https://uae.dubizzle.com{href}"
            listing_id = f"dubizzle:{full.rstrip('/').split('/')[-1].split('?')[0]}"

            titulo = (c.locator(DUBIZZLE_SELECTORS["title"]).first.text_content() or "").strip()
            precio_txt = (c.locator(DUBIZZLE_SELECTORS["price"]).first.text_content() or "").strip()
            details_txt = (c.locator(DUBIZZLE_SELECTORS["details"]).first.text_content() or "").strip()
            img_src = c.locator(DUBIZZLE_SELECTORS["image"]).first.get_attribute("src") or None

            precio = _to_int(precio_txt)
            if not precio:
                continue
            ano_match = re.search(r"\b(20\d{2}|19\d{2})\b", details_txt + " " + titulo)
            km_match = re.search(r"(\d[\d,]*)\s*km", details_txt, re.IGNORECASE)
            ano = int(ano_match.group(1)) if ano_match else None
            km = _to_int(km_match.group(1)) if km_match else None

            results.append({
                "listing_id": listing_id,
                "fuente": "Dubizzle",
                "titulo": titulo or f"{search['marca']} {search['modelo']}",
                "precio_aed": float(precio),
                "ano": ano,
                "km": km,
                "url": full,
                "foto_url": img_src,
            })
        except Exception as e:
            log.debug("Dubizzle card %d skip: %s", i, e)
            continue
    return results


# =========================================================
# DubiCars (dubicars.com)
# =========================================================
def _dubicars_url(search: dict[str, Any]) -> str:
    base = "https://www.dubicars.com/search.html"
    marca = quote_plus(search["marca"])
    modelo = quote_plus(search["modelo"])
    params = (
        f"?b={marca}&m={modelo}"
        f"&ymin={search['ano_min']}&ymax={search['ano_max']}"
        f"&pmin={search['precio_min_aed']}&pmax={search['precio_max_aed']}"
        f"&kmax={search['km_max']}"
    )
    return base + params


DUBICARS_SELECTORS = {
    "card": "article.serp-list-item, li.serp-list-item, div.car-card",
    "link": "a[href*='/']",
    "title": ".title, h3, .car-title",
    "price": ".price, .car-price",
    "year": ".year, .car-year",
    "km": ".km, .mileage",
    "image": "img",
}


def scrape_dubicars(page: Page, search: dict[str, Any], limit: int = 40) -> list[dict[str, Any]]:
    url = _dubicars_url(search)
    log.info("DubiCars URL: %s", url)
    try:
        page.goto(url, timeout=30000, wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle", timeout=15000)
    except Exception as e:
        log.warning("DubiCars navigation failed: %s", e)
        return []

    for _ in range(3):
        page.mouse.wheel(0, 2500)
        time.sleep(random.uniform(0.8, 1.5))

    cards = page.locator(DUBICARS_SELECTORS["card"])
    n = cards.count()
    log.info("DubiCars: %d cards encontrados", n)
    results: list[dict[str, Any]] = []
    for i in range(min(n, limit)):
        try:
            c = cards.nth(i)
            link_el = c.locator(DUBICARS_SELECTORS["link"]).first
            href = link_el.get_attribute("href") or ""
            if not href:
                continue
            full = href if href.startswith("http") else f"https://www.dubicars.com{href}"
            listing_id = f"dubicars:{full.rstrip('/').split('/')[-1].split('?')[0]}"

            titulo = (c.locator(DUBICARS_SELECTORS["title"]).first.text_content() or "").strip()
            precio_txt = (c.locator(DUBICARS_SELECTORS["price"]).first.text_content() or "").strip()
            ano_txt = ""
            try:
                ano_txt = (c.locator(DUBICARS_SELECTORS["year"]).first.text_content() or "").strip()
            except Exception:
                pass
            km_txt = ""
            try:
                km_txt = (c.locator(DUBICARS_SELECTORS["km"]).first.text_content() or "").strip()
            except Exception:
                pass
            try:
                img_src = c.locator(DUBICARS_SELECTORS["image"]).first.get_attribute("src") or None
            except Exception:
                img_src = None

            precio = _to_int(precio_txt)
            if not precio:
                continue
            ano = _to_int(ano_txt) if ano_txt else None
            if ano is None:
                m = re.search(r"\b(20\d{2}|19\d{2})\b", titulo)
                ano = int(m.group(1)) if m else None
            km = _to_int(km_txt)

            results.append({
                "listing_id": listing_id,
                "fuente": "DubiCars",
                "titulo": titulo or f"{search['marca']} {search['modelo']}",
                "precio_aed": float(precio),
                "ano": ano,
                "km": km,
                "url": full,
                "foto_url": img_src,
            })
        except Exception as e:
            log.debug("DubiCars card %d skip: %s", i, e)
            continue
    return results


# =========================================================
# Orquestador
# =========================================================
def scrape_search(search: dict[str, Any], fuentes: dict[str, bool]) -> list[dict[str, Any]]:
    """Lanza un browser una vez por búsqueda y scrapea las fuentes activas."""
    all_listings: list[dict[str, Any]] = []
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
            if fuentes.get("dubizzle", True):
                try:
                    all_listings += scrape_dubizzle(page, search)
                except Exception as e:
                    log.exception("Dubizzle scrape error: %s", e)
            if fuentes.get("dubicars", True):
                try:
                    all_listings += scrape_dubicars(page, search)
                except Exception as e:
                    log.exception("DubiCars scrape error: %s", e)
        finally:
            ctx.close()
            browser.close()
    return all_listings
