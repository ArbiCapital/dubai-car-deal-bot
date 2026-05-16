import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

const FRANKFURTER = "https://api.frankfurter.dev/v1/latest";
const AED_PEG_USD = 3.6725; // peg fijo desde 1997

export async function GET() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    // Frankfurter no soporta AED como base → derivamos via USD→EUR + peg AED-USD
    const r = await fetch(`${FRANKFURTER}?from=USD&to=EUR`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!r.ok) {
      return NextResponse.json({ error: `Frankfurter HTTP ${r.status}` }, { status: 502 });
    }
    const data = await r.json();
    const usdEur = data?.rates?.EUR;
    if (typeof usdEur !== "number") {
      return NextResponse.json({ error: "Sin rate EUR en respuesta" }, { status: 502 });
    }
    const aedEur = usdEur / AED_PEG_USD;
    return NextResponse.json({
      aed_to_eur: Number(aedEur.toFixed(6)),
      usd_to_eur: usdEur,
      source: "Frankfurter (ECB) + peg AED↔USD 3.6725",
      date: data?.date ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "fetch error" }, { status: 500 });
  }
}
