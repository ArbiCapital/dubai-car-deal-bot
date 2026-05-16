export type Clasificacion = "excepcional" | "muy_bueno" | "bueno";

export type SpecKey = "gcc" | "american" | "canadian" | "european" | "japanese";

export const SPEC_LABEL: Record<SpecKey, string> = {
  gcc: "GCC",
  american: "American",
  canadian: "Canadian",
  european: "European",
  japanese: "Japanese",
};

export const ALL_SPECS: SpecKey[] = ["gcc", "american", "canadian", "european", "japanese"];

export interface Search {
  id: string;
  nombre: string;
  marca: string;
  modelo: string;
  ano_min: number;
  ano_max: number;
  precio_min_aed: number;
  precio_max_aed: number;
  km_max: number;
  margen_minimo_override: number | null;
  especificaciones: SpecKey[] | null;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  search_id: string | null;
  fuente: string;
  titulo: string;
  precio_aed: number;
  precio_eur: number;
  ano: number | null;
  km: number | null;
  url: string;
  foto_url: string | null;
  precio_mercado_es: number;
  num_anuncios_es: number | null;
  coste_total_espana: number;
  margen: number;
  margen_pct: number;
  clasificacion: Clasificacion;
  umbral_aplicado: number;
  enviado_telegram: boolean;
  created_at: string;
}

export interface GlobalSettings {
  hora_busqueda: string;
  zona_horaria: string;
  margen_minimo_eur: number;
  descuento_venta_pct: number;
  aed_to_eur: number;
  ejecutar_al_inicio: boolean;
  enviar_descartados: boolean;
  fuentes: { dubizzle: boolean; dubicars: boolean };
}

export interface CostesSettings {
  rta_exportacion_eur: number;
  transporte_eur: number;
  seguro_pct: number;
  agente_aduana_eur: number;
  arancel_pct: number;
  iva_importacion_pct: number;
  factor_hacienda: number;
  impuesto_mat_pct: number;
  homologacion_eur: number;
  itv_eur: number;
  matriculacion_eur: number;
}

export interface TelegramSettings {
  token: string;
  chat_id: string;
  enviar_foto: boolean;
  enviar_resumen: boolean;
  pausa_entre_msgs: number;
}

export function fmtEur(n: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export function fmtNum(n: number): string {
  return new Intl.NumberFormat("es-ES").format(n);
}

export function fmtDate(s: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(s));
}
