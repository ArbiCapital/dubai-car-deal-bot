"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/Button";
import { SearchCard } from "@/components/searches/SearchCard";
import { SearchForm } from "@/components/searches/SearchForm";
import { Deal, Search } from "@/lib/types";
import { supabase } from "@/lib/supabase";

export default function SearchesPage() {
  const [searches, setSearches] = useState<Search[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<Search | null | "new">(null);

  async function reload() {
    const { data } = await supabase.from("dubai_searches").select("*").order("created_at", { ascending: true });
    setSearches((data as Search[]) ?? []);
    const { data: d } = await supabase.from("dubai_deals").select("search_id");
    const c: Record<string, number> = {};
    ((d as Pick<Deal, "search_id">[]) ?? []).forEach((row) => {
      if (row.search_id) c[row.search_id] = (c[row.search_id] ?? 0) + 1;
    });
    setCounts(c);
  }

  useEffect(() => { reload(); }, []);

  return (
    <Layout>
      <div className="flex items-center mb-6">
        <p className="text-sm text-text-secondary">
          {searches.length} búsquedas · {searches.filter((s) => s.activa).length} activas
        </p>
        <Button className="ml-auto" onClick={() => setEditing("new")}>+ Nueva búsqueda</Button>
      </div>

      <div className="space-y-3">
        {searches.map((s) => (
          <SearchCard
            key={s.id}
            search={s}
            dealsCount={counts[s.id] ?? 0}
            onEdit={() => setEditing(s)}
            onChanged={reload}
          />
        ))}
      </div>

      {editing && (
        <SearchForm
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}
    </Layout>
  );
}
