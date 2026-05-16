# Dubai Car Deal Bot

Sistema de inteligencia de mercado para importar coches de Dubai a España.

- **Bot Python** scrapea Dubizzle, compara con AutoScout24.es, calcula margen tras costes y manda los buenos por Telegram.
- **Panel Next.js** (diseño ARBI) gestiona búsquedas, costes, ve histórico.
- **Supabase** conecta ambos. Cualquier cambio del panel se aplica en la siguiente ejecución del bot.

## URLs

| Recurso | URL |
|---|---|
| Panel | https://dubai-car-deal-bot.vercel.app |
| Repo | https://github.com/ArbiCapital/dubai-car-deal-bot (público) |
| Workflow | https://github.com/ArbiCapital/dubai-car-deal-bot/actions |
| Supabase | proyecto **ArbiOS** `bjutnhbpinozquvmpfsk` |
| Telegram bot | @dubai_deal_arbi_bot |

## Estado

| Pieza | Estado |
|---|---|
| Supabase (schema + RLS, admin = `gastakafx@gmail.com`) | ✓ |
| Bot Python (Dubizzle via Playwright + AutoScout24 via HTTP) | ✓ |
| Panel Next.js (5 páginas + login) | ✓ |
| Auto-deploy Vercel desde push | ✓ |
| GitHub Actions cron diario (06:00 + 07:00 UTC = 08:00 Madrid) | ✓ |
| Telegram bot creado + token/chat_id en Supabase | ✓ |
| End-to-end verificado: 1 deal `muy_bueno` enviado por Telegram + guardado en Supabase | ✓ |

## Cómo lo encontrarás cada mañana

1. A las 08:00 (Europe/Madrid) el cron de GitHub Actions corre `bot/main.py` → `job()`.
2. Por cada `dubai_searches.activa = true`:
   - Scrape Dubizzle vía Playwright (pasa Incapsula).
   - Para cada coche nuevo, calcula coste total en España.
   - Compara con mediana AutoScout24.es del mismo año.
   - Si margen ≥ umbral → inserta en `dubai_deals` + manda Telegram con foto, desglose de costes y barra de ROI.
3. Resumen final también por Telegram.
4. Lo ves en https://dubai-car-deal-bot.vercel.app/deals (Realtime push).

## Estructura

```
.
├── bot/
│   ├── main.py
│   ├── config_loader.py
│   ├── scraper_dubai.py    # Dubizzle (Playwright + __NEXT_DATA__)
│   ├── scraper_spain.py    # AutoScout24 (HTTP + __NEXT_DATA__)
│   ├── calculator.py
│   ├── telegram.py
│   ├── requirements.txt
│   └── Procfile
├── panel/                  # Next.js 14, Vercel
├── supabase/migrations/
│   ├── 001_init.sql
│   └── 002_auth_rls.sql
└── .github/workflows/bot.yml
```

## Tablas Supabase (schema `public`)

- `dubai_settings` — `global` / `costes` / `telegram`
- `dubai_searches` — búsquedas configuradas (4 inicialmente)
- `dubai_deals` — deals encontrados (Realtime activo)
- `dubai_seen_listings` — anti-duplicados
- `dubai_spain_price_cache` — caché 24h de mediana España
- `dubai_team_members` — para auth (stub)

## Lo primero al volver

1. **Sign up** en https://dubai-car-deal-bot.vercel.app/login con `gastakafx@gmail.com` → te creas como admin automáticamente.
2. Mira `/deals` para ver el deal que ya hay (Porsche Cayenne Platinum 2019, margen 11,364€).
3. Si quieres re-activar **DubiCars**: vía panel `/settings` → toggle DubiCars ON. *(Ojo: el scraper de DubiCars no funciona bien desde IPs de GitHub Actions — DubiCars sirve datos distintos según geo IP. Si quieres usarlo, hay que pasar por un proxy o ejecutar el bot en otra infra.)*

## Local

**Bot:**
```bash
cd bot
python -m venv .venv && source .venv/Scripts/activate   # Windows
pip install -r requirements.txt
python -m playwright install chromium
cp .env.example .env                                   # rellenar SUPABASE_SERVICE_KEY
python -c "from main import job; job()"                # run único
# o:
python main.py                                          # con scheduler
```

**Panel:**
```bash
cd panel
npm install
cp .env.example .env.local
npm run dev   # http://localhost:3000
```

## Seguridad — rotar si quieres ser estricto

Durante el setup quedaron visibles en el transcript:
- **GitHub PAT** (`ghp_zLpg...QqBDV`) — usar `gh auth refresh` o regenerar en https://github.com/settings/tokens
- **Telegram bot token** (`8851938872:AAHxd1Vw...`) — opcional rotarlo via `/revoke` en @BotFather

El `SUPABASE_SERVICE_KEY` viajó del navegador → fichero temporal → `gh secret set` por stdin → borrado. **Nunca pasó por el transcript del chat.**

## Decisiones de diseño

- **Bot reload de config en CADA job** (no al arrancar) → cambios del panel se aplican sin restart.
- **GitHub Actions** en lugar de Railway/Render por gratuidad (repo público = Actions ilimitadas).
- **Dubizzle vía Playwright** porque Incapsula bloquea curl/httpx. Extracción vía `__NEXT_DATA__` (más estable que CSS selectors).
- **AutoScout24 vía HTTP**: coches.net y similares dan 403, AutoScout24 deja pasar.
- **DubiCars desactivado** por geo-pricing inconsistente (devuelve precios diferentes según IP del cliente).
- **Bot mediana España con caché 24h** en Supabase para evitar re-scrapear cada run.
- **RLS habilitado** con admin via email check (`gastakafx@gmail.com`) — simple y no requiere crear `dubai_team_members` manualmente.
