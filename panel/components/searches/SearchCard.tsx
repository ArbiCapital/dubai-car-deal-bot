"use client";

import { Toggle } from "@/components/ui/Toggle";
import { Search, fmtNum } from "@/lib/types";
import { supabase } from "@/lib/supabase";

export function SearchCard({
  search,
  dealsCount,
  onEdit,
  onChanged,
}: {
  search: Search;
  dealsCount: number;
  onEdit: () => void;
  onChanged: () => void;
}) {
  async function toggleActiva(v: boolean) {
    await supabase.from("dubai_searches").update({ activa: v }).eq("id", search.id);
    onChanged();
  }

  const pills = [
    `${search.marca} ${search.modelo}`,
    `${search.ano_min}–${search.ano_max}`,
    `${fmtNum(search.precio_min_aed)}–${fmtNum(search.precio_max_aed)} AED`,
    `≤ ${fmtNum(search.km_max)} km`,
    search.margen_minimo_override ? `Margen ≥ ${fmtNum(search.margen_minimo_override)} €` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="card flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-medium text-text-primary">{search.nombre}</h3>
          <span className="text-xs text-text-tertiary font-data">
            {dealsCount} deals
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {pills.map((p) => (
            <span key={p} className="text-xs text-text-secondary bg-bg-input border border-border px-2 py-1 rounded-md font-data">
              {p}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <Toggle checked={search.activa} onChange={toggleActiva} ariaLabel="Activa" />
        <button onClick={onEdit} className="text-xs text-text-secondary hover:text-gold-light underline-offset-2 hover:underline">
          Editar
        </button>
      </div>
    </div>
  );
}
