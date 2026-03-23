"use client";

import { useMemo, useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { mockTrucks, type TruckRecord } from "@/lib/admin/trucksData";

export default function AdminTrucksPage() {
  const [search, setSearch] = useState("");
  const [selectedTruckId, setSelectedTruckId] = useState<string>(mockTrucks[0]?.id ?? "");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const filteredTrucks = useMemo(() => {
    const q = search.trim().toLowerCase();

    return mockTrucks.filter((truck) => {
      const matchesSearch =
        !q ||
        truck.id.toLowerCase().includes(q) ||
        truck.zoneAssigned.toLowerCase().includes(q) ||
        truck.fuelType.toLowerCase().includes(q) ||
        truck.type.toLowerCase().includes(q);

      const matchesType =
        typeFilter === "ALL" ? true : truck.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [search, typeFilter]);

  const selectedTruck =
    filteredTrucks.find((truck) => truck.id === selectedTruckId) ||
    mockTrucks.find((truck) => truck.id === selectedTruckId) ||
    filteredTrucks[0] ||
    mockTrucks[0];

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

                <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
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
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="ALL">Filter by Type</option>
                  <option value="Heavy Duty">Heavy Duty</option>
                  <option value="Medium Duty">Medium Duty</option>
                  <option value="Light Duty">Light Duty</option>
                </select>
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Truck ID</th>
                      <th className="px-4 py-3 text-left font-semibold">Type</th>
                      <th className="px-4 py-3 text-left font-semibold">Capacity</th>
                      <th className="px-4 py-3 text-left font-semibold">Fuel Type</th>
                      <th className="px-4 py-3 text-left font-semibold">Zone Assigned</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Last Maintenance</th>
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
                        <td className="px-4 py-4 text-gray-700">{truck.type}</td>
                        <td className="px-4 py-4 text-gray-700">{truck.capacityTons} Tons</td>
                        <td className="px-4 py-4 text-gray-700">{truck.fuelType}</td>
                        <td className="px-4 py-4 text-gray-700">{truck.zoneAssigned}</td>
                        <td className="px-4 py-4">
                          <TruckStatusPill status={truck.status} />
                        </td>
                        <td className="px-4 py-4 text-gray-700">{truck.lastMaintenance}</td>
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
                  <InfoRow label="Type" value={selectedTruck.type} />
                  <InfoRow label="Capacity" value={`${selectedTruck.capacityTons} Tons`} />
                  <InfoRow label="Fuel Type" value={selectedTruck.fuelType} />
                  <InfoRow label="Zone Assigned" value={selectedTruck.zoneAssigned} />
                  <InfoRow label="Operational Status" value={selectedTruck.status} />

                  <div className="border-t pt-4">
                    <InfoRow label="Route Assigned" value={selectedTruck.routeAssigned} />
                    <InfoRow label="Max Daily Hours" value={selectedTruck.maxDailyHours} />
                    <InfoRow label="Odometer" value={`${selectedTruck.odometerKm.toLocaleString()} km`} />
                    <InfoRow label="Last Inspection" value={selectedTruck.lastInspection} />
                    <InfoRow label="Next Inspection Due" value={selectedTruck.nextInspectionDue} />
                  </div>

                  <div className="space-y-2 pt-2">
                    <button className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
                      Edit Truck Details
                    </button>
                    <button className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
                      View Maintenance History
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
                  Open Maintenance Log
                </button>
                <button className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
                  Assign Trucks to Routes
                </button>
                <button className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
                  Register New Truck
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function TruckStatusPill({ status }: { status: TruckRecord["status"] }) {
  const cls =
    status === "Active"
      ? "bg-emerald-50 text-emerald-700"
      : status === "Maintenance Due"
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