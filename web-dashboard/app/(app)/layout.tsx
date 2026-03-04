//This is for shared layout(top bar) across all pages 
import type { ReactNode } from "react";
import Link from "next/link";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top header */}
      <header className="h-16 border-b bg-white flex items-center px-6">
        <div className="flex items-center gap-2">
          <img
            src="/bintwin-logo.png"
            alt="BinTwin logo"
            className="h-14 w-auto"
          />
        </div>

        <nav className="flex gap-6">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/bins">Bins</Link>
        <Link href="/routes">Routes</Link>
        <Link href="/scenarios">Scenarios</Link>
        <Link href="/reports">Reports</Link>
        <Link href="/admin">Admin</Link>
        </nav>

        <div className="ml-auto text-sm text-gray-500">🔔</div>
      </header>

      <main className="p-6">{children}</main>
    </div>
  );
}