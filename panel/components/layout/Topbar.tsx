"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { GlobalSettings } from "@/lib/types";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/deals":     "Deals",
  "/searches":  "Búsquedas",
  "/settings":  "Configuración",
  "/team":      "Equipo",
};

export function Topbar() {
  const path = usePathname() ?? "";
  const router = useRouter();
  const title = Object.entries(TITLES).find(([k]) => path.startsWith(k))?.[1] ?? "";
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => {
    let alive = true;
    supabase
      .from("dubai_settings")
      .select("value")
      .eq("key", "global")
      .single()
      .then((r) => alive && r.data && setSettings(r.data.value as GlobalSettings));
    supabase.auth.getUser().then(({ data }) => alive && setEmail(data.user?.email ?? null));
    return () => { alive = false; };
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  async function ejecutarAhora() {
    setRunning(true);
    setToast(null);
    try {
      const r = await fetch("/api/run-bot", { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      setToast({ kind: "ok", msg: "Búsqueda lanzada. En 1–2 min verás los deals nuevos." });
    } catch (e: any) {
      setToast({ kind: "err", msg: `Error: ${e.message}` });
    } finally {
      setRunning(false);
      setTimeout(() => setToast(null), 6000);
    }
  }

  return (
    <header className="glass h-14 sticky top-0 z-20 flex items-center px-8">
      <h1 className="text-base font-medium text-text-primary">{title}</h1>

      <div className="ml-auto flex items-center gap-6 text-xs text-text-secondary">
        {toast && (
          <div
            className={
              "text-xs px-3 py-1 rounded-md border " +
              (toast.kind === "ok"
                ? "text-success bg-success-dim border-[rgba(45,158,107,0.3)]"
                : "text-danger bg-danger-dim border-[rgba(217,64,64,0.3)]")
            }
          >
            {toast.msg}
          </div>
        )}

        <button
          onClick={ejecutarAhora}
          disabled={running}
          className="btn-primary !px-3 !py-1.5 text-xs disabled:opacity-60"
          title="Lanza el bot ahora — scrape Dubizzle + comparativa España + Telegram"
        >
          {running ? "Lanzando…" : "▶ Ejecutar ahora"}
        </button>

        <div className="flex items-center gap-2">
          <span className="pulse-dot" />
          <span>Bot activo</span>
        </div>
        {settings && (
          <div className="font-data text-text-tertiary">
            Próx. búsqueda · {settings.hora_busqueda}
          </div>
        )}
        {email && (
          <div className="flex items-center gap-3 pl-6 border-l border-border">
            <span className="text-text-tertiary truncate max-w-[160px]">{email}</span>
            <button onClick={logout} className="text-text-tertiary hover:text-gold-light">
              Salir
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
