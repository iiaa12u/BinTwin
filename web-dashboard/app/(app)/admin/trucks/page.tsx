"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import {
  trucks as initialTrucks,
  type TruckRecord,
} from "@/lib/admin/trucksData";

type ManagedTruck = TruckRecord & {
  plateNumber?: string;
  driverName?: string;
  lastServiceDate?: string;
  maintenanceNote?: string;
};

type TruckForm = {
  id: string;
  name: string;
  type: string;
  capacityKg: string;
  fuelType: "Diesel" | "Electric";
  zoneAssigned: "East Campus" | "West Campus";
  status: "Active" | "Inactive" | "Maintenance";
  startLat: string;
  startLng: string;
  routeAssigned: string;
  plateNumber: string;
  driverName: string;
};

type ZoneFilter = "ALL" | "East Campus" | "West Campus";
type StatusFilter = "ALL" | "Active" | "Inactive" | "Maintenance";
type ModalType =
  | "add"
  | "edit"
  | "assign"
  | "depot"
  | "bulkAssign"
  | "maintenance"
  | null;

const STORAGE_KEY = "adminTrucksState";

const emptyForm: TruckForm = {
  id: "",
  name: "",
  type: "Collection Truck",
  capacityKg: "2500",
  fuelType: "Diesel",
  zoneAssigned: "East Campus",
  status: "Active",
  startLat: "",
  startLng: "",
  routeAssigned: "",
  plateNumber: "",
  driverName: "",
};

const routeOptions = [
  "East Route",
  "West Route",
  "Dynamic Priority Route",
  "Static Scheduled Route",
  "Overflow Prevention Route",
  "Unassigned",
];

const depotInfo = {
  name: "IAU Main Depot",
  eastStart: "26.397820, 50.204268",
  westStart: "26.383639, 50.186365",
  landfill: "26.160087, 49.869909",
};

function readSavedTrucks(): ManagedTruck[] {
  if (typeof window === "undefined") return initialTrucks as ManagedTruck[];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialTrucks as ManagedTruck[];

    const saved = JSON.parse(raw) as ManagedTruck[];

    if (!Array.isArray(saved) || saved.length === 0) {
      return initialTrucks as ManagedTruck[];
    }

    return saved;
  } catch {
    return initialTrucks as ManagedTruck[];
  }
}

function saveTrucks(trucks: ManagedTruck[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trucks));
}

