"use client";

import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { DealCard } from "@/components/deals/DealCard";
import { Clasificacion, Deal, Search } from "@/lib/types";
import { supabase } from "@/lib/supabase";

type Periodo = "hoy" | "7d" | "30d" | "todo";
type Orden = "fecha" | "margen" | "roi";

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [searches, setSearches] = useState<Search[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>("7d");
  const [clasif, setClasif] = useState<Clasificacion | "todos">("todos");
  const [searchId, setSearchId] = useState<string>("todas");
  const [orden, setOrden] = useState<Orden>("fecha");

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: d }, { data: s }] = await Promise.all([
        supabase.from("dubai_deals").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("dubai_searches").select("*"),
      ]);
      if (!alive) return;
      setDeals((d as Deal[]) ?? []);
      setSearches((s as Search[]) ?? []);
    })();

    const ch = supabase
      .channel("dubai_deals_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dubai_deals" }, (payload) => {
        setDeals((prev) => [payload.new as Deal, ...prev]);
      })
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, []);

  const filtered = useMemo(() => {
    let list = [...deals];
    if (periodo !== "todo") {
      const cutoff = new Date();
      if (periodo === "hoy") cutoff.setHours(0, 0, 0, 0);
      else if (periodo === "7d") cutoff.setDate(cutoff.getDate() - 7);
      else if (periodo === "30d") cutoff.setDate(cutoff.getDate() - 30);
      list = list.filter((d) => new Date(d.created_at) >= cutoff);
    }
    if (clasif !== "todos") list = list.filter((d) => d.clasificacion === clasif);
    if (searchId !== "todas") list = list.filter((d) => d.search_id === searchId);

    if (orden === "fecha") list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    else if (orden === "margen") list.sort((a, b) => b.margen - a.margen);
    else if (orden === "roi") list.sort((a, b) => b.margen_pct - a.margen_pct);

    return list;
  }, [deals, periodo, clasif, searchId, orden]);

  return (
    <Layout>
      <div className="card !p-4 mb-6 flex flex-wrap gap-3 items-center">
        <Select label="Período" value={periodo} onChange={(v) => setPeriodo(v as Periodo)} options={[
          ["hoy", "Hoy"], ["7d", "7 días"], ["30d", "30 días"], ["todo", "Todo"],
        ]} />
        <Select label="Clasificación" value={clasif} onChange={(v) => setClasif(v as Clasificacion | "todos")} options={[
          ["todos", "Todas"], ["excepcional", "Excepcional"], ["muy_bueno", "Muy bueno"], ["bueno", "Bueno"],
        ]} />
        <Select
          label="Búsqueda"
          value={searchId}
          onChange={setSearchId}
          options={[["todas", "Todas"], ...searches.map<[string, string]>((s) => [s.id, s.nombre])]}
        />
        <Select label="Ordenar" value={orden} onChange={(v) => setOrden(v as Orden)} options={[
          ["fecha", "Más recientes"], ["margen", "Mayor margen"], ["roi", "Mayor ROI"],
        ]} />
        <span className="ml-auto text-xs text-text-tertiary font-data">{filtered.length} deals</span>
      </div>

      <div className="space-y-3">
        {filtered.map((d) => <DealCard key={d.id} deal={d} />)}
        {filtered.length === 0 && (
          <div className="card text-center text-text-tertiary py-8">
            No hay deals con esos filtros.
          </div>
        )}
      </div>
    </Layout>
  );
}

function Select({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void; options: [string, string][];
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-text-tertiary">
      <span className="uppercase tracking-wider">{label}</span>
      <select className="input !w-auto !py-1.5 !text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
