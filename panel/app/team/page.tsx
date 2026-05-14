"use client";

import { Layout } from "@/components/layout/Layout";

export default function TeamPage() {
  return (
    <Layout>
      <div className="card">
        <h2 className="text-base font-medium text-text-primary">Equipo</h2>
        <p className="text-sm text-text-secondary mt-2">
          La gestión de equipo se habilita junto con Supabase Auth. Por ahora el panel está abierto.
          Cuando metamos auth aparecerán aquí los miembros y sus roles (admin / viewer).
        </p>
      </div>
    </Layout>
  );
}
