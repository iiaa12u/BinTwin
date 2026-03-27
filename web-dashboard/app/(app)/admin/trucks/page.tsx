"use client";

import { useMemo, useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { trucks as initialTrucks, type TruckRecord } from "@/lib/admin/trucksData";

type TruckForm = {
  id: string;
  name: string;
  type: "Collection Truck";
  capacityKg: string;
  fuelType: "Diesel" | "Electric";
  zoneAssigned: "East Campus" | "West Campus";
  status: "Active" | "Inactive" | "Maintenance";
  startLat: string;
  startLng: string;
  routeAssigned: string;
};

const emptyForm: TruckForm = {
  id: "",
  name: "",
  type: "Collection Truck",
  capacityKg: "",
  fuelType: "Diesel",
  zoneAssigned: "East Campus",
  status: "Active",
  startLat: "",
  startLng: "",
  routeAssigned: "",
};

export default function AdminTrucksPage() {
  const [allTrucks, setAllTrucks] = useState<TruckRecord[]>(initialTrucks);
  const [search, setSearch] = useState("");
  const [selectedTruckId, setSelectedTruckId] = useState<string>(initialTrucks[0]?.id ?? "");
  const [zoneFilter, setZoneFilter] = useState("ALL");

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<TruckForm>(emptyForm);

  const filteredTrucks = useMemo(() => {
    const q = search.trim().toLowerCase();

    return allTrucks.filter((truck) => {
      const matchesSearch =
        !q ||
        truck.id.toLowerCase().includes(q) ||
        truck.name.toLowerCase().includes(q) ||
        truck.zoneAssigned.toLowerCase().includes(q) ||
        truck.fuelType.toLowerCase().includes(q) ||
        truck.type.toLowerCase().includes(q);

      const matchesZone =
        zoneFilter === "ALL" ? true : truck.zoneAssigned === zoneFilter;

      return matchesSearch && matchesZone;
    });
  }, [allTrucks, search, zoneFilter]);

  const selectedTruck =
    filteredTrucks.find((truck) => truck.id === selectedTruckId) ||
    allTrucks.find((truck) => truck.id === selectedTruckId) ||
    filteredTrucks[0] ||
    allTrucks[0];

  function updateForm<K extends keyof TruckForm>(key: K, value: TruckForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setFormError("");
  }

  function handleOpenModal() {
    resetForm();
    setOpen(true);
  }

  function handleCloseModal() {
    setOpen(false);
    resetForm();
  }

  function handleCreateTruck() {
    setCreating(true);
    setFormError("");

    const id = form.id.trim().toUpperCase();
    const name = form.name.trim();
    const capacityKg = Number(form.capacityKg);
    const startLat = Number(form.startLat);
    const startLng = Number(form.startLng);
    const routeAssigned = form.routeAssigned.trim();

    if (!id || !name || !form.capacityKg || !form.startLat || !form.startLng) {
      setFormError("Truck ID, name, capacity, and start coordinates are required.");
      setCreating(false);
      return;
    }

    if (Number.isNaN(capacityKg) || capacityKg <= 0) {
      setFormError("Capacity must be a valid positive number.");
      setCreating(false);
      return;
    }

    if (Number.isNaN(startLat) || Number.isNaN(startLng)) {
      setFormError("Start latitude and longitude must be valid numbers.");
      setCreating(false);
      return;
    }

    const exists = allTrucks.some((truck) => truck.id === id);
    if (exists) {
      setFormError("Truck ID already exists.");
      setCreating(false);
      return;
    }

    const newTruck: TruckRecord = {
      id,
      name,
      type: "Collection Truck",
      capacityKg,
      fuelType: form.fuelType,
      zoneAssigned: form.zoneAssigned,
      status: form.status,
      startLat,
      startLng,
      routeAssigned: routeAssigned || undefined,
    };

    const nextTrucks = [newTruck, ...allTrucks];
    setAllTrucks(nextTrucks);
    setSelectedTruckId(newTruck.id);
    setOpen(false);
    resetForm();
    setCreating(false);
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-[1500px] px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          <AdminSidebar />

          {/* Main */}
          <section className="col-span-12 lg:col-span-7">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-1 text-xs text-gray-700">
                    Admin › Truck Fleet Database
                  </div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    Truck Fleet Database
                  </h1>
                </div>

                <button
                  onClick={handleOpenModal}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  + Add New Truck
                </button>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search trucks..."
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-200"
                />

                <select
                  value={zoneFilter}
                  onChange={(e) => setZoneFilter(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="ALL">Filter by Zone</option>
                  <option value="East Campus">East Campus</option>
                  <option value="West Campus">West Campus</option>
                </select>
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Truck ID</th>
                      <th className="px-4 py-3 text-left font-semibold">Name</th>
                      <th className="px-4 py-3 text-left font-semibold">Type</th>
                      <th className="px-4 py-3 text-left font-semibold">Capacity</th>
                      <th className="px-4 py-3 text-left font-semibold">Fuel Type</th>
                      <th className="px-4 py-3 text-left font-semibold">Zone Assigned</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredTrucks.map((truck) => (
                      <tr
                        key={truck.id}
                        onClick={() => setSelectedTruckId(truck.id)}
                        className={
                          "cursor-pointer bg-white transition " +
                          (selectedTruck?.id === truck.id
                            ? "bg-emerald-50/40"
                            : "hover:bg-gray-50")
                        }
                      >
                        <td className="px-4 py-4 font-semibold text-gray-900">
                          {truck.id}
                        </td>
                        <td className="px-4 py-4 text-gray-700">{truck.name}</td>
                        <td className="px-4 py-4 text-gray-700">{truck.type}</td>
                        <td className="px-4 py-4 text-gray-700">
                          {truck.capacityKg} kg
                        </td>
                        <td className="px-4 py-4 text-gray-700">{truck.fuelType}</td>
                        <td className="px-4 py-4 text-gray-700">{truck.zoneAssigned}</td>
                        <td className="px-4 py-4">
                          <TruckStatusPill status={truck.status} />
                        </td>
                        <td className="px-4 py-4 text-right text-gray-500">⋯</td>
                      </tr>
                    ))}

                    {filteredTrucks.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                          No trucks found.
                        </td>
                      </tr>
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
                Selected Truck Overview
              </div>

              {selectedTruck ? (
                <div className="space-y-4 text-sm">
                  <InfoRow label="Truck ID" value={selectedTruck.id} />
                  <InfoRow label="Truck Name" value={selectedTruck.name} />
                  <InfoRow label="Type" value={selectedTruck.type} />
                  <InfoRow label="Capacity" value={`${selectedTruck.capacityKg} kg`} />
                  <InfoRow label="Fuel Type" value={selectedTruck.fuelType} />
                  <InfoRow label="Zone Assigned" value={selectedTruck.zoneAssigned} />
                  <InfoRow label="Operational Status" value={selectedTruck.status} />

                  <div className="border-t pt-4">
                    <InfoRow
                      label="Route Assigned"
                      value={selectedTruck.routeAssigned ?? "Not Assigned"}
                    />
                    <InfoRow
                      label="Start Location"
                      value={`${selectedTruck.startLat.toFixed(6)}, ${selectedTruck.startLng.toFixed(6)}`}
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    <button className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
                      Edit Truck Details
                    </button>
                    <button className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
                      Assign Truck to Route
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No truck selected.</div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 text-sm font-semibold text-gray-900">
                Quick Actions
              </div>

              <div className="space-y-2">
                <button className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
                  Export Fleet (PDF/CSV)
                </button>
                <button className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
                  View Depot Assignment
                </button>
                <button className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
                  Assign Trucks to Routes
                </button>
                <button
                  onClick={handleOpenModal}
                  className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Register New Truck
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Add truck modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900">Add New Truck</div>
              <button
                onClick={handleCloseModal}
                className="rounded-lg px-2 py-1 text-sm text-gray-700 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Truck ID">
                <input
                  value={form.id}
                  onChange={(e) => updateForm("id", e.target.value)}
                  placeholder="e.g., TRK003"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </Field>

              <Field label="Truck Name">
                <input
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  placeholder="e.g., North Campus Truck"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </Field>

              <Field label="Fuel Type">
                <select
                  value={form.fuelType}
                  onChange={(e) => updateForm("fuelType", e.target.value as TruckForm["fuelType"])}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="Diesel">Diesel</option>
                  <option value="Electric">Electric</option>
                </select>
              </Field>

              <Field label="Zone Assigned">
                <select
                  value={form.zoneAssigned}
                  onChange={(e) =>
                    updateForm("zoneAssigned", e.target.value as TruckForm["zoneAssigned"])
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="East Campus">East Campus</option>
                  <option value="West Campus">West Campus</option>
                </select>
              </Field>

              <Field label="Capacity (kg)">
                <input
                  value={form.capacityKg}
                  onChange={(e) => updateForm("capacityKg", e.target.value)}
                  placeholder="e.g., 2500"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </Field>

              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) => updateForm("status", e.target.value as TruckForm["status"])}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </Field>

              <Field label="Start Latitude">
                <input
                  value={form.startLat}
                  onChange={(e) => updateForm("startLat", e.target.value)}
                  placeholder="e.g., 26.405756"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </Field>

              <Field label="Start Longitude">
                <input
                  value={form.startLng}
                  onChange={(e) => updateForm("startLng", e.target.value)}
                  placeholder="e.g., 50.207625"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label="Route Assigned (optional)">
                  <input
                    value={form.routeAssigned}
                    onChange={(e) => updateForm("routeAssigned", e.target.value)}
                    placeholder="e.g., East Route"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </Field>
              </div>
            </div>

            {formError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={handleCloseModal}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-900 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={creating}
                onClick={handleCreateTruck}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {creating ? "Creating..." : "Create Truck"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TruckStatusPill({ status }: { status: TruckRecord["status"] }) {
  const cls =
    status === "Active"
      ? "bg-emerald-50 text-emerald-700"
      : status === "Maintenance"
      ? "bg-amber-50 text-amber-700"
      : "bg-gray-100 text-gray-700";

  return (
    <span className={"rounded-full px-2 py-1 text-xs font-semibold " + cls}>
      {status}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value}</span>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-gray-800">{label}</div>
      {children}
    </div>
  );
}