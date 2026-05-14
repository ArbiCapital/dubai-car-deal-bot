# Dubai Car Deal Bot

Sistema de inteligencia de mercado para importar coches de Dubai a España.

- **Bot Python** scrapea Dubizzle + DubiCars, compara con coches.net, calcula margen tras costes y manda los buenos por Telegram.
- **Panel Next.js** (diseño ARBI) gestiona búsquedas, costes, ve histórico.
- **Supabase** conecta ambos. Cualquier cambio del panel se aplica en la siguiente ejecución del bot.

## Estructura

```
.
├── bot/        # Python — Railway
├── panel/      # Next.js 14 — Vercel
└── supabase/   # migraciones SQL
```

## Supabase

Proyecto: **ArbiOS** (`bjutnhbpinozquvmpfsk`, eu-west-1) — cuenta ArbiCapital.
URL: `https://bjutnhbpinozquvmpfsk.supabase.co`

Las tablas viven en `public` con prefijo `dubai_`:

- `dubai_settings` — `global`, `costes`, `telegram`
- `dubai_searches` — búsquedas configuradas
- `dubai_deals` — todos los deals (Realtime activo)
- `dubai_seen_listings` — anti-duplicados
- `dubai_spain_price_cache` — caché de precios España (24h)
- `dubai_team_members` — stub hasta Fase D (auth)

La migración inicial está en `supabase/migrations/001_init.sql`.

## Bot — local

```bash
cd bot
python -m venv .venv
source .venv/bin/activate   # o .venv\Scripts\activate en Windows
pip install -r requirements.txt
python -m playwright install chromium
cp .env.example .env        # rellena SUPABASE_SERVICE_KEY
python main.py
```

El bot lee toda la config de Supabase. Si `ejecutar_al_inicio=true` corre una vez al arrancar; luego se queda esperando al cron diario (`hora_busqueda`, `zona_horaria`).

## Panel — local

```bash
cd panel
npm install
cp .env.example .env.local
npm run dev
# http://localhost:3000
```

## Deploy

- **Bot → Railway**: env vars `SUPABASE_URL` y `SUPABASE_SERVICE_KEY`. Procfile lanza `playwright install chromium` y luego `main.py`.
- **Panel → Vercel** (cuenta `vercel-arbi`): env vars `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Estado actual

| Fase | Estado |
|---|---|
| A · Supabase | ✓ |
| B · Bot | ✓ |
| C · Panel | ✓ |
| D · Auth + RLS | pendiente |
| E · Deploy | pendiente |
| Telegram bot creado | pendiente |
