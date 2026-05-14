"use client";
import clsx from "clsx";
import { InputHTMLAttributes } from "react";

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx("input", className)} {...rest} />;
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-text-tertiary uppercase tracking-wider mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-text-tertiary mt-1">{hint}</span>}
    </label>
  );
}
