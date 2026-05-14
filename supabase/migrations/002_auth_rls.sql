-- =========================================================
-- Auth + RLS
-- Política simple: admin = email gastakafx@gmail.com
-- service_role bypasea RLS (bot sigue funcionando)
-- =========================================================

-- Helper: ¿el JWT actual es admin?
create or replace function public.dubai_is_admin()
returns boolean
language sql stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'gastakafx@gmail.com'
$$;

-- Habilitar RLS en todas las tablas
alter table public.dubai_settings           enable row level security;
alter table public.dubai_searches           enable row level security;
alter table public.dubai_deals              enable row level security;
alter table public.dubai_seen_listings      enable row level security;
alter table public.dubai_spain_price_cache  enable row level security;
alter table public.dubai_team_members       enable row level security;

-- ===== dubai_settings =====
drop policy if exists "settings_read_authenticated" on public.dubai_settings;
create policy "settings_read_authenticated"
  on public.dubai_settings for select
  to authenticated using (true);

drop policy if exists "settings_write_admin" on public.dubai_settings;
create policy "settings_write_admin"
  on public.dubai_settings for all
  to authenticated
  using (public.dubai_is_admin())
  with check (public.dubai_is_admin());

-- ===== dubai_searches =====
drop policy if exists "searches_read_authenticated" on public.dubai_searches;
create policy "searches_read_authenticated"
  on public.dubai_searches for select
  to authenticated using (true);

drop policy if exists "searches_write_admin" on public.dubai_searches;
create policy "searches_write_admin"
  on public.dubai_searches for all
  to authenticated
  using (public.dubai_is_admin())
  with check (public.dubai_is_admin());

-- ===== dubai_deals (lectura abierta a autenticados; service_role escribe) =====
drop policy if exists "deals_read_authenticated" on public.dubai_deals;
create policy "deals_read_authenticated"
  on public.dubai_deals for select
  to authenticated using (true);

-- ===== dubai_seen_listings & spain_price_cache (solo service_role) =====
-- No creamos políticas para authenticated → todo bloqueado salvo service_role.

-- ===== dubai_team_members =====
drop policy if exists "team_read_self_or_admin" on public.dubai_team_members;
create policy "team_read_self_or_admin"
  on public.dubai_team_members for select
  to authenticated
  using (public.dubai_is_admin() or id = auth.uid());

drop policy if exists "team_admin_write" on public.dubai_team_members;
create policy "team_admin_write"
  on public.dubai_team_members for all
  to authenticated
  using (public.dubai_is_admin())
  with check (public.dubai_is_admin());
