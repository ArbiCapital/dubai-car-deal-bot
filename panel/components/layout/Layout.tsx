import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen relative">
      <Sidebar />
      <div className="flex-1 min-w-0 relative">
        <Topbar />
        <main className="px-8 py-8 max-w-[1200px] mx-auto">{children}</main>
      </div>
    </div>
  );
}
