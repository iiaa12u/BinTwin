"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/bins", label: "Bins" },
  { href: "/routes", label: "Routes" },
  { href: "/scenarios", label: "Scenarios" },
  { href: "/reports", label: "Reports" },
  { href: "/admin", label: "Admin" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-black">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="h-16 px-6 flex items-center gap-6">
          <img src="/bintwin-logo.png" alt="BinTwin logo" className="h-16 w-auto" />

          <nav className="flex items-center gap-2">
            {navItems.map((item) => (
              <NavLink key={item.href} href={item.href}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto">
            <button
              type="button"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-black hover:bg-gray-50"
              aria-label="Notifications"
              title="Notifications"
            >
              🔔
            </button>
          </div>
        </div>
      </header>

      <main className="p-6">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={
        "relative rounded-lg px-3 py-2 text-sm font-medium transition " +
        (active
          ? "text-emerald-700 bg-emerald-50"
          : "text-black hover:bg-gray-50")
      }
    >
      <span className="relative z-10">{children}</span>

      {/* Green top highlight/shadow when active */}
      {active && (
        <span
          className="
            pointer-events-none absolute inset-x-2 -top-[2px] h-[3px]
            rounded-full bg-emerald-500
            shadow-[0_6px_14px_rgba(16,185,129,0.35)]
          "
          aria-hidden="true"
        />
      )}
    </Link>
  );
}