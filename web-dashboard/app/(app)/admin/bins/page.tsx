"use client";

import { useMemo, useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { mockBins, type BinRecord } from "@/lib/admin/binsData";

export default function AdminBinsPage() {
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedBinId, setSelectedBinId] = useState<string>(mockBins[0]?.id ?? "");

  const filteredBins = useMemo(() => {
    const q = search.trim().toLowerCase();

    return mockBins.filter((bin) => {
      const matchesSearch =
        !q ||
        bin.id.toLowerCase().includes(q) ||
        bin.placeName.toLowerCase().includes(q) ||
        bin.zoneAssigned.toLowerCase().includes(q);

      const matchesZone = zoneFilter === "ALL" ? true : bin.zoneAssigned === zoneFilter;
      const matchesStatus = statusFilter === "ALL" ? true : bin.status === statusFilter;

      return matchesSearch && matchesZone && matchesStatus;
    });
  }, [search, zoneFilter, statusFilter]);

  const selectedBin =
    filteredBins.find((bin) => bin.id === selectedBinId) ||
    mockBins.find((bin) => bin.id === selectedBinId) ||
    filteredBins[0] ||
    mockBins[0];

  const uniqueZones = Array.from(new Set(mockBins.map((b) => b.zoneAssigned)));

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-[1500px] px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          <AdminSidebar />

          <section className="col-span-12 lg:col-span-7">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-1 text-xs text-gray-700">
                    Admin › Bins Database
                  </div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    Bins Database
                  </h1>
                </div>

                <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                  + Add New Bin
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-4">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-200"
                />

                <select
                  value={zoneFilter}
                  onChange={(e) => setZoneFilter(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="ALL">Filter by Zone</option>
                  {uniqueZones.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="ALL">Filter by Status</option>
                  <option value="Active">Active</option>
                  <option value="Maintenance Due">Maintenance Due</option>
                  <option value="Offline">Offline</option>
                </select>

                <div />
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Bin ID</th>
                      <th className="px-4 py-3 text-left font-semibold">Location</th>
                      <th className="px-4 py-3 text-left font-semibold">Zone Assigned</th>
                      <th className="px-4 py-3 text-left font-semibold">Sensor Type</th>
                      <th className="px-4 py-3 text-left font-semibold">Battery Level</th>
                      <th className="px-4 py-3 text-left font-semibold">Fill Level</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredBins.map((bin) => (
                      <tr
                        key={bin.id}
                        onClick={() => setSelectedBinId(bin.id)}
                        className={
                          "cursor-pointer bg-white transition " +
                          (selectedBin?.id === bin.id
                            ? "bg-emerald-50/40"
                            : "hover:bg-gray-50")
                        }
                      >
                        <td className="px-4 py-4 font-semibold text-gray-900">
                          {bin.id}
                        </td>
                        <td className="px-4 py-4 text-gray-700">{bin.placeName}</td>
                        <td className="px-4 py-4 text-gray-700">{bin.zoneAssigned}</td>
                        <td className="px-4 py-4 text-gray-700">{bin.sensorType}</td>
                        <td className="px-4 py-4 text-gray-700">{bin.batteryLevel}</td>
                        <td className="px-4 py-4 text-gray-700">{bin.currentFillLevel}%</td>
                        <td className="px-4 py-4">
                          <BinStatusPill status={bin.status} />
                        </td>
                        <td className="px-4 py-4 text-right text-gray-500">⋮</td>
                      </tr>
                    ))}

                    {filteredBins.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                          No bins found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-3 text-sm font-semibold text-gray-900">
                  Quick Actions
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
                    Export Bins (CSV/PDF)
                  </button>
                  <button className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
                    Open Maintenance Log
                  </button>
                  <button className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
                    Assign Bins to Routes
                  </button>
                  <button className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-black">
                    Register New Bin
                  </button>
                </div>
              </div>
            </div>
          </section>

          <aside className="col-span-12 lg:col-span-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 text-base font-semibold text-gray-900">
                Selected Bin Overview
              </div>

              {selectedBin ? (
                <div className="space-y-6">
                  <div>
                    <div className="mb-3 text-sm font-semibold text-gray-900">
                      Bin Details
                    </div>
                    <div className="space-y-2 text-sm">
                      <InfoRow label="Bin ID" value={selectedBin.id} />
                      <InfoRow label="Location" value={selectedBin.placeName} />
                      <InfoRow label="Type" value={selectedBin.type} />
                      <InfoRow label="Volume/Capacity" value={selectedBin.volumeCapacity} />
                      <InfoRow label="Zone" value={selectedBin.zoneAssigned} />
                      <InfoRow label="Installation Date" value={selectedBin.installationDate} />
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 text-sm font-semibold text-gray-900">
                      Sensor Info
                    </div>
                    <div className="space-y-2 text-sm">
                      <InfoRow label="Sensor Type" value={selectedBin.sensorType} />
                      <InfoRow label="Last Communication" value={selectedBin.lastCommunication} />
                      <InfoRow label="Battery Level" value={selectedBin.batteryLevel} />
                      <InfoRow label="Signal Strength (RSSI)" value={selectedBin.signalStrength} />
                      <InfoRow label="Firmware Version" value={selectedBin.firmwareVersion} />
                    </div>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-4 text-center">
                    <div className="text-sm font-semibold text-gray-900">
                      Operational Status
                    </div>
                    <div className="mt-2 text-5xl font-bold text-gray-900">
                      {selectedBin.currentFillLevel}%
                    </div>
                    <div className="mt-2 text-sm text-gray-600">Current Fill Level</div>

                    <div className="mt-4 space-y-2 text-sm">
                      <InfoRow label="Risk Indicator" value={selectedBin.riskIndicator} />
                      <InfoRow label="Recent Issues" value={selectedBin.recentIssues} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
                      Edit Bin Details
                    </button>
                    <button className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
                      View Sensor Diagnostics
                    </button>
                    <button className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
                      Open Bin History
                    </button>
                    <button className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
                      Reassign to Zone
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No bin selected.</div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function BinStatusPill({ status }: { status: BinRecord["status"] }) {
  const cls =
    status === "Active"
      ? "bg-emerald-50 text-emerald-700"
      : status === "Maintenance Due"
      ? "bg-amber-50 text-amber-700"
      : "bg-red-50 text-red-700";

  return (
    <span className={"rounded-full px-2 py-1 text-xs font-semibold " + cls}>
      {status}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value}</span>
    </div>
  );
}