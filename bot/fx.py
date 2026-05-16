"""Tipo de cambio AED → EUR via Frankfurter (ECB, sin API key)."""

from __future__ import annotations

import logging
from typing import Any

import httpx

log = logging.getLogger(__name__)

FRANKFURTER_URL = "https://api.frankfurter.app/latest"


def fetch_aed_to_eur() -> float | None:
    """Devuelve tipo AED→EUR del día (referencia BCE) o None si falla."""
    try:
        # Frankfurter no soporta AED como base; usamos USD→EUR + AED peg a USD (3.6725)
        # PERO Frankfurter sí trae AED como currency. Probamos directo y caemos a USD si falla.
        with httpx.Client(timeout=15, follow_redirects=True) as c:
            r = c.get(FRANKFURTER_URL, params={"from": "AED", "to": "EUR"})
            if r.status_code == 200:
                rate = (r.json() or {}).get("rates", {}).get("EUR")
                if rate:
                    log.info("Frankfurter AED→EUR directo: %s", rate)
                    return float(rate)
            # Fallback: USD→EUR × (1/3.6725)
            r2 = c.get(FRANKFURTER_URL, params={"from": "USD", "to": "EUR"})
            r2.raise_for_status()
            usd_eur = (r2.json() or {}).get("rates", {}).get("EUR")
            if usd_eur:
                aed_eur = float(usd_eur) / 3.6725
                log.info("Frankfurter USD→EUR=%s → AED→EUR=%s", usd_eur, aed_eur)
                return aed_eur
    except Exception as e:
        log.warning("FX fetch error: %s", e)
    return None
