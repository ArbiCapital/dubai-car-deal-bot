"""Lee toda la configuración del bot desde Supabase."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from typing import Any, Optional

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()


@lru_cache(maxsize=1)
def _client() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_KEY"]
    return create_client(url, key)


def _get_setting(key: str) -> dict[str, Any]:
    res = (
        _client()
        .table("dubai_settings")
        .select("value")
        .eq("key", key)
        .single()
        .execute()
    )
    return res.data["value"]


def get_global_settings() -> dict[str, Any]:
    return _get_setting("global")


def get_costes() -> dict[str, Any]:
    return _get_setting("costes")


def get_telegram_config() -> dict[str, Any]:
    return _get_setting("telegram")


def get_active_searches() -> list[dict[str, Any]]:
    res = (
        _client()
        .table("dubai_searches")
        .select("*")
        .eq("activa", True)
        .execute()
    )
    return res.data or []


def is_seen(listing_id: str) -> bool:
    res = (
        _client()
        .table("dubai_seen_listings")
        .select("listing_id")
        .eq("listing_id", listing_id)
        .limit(1)
        .execute()
    )
    return bool(res.data)


def mark_seen(listing_id: str) -> None:
    _client().table("dubai_seen_listings").upsert(
        {"listing_id": listing_id}, on_conflict="listing_id"
    ).execute()


def save_deal(deal: dict[str, Any]) -> None:
    _client().table("dubai_deals").insert(deal).execute()


def get_cached_price(cache_key: str) -> Optional[dict[str, Any]]:
    res = (
        _client()
        .table("dubai_spain_price_cache")
        .select("*")
        .eq("cache_key", cache_key)
        .limit(1)
        .execute()
    )
    if not res.data:
        return None
    row = res.data[0]
    if datetime.fromisoformat(row["expires_at"].replace("Z", "+00:00")) <= datetime.now(timezone.utc):
        return None
    return row


def save_cached_price(cache_key: str, data: dict[str, Any], hours: int = 24) -> None:
    expires = (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()
    payload = {
        "cache_key": cache_key,
        "mediana": int(data["mediana"]),
        "minimo": int(data["minimo"]),
        "maximo": int(data["maximo"]),
        "media": int(data["media"]),
        "num_anuncios": int(data["num_anuncios"]),
        "fuente": data.get("fuente", "coches.net"),
        "expires_at": expires,
    }
    _client().table("dubai_spain_price_cache").upsert(payload, on_conflict="cache_key").execute()
