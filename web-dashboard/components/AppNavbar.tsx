"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AppNavbarProps = {
  role: string;
};

export default function AppNavbar({ role }: AppNavbarProps) {
  const pathname = usePathname();

  const navItems =
    role === "ADMINISTRATOR"
      ? [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/bins", label: "Bins" },
          { href: "/routes", label: "Routes" },
          { href: "/scenarios", label: "Scenarios" },
          { href: "/reports", label: "Reports" },
          { href: "/admin", label: "Admin" },
        ]
      : role === "OPERATIONS_PLANNER"
      ? [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/bins", label: "Bins" },
          { href: "/routes", label: "Routes" },
          { href: "/scenarios", label: "Scenarios" },
          { href: "/reports", label: "Reports" },
        ]
      : [
          { href: "/driver", label: "Driver" },
        ];

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="h-16 px-6 flex items-center gap-6">
        <img
          src="/bintwin-logo.png"
          alt="BinTwin logo"
          className="h-12 w-auto"
        />

        <nav className="flex items-center gap-2">
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "relative rounded-lg px-3 py-2 text-sm font-medium transition " +
                  (active
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-black hover:bg-gray-50")
                }
              >
                <span className="relative z-10">{item.label}</span>

                {active && (
                  <span
                    className="pointer-events-none absolute inset-x-2 -top-[2px] h-[3px] rounded-full bg-emerald-500 shadow-[0_6px_14px_rgba(16,185,129,0.35)]"
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-black hover:bg-gray-50"
            aria-label="Notifications"
            title="Notifications"
          >
            🔔
          </button>

          <button
            onClick={async () => {
                await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include",
                cache: "no-store",
                });

                window.location.replace("/login");
            }}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-50"
            >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}