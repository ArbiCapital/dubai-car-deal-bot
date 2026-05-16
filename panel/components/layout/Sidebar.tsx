"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "◫" },
  { href: "/deals",     label: "Deals",     icon: "★" },
  { href: "/searches",  label: "Búsquedas", icon: "⌕" },
  { href: "/settings",  label: "Configuración", icon: "⚙" },
  { href: "/team",      label: "Equipo",    icon: "◉" },
];

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const path = usePathname();
  return (
    <>
      {/* Overlay en móvil cuando el drawer está abierto */}
      <div
        className={clsx(
          "md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity",
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />
      <aside
        className={clsx(
          "fixed md:sticky top-0 z-40 md:z-10",
          "w-[220px] shrink-0 bg-bg-surface border-r border-border h-screen flex flex-col",
          "transition-transform duration-200 md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="px-5 pt-6 pb-8 flex items-start">
          <div>
            <div className="text-gold-light font-data text-sm tracking-widest">EXPORT</div>
            <div className="text-text-primary font-medium text-lg leading-tight">Dubai Deal</div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden ml-auto text-text-tertiary hover:text-text-primary text-2xl leading-none"
            aria-label="Cerrar menú"
          >
            ×
          </button>
        </div>
        <nav className="flex-1 px-2 space-y-1">
          {NAV.map((item) => {
            const active = path?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative",
                  active
                    ? "text-text-primary bg-white/[0.04]"
                    : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary",
                )}
              >
                {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-gold rounded-r" />}
                <span className="w-4 text-center text-text-tertiary">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-border text-xs text-text-tertiary">
          v0.2
        </div>
      </aside>
    </>
  );
}
