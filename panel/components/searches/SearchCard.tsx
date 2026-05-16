"use client";

import { useState } from "react";
import { Toggle } from "@/components/ui/Toggle";
import { SPEC_LABEL, Search, SpecKey, fmtNum } from "@/lib/types";
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
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function toggleActiva(v: boolean) {
    await supabase.from("dubai_searches").update({ activa: v }).eq("id", search.id);
    onChanged();
  }

  async function doDelete() {
    setDeleting(true);
    await supabase.from("dubai_searches").delete().eq("id", search.id);
    setDeleting(false);
    setConfirm(false);
    onChanged();
  }

  const specs = (search.especificaciones ?? []) as SpecKey[];
  const pills = [
    `${search.marca} ${search.modelo}`,
    `${search.ano_min}–${search.ano_max}`,
    `${fmtNum(search.precio_min_aed)}–${fmtNum(search.precio_max_aed)} AED`,
    `≤ ${fmtNum(search.km_max)} km`,
    search.margen_minimo_override ? `Margen ≥ ${fmtNum(search.margen_minimo_override)} €` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="card flex flex-col md:flex-row md:items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
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
          {specs.length > 0 ? (
            specs.map((s) => (
              <span key={s} className="text-xs text-gold-light bg-gold-dim border border-gold-border px-2 py-1 rounded-md">
                {SPEC_LABEL[s]}
              </span>
            ))
          ) : (
            <span className="text-xs text-text-tertiary bg-bg-input border border-border px-2 py-1 rounded-md">
              Todas las specs
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end border-t md:border-t-0 border-border pt-3 md:pt-0">
        <Toggle checked={search.activa} onChange={toggleActiva} ariaLabel="Activa" />
        <div className="flex items-center gap-3">
          <button onClick={onEdit} className="text-xs text-text-secondary hover:text-gold-light underline-offset-2 hover:underline">
            Editar
          </button>
          {confirm ? (
            <div className="flex items-center gap-2">
              <button
                onClick={doDelete}
                disabled={deleting}
                className="text-xs text-danger hover:underline disabled:opacity-50"
              >
                {deleting ? "…" : "Confirmar"}
              </button>
              <button onClick={() => setConfirm(false)} className="text-xs text-text-tertiary hover:text-text-primary">
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirm(true)}
              className="text-xs text-text-tertiary hover:text-danger underline-offset-2 hover:underline"
            >
              Borrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
