"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import ResetRequestsPanel from "@/components/admin/ResetRequestsPanel";

type UserRole = "ADMINISTRATOR" | "OPERATIONS_PLANNER" | "TRUCK_DRIVER";
type UserStatus = "ACTIVE" | "INACTIVE" | "PENDING";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole | string;
  status: UserStatus | string;
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt?: string;
};

export default function AdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // filters
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | UserRole>("ALL");

  // add user form
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("OPERATIONS_PLANNER");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  // actions dropdown
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const openMenuRef = useRef<HTMLDivElement | null>(null);

  // IMPORTANT: set this in .env.local as NEXT_PUBLIC_ADMIN_SECRET=...
  const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET;

  async function fetchUsers() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        headers: { "x-admin-secret": String(ADMIN_SECRET || "") },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load users");
      setUsers(data.users || []);
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // close menu on outside click / escape (FIXED)
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!openMenuRef.current) return;
      if (!openMenuRef.current.contains(e.target as Node)) {
        setOpenMenuFor(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenuFor(null);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return users.filter((u) => {
      const matchesQuery =
        !query ||
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query);

      const matchesRole = roleFilter === "ALL" ? true : u.role === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [users, q, roleFilter]);

  async function createUser() {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": String(ADMIN_SECRET || ""),
        },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create user");

      setOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("OPERATIONS_PLANNER");
      await fetchUsers();
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setCreating(false);
    }
  }

  // ---- ACTION HELPERS (now wired) ----
  async function patchUser(id: string, body: any) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": String(ADMIN_SECRET || ""),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Update failed");
    return data;
  }

  async function deleteUser(id: string) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "DELETE",
      headers: { "x-admin-secret": String(ADMIN_SECRET || "") },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Delete failed");
    return data;
  }

  async function onChangeRole(u: UserRow) {
    setOpenMenuFor(null);
    const next = prompt(
  "Enter role: ADMINISTRATOR / OPERATIONS_PLANNER / TRUCK_DRIVER",
  String(u.role)
);
    if (!next) return;

    const roleUpper = next.trim().toUpperCase();
    if (!["ADMINISTRATOR", "OPERATIONS_PLANNER", "TRUCK_DRIVER"].includes(roleUpper)) {
      alert("Invalid role.");
      return;
    }

    try {
      setError("");
      await patchUser(u.id, { role: roleUpper });
      await fetchUsers();
    } catch (e: any) {
      setError(e.message || "Error");
    }
  }

  async function onToggleActive(u: UserRow) {
    setOpenMenuFor(null);
    const isActive = String(u.status).toUpperCase() === "ACTIVE";
    const nextStatus = isActive ? "INACTIVE" : "ACTIVE";

    if (
      !confirm(
        `${isActive ? "Deactivate" : "Activate"} user "${u.name}"?`
      )
    )
      return;

    try {
      setError("");
      await patchUser(u.id, { status: nextStatus });
      await fetchUsers();
    } catch (e: any) {
      setError(e.message || "Error");
    }
  }

  async function onResetPassword(u: UserRow) {
    setOpenMenuFor(null);
    const nextPw = prompt(`Set NEW password for ${u.email} (min 6 chars):`);
    if (!nextPw) return;

    try {
      setError("");
      await patchUser(u.id, { password: nextPw });
      alert("Password reset successfully.");
    } catch (e: any) {
      setError(e.message || "Error");
    }
  }

  async function onEditDetails(u: UserRow) {
    setOpenMenuFor(null);
    const nextName = prompt("Edit name:", u.name);
    if (nextName === null) return;
    const nextEmail = prompt("Edit email:", u.email);
    if (nextEmail === null) return;

    try {
      setError("");
      await patchUser(u.id, { name: nextName, email: nextEmail });
      await fetchUsers();
    } catch (e: any) {
      setError(e.message || "Error");
    }
  }

  async function onDelete(u: UserRow) {
    setOpenMenuFor(null);
    if (!confirm(`DELETE user "${u.name}" (${u.email})? This cannot be undone.`)) return;

    try {
      setError("");
      await deleteUser(u.id);
      await fetchUsers();
    } catch (e: any) {
      setError(e.message || "Error");
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left sidebar */}
          <AdminSidebar />

          {/* Main */}
          <section className="col-span-12 lg:col-span-8">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-gray-700 mb-1">
                    Admin › User Management
                  </div>
                  <h1 className="text-lg font-semibold text-gray-900">Users</h1>
                </div>

                <button
                  onClick={() => setOpen(true)}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  + Add New User
                </button>
              </div>

              {/* Controls */}
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 gap-3">
                  <div className="flex-1">
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Search users by name or email..."
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>

                    <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as "ALL" | UserRole)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-200"
                    >
                    <option value="ALL">All Roles</option>
                    <option value="ADMINISTRATOR">Administrator</option>
                    <option value="OPERATIONS_PLANNER">Operations Planner</option>
                    <option value="TRUCK_DRIVER">Truck Driver</option>
                    </select>
                </div>

                <button
                  onClick={fetchUsers}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 hover:bg-gray-50"
                >
                  Refresh
                </button>
              </div>

              {!!error && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Table */}
              <div className="mt-4 overflow-visible rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Name</th>
                      <th className="px-4 py-3 text-left font-semibold">Email</th>
                      <th className="px-4 py-3 text-left font-semibold">Role</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Last Active</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td className="px-4 py-4 text-gray-700" colSpan={6}>
                          Loading...
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td className="px-4 py-4 text-gray-700" colSpan={6}>
                          No users found.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((u) => {
                        const isOpen = openMenuFor === u.id;
                        const isActive = String(u.status).toUpperCase() === "ACTIVE";

                        return (
                          <tr key={u.id} className="bg-white">
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {u.name}
                            </td>
                            <td className="px-4 py-3 text-gray-900">{u.email}</td>
                            <td className="px-4 py-3">
                              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
                                {formatRole(String(u.role))}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <StatusPill status={String(u.status)} />
                            </td>
                            <td className="px-4 py-3 text-gray-800">
                              {u.lastActiveAt
                                ? new Date(u.lastActiveAt).toLocaleString()
                                : "—"}
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3">
                              <div className="relative flex justify-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuFor((cur) => (cur === u.id ? null : u.id));
                                  }}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                                  aria-label="Open actions"
                                >
                                  ⋮
                                </button>

                                {isOpen && (
                                  <div
                                    ref={openMenuRef}
                                    className="absolute right-0 top-10 z-50 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
                                  >
                                    <MenuItem label="Edit Details" onClick={() => onEditDetails(u)} />
                                    <MenuItem label="Change Role" onClick={() => onChangeRole(u)} />
                                    <MenuItem label="Reset Password" onClick={() => onResetPassword(u)} />
                                    <MenuItem
                                      label={isActive ? "Deactivate User" : "Activate User"}
                                      onClick={() => onToggleActive(u)}
                                    />
                                    <div className="h-px bg-gray-100" />
                                    <MenuItem label="Delete User" danger onClick={() => onDelete(u)} />
                                  </div>
                                )}
                              </div>
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

          {/* Right sidebar */}
          <aside className="col-span-12 lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold mb-3 text-gray-900">
                Quick Admin Actions
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => setOpen(true)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 hover:bg-gray-50"
                >
                  Add New User
                </button>
              </div>
            </div>

            <ResetRequestsPanel />
          </aside>
        </div>
      </div>

      {/* Add user modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900">Add New User</div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-gray-700 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <Field label="Name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="e.g., Jayan"
                />
              </Field>

              <Field label="Email">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="e.g., jayan@bintwin.com"
                />
              </Field>

              <Field label="Role">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="ADMINISTRATOR">Administrator</option>
                  <option value="OPERATIONS_PLANNER">Operations Planner</option>
                  <option value="TRUCK_DRIVER">Truck Driver</option>
                </select>
              </Field>

              <Field label="Temporary Password">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="Set a strong password"
                  type="password"
                />
              </Field>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-900 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={creating || !name || !email || !password}
                onClick={createUser}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create User"}
              </button>
            </div>

            <div className="mt-3 text-xs text-gray-700">
              Password will be stored as a hash in PostgreSQL.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatRole(role: string) {
  switch (role) {
    case "ADMINISTRATOR":
      return "Administrator";
    case "OPERATIONS_PLANNER":
      return "Operations Planner";
    case "TRUCK_DRIVER":
      return "Truck Driver";
    default:
      return role;
  }
}



function StatusPill({ status }: { status: string }) {
  const s = status.toUpperCase();
  const cls =
    s === "ACTIVE"
      ? "bg-emerald-50 text-emerald-800"
      : s === "PENDING"
      ? "bg-orange-50 text-orange-800"
      : "bg-gray-100 text-gray-800";

  return <span className={"rounded-full px-2 py-1 text-xs font-semibold " + cls}>{s}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-gray-800">{label}</div>
      {children}
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "w-full px-3 py-2 text-left text-sm hover:bg-gray-50 " +
        (danger ? "text-red-600" : "text-gray-900")
      }
    >
      {label}
    </button>
  );
}