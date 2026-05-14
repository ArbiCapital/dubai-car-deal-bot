# Dubai Car Deal Bot

Sistema de inteligencia de mercado para importar coches de Dubai a España.

- **Bot Python** scrapea Dubizzle + DubiCars, compara con coches.net, calcula margen tras costes y manda los buenos por Telegram.
- **Panel Next.js** (diseño ARBI) gestiona búsquedas, costes, ve histórico.
- **Supabase** conecta ambos. Cualquier cambio del panel se aplica en la siguiente ejecución del bot.

## URLs

| Recurso | URL |
|---|---|
| Panel | https://dubai-car-deal-bot.vercel.app |
| Repo | https://github.com/ArbiCapital/dubai-car-deal-bot |
| Supabase | `bjutnhbpinozquvmpfsk` (proyecto ArbiOS) |
| Bot Telegram | @dubai_deal_arbi_bot |

## Estructura

```
.
├── bot/        # Python (GitHub Actions cron / Render / etc.)
├── panel/      # Next.js 14 — Vercel (vercel-arbi)
├── supabase/   # migraciones SQL
└── .github/workflows/bot.yml   # cron diario
```

## Estado actual

| Fase | Estado |
|---|---|
| A · Supabase (schema, RLS) | ✓ |
| B · Bot Python | ✓ (corre local con `python main.py`) |
| C · Panel Next.js | ✓ |
| D · Auth + RLS | ✓ (admin = email `gastakafx@gmail.com`) |
| E.1 · GitHub repo | ✓ privado en ArbiCapital |
| E.2 · Deploy Vercel | ✓ live, auto-deploy en push |
| E.3 · GH Actions secrets | ✓ `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` |
| E.4 · Telegram bot | ✓ token + chat_id en Supabase |
| Cron del bot | ⏳ GitHub Actions agotó minutos free de ArbiCapital. Decidir mañana plataforma. |

## Lo primero al volver mañana

1. **Sign up en el panel** con `gastakafx@gmail.com` en https://dubai-car-deal-bot.vercel.app/login — eso te crea como admin (la policy ya está puesta).
2. **Decidir cómo correr el cron del bot** (gratis):
   - Repo público → Actions ilimitadas
   - Mover repo a oskar-Mav
   - Fly.io / GitLab CI
3. **Probar el bot en local** una vez para verificar scrapers reales:
   ```bash
   cd bot
   cp .env.example .env  # rellenar SUPABASE_SERVICE_KEY (sacar de dashboard)
   pip install -r requirements.txt
   python -m playwright install chromium
   python -c "from main import job; job()"
   ```
   Verás los deals aparecer en https://dubai-car-deal-bot.vercel.app/deals.

## Seguridad — pendiente rotar

Durante el setup, se hicieron visibles en este transcript:
- **GitHub PAT** (`ghp_zLpg...QqBDV`) — rotar con `gh auth refresh` o regenerar en https://github.com/settings/tokens
- **Telegram bot token** (`8851938872:AAHxd1Vw...`) — opcional, está bien aislado a este bot

El `SUPABASE_SERVICE_KEY` se transmitió de la página de Supabase a un fichero temporal a GH Secrets vía clipboard/download — **nunca pasó por el transcript del chat**.

## Supabase

Proyecto: **ArbiOS** (`bjutnhbpinozquvmpfsk`, eu-west-1) — cuenta ArbiCapital.
URL: `https://bjutnhbpinozquvmpfsk.supabase.co`

Tablas con prefijo `dubai_` en el schema `public`:

- `dubai_settings` (`global`, `costes`, `telegram`)
- `dubai_searches`
- `dubai_deals` (Realtime activo)
- `dubai_seen_listings`
- `dubai_spain_price_cache`
- `dubai_team_members`

Migraciones en `supabase/migrations/`:
- `001_init.sql` — tablas + seeds
- `002_auth_rls.sql` — RLS + policies (admin = `gastakafx@gmail.com`)

## Bot local

```bash
cd bot
python -m venv .venv
source .venv/Scripts/activate     # Windows
pip install -r requirements.txt
python -m playwright install chromium
cp .env.example .env              # rellenar SUPABASE_SERVICE_KEY
python main.py                    # programa el scheduler (cada día a hora_busqueda)
# o:
python -c "from main import job; job()"  # run único ya
```

## Panel local

```bash
cd panel
npm install
cp .env.example .env.local
npm run dev
# http://localhost:3000
```
