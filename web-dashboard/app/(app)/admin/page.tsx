"use client";

import { useEffect, useMemo, useState } from "react";

type UserRole = "ADMIN" | "SUPERVISOR" | "OPERATOR" | "DRIVER";
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
  const [role, setRole] = useState<UserRole>("SUPERVISOR");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  // IMPORTANT: set this in .env.local as ADMIN_SECRET=...
  const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET; // optional if you prefer client-side
  // If you DON'T want exposing any secret to browser:
  // keep NEXT_PUBLIC_ADMIN_SECRET undefined, and instead hardcode header in a server action later.
  // For now, easiest: put it as NEXT_PUBLIC_ADMIN_SECRET.

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
        body: JSON.stringify({
          name,
          email,
          password,
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create user");

      setOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("SUPERVISOR");
      await fetchUsers();
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50">
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left sidebar */}
          <aside className="col-span-12 lg:col-span-2">
            <div className="rounded-xl border bg-white p-4">
              <div className="text-sm font-semibold mb-3">Admin Controls</div>

              <div className="space-y-2 text-sm">
                <SidebarItem active label="User Management" />
                <SidebarItem label="Roles & Permissions" />
                <SidebarItem label="Trucks Database" />
                <SidebarItem label="Bins Database" />
                <SidebarItem label="Sensor Health Monitor" />
              </div>
            </div>
          </aside>

          {/* Main */}
          <section className="col-span-12 lg:col-span-8">
            <div className="rounded-xl border bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Admin › User Management</div>
                  <h1 className="text-lg font-semibold">Users</h1>
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
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>

                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as any)}
                    className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="OPERATOR">Operator</option>
                    <option value="DRIVER">Driver</option>
                  </select>
                </div>

                <button
                  onClick={fetchUsers}
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                >
                  Refresh
                </button>
              </div>

              {/* Errors */}
              {!!error && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Table */}
              <div className="mt-4 overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Name</th>
                      <th className="px-4 py-3 text-left font-medium">Email</th>
                      <th className="px-4 py-3 text-left font-medium">Role</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Last Active</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {loading ? (
                      <tr>
                        <td className="px-4 py-4 text-gray-500" colSpan={5}>
                          Loading...
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td className="px-4 py-4 text-gray-500" colSpan={5}>
                          No users found.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((u) => (
                        <tr key={u.id} className="bg-white">
                          <td className="px-4 py-3">{u.name}</td>
                          <td className="px-4 py-3">{u.email}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">
                              {String(u.role)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill status={String(u.status)} />
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleString() : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Right quick actions */}
          <aside className="col-span-12 lg:col-span-2">
            <div className="rounded-xl border bg-white p-4">
              <div className="text-sm font-semibold mb-3">Quick Admin Actions</div>

              <div className="space-y-2">
                <button
                  onClick={() => setOpen(true)}
                  className="w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                >
                  Add New User
                </button>
                <button className="w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
                  Add New Truck
                </button>
                <button className="w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
                  Add New Bin
                </button>

                <div className="pt-3">
                  <div className="text-xs text-gray-500 mb-2">Export Admin Logs</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
                      PDF
                    </button>
                    <button className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
                      CSV
                    </button>
                  </div>
                </div>

                <button className="w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 mt-3">
                  View System Activity Log
                </button>
                <button className="w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
                  Backup System Data
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Add user modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Add New User</div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-sm hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <Field label="Name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="e.g., Jayan"
                />
              </Field>

              <Field label="Email">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="e.g., jayan@bintwin.com"
                />
              </Field>

              <Field label="Role">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="OPERATOR">Operator</option>
                  <option value="DRIVER">Driver</option>
                </select>
              </Field>

              <Field label="Temporary Password">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="Set a strong password"
                  type="password"
                />
              </Field>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
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

            <div className="mt-3 text-xs text-gray-500">
              Password will be stored as a hash in PostgreSQL.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarItem({ label, active }: { label: string; active?: boolean }) {
  return (
    <div
      className={
        "flex items-center gap-2 rounded-lg px-3 py-2 " +
        (active ? "bg-emerald-50 text-emerald-700" : "text-gray-700 hover:bg-gray-50")
      }
    >
      <span className="h-2 w-2 rounded-full bg-gray-300" />
      <span>{label}</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = status.toUpperCase();
  const cls =
    s === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700"
      : s === "PENDING"
      ? "bg-orange-50 text-orange-700"
      : "bg-gray-100 text-gray-700";

  return <span className={"rounded-full px-2 py-1 text-xs " + cls}>{s}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs text-gray-600">{label}</div>
      {children}
    </div>
  );
}