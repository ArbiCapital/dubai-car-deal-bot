"""Bot principal: scheduler + flujo completo."""

from __future__ import annotations

import logging
import os
import sys
from datetime import datetime
from typing import Any

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from dotenv import load_dotenv

from calculator import evaluar_deal
from config_loader import (
    _client,
    get_active_searches,
    get_costes,
    get_global_settings,
    get_telegram_config,
)
from fx import fetch_aed_to_eur
from scraper_dubai import scrape_search
from scraper_spain import fetch_spain_stats
from telegram import Telegram, formatear_mensaje

load_dotenv()

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
log = logging.getLogger("dubai-bot")


def _url_already_notified(url: str) -> bool:
    """¿Esta URL ya fue enviada por Telegram en algún momento?"""
    try:
        res = (
            _client()
            .table("dubai_deals")
            .select("enviado_telegram")
            .eq("url", url)
            .eq("enviado_telegram", True)
            .limit(1)
            .execute()
        )
        return bool(res.data)
    except Exception:
        return False


def _upsert_deal(deal_row: dict[str, Any]) -> None:
    """Insert o update por url (la url identifica unívocamente el listing)."""
    try:
        existing = (
            _client().table("dubai_deals").select("id").eq("url", deal_row["url"]).limit(1).execute()
        )
        if existing.data:
            _client().table("dubai_deals").update(deal_row).eq("url", deal_row["url"]).execute()
        else:
            _client().table("dubai_deals").insert(deal_row).execute()
    except Exception:
        log.exception("Error upserting deal %s", deal_row.get("url"))


def _run_search(search: dict[str, Any], settings: dict[str, Any], costes: dict[str, Any], tg: Telegram) -> dict[str, int]:
    log.info("▶ Búsqueda: %s [marca=%s modelo=%s años=%s-%s precio=%s-%s AED km≤%s specs=%s]",
             search["nombre"], search["marca"], search["modelo"],
             search["ano_min"], search["ano_max"],
             search["precio_min_aed"], search["precio_max_aed"],
             search["km_max"], search.get("especificaciones") or "todas")
    fuentes = settings.get("fuentes", {"dubizzle": True, "dubicars": True})
    listings = scrape_search(search, fuentes)
    log.info("  %d anuncios brutos tras todas las fuentes", len(listings))

    stats = {"analizados": 0, "deals": 0, "sin_ano": 0, "sin_stats_es": 0, "no_supera_umbral": 0, "tg_ya_enviado": 0}
    for lst in listings:
        stats["analizados"] += 1

        if not lst.get("ano"):
            stats["sin_ano"] += 1
            continue
        spain = fetch_spain_stats(search["marca"], search["modelo"], int(lst["ano"]))
        if not spain:
            stats["sin_stats_es"] += 1
            continue

        eva = evaluar_deal(
            precio_aed=lst["precio_aed"],
            precio_referencia_es=spain["minimo"],
            costes=costes,
            settings_global=settings,
            margen_minimo_override=search.get("margen_minimo_override"),
        )
        clasif = eva["clasificacion"]
        if not clasif:
            stats["no_supera_umbral"] += 1
            continue

        deal_row = {
            "search_id": search["id"],
            "fuente": lst["fuente"],
            "titulo": lst["titulo"],
            "precio_aed": lst["precio_aed"],
            "precio_eur": int(eva["desglose"]["precio_eur"]),
            "ano": lst.get("ano"),
            "km": lst.get("km"),
            "url": lst["url"],
            "foto_url": lst.get("foto_url"),
            "precio_mercado_es": int(spain["minimo"]),  # mínimo saneado = competidor más barato
            "num_anuncios_es": int(spain["num_anuncios"]),
            "coste_total_espana": int(eva["desglose"]["coste_total"]),
            "margen": int(eva["margen"]),
            "margen_pct": round(float(eva["margen_pct"]), 4),
            "clasificacion": clasif,
            "umbral_aplicado": int(eva["umbral_aplicado"]),
            "enviado_telegram": False,
        }
        # Upsert para que el panel siempre tenga el dato actual (precio cambia con el tiempo)
        _upsert_deal(deal_row)
        stats["deals"] += 1

        # Telegram: solo si NUNCA hemos enviado este URL antes
        if _url_already_notified(lst["url"]):
            stats["tg_ya_enviado"] += 1
            continue

        mensaje = formatear_mensaje(
            deal={
                **lst,
                "clasificacion": clasif,
                "margen": eva["margen"],
                "margen_pct": eva["margen_pct"],
                "precio_eur": int(eva["desglose"]["precio_eur"]),
            },
            desglose=eva["desglose"],
            stats_es=spain,
        )
        enviado_ok = tg.enviar(
            mensaje,
            foto_url=lst.get("foto_url") if get_telegram_config().get("enviar_foto") else None,
        )
        if enviado_ok:
            try:
                _client().table("dubai_deals").update({"enviado_telegram": True}).eq(
                    "url", lst["url"]
                ).execute()
            except Exception:
                log.exception("No se pudo marcar enviado_telegram")
    log.info(
        "  Resumen '%s': escaneados=%d (sin_año=%d, sin_stats_ES=%d, no_supera_umbral=%d) → deals=%d (de los cuales %d ya estaban notificados)",
        search["nombre"], stats["analizados"],
        stats["sin_ano"], stats["sin_stats_es"], stats["no_supera_umbral"],
        stats["deals"], stats["tg_ya_enviado"],
    )
    return stats


