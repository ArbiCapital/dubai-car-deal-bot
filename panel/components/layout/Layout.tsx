"use client";

import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function Layout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex min-h-screen relative">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 min-w-0 relative">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="px-4 md:px-8 py-6 md:py-8 max-w-[1200px] mx-auto">{children}</main>
      </div>
    </div>
  );
}
