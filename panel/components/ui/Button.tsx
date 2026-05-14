"use client";
import clsx from "clsx";
import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className, ...rest }: Props) {
  return (
    <button className={clsx(variant === "primary" ? "btn-primary" : "btn-secondary", className)} {...rest} />
  );
}
