import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

const REPO = "ArbiCapital/dubai-car-deal-bot";
const WORKFLOW_FILE = "bot.yml";

export async function POST() {
  // Auth: el middleware ya protege esta ruta, pero re-verificamos por si acaso.
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = process.env.GH_DISPATCH_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Falta GH_DISPATCH_TOKEN en el servidor" }, { status: 500 });
  }

  const res = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "master" }),
    },
  );

  if (res.status === 204) {
    return NextResponse.json({
      ok: true,
      message: "Workflow disparado. Tardará 1–2 min en aparecer en /deals.",
      run_url: `https://github.com/${REPO}/actions`,
    });
  }

  const body = await res.text();
  return NextResponse.json(
    { error: `GitHub API ${res.status}`, body: body.substring(0, 500) },
    { status: 502 },
  );
}
