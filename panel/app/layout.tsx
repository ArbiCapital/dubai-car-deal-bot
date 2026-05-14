import "../styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dubai Deal Bot · ArbiCapital",
  description: "Panel de control del bot de importación de coches de Dubai.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
