"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { ALL_SPECS, SPEC_LABEL, Search, SpecKey } from "@/lib/types";
import { supabase } from "@/lib/supabase";

interface Props {
  initial?: Search | null;
  onClose: () => void;
  onSaved: () => void;
}

export function SearchForm({ initial, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    nombre: initial?.nombre ?? "",
    marca: initial?.marca ?? "",
    modelo: initial?.modelo ?? "",
    ano_min: initial?.ano_min ?? 2016,
    ano_max: initial?.ano_max ?? new Date().getFullYear(),
    precio_min_aed: initial?.precio_min_aed ?? 50000,
    precio_max_aed: initial?.precio_max_aed ?? 300000,
    km_max: initial?.km_max ?? 150000,
    margen_minimo_override: initial?.margen_minimo_override ?? (null as number | null),
    especificaciones: (initial?.especificaciones ?? []) as SpecKey[],
    activa: initial?.activa ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggleSpec(s: SpecKey) {
    setForm((f) => ({
      ...f,
      especificaciones: f.especificaciones.includes(s)
        ? f.especificaciones.filter((x) => x !== s)
        : [...f.especificaciones, s],
    }));
  }

  async function save() {
    setSaving(true);
    setErr(null);
    const payload = { ...form };
    const op = initial
      ? supabase.from("dubai_searches").update(payload).eq("id", initial.id)
      : supabase.from("dubai_searches").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card !p-0 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-border flex items-center">
          <h3 className="text-lg font-medium text-text-primary">
            {initial ? "Editar búsqueda" : "Nueva búsqueda"}
          </h3>
          <button onClick={onClose} className="ml-auto text-text-tertiary hover:text-text-primary text-xl leading-none">×</button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Nombre">
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="BMW X5 2016-2022" />
            </Field>
          </div>
          <Field label="Marca"><Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} /></Field>
          <Field label="Modelo"><Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} /></Field>
          <Field label="Año mín"><Input type="number" value={form.ano_min} onChange={(e) => setForm({ ...form, ano_min: +e.target.value })} /></Field>
          <Field label="Año máx"><Input type="number" value={form.ano_max} onChange={(e) => setForm({ ...form, ano_max: +e.target.value })} /></Field>
          <Field label="Precio mín AED"><Input type="number" value={form.precio_min_aed} onChange={(e) => setForm({ ...form, precio_min_aed: +e.target.value })} /></Field>
          <Field label="Precio máx AED"><Input type="number" value={form.precio_max_aed} onChange={(e) => setForm({ ...form, precio_max_aed: +e.target.value })} /></Field>
          <Field label="Kilómetros máx"><Input type="number" value={form.km_max} onChange={(e) => setForm({ ...form, km_max: +e.target.value })} /></Field>
          <Field
            label="Margen mínimo solo para esta búsqueda (€)"
            hint="Sobrescribe el global de /settings. Vacío = usa el global."
          >
            <Input
              type="number"
              value={form.margen_minimo_override ?? ""}
              onChange={(e) => setForm({ ...form, margen_minimo_override: e.target.value ? +e.target.value : null })}
              placeholder="—"
            />
          </Field>

          <div className="col-span-2">
            <div className="text-xs text-text-tertiary uppercase tracking-wider mb-2">
              Especificaciones regionales
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_SPECS.map((s) => {
                const on = form.especificaciones.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSpec(s)}
                    className={
                      "px-3 py-1.5 text-xs rounded-full border transition-colors " +
                      (on
                        ? "bg-gold-dim text-gold-light border-gold-border"
                        : "bg-bg-input text-text-secondary border-border hover:border-border-strong")
                    }
                  >
                    {SPEC_LABEL[s]}
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-text-tertiary mt-2">
              Vacío = acepta todas las especificaciones.
            </div>
          </div>

          <div className="col-span-2 flex items-center gap-3 pt-2">
            <Toggle checked={form.activa} onChange={(v) => setForm({ ...form, activa: v })} ariaLabel="Activa" />
            <span className="text-sm text-text-secondary">Activa</span>
          </div>
        </div>
        {err && (
          <div className="px-6 pb-2 text-xs text-danger">
            Error: {err}. ¿Estás logueado?
          </div>
        )}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
        </div>
      </div>
    </div>
  );
}
