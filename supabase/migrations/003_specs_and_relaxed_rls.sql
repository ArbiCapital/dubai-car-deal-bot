-- =========================================================
-- 003: añadir especificaciones regionales + relajar RLS
-- =========================================================

-- Columna especificaciones (array de slugs, null/[] = todas)
alter table public.dubai_searches
  add column if not exists especificaciones text[] default '{}'::text[];

-- ===== RLS: cualquier usuario autenticado puede leer/escribir =====
-- Uso interno; el filtro real es estar logueado.

drop policy if exists "settings_read_authenticated" on public.dubai_settings;
drop policy if exists "settings_write_admin" on public.dubai_settings;
create policy "settings_rw_authenticated"
  on public.dubai_settings for all
  to authenticated
  using (true) with check (true);

drop policy if exists "searches_read_authenticated" on public.dubai_searches;
drop policy if exists "searches_write_admin" on public.dubai_searches;
create policy "searches_rw_authenticated"
  on public.dubai_searches for all
  to authenticated
  using (true) with check (true);

-- deals: leen todos, solo service_role escribe (sin cambios)

-- team_members: cualquiera autenticado puede leer; admin (legacy fn) escribe
drop policy if exists "team_read_self_or_admin" on public.dubai_team_members;
drop policy if exists "team_admin_write" on public.dubai_team_members;
create policy "team_read_authenticated"
  on public.dubai_team_members for select
  to authenticated using (true);
create policy "team_write_authenticated"
  on public.dubai_team_members for all
  to authenticated using (true) with check (true);
