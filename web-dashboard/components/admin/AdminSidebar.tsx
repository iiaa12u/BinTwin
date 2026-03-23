"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "User Management" },
  { href: "/admin/roles", label: "Roles & Permissions" },
  { href: "/admin/trucks", label: "Trucks Database" },
  { href: "/admin/bins", label: "Bins Database" },
  { href: "/admin/sensors", label: "Sensor Health Monitor" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="col-span-12 lg:col-span-2">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 text-sm font-semibold text-gray-900">
          Admin Controls
        </div>

        <div className="space-y-2 text-sm">
          {items.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "flex items-center gap-2 rounded-lg px-3 py-2 transition " +
                  (active
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-gray-900 hover:bg-gray-50")
                }
              >
                <span className="h-2 w-2 rounded-full bg-gray-300" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}