-- =========================================================
-- Dubai Car Deal Bot — schema inicial
-- Proyecto: ArbiOS (bjutnhbpinozquvmpfsk)
-- Prefijo: dubai_ para no chocar con futuras tablas
-- =========================================================

-- ---------- dubai_settings ----------
create table if not exists public.dubai_settings (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

create or replace function public.dubai_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end
$$;

drop trigger if exists trg_dubai_settings_touch on public.dubai_settings;
create trigger trg_dubai_settings_touch
before update on public.dubai_settings
for each row execute function public.dubai_touch_updated_at();

-- ---------- dubai_searches ----------
create table if not exists public.dubai_searches (
  id                     uuid primary key default gen_random_uuid(),
  nombre                 text not null,
  marca                  text not null,
  modelo                 text not null,
  ano_min                int  not null,
  ano_max                int  not null,
  precio_min_aed         int  not null,
  precio_max_aed         int  not null,
  km_max                 int  not null,
  margen_minimo_override int,
  activa                 boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

drop trigger if exists trg_dubai_searches_touch on public.dubai_searches;
create trigger trg_dubai_searches_touch
before update on public.dubai_searches
for each row execute function public.dubai_touch_updated_at();

create index if not exists idx_dubai_searches_activa on public.dubai_searches (activa);

-- ---------- dubai_deals ----------
create table if not exists public.dubai_deals (
  id                  uuid primary key default gen_random_uuid(),
  search_id           uuid references public.dubai_searches(id) on delete set null,
  fuente              text not null,
  titulo              text not null,
  precio_aed          numeric not null,
  precio_eur          int not null,
  ano                 int,
  km                  int,
  url                 text not null,
  foto_url            text,
  precio_mercado_es   int not null,
  num_anuncios_es     int,
  coste_total_espana  int not null,
  margen              int not null,
  margen_pct          numeric not null,
  clasificacion       text not null,
  umbral_aplicado     int not null,
  enviado_telegram    boolean not null default false,
  created_at          timestamptz not null default now()
);

create index if not exists idx_dubai_deals_created_at on public.dubai_deals (created_at desc);
create index if not exists idx_dubai_deals_search_id  on public.dubai_deals (search_id);
create index if not exists idx_dubai_deals_clasif     on public.dubai_deals (clasificacion);

-- ---------- dubai_seen_listings ----------
create table if not exists public.dubai_seen_listings (
  listing_id  text primary key,
  created_at  timestamptz not null default now()
);

create index if not exists idx_dubai_seen_created_at on public.dubai_seen_listings (created_at);

-- ---------- dubai_spain_price_cache ----------
create table if not exists public.dubai_spain_price_cache (
  cache_key     text primary key,
  mediana       int not null,
  minimo        int not null,
  maximo        int not null,
  media         int not null,
  num_anuncios  int not null,
  fuente        text not null,
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_dubai_cache_expires on public.dubai_spain_price_cache (expires_at);

-- ---------- dubai_team_members (stub para Fase D) ----------
create table if not exists public.dubai_team_members (
  id          uuid primary key,            -- referencia auth.users.id cuando metamos auth
  nombre      text not null,
  email       text not null,
  role        text not null default 'viewer',  -- 'admin' | 'viewer'
  created_at  timestamptz not null default now()
);

-- =========================================================
-- Realtime: publicar dubai_deals para que el panel reciba push
-- =========================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'dubai_deals'
  ) then
    execute 'alter publication supabase_realtime add table public.dubai_deals';
  end if;
end$$;

-- =========================================================
-- RLS — DESHABILITADO inicialmente (sin auth todavía).
-- En Fase D activar con:
--   alter table public.dubai_settings enable row level security;
--   -- (y políticas según PRD §4.2)
-- =========================================================
alter table public.dubai_settings           disable row level security;
alter table public.dubai_searches           disable row level security;
alter table public.dubai_deals              disable row level security;
alter table public.dubai_seen_listings      disable row level security;
alter table public.dubai_spain_price_cache  disable row level security;
alter table public.dubai_team_members       disable row level security;

-- =========================================================
-- Seeds
-- =========================================================
insert into public.dubai_settings (key, value) values
('global', '{
  "hora_busqueda": "08:00",
  "zona_horaria": "Europe/Madrid",
  "margen_minimo_eur": 8000,
  "descuento_venta_pct": 0.05,
  "aed_to_eur": 0.25,
  "ejecutar_al_inicio": true,
  "enviar_descartados": false,
  "fuentes": {"dubizzle": true, "dubicars": true}
}'::jsonb),
('costes', '{
  "rta_exportacion_eur": 500,
  "transporte_eur": 1800,
  "seguro_pct": 0.018,
  "agente_aduana_eur": 250,
  "arancel_pct": 0.10,
  "iva_importacion_pct": 0.21,
  "factor_hacienda": 0.65,
  "impuesto_mat_pct": 0.1475,
  "homologacion_eur": 1800,
  "itv_eur": 150,
  "matriculacion_eur": 150
}'::jsonb),
('telegram', '{
  "token": "",
  "chat_id": "",
  "enviar_foto": true,
  "enviar_resumen": true,
  "pausa_entre_msgs": 1.5
}'::jsonb)
on conflict (key) do nothing;

insert into public.dubai_searches (nombre, marca, modelo, ano_min, ano_max, precio_min_aed, precio_max_aed, km_max) values
('BMW X5 2016-2022',             'BMW',           'X5',           2016, 2022,  50000, 280000, 150000),
('Mercedes GLE 2017-2022',       'Mercedes-Benz', 'GLE',          2017, 2022,  60000, 300000, 120000),
('Toyota Land Cruiser 2016-2022','Toyota',        'Land Cruiser', 2016, 2022,  80000, 450000, 180000),
('Porsche Cayenne 2016-2022',    'Porsche',       'Cayenne',      2016, 2022,  70000, 350000, 120000)
on conflict do nothing;
