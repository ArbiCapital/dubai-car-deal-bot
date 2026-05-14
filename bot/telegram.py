"""Manda deals a Telegram con formato bonito."""

from __future__ import annotations

import logging
import time
from typing import Any

import httpx

log = logging.getLogger(__name__)

BADGES = {
    "excepcional": "🟡 EXCEPCIONAL",
    "muy_bueno":   "🟢 MUY BUENO",
    "bueno":       "🔵 BUENO",
}


def _barra(pct: float, ancho: int = 10) -> str:
    llenos = max(0, min(ancho, int(round(pct * ancho))))
    return "▰" * llenos + "▱" * (ancho - llenos)


def formatear_mensaje(deal: dict[str, Any], desglose: dict[str, Any], stats_es: dict[str, Any]) -> str:
    badge = BADGES.get(deal["clasificacion"], deal["clasificacion"])
    titulo = deal["titulo"]
    fuente = deal["fuente"]
    ano = deal.get("ano") or "?"
    km = f"{int(deal['km']):,}".replace(",", ".") if deal.get("km") else "?"

    precio_aed = f"{int(deal['precio_aed']):,}".replace(",", ".")
    precio_eur = f"{int(deal['precio_eur']):,}".replace(",", ".")

    def eur(v: float) -> str:
        return f"{int(round(v)):,} €".replace(",", ".")

    coste_total = desglose["coste_total"]
    margen = deal["margen"]
    margen_pct = deal["margen_pct"]
    barra = _barra(margen_pct)

    return (
        f"*{badge}*\n"
        f"_{titulo}_\n"
        f"📍 {fuente}  ·  {ano}  ·  {km} km\n"
        f"\n"
        f"💵 *Precio Dubai:* {precio_aed} AED  ({precio_eur} €)\n"
        f"\n"
        f"📦 *Costes hasta España*\n"
        f"  · RTA exportación: {eur(desglose['rta_exportacion'])}\n"
        f"  · Transporte: {eur(desglose['transporte'])}\n"
        f"  · Seguro: {eur(desglose['seguro'])}\n"
        f"  · Agente aduanas: {eur(desglose['agente_aduana'])}\n"
        f"  · Arancel 10%: {eur(desglose['arancel'])}\n"
        f"  · IVA 21%: {eur(desglose['iva_importacion'])}\n"
        f"  · Imp. matriculación: {eur(desglose['impuesto_matriculacion'])}\n"
        f"  · Homologación: {eur(desglose['homologacion'])}\n"
        f"  · ITV: {eur(desglose['itv'])}\n"
        f"  · Matriculación: {eur(desglose['matriculacion'])}\n"
        f"  ━━━━━━━━━━━━━━\n"
        f"  *Total en España: {eur(coste_total)}*\n"
        f"\n"
        f"🇪🇸 *Mercado España* ({stats_es.get('num_anuncios', 0)} anuncios)\n"
        f"  · Mín: {eur(stats_es['minimo'])}  ·  Mediana: {eur(stats_es['mediana'])}  ·  Máx: {eur(stats_es['maximo'])}\n"
        f"\n"
        f"📈 *Margen:* {eur(margen)}  ({margen_pct*100:.1f}% ROI)\n"
        f"`{barra}`\n"
        f"\n"
        f"[Ver anuncio]({deal['url']})"
    )


class Telegram:
    def __init__(self, token: str, chat_id: str, pausa_entre_msgs: float = 1.5):
        self.token = token
        self.chat_id = chat_id
        self.pausa = pausa_entre_msgs
        self.base = f"https://api.telegram.org/bot{token}"

    def enviar(self, mensaje: str, foto_url: str | None = None) -> bool:
        if not self.token or not self.chat_id:
            log.warning("Telegram sin configurar (token o chat_id vacíos); skip envío")
            return False
        try:
            if foto_url:
                r = httpx.post(
                    f"{self.base}/sendPhoto",
                    json={
                        "chat_id": self.chat_id,
                        "photo": foto_url,
                        "caption": mensaje,
                        "parse_mode": "Markdown",
                    },
                    timeout=30,
                )
                if r.status_code != 200:
                    log.warning("sendPhoto falló (%s), fallback a sendMessage", r.status_code)
                    foto_url = None
            if not foto_url:
                r = httpx.post(
                    f"{self.base}/sendMessage",
                    json={
                        "chat_id": self.chat_id,
                        "text": mensaje,
                        "parse_mode": "Markdown",
                        "disable_web_page_preview": False,
                    },
                    timeout=30,
                )
            r.raise_for_status()
            time.sleep(self.pausa)
            return True
        except Exception as e:
            log.exception("Error enviando a Telegram: %s", e)
            return False