def _refresh_fx_rate(settings: dict[str, Any]) -> dict[str, Any]:
    """Intenta refrescar AED→EUR via Frankfurter. Persiste en settings si éxito."""
    rate = fetch_aed_to_eur()
    if not rate:
        log.info("FX: no se pudo refrescar, uso valor en settings: %s", settings.get("aed_to_eur"))
        return settings
    new_settings = dict(settings)
    new_settings["aed_to_eur"] = round(rate, 6)
    try:
        _client().table("dubai_settings").update({"value": new_settings}).eq("key", "global").execute()
        log.info("FX actualizado: 1 AED = %s EUR (persistido)", new_settings["aed_to_eur"])
    except Exception:
        log.exception("FX update fail (uso valor en memoria)")
    return new_settings


def job() -> None:
    log.info("=== JOB START %s ===", datetime.now().isoformat())
    settings = get_global_settings()
    settings = _refresh_fx_rate(settings)
    costes = get_costes()
    tg_cfg = get_telegram_config()
    tg = Telegram(
        token=tg_cfg.get("token", ""),
        chat_id=tg_cfg.get("chat_id", ""),
        pausa_entre_msgs=tg_cfg.get("pausa_entre_msgs", 1.5),
    )
    searches = get_active_searches()
    log.info("Búsquedas activas: %d", len(searches))

    totales = {"analizados": 0, "deals": 0, "tg_ya_enviado": 0, "sin_ano": 0, "sin_stats_es": 0, "no_supera_umbral": 0}
    for s in searches:
        try:
            r = _run_search(s, settings, costes, tg)
            for k, v in r.items():
                totales[k] = totales.get(k, 0) + v
        except Exception:
            log.exception("Búsqueda falló: %s", s.get("nombre"))

    log.info("=== JOB END — %s ===", totales)
    if tg_cfg.get("enviar_resumen"):
        nuevos = totales["deals"] - totales.get("tg_ya_enviado", 0)
        try:
            tg.enviar(
                f"📊 *Resumen Export Dubai Deal*\n"
                f"Anuncios escaneados: {totales['analizados']}\n"
                f"Deals que cumplen umbral: {totales['deals']}\n"
                f"  · Notificados ahora: {nuevos}\n"
                f"  · Ya notificados antes: {totales.get('tg_ya_enviado', 0)}\n"
                f"Descartados: sin año {totales.get('sin_ano', 0)} · sin precio ES {totales.get('sin_stats_es', 0)} · no llega umbral {totales.get('no_supera_umbral', 0)}"
            )
        except Exception:
            pass


def main() -> None:
    if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_SERVICE_KEY"):
        log.error("Falta SUPABASE_URL o SUPABASE_SERVICE_KEY en el entorno")
        sys.exit(1)

    settings = get_global_settings()
    hora = settings.get("hora_busqueda", "08:00")
    tz = settings.get("zona_horaria", "Europe/Madrid")
    h, m = (int(x) for x in hora.split(":"))

    sched = BlockingScheduler(timezone=tz)
    sched.add_job(job, CronTrigger(hour=h, minute=m, timezone=tz), id="daily_search")
    log.info("Scheduler programado: cada día a las %s (%s)", hora, tz)

    if settings.get("ejecutar_al_inicio", False):
        log.info("ejecutar_al_inicio=true → corriendo ahora")
        try:
            job()
        except Exception:
            log.exception("Fallo en run inicial")

    sched.start()


if __name__ == "__main__":
    main()
