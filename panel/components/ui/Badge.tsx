import clsx from "clsx";
import { Clasificacion } from "@/lib/types";

const LABEL: Record<Clasificacion, string> = {
  excepcional: "Excepcional",
  muy_bueno: "Muy bueno",
  bueno: "Bueno",
};

const STYLES: Record<Clasificacion, string> = {
  excepcional: "bg-gold-dim text-gold-light border border-gold-border",
  muy_bueno:   "bg-success-dim text-[#4DCE94] border border-[rgba(45,158,107,0.3)]",
  bueno:       "bg-info-dim text-[#60A5FA] border border-[rgba(59,130,246,0.3)]",
};

export function Badge({ kind, className }: { kind: Clasificacion; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full leading-none",
        STYLES[kind],
        className,
      )}
    >
      {LABEL[kind]}
    </span>
  );
}
