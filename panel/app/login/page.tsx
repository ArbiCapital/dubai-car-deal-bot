"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
      router.replace(next);
      router.refresh();
    } catch (e: any) {
      setErr(e.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 relative z-10">
        <div>
          <div className="text-gold-light font-data text-xs tracking-widest">DUBAI</div>
          <h1 className="text-text-primary text-xl font-medium">Deal Bot · ArbiCapital</h1>
          <p className="text-xs text-text-tertiary mt-2">
            {mode === "signin" ? "Entra al panel" : "Crear cuenta (uso interno)"}
          </p>
        </div>

        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@arbicapital.com"
            required
          />
        </Field>
        <Field label="Contraseña">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </Field>

        {err && <div className="text-xs text-danger">{err}</div>}

        <Button disabled={loading} className="w-full">
          {loading ? "…" : mode === "signin" ? "Entrar" : "Crear cuenta"}
        </Button>

        <div className="text-xs text-text-tertiary text-center">
          {mode === "signin" ? (
            <>¿Primera vez?{" "}
              <button type="button" className="text-gold-light hover:underline" onClick={() => setMode("signup")}>
                Crear cuenta
              </button>
            </>
          ) : (
            <>¿Ya tienes cuenta?{" "}
              <button type="button" className="text-gold-light hover:underline" onClick={() => setMode("signin")}>
                Entrar
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