function formatNow() {
  return new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function exportFleetCsv(trucks: ManagedTruck[]) {
  const headers = [
    "truck_id",
    "name",
    "type",
    "capacity_kg",
    "fuel_type",
    "zone_assigned",
    "status",
    "route_assigned",
    "start_lat",
    "start_lng",
    "plate_number",
    "driver_name",
    "last_service_date",
    "maintenance_note",
  ];

  const rows = trucks.map((truck) => [
    truck.id,
    truck.name,
    truck.type,
    truck.capacityKg,
    truck.fuelType,
    truck.zoneAssigned,
    truck.status,
    truck.routeAssigned ?? "",
    truck.startLat,
    truck.startLng,
    truck.plateNumber ?? "",
    truck.driverName ?? "",
    truck.lastServiceDate ?? "",
    truck.maintenanceNote ?? "",
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `bintwin-fleet-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getSuggestedStart(zone: "East Campus" | "West Campus") {
  if (zone === "East Campus") {
    return {
      lat: "26.397820",
      lng: "50.204268",
      route: "East Route",
    };
  }

  return {
    lat: "26.383639",
    lng: "50.186365",
    route: "West Route",
  };
}

export default function AdminTrucksPage() {
  const [allTrucks, setAllTrucks] = useState<ManagedTruck[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTruckId, setSelectedTruckId] = useState("");
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [modal, setModal] = useState<ModalType>(null);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<TruckForm>(emptyForm);
  const [maintenanceNote, setMaintenanceNote] = useState("Routine inspection");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = readSavedTrucks();
    setAllTrucks(saved);
    setSelectedTruckId(saved[0]?.id ?? "");
  }, []);

  const filteredTrucks = useMemo(() => {
    const q = search.trim().toLowerCase();

    return allTrucks.filter((truck) => {
      const matchesSearch =
        !q ||
        truck.id.toLowerCase().includes(q) ||
        truck.name.toLowerCase().includes(q) ||
        truck.zoneAssigned.toLowerCase().includes(q) ||
        truck.fuelType.toLowerCase().includes(q) ||
        truck.type.toLowerCase().includes(q) ||
        String(truck.routeAssigned ?? "").toLowerCase().includes(q) ||
        String(truck.driverName ?? "").toLowerCase().includes(q);

      const matchesZone =
        zoneFilter === "ALL" ? true : truck.zoneAssigned === zoneFilter;

      const matchesStatus =
        statusFilter === "ALL" ? true : truck.status === statusFilter;

      return matchesSearch && matchesZone && matchesStatus;
    });
  }, [allTrucks, search, zoneFilter, statusFilter]);

  const selectedTruck =
    filteredTrucks.find((truck) => truck.id === selectedTruckId) ||
    allTrucks.find((truck) => truck.id === selectedTruckId) ||
    filteredTrucks[0] ||
    allTrucks[0];

  const stats = useMemo(() => {
    const total = allTrucks.length;
    const active = allTrucks.filter((truck) => truck.status === "Active").length;
    const maintenance = allTrucks.filter(
      (truck) => truck.status === "Maintenance"
    ).length;
    const totalCapacity = allTrucks.reduce(
      (sum, truck) => sum + Number(truck.capacityKg ?? 0),
      0
    );

    return {
      total,
      active,
      maintenance,
      totalCapacity,
    };
  }, [allTrucks]);

  function showMessage(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 3000);
  }

  function updateTrucks(next: ManagedTruck[]) {
    setAllTrucks(next);
    saveTrucks(next);
  }

  function updateForm<K extends keyof TruckForm>(key: K, value: TruckForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));

    if (key === "zoneAssigned") {
      const suggested = getSuggestedStart(value as "East Campus" | "West Campus");

      setForm((prev) => ({
        ...prev,
        zoneAssigned: value as TruckForm["zoneAssigned"],
        startLat: suggested.lat,
        startLng: suggested.lng,
        routeAssigned:
          prev.routeAssigned && prev.routeAssigned !== "Unassigned"
            ? prev.routeAssigned
            : suggested.route,
      }));
    }
  }

  function getNextTruckId() {
    const maxNumber = allTrucks.reduce((max, truck) => {
      const number = Number(String(truck.id).replace(/\D/g, ""));
      return Number.isFinite(number) ? Math.max(max, number) : max;
    }, 0);

    return `TRK${String(maxNumber + 1).padStart(3, "0")}`;
  }

  function openAddModal() {
    const suggested = getSuggestedStart("East Campus");

    setForm({
      ...emptyForm,
      id: getNextTruckId(),
      name: `New Collection Truck ${allTrucks.length + 1}`,
      startLat: suggested.lat,
      startLng: suggested.lng,
      routeAssigned: suggested.route,
    });
    setFormError("");
    setModal("add");
  }

  function openEditModal(truck: ManagedTruck) {
    setForm({
      id: truck.id,
      name: truck.name,
      type: truck.type,
      capacityKg: String(truck.capacityKg),
      fuelType: truck.fuelType as TruckForm["fuelType"],
      zoneAssigned: truck.zoneAssigned as TruckForm["zoneAssigned"],
      status: truck.status as TruckForm["status"],
      startLat: String(truck.startLat),
      startLng: String(truck.startLng),
      routeAssigned: truck.routeAssigned ?? "",
      plateNumber: truck.plateNumber ?? "",
      driverName: truck.driverName ?? "",
    });
    setFormError("");
    setModal("edit");
  }

  function openAssignModal(truck: ManagedTruck) {
    setForm({
      id: truck.id,
      name: truck.name,
      type: truck.type,
      capacityKg: String(truck.capacityKg),
      fuelType: truck.fuelType as TruckForm["fuelType"],
      zoneAssigned: truck.zoneAssigned as TruckForm["zoneAssigned"],
      status: truck.status as TruckForm["status"],
      startLat: String(truck.startLat),
      startLng: String(truck.startLng),
      routeAssigned: truck.routeAssigned ?? "Unassigned",
      plateNumber: truck.plateNumber ?? "",
      driverName: truck.driverName ?? "",
    });
    setFormError("");
    setModal("assign");
  }

  function validateForm() {
    const id = form.id.trim().toUpperCase();
    const name = form.name.trim();
    const capacityKg = Number(form.capacityKg);
    const startLat = Number(form.startLat);
    const startLng = Number(form.startLng);

    if (!id || !name || !form.capacityKg || !form.startLat || !form.startLng) {
      return "Truck ID, name, capacity, and start coordinates are required.";
    }

    if (Number.isNaN(capacityKg) || capacityKg <= 0) {
      return "Capacity must be a valid positive number.";
    }

    if (Number.isNaN(startLat) || Number.isNaN(startLng)) {
      return "Start latitude and longitude must be valid numbers.";
    }

    if (modal === "add" && allTrucks.some((truck) => truck.id === id)) {
      return "Truck ID already exists.";
    }

    return "";
  }

  function saveTruckForm() {
    const error = validateForm();

    if (error) {
      setFormError(error);
      return;
    }

    const id = form.id.trim().toUpperCase();

    const truckData: ManagedTruck = {
      id,
      name: form.name.trim(),
      type: form.type as ManagedTruck["type"],
      capacityKg: Number(form.capacityKg),
      fuelType: form.fuelType as ManagedTruck["fuelType"],
      zoneAssigned: form.zoneAssigned as ManagedTruck["zoneAssigned"],
      status: form.status as ManagedTruck["status"],
      startLat: Number(form.startLat),
      startLng: Number(form.startLng),
      routeAssigned:
        form.routeAssigned && form.routeAssigned !== "Unassigned"
          ? form.routeAssigned
          : undefined,
      plateNumber: form.plateNumber.trim() || undefined,
      driverName: form.driverName.trim() || undefined,
    };

    let next: ManagedTruck[];

    if (modal === "edit") {
      next = allTrucks.map((truck) => (truck.id === id ? truckData : truck));
      showMessage(`${id} updated successfully.`);
    } else {
      next = [truckData, ...allTrucks];
      showMessage(`${id} added successfully.`);
    }

    updateTrucks(next);
    setSelectedTruckId(id);
    setModal(null);
    setFormError("");
  }

  function saveRouteAssignment() {
    const id = form.id;

    const next = allTrucks.map((truck) => {
      if (truck.id !== id) return truck;

      return {
        ...truck,
        routeAssigned:
          form.routeAssigned && form.routeAssigned !== "Unassigned"
            ? form.routeAssigned
            : undefined,
        zoneAssigned: form.zoneAssigned as ManagedTruck["zoneAssigned"],
        startLat: Number(form.startLat),
        startLng: Number(form.startLng),
      };
    });

    updateTrucks(next);

    localStorage.setItem(
      "adminTruckRouteAssignments",
      JSON.stringify(
        next.map((truck) => ({
          truckId: truck.id,
          routeAssigned: truck.routeAssigned ?? "Unassigned",
          zoneAssigned: truck.zoneAssigned,
          startLat: truck.startLat,
          startLng: truck.startLng,
        }))
      )
    );

    setModal(null);
    showMessage(`${id} assigned to ${form.routeAssigned}.`);
  }

  function deleteTruck(truck: ManagedTruck) {
    const ok = window.confirm(`Delete ${truck.id}? This only affects demo data.`);
    if (!ok) return;

    const next = allTrucks.filter((item) => item.id !== truck.id);
    updateTrucks(next);
    setSelectedTruckId(next[0]?.id ?? "");
    showMessage(`${truck.id} deleted from fleet database.`);
  }

  function scheduleMaintenance() {
    if (!selectedTruck) return;

    const now = formatNow();

    const next = allTrucks.map((truck) => {
      if (truck.id !== selectedTruck.id) return truck;

      return {
        ...truck,
        status: "Maintenance" as ManagedTruck["status"],
        lastServiceDate: now,
        maintenanceNote,
      };
    });

    updateTrucks(next);
    setModal(null);
    showMessage(`${selectedTruck.id} marked for maintenance.`);
  }

  function markActive(truck: ManagedTruck) {
    const now = formatNow();

    const next = allTrucks.map((item) => {
      if (item.id !== truck.id) return item;

      return {
        ...item,
        status: "Active" as ManagedTruck["status"],
        lastServiceDate: now,
        maintenanceNote: undefined,
      };
    });

    updateTrucks(next);
    showMessage(`${truck.id} marked as active.`);
  }

  function assignAllTrucksToRoutes() {
    const next = allTrucks.map((truck) => {
      const suggested = getSuggestedStart(
        truck.zoneAssigned as "East Campus" | "West Campus"
      );

      return {
        ...truck,
        routeAssigned:
          truck.zoneAssigned === "West Campus" ? "West Route" : "East Route",
        startLat: Number(suggested.lat),
        startLng: Number(suggested.lng),
      };
    });

    updateTrucks(next);

    localStorage.setItem(
      "adminTruckRouteAssignments",
      JSON.stringify(
        next.map((truck) => ({
          truckId: truck.id,
          routeAssigned: truck.routeAssigned ?? "Unassigned",
          zoneAssigned: truck.zoneAssigned,
          startLat: truck.startLat,
          startLng: truck.startLng,
        }))
      )
    );

    setModal(null);
    showMessage("All trucks assigned to their zone routes.");
  }

  function resetDemoChanges() {
    const ok = window.confirm("Reset truck demo changes?");
    if (!ok) return;

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("adminTruckRouteAssignments");

    const reset = initialTrucks as ManagedTruck[];
    setAllTrucks(reset);
    setSelectedTruckId(reset[0]?.id ?? "");
    showMessage("Truck demo changes were reset.");
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-[1500px] px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          <AdminSidebar />

          <section className="col-span-12 lg:col-span-7">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-1 text-xs text-gray-700">
                    Admin › Truck Fleet Database
                  </div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    Truck Fleet Database
                  </h1>
                  <p className="mt-1 text-xs text-gray-500">
                    Manage truck records, route assignment, depot start points, and
                    operational status.
                  </p>
                </div>

                <button
                  onClick={openAddModal}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  + Add New Truck
                </button>
              </div>

              {message && (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {message}
                </div>
              )}

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
                <StatCard label="Total Trucks" value={String(stats.total)} />
                <StatCard label="Active" value={String(stats.active)} />
                <StatCard label="Maintenance" value={String(stats.maintenance)} />
                <StatCard
                  label="Fleet Capacity"
                  value={`${stats.totalCapacity} kg`}
                />
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-4">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search trucks..."
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-200 xl:col-span-2"
                />

                <select
                  value={zoneFilter}
                  onChange={(e) => setZoneFilter(e.target.value as ZoneFilter)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="ALL">All Zones</option>
                  <option value="East Campus">East Campus</option>
                  <option value="West Campus">West Campus</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Maintenance">Maintenance</option>
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
                      <th className="px-4 py-3 text-left font-semibold">Fuel</th>
                      <th className="px-4 py-3 text-left font-semibold">Zone</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
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
                            ? "bg-emerald-50/50"
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
                        <td className="px-4 py-4 text-gray-700">
                          {truck.fuelType}
                        </td>
                        <td className="px-4 py-4 text-gray-700">
                          {truck.zoneAssigned}
                        </td>
                        <td className="px-4 py-4">
                          <TruckStatusPill status={truck.status} />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(truck);
                              }}
                              className="rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openAssignModal(truck);
                              }}
                              className="rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              Assign
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredTrucks.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-6 text-center text-gray-500"
                        >
                          No trucks found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

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
                  <InfoRow
                    label="Capacity"
                    value={`${selectedTruck.capacityKg} kg`}
                  />
                  <InfoRow label="Fuel Type" value={selectedTruck.fuelType} />
                  <InfoRow
                    label="Zone Assigned"
                    value={selectedTruck.zoneAssigned}
                  />
                  <InfoRow
                    label="Operational Status"
                    value={selectedTruck.status}
                  />

                  <div className="border-t pt-4">
                    <InfoRow
                      label="Route Assigned"
                      value={selectedTruck.routeAssigned ?? "Not Assigned"}
                    />
                    <InfoRow
                      label="Start Location"
                      value={`${Number(selectedTruck.startLat).toFixed(
                        6
                      )}, ${Number(selectedTruck.startLng).toFixed(6)}`}
                    />
                    <InfoRow
                      label="Driver"
                      value={selectedTruck.driverName ?? "Not Assigned"}
                    />
                    <InfoRow
                      label="Plate Number"
                      value={selectedTruck.plateNumber ?? "Not Added"}
                    />
                  </div>

                  {selectedTruck.maintenanceNote && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
                      <div className="font-bold">Maintenance Note</div>
                      <div className="mt-1">{selectedTruck.maintenanceNote}</div>
                      <div className="mt-1 text-xs">
                        Last service: {selectedTruck.lastServiceDate}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => openEditModal(selectedTruck)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
                    >
                      Edit Truck Details
                    </button>

                    <button
                      onClick={() => openAssignModal(selectedTruck)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
                    >
                      Assign Truck to Route
                    </button>

                    <button
                      onClick={() => {
                        setMaintenanceNote("Routine inspection");
                        setModal("maintenance");
                      }}
                      className="w-full rounded-lg border border-amber-200 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50"
                    >
                      Mark for Maintenance
                    </button>

                    <button
                      onClick={() => markActive(selectedTruck)}
                      className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      Mark as Active
                    </button>

                    <button
                      onClick={() => deleteTruck(selectedTruck)}
                      className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                    >
                      Delete Truck
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
                <button
                  onClick={() => exportFleetCsv(filteredTrucks)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
                >
                  Export Fleet CSV
                </button>

                <button
                  onClick={() => window.print()}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
                >
                  Print Fleet Report
                </button>

                <button
                  onClick={() => setModal("depot")}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
                >
                  View Depot Assignment
                </button>

                <button
                  onClick={() => setModal("bulkAssign")}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
                >
                  Assign Trucks to Routes
                </button>

                <button
                  onClick={openAddModal}
                  className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Register New Truck
                </button>

                <button
                  onClick={resetDemoChanges}
                  className="w-full rounded-lg bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-black"
                >
                  Reset Demo Changes
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {(modal === "add" || modal === "edit") && (
        <Modal
          title={modal === "add" ? "Add New Truck" : "Edit Truck Details"}
          onClose={() => setModal(null)}
        >
          <TruckFormView
            form={form}
            updateForm={updateForm}
            formError={formError}
            mode={modal}
          />

          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setModal(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-900 hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              onClick={saveTruckForm}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Save Truck
            </button>
          </div>
        </Modal>
      )}

      {modal === "assign" && selectedTruck && (
        <Modal
          title={`Assign Truck to Route — ${selectedTruck.id}`}
          onClose={() => setModal(null)}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Route Assigned">
              <select
                value={form.routeAssigned || "Unassigned"}
                onChange={(e) => updateForm("routeAssigned", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              >
                {routeOptions.map((route) => (
                  <option key={route} value={route}>
                    {route}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Zone Assigned">
              <select
                value={form.zoneAssigned}
                onChange={(e) =>
                  updateForm(
                    "zoneAssigned",
                    e.target.value as TruckForm["zoneAssigned"]
                  )
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              >
                <option value="East Campus">East Campus</option>
                <option value="West Campus">West Campus</option>
              </select>
            </Field>

            <Field label="Start Latitude">
              <input
                value={form.startLat}
                onChange={(e) => updateForm("startLat", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </Field>

            <Field label="Start Longitude">
              <input
                value={form.startLng}
                onChange={(e) => updateForm("startLng", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </Field>
          </div>

          <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
            This assignment is saved locally and can be read later by routing pages
            through <strong>adminTruckRouteAssignments</strong>.
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setModal(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-900 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={saveRouteAssignment}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Save Assignment
            </button>
          </div>
        </Modal>
      )}

      {modal === "depot" && (
        <Modal title="Depot Assignment" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <DepotBox label="Depot Name" value={depotInfo.name} />
            <DepotBox label="East Truck Start" value={depotInfo.eastStart} />
            <DepotBox label="West Truck Start" value={depotInfo.westStart} />
            <DepotBox label="Landfill Location" value={depotInfo.landfill} />
          </div>

          <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            These points match the routing configuration used in BinTwin route
            generation.
          </div>
        </Modal>
      )}

      {modal === "bulkAssign" && (
        <Modal title="Assign Trucks to Routes" onClose={() => setModal(null)}>
          <div className="space-y-3">
            {allTrucks.map((truck) => (
              <div
                key={truck.id}
                className="rounded-xl border border-gray-200 bg-gray-50 p-4"
              >
                <div className="font-bold text-gray-900">
                  {truck.id} — {truck.name}
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  {truck.zoneAssigned} →{" "}
                  {truck.zoneAssigned === "West Campus"
                    ? "West Route"
                    : "East Route"}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setModal(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-900 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={assignAllTrucksToRoutes}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Confirm Assignment
            </button>
          </div>
        </Modal>
      )}

      {modal === "maintenance" && selectedTruck && (
        <Modal
          title={`Schedule Maintenance — ${selectedTruck.id}`}
          onClose={() => setModal(null)}
        >
          <Field label="Maintenance Reason">
            <select
              value={maintenanceNote}
              onChange={(e) => setMaintenanceNote(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option>Routine inspection</option>
              <option>Truck capacity check</option>
              <option>Fuel system inspection</option>
              <option>Route equipment maintenance</option>
              <option>Driver reported issue</option>
            </select>
          </Field>

          <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            This will set the truck status to <strong>Maintenance</strong>.
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setModal(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-900 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={scheduleMaintenance}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              Schedule
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function TruckFormView({
  form,
  updateForm,
  formError,
  mode,
}: {
  form: TruckForm;
  updateForm: <K extends keyof TruckForm>(key: K, value: TruckForm[K]) => void;
  formError: string;
  mode: "add" | "edit";
}) {
  return (
    <div>
      {formError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {formError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Truck ID">
          <input
            value={form.id}
            onChange={(e) => updateForm("id", e.target.value)}
            disabled={mode === "edit"}
            placeholder="e.g., TRK003"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-gray-100"
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

        <Field label="Type">
          <select
            value={form.type}
            onChange={(e) => updateForm("type", e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="Collection Truck">Collection Truck</option>
            <option value="Maintenance Truck">Maintenance Truck</option>
          </select>
        </Field>

        <Field label="Fuel Type">
          <select
            value={form.fuelType}
            onChange={(e) =>
              updateForm("fuelType", e.target.value as TruckForm["fuelType"])
            }
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
              updateForm(
                "zoneAssigned",
                e.target.value as TruckForm["zoneAssigned"]
              )
            }
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="East Campus">East Campus</option>
            <option value="West Campus">West Campus</option>
          </select>
        </Field>

        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) =>
              updateForm("status", e.target.value as TruckForm["status"])
            }
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Maintenance">Maintenance</option>
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

        <Field label="Route Assigned">
          <select
            value={form.routeAssigned || "Unassigned"}
            onChange={(e) => updateForm("routeAssigned", e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
          >
            {routeOptions.map((route) => (
              <option key={route} value={route}>
                {route}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Start Latitude">
          <input
            value={form.startLat}
            onChange={(e) => updateForm("startLat", e.target.value)}
            placeholder="e.g., 26.397820"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </Field>

        <Field label="Start Longitude">
          <input
            value={form.startLng}
            onChange={(e) => updateForm("startLng", e.target.value)}
            placeholder="e.g., 50.204268"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </Field>

        <Field label="Plate Number">
          <input
            value={form.plateNumber}
            onChange={(e) => updateForm("plateNumber", e.target.value)}
            placeholder="Optional"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </Field>

        <Field label="Driver Name">
          <input
            value={form.driverName}
            onChange={(e) => updateForm("driverName", e.target.value)}
            placeholder="Optional"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </Field>
      </div>
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

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value}</span>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function DepotBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-2 font-bold text-gray-900">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-gray-800">{label}</div>
      {children}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-1 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}