import { Badge } from "@/components/ui/Badge";
import { Deal, fmtDate, fmtEur, fmtNum } from "@/lib/types";

export function DealCard({ deal }: { deal: Deal }) {
  return (
    <div className="card !p-0 overflow-hidden">
      <div className="flex flex-col md:flex-row">
        {deal.foto_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={deal.foto_url}
            alt={deal.titulo}
            className="w-full md:w-56 h-44 md:h-auto object-cover bg-bg-elevated"
          />
        )}
        <div className="flex-1 p-5">
          <div className="flex items-start gap-3">
            <Badge kind={deal.clasificacion} />
            <span className="text-xs text-text-tertiary font-data">{deal.fuente}</span>
            <span className="text-xs text-text-tertiary ml-auto">{fmtDate(deal.created_at)}</span>
          </div>

          <a
            href={deal.url}
            target="_blank"
            rel="noreferrer"
            className="block mt-2 text-base font-medium text-text-primary hover:text-gold-light"
          >
            {deal.titulo}
          </a>

          <div className="mt-1 text-xs text-text-secondary font-data">
            {deal.ano ?? "?"} · {deal.km ? `${fmtNum(deal.km)} km` : "?"}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <Stat label="Precio Dubai" value={`${fmtNum(Math.round(deal.precio_aed))} AED`} sub={fmtEur(deal.precio_eur)} />
            <Stat label="Coste en España" value={fmtEur(deal.coste_total_espana)} />
            <Stat
              label="Mercado España"
              value={fmtEur(deal.precio_mercado_es)}
              sub={deal.num_anuncios_es ? `${deal.num_anuncios_es} anuncios` : undefined}
            />
            <Stat
              label="Margen"
              value={fmtEur(deal.margen)}
              sub={`${(deal.margen_pct * 100).toFixed(1)}% ROI`}
              highlight
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-sm font-data ${highlight ? "text-gold-light" : "text-text-primary"}`}>{value}</div>
      {sub && <div className="text-xs text-text-secondary mt-0.5">{sub}</div>}
    </div>
  );
}
