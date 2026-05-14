"""Calcula coste total en España y clasifica el deal."""

from __future__ import annotations

from typing import Any


UMBRAL_EXCEPCIONAL = 15000
UMBRAL_MUY_BUENO = 10000


def calcular_coste_espana(precio_aed: float, costes: dict[str, Any], aed_to_eur: float) -> dict[str, float]:
    """Desglose completo del coste de poner el coche en España, matriculado."""
    precio_eur = precio_aed * aed_to_eur

    rta = costes["rta_exportacion_eur"]
    transporte = costes["transporte_eur"]
    seguro = precio_eur * costes["seguro_pct"]
    agente = costes["agente_aduana_eur"]
    arancel = precio_eur * costes["arancel_pct"]
    iva_imp = (precio_eur + arancel) * costes["iva_importacion_pct"]
    base_hacienda = precio_eur * costes["factor_hacienda"]
    imp_mat = base_hacienda * costes["impuesto_mat_pct"]
    homologacion = costes["homologacion_eur"]
    itv = costes["itv_eur"]
    matriculacion = costes["matriculacion_eur"]

    total = (
        precio_eur
        + rta
        + transporte
        + seguro
        + agente
        + arancel
        + iva_imp
        + imp_mat
        + homologacion
        + itv
        + matriculacion
    )

    return {
        "precio_eur": precio_eur,
        "rta_exportacion": rta,
        "transporte": transporte,
        "seguro": seguro,
        "agente_aduana": agente,
        "arancel": arancel,
        "iva_importacion": iva_imp,
        "impuesto_matriculacion": imp_mat,
        "homologacion": homologacion,
        "itv": itv,
        "matriculacion": matriculacion,
        "coste_total": total,
    }


def evaluar_deal(
    *,
    precio_aed: float,
    mediana_espana: int,
    costes: dict[str, Any],
    settings_global: dict[str, Any],
    margen_minimo_override: int | None = None,
) -> dict[str, Any]:
    """Devuelve desglose + margen + clasificación, o None si no supera el umbral."""
    aed_to_eur = settings_global["aed_to_eur"]
    descuento_venta = settings_global["descuento_venta_pct"]
    umbral = margen_minimo_override or settings_global["margen_minimo_eur"]

    desglose = calcular_coste_espana(precio_aed, costes, aed_to_eur)
    coste_total = desglose["coste_total"]
    precio_venta = mediana_espana * (1 - descuento_venta)
    margen = precio_venta - coste_total
    margen_pct = margen / coste_total if coste_total else 0

    if margen >= UMBRAL_EXCEPCIONAL:
        clasificacion = "excepcional"
    elif margen >= UMBRAL_MUY_BUENO:
        clasificacion = "muy_bueno"
    elif margen >= umbral:
        clasificacion = "bueno"
    else:
        clasificacion = None

    return {
        "desglose": desglose,
        "precio_venta": precio_venta,
        "margen": margen,
        "margen_pct": margen_pct,
        "clasificacion": clasificacion,
        "umbral_aplicado": umbral,
    }
