"use client";

import { useEffect, useMemo, useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { mockRoles, roleModules, type RoleRecord } from "@/lib/admin/rolesData";

type UserRole = "ADMINISTRATOR" | "OPERATIONS_PLANNER" | "TRUCK_DRIVER";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole | string;
  status: string;
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt?: string;
};

export default function AdminRolesPage() {
  const [selectedRoleKey, setSelectedRoleKey] =
    useState<RoleRecord["key"]>("ADMINISTRATOR");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET;

  async function fetchUsers() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/users", {
        headers: {
          "x-admin-secret": String(ADMIN_SECRET || ""),
        },
        cache: "no-store",
      });

      const raw = await res.text();
      let data: any = null;

      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        throw new Error(raw || "Server returned invalid response");
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load users");
      }

      setUsers(data.users || []);
    } catch (e: any) {
      setError(e.message || "Error loading users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roleCounts = useMemo(() => {
    return {
      ADMINISTRATOR: users.filter((u) => u.role === "ADMINISTRATOR").length,
      OPERATIONS_PLANNER: users.filter((u) => u.role === "OPERATIONS_PLANNER").length,
      TRUCK_DRIVER: users.filter((u) => u.role === "TRUCK_DRIVER").length,
    };
  }, [users]);

  const rolesWithCounts = useMemo(() => {
    return mockRoles.map((role) => ({
      ...role,
      usersAssigned: roleCounts[role.key] ?? 0,
    }));
  }, [roleCounts]);

  const selectedRole = useMemo(
    () => rolesWithCounts.find((r) => r.key === selectedRoleKey) ?? rolesWithCounts[0],
    [selectedRoleKey, rolesWithCounts]
  );

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-[1450px] px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          <AdminSidebar />

          {/* Main content */}
          <section className="col-span-12 lg:col-span-7">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-1 text-xs text-gray-700">
                    Admin › Roles & Permissions
                  </div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    Roles & Permissions
                  </h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Manage access levels and capabilities for all supported user
                    types.
                  </p>
                </div>

                <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                  + Add New Role
                </button>
              </div>

              {!!error && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-5 overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">
                        Role Name
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Description
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Users Assigned
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-4 text-gray-600">
                          Loading role counts...
                        </td>
                      </tr>
                    ) : (
                      rolesWithCounts.map((role) => {
                        const selected = selectedRoleKey === role.key;

                        return (
                          <tr
                            key={role.key}
                            onClick={() => setSelectedRoleKey(role.key)}
                            className={
                              "cursor-pointer bg-white transition " +
                              (selected ? "bg-emerald-50/50" : "hover:bg-gray-50")
                            }
                          >
                            <td className="px-4 py-4 font-semibold text-gray-900">
                              {role.name}
                            </td>
                            <td className="px-4 py-4 text-gray-700">
                              {role.description}
                            </td>
                            <td className="px-4 py-4 text-gray-700">
                              {role.usersAssigned}
                            </td>
                            <td className="px-4 py-4">
                              <StatusPill status={role.status} />
                            </td>
                            <td className="px-4 py-4 text-right text-gray-500">
                              ⋮
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Right side */}
          <aside className="col-span-12 lg:col-span-3 space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 text-base font-semibold text-gray-900">
                Selected Role: {selectedRole?.name || "—"}
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-800">
                    <tr>
                      <th className="px-3 py-3 text-left font-semibold">
                        Module
                      </th>
                      <th className="px-3 py-3 text-center font-semibold">
                        View
                      </th>
                      <th className="px-3 py-3 text-center font-semibold">
                        Edit
                      </th>
                      <th className="px-3 py-3 text-center font-semibold">
                        Manage
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {selectedRole &&
                      roleModules.map((moduleName) => {
                        const permission = selectedRole.permissions[moduleName];

                        return (
                          <tr key={moduleName}>
                            <td className="px-3 py-3 text-gray-900">
                              {moduleName}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <PermissionCell enabled={permission.view} />
                            </td>
                            <td className="px-3 py-3 text-center">
                              <PermissionCell enabled={permission.edit} />
                            </td>
                            <td className="px-3 py-3 text-center">
                              <PermissionCell enabled={permission.manage} />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 text-sm font-semibold text-gray-900">
                Quick Actions
              </div>

              <div className="space-y-2">
                <button className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
                  Export Roles (CSV/PDF)
                </button>
                <button className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
                  Manage Role Templates
                </button>
                <button className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
                  View Permission Audit Log
                </button>
                <button className="w-full rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600">
                  Reset All Permissions
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: "Active" | "Inactive" }) {
  const cls =
    status === "Active"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-gray-100 text-gray-700";

  return (
    <span className={"rounded-full px-2 py-1 text-xs font-semibold " + cls}>
      {status}
    </span>
  );
}

function PermissionCell({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={
        "inline-flex h-5 w-5 items-center justify-center rounded text-xs font-bold " +
        (enabled
          ? "bg-slate-900 text-white"
          : "bg-gray-100 text-gray-400")
      }
    >
      {enabled ? "✓" : "—"}
    </span>
  );
}