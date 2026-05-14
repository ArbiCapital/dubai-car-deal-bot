"use client";
import clsx from "clsx";

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel?: string;
}

export function Toggle({ checked, onChange, ariaLabel }: Props) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative w-9 h-5 rounded-full transition-colors",
        checked ? "bg-gold" : "bg-white/15",
      )}
    >
      <span
        className={clsx(
          "absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white transition-all",
          checked ? "left-[19px]" : "left-[3px]",
        )}
      />
    </button>
  );
}
