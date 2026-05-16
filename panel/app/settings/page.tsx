"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { CostesSettings, GlobalSettings, TelegramSettings } from "@/lib/types";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const [global, setGlobal] = useState<GlobalSettings | null>(null);
  const [costes, setCostes] = useState<CostesSettings | null>(null);
  const [tg, setTg] = useState<TelegramSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshingFx, setRefreshingFx] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("dubai_settings").select("key,value");
      const map = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
      setGlobal(map.global);
      setCostes(map.costes);
      setTg(map.telegram);
    })();
  }, []);

  async function refreshFx() {
    if (!global) return;
    setRefreshingFx(true);
    try {
      // Frankfurter es CORS-friendly
      let rate: number | null = null;
      const r1 = await fetch("https://api.frankfurter.app/latest?from=AED&to=EUR").then((r) => r.json());
      if (r1?.rates?.EUR) rate = r1.rates.EUR;
      if (!rate) {
        const r2 = await fetch("https://api.frankfurter.app/latest?from=USD&to=EUR").then((r) => r.json());
        if (r2?.rates?.EUR) rate = r2.rates.EUR / 3.6725;
      }
      if (!rate) throw new Error("No se pudo obtener el tipo");
      setGlobal({ ...global, aed_to_eur: Number(rate.toFixed(6)) });
      setToast({ kind: "ok", msg: `Tipo actualizado: 1 AED = ${rate.toFixed(4)} €` });
      setTimeout(() => setToast(null), 4000);
    } catch (e: any) {
      setToast({ kind: "err", msg: `Error refrescando FX: ${e.message ?? e}` });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setRefreshingFx(false);
    }
  }

  async function guardar() {
    if (!global || !costes || !tg) return;
    setSaving(true);
    const results = await Promise.all([
      supabase.from("dubai_settings").update({ value: global }).eq("key", "global"),
      supabase.from("dubai_settings").update({ value: costes }).eq("key", "costes"),
      supabase.from("dubai_settings").update({ value: tg }).eq("key", "telegram"),
    ]);
    setSaving(false);
    const err = results.find((r) => r.error)?.error;
    if (err) {
      setToast({ kind: "err", msg: `Error guardando: ${err.message}. ¿Estás logueado?` });
    } else {
      setToast({ kind: "ok", msg: "Guardado. Aplica en la siguiente ejecución del bot." });
    }
    setTimeout(() => setToast(null), 5000);
  }

  if (!global || !costes || !tg) {
    return <Layout><div className="text-text-tertiary">Cargando…</div></Layout>;
  }

  return (
    <Layout>
      <Section title="Rentabilidad y horario">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Margen mínimo global (€)">
            <Input type="number" value={global.margen_minimo_eur}
              onChange={(e) => setGlobal({ ...global, margen_minimo_eur: +e.target.value })} />
          </Field>
          <Field label="Descuento venta">
            <Input type="number" step="0.01" value={global.descuento_venta_pct}
              onChange={(e) => setGlobal({ ...global, descuento_venta_pct: +e.target.value })} />
          </Field>
          <Field label="AED → EUR" hint="El bot lo refresca solo (ECB/Frankfurter) en cada ejecución">
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.000001"
                value={global.aed_to_eur}
                onChange={(e) => setGlobal({ ...global, aed_to_eur: +e.target.value })}
              />
              <button
                type="button"
                onClick={refreshFx}
                disabled={refreshingFx}
                className="btn-secondary !px-3 !py-1 text-xs whitespace-nowrap"
              >
                {refreshingFx ? "…" : "Hoy"}
              </button>
            </div>
          </Field>
          <Field label="Hora búsqueda diaria">
            <Input value={global.hora_busqueda}
              onChange={(e) => setGlobal({ ...global, hora_busqueda: e.target.value })} placeholder="08:00" />
          </Field>
          <Field label="Zona horaria">
            <Input value={global.zona_horaria}
              onChange={(e) => setGlobal({ ...global, zona_horaria: e.target.value })} />
          </Field>
          <div className="flex flex-col gap-3 pt-6">
            <ToggleRow label="Ejecutar al arrancar" v={global.ejecutar_al_inicio}
              onChange={(v) => setGlobal({ ...global, ejecutar_al_inicio: v })} />
            <ToggleRow label="Enviar descartados" v={global.enviar_descartados}
              onChange={(v) => setGlobal({ ...global, enviar_descartados: v })} />
          </div>
        </div>
      </Section>

      <Section title="Costes de exportación">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <NumField label="Exportación RTA (€)" v={costes.rta_exportacion_eur} on={(x) => setCostes({ ...costes, rta_exportacion_eur: x })} />
          <NumField label="Transporte marítimo (€)" v={costes.transporte_eur} on={(x) => setCostes({ ...costes, transporte_eur: x })} />
          <NumField label="Seguro transporte (%)" step="0.001" v={costes.seguro_pct} on={(x) => setCostes({ ...costes, seguro_pct: x })} />
          <NumField label="Agente aduanas (€)" v={costes.agente_aduana_eur} on={(x) => setCostes({ ...costes, agente_aduana_eur: x })} />
          <NumField label="Homologación (€)" v={costes.homologacion_eur} on={(x) => setCostes({ ...costes, homologacion_eur: x })} />
          <NumField label="ITV (€)" v={costes.itv_eur} on={(x) => setCostes({ ...costes, itv_eur: x })} />
          <NumField label="Matriculación (€)" v={costes.matriculacion_eur} on={(x) => setCostes({ ...costes, matriculacion_eur: x })} />
          <NumField label="Factor Hacienda" step="0.01" v={costes.factor_hacienda} on={(x) => setCostes({ ...costes, factor_hacienda: x })} />
          <NumField label="Imp. matriculación (%)" step="0.001" v={costes.impuesto_mat_pct} on={(x) => setCostes({ ...costes, impuesto_mat_pct: x })} />
          <Field label="Arancel (fijo)" hint="10% por ley. No editable.">
            <Input value="10%" disabled />
          </Field>
          <Field label="IVA importación (fijo)" hint="21% por ley. No editable.">
            <Input value="21%" disabled />
          </Field>
        </div>
      </Section>

      <Section title="Fuentes activas">
        <div className="flex gap-8">
          <ToggleRow label="Dubizzle" v={global.fuentes.dubizzle}
            onChange={(v) => setGlobal({ ...global, fuentes: { ...global.fuentes, dubizzle: v } })} />
          <ToggleRow label="DubiCars" v={global.fuentes.dubicars}
            onChange={(v) => setGlobal({ ...global, fuentes: { ...global.fuentes, dubicars: v } })} />
        </div>
      </Section>

      <Section title="Telegram">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Field label="Token del bot">
              <Input type="password" value={tg.token} onChange={(e) => setTg({ ...tg, token: e.target.value })} placeholder="123456789:AA..." />
            </Field>
          </div>
          <Field label="Chat ID"><Input value={tg.chat_id} onChange={(e) => setTg({ ...tg, chat_id: e.target.value })} /></Field>
          <Field label="Pausa entre msgs (s)">
            <Input type="number" step="0.1" value={tg.pausa_entre_msgs}
              onChange={(e) => setTg({ ...tg, pausa_entre_msgs: +e.target.value })} />
          </Field>
          <div className="flex flex-col gap-3 pt-6 md:col-span-2">
            <ToggleRow label="Enviar foto" v={tg.enviar_foto} onChange={(v) => setTg({ ...tg, enviar_foto: v })} />
            <ToggleRow label="Enviar resumen" v={tg.enviar_resumen} onChange={(v) => setTg({ ...tg, enviar_resumen: v })} />
          </div>
        </div>
      </Section>

      <div className="sticky bottom-4 mt-8 flex justify-end gap-3">
        {toast && (
          <div
            className={
              "card !py-2 !px-4 text-sm " +
              (toast.kind === "ok"
                ? "text-success border-[rgba(45,158,107,0.3)]"
                : "text-danger border-[rgba(217,64,64,0.3)]")
            }
          >
            {toast.msg}
          </div>
        )}
        <Button onClick={guardar} disabled={saving}>{saving ? "Guardando…" : "Guardar cambios"}</Button>
      </div>
    </Layout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-sm uppercase tracking-wider text-text-tertiary mb-3">{title}</h2>
      <div className="card">{children}</div>
    </section>
  );
}

function NumField({
  label, v, on, step,
}: { label: string; v: number; on: (x: number) => void; step?: string }) {
  return (
    <Field label={label}>
      <Input type="number" step={step ?? "1"} value={v} onChange={(e) => on(+e.target.value)} />
    </Field>
  );
}

function ToggleRow({ label, v, onChange }: { label: string; v: boolean; onChange: (b: boolean) => void }) {
  return (
    <div className="flex items-center gap-3">
      <Toggle checked={v} onChange={onChange} ariaLabel={label} />
      <span className="text-sm text-text-secondary">{label}</span>
    </div>
  );
}
