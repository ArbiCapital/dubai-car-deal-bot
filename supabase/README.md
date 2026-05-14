# Supabase

Proyecto: ArbiOS (`bjutnhbpinozquvmpfsk`).

La migración `001_init.sql` ya está aplicada vía Supabase MCP. Si tuvieras que reaplicar, también puedes:

```bash
# Desde la consola SQL de Supabase
\i migrations/001_init.sql
```

## RLS

Está **deshabilitado** mientras no haya auth en el panel. En Fase D activamos políticas según PRD §4.2.
