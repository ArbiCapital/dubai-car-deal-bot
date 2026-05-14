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

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-[220px] shrink-0 bg-bg-surface border-r border-border h-screen sticky top-0 flex flex-col z-10">
      <div className="px-5 pt-6 pb-8">
        <div className="text-gold-light font-data text-sm tracking-widest">DUBAI</div>
        <div className="text-text-primary font-medium text-lg leading-tight">Deal Bot</div>
      </div>
      <nav className="flex-1 px-2 space-y-1">
        {NAV.map((item) => {
          const active = path?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
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
        v0.1 · ArbiCapital
      </div>
    </aside>
  );
}
