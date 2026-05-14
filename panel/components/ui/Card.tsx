import clsx from "clsx";
import { HTMLAttributes } from "react";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("card", className)} {...rest} />;
}
