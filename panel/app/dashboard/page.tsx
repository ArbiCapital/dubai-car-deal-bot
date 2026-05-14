"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { MetricCard } from "@/components/ui/MetricCard";
import { Badge } from "@/components/ui/Badge";
import { Deal, fmtDate, fmtEur } from "@/lib/types";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("dubai_deals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setDeals((data as Deal[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);

  const dealsHoy = deals.filter((d) => new Date(d.created_at) >= today);
  const dealsSemana = deals.filter((d) => new Date(d.created_at) >= weekAgo);
  const mejor = dealsHoy.reduce<Deal | null>((acc, d) => (!acc || d.margen > acc.margen ? d : acc), null);

  return (
    <Layout>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Deals hoy" value={String(dealsHoy.length)} sub={loading ? "cargando…" : `${dealsHoy.length} encontrados`} />
        <MetricCard label="Anuncios analizados" value={String(deals.length)} sub="histórico panel" />
        <MetricCard
          label="Mejor margen hoy"
          value={mejor ? fmtEur(mejor.margen) : "—"}
          sub={mejor ? mejor.titulo : "sin deals aún"}
        />
        <MetricCard label="Deals esta semana" value={String(dealsSemana.length)} sub="últimos 7 días" />
      </div>

      <h2 className="text-sm uppercase tracking-wider text-text-tertiary mb-3">Últimos deals</h2>
      <div className="space-y-2">
        {deals.slice(0, 5).map((d) => (
          <div key={d.id} className="card !py-3 !px-4 flex items-center gap-4">
            <Badge kind={d.clasificacion} />
            <a href={d.url} target="_blank" rel="noreferrer" className="flex-1 text-sm text-text-primary truncate hover:text-gold-light">
              {d.titulo}
            </a>
            <span className="text-xs text-text-tertiary font-data">{d.fuente}</span>
            <span className="text-sm font-data text-gold-light">{fmtEur(d.margen)}</span>
            <span className="text-xs text-text-tertiary">{fmtDate(d.created_at)}</span>
          </div>
        ))}
        {!loading && deals.length === 0 && (
          <div className="card text-center text-text-tertiary py-8">
            Aún no hay deals. El bot los irá publicando aquí en cuanto encuentre.
          </div>
        )}
      </div>
    </Layout>
  );
}
