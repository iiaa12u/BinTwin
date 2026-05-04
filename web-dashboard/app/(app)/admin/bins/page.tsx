"use client";

import { useEffect, useMemo, useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import DataSourceToggle from "@/components/DataSourceToggle";
import DataTimelineControls from "@/components/DataTimelineControls";

import {
  loadBinsFromSource,
  loadDataRange,
  splitDateTimeForInputs,
  combineDateAndTime,
  clampDateTimeToRange,
  type DataSourceMode,
  type UnifiedBinRecord,
} from "@/lib/binsData";

type ZoneFilter = "ALL" | "East" | "West";
type StatusFilter = "ALL" | "Active" | "Maintenance Due" | "Offline";

function formatPct(value?: number) {
  if (value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function shiftMinutes(value: string, minutes: number) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

function getOperationalStatus(bin: UnifiedBinRecord): StatusFilter {
  const fill = bin.currentFillPct ?? 0;

  if (!bin.currentTimestamp) return "Offline";
  if (fill >= 90) return "Maintenance Due";
  return "Active";
}

function getRiskIndicator(bin: UnifiedBinRecord) {
  const fill = bin.currentFillPct ?? 0;
  const forecast = bin.forecastFillPct ?? 0;

  if (fill >= 80 || forecast >= 80) return "High";
  if (fill >= 60 || forecast >= 60) return "Medium";
  return "Low";
}

export default function AdminBinsPage() {
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [selectedBinId, setSelectedBinId] = useState<string>("");

  const [dataMode, setDataMode] = useState<DataSourceMode>("synthetic");
  const [bins, setBins] = useState<UnifiedBinRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [minTimestamp, setMinTimestamp] = useState<string | null>(null);
  const [maxTimestamp, setMaxTimestamp] = useState<string | null>(null);
  const [selectedDateTime, setSelectedDateTime] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function loadRange() {
      const range = await loadDataRange(dataMode);
      if (cancelled) return;

      setMinTimestamp(range.minTimestamp);
      setMaxTimestamp(range.maxTimestamp);
      setSelectedDateTime(range.maxTimestamp ?? "");
    }

    loadRange();

    return () => {
      cancelled = true;
    };
  }, [dataMode]);

  useEffect(() => {
    let cancelled = false;

    async function loadBins() {
      if (!selectedDateTime) return;

      setLoading(true);
      const data = await loadBinsFromSource(dataMode, selectedDateTime);

      if (!cancelled) {
        setBins(data);
        setLoading(false);

        if (data.length > 0) {
          setSelectedBinId((prev) =>
            data.some((bin) => bin.id === prev) ? prev : data[0].id
          );
        }
      }
    }

    loadBins();

    return () => {
      cancelled = true;
    };
  }, [dataMode, selectedDateTime]);

  const { date: selectedDate, time: selectedTime } =
    splitDateTimeForInputs(selectedDateTime);

  function setCombinedDateTime(date: string, time: string) {
    const next = combineDateAndTime(date, time);
    const clamped = clampDateTimeToRange(next, minTimestamp, maxTimestamp);
    setSelectedDateTime(clamped);
  }

  const filteredBins = useMemo(() => {
    const q = search.trim().toLowerCase();

    return bins.filter((bin) => {
      const status = getOperationalStatus(bin);

      const matchesSearch =
        !q ||
        bin.id.toLowerCase().includes(q) ||
        bin.binNumber.toLowerCase().includes(q) ||
        bin.placeName.toLowerCase().includes(q) ||
        bin.buildingNumber.toLowerCase().includes(q);

      const matchesZone = zoneFilter === "ALL" ? true : bin.side === zoneFilter;
      const matchesStatus = statusFilter === "ALL" ? true : status === statusFilter;

      return matchesSearch && matchesZone && matchesStatus;
    });
  }, [bins, search, zoneFilter, statusFilter]);

  const selectedBin =
    filteredBins.find((bin) => bin.id === selectedBinId) ||
    bins.find((bin) => bin.id === selectedBinId) ||
    filteredBins[0] ||
    bins[0];

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
                    Bins Database ({dataMode === "real" ? "Real + Forecast" : "Synthetic"})
                  </h1>
                </div>

                <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                  + Add New Bin
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <DataSourceToggle value={dataMode} onChange={setDataMode} />

                  <div className="text-xs text-gray-500">
                    {loading ? "Loading bins..." : `${bins.length} bin(s) loaded`}
                  </div>
                </div>

                <DataTimelineControls
                  loading={loading}
                  minTimestamp={minTimestamp}
                  maxTimestamp={maxTimestamp}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  onDateChange={(date) => setCombinedDateTime(date, selectedTime)}
                  onTimeChange={(time) => setCombinedDateTime(selectedDate, time)}
                  onJumpStart={() =>
                    minTimestamp && setSelectedDateTime(minTimestamp)
                  }
                  onJumpLatest={() =>
                    maxTimestamp && setSelectedDateTime(maxTimestamp)
                  }
                  onStepBack={() =>
                    setSelectedDateTime((prev) =>
                      clampDateTimeToRange(
                        shiftMinutes(prev, -15),
                        minTimestamp,
                        maxTimestamp
                      )
                    )
                  }
                  onStepForward={() =>
                    setSelectedDateTime((prev) =>
                      clampDateTimeToRange(
                        shiftMinutes(prev, 15),
                        minTimestamp,
                        maxTimestamp
                      )
                    )
                  }
                />
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
                  onChange={(e) => setZoneFilter(e.target.value as ZoneFilter)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="ALL">Filter by Zone</option>
                  <option value="East">East</option>
                  <option value="West">West</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
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
                      <th className="px-4 py-3 text-left font-semibold">Zone</th>
                      <th className="px-4 py-3 text-left font-semibold">Sensor Type</th>
                      <th className="px-4 py-3 text-left font-semibold">Battery</th>
                      <th className="px-4 py-3 text-left font-semibold">Current Fill</th>
                      <th className="px-4 py-3 text-left font-semibold">Forecast</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredBins.map((bin) => {
                      const status = getOperationalStatus(bin);

                      return (
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
                          <td className="px-4 py-4 text-gray-700">
                            {bin.placeName}
                          </td>
                          <td className="px-4 py-4 text-gray-700">{bin.side}</td>
                          <td className="px-4 py-4 text-gray-700">
                            Ultrasonic
                          </td>
                          <td className="px-4 py-4 text-gray-700">
                            {dataMode === "real" ? "Solar-powered" : "Simulated"}
                          </td>
                          <td className="px-4 py-4 text-gray-700">
                            {formatPct(bin.currentFillPct)}
                          </td>
                          <td className="px-4 py-4 text-gray-700">
                            {dataMode === "real" ? formatPct(bin.forecastFillPct) : "—"}
                          </td>
                          <td className="px-4 py-4">
                            <BinStatusPill status={status} />
                          </td>
                          <td className="px-4 py-4 text-right text-gray-500">⋮</td>
                        </tr>
                      );
                    })}

                    {filteredBins.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-6 text-center text-gray-500"
                        >
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
                      <InfoRow label="Building" value={selectedBin.buildingNumber} />
                      <InfoRow label="Bin Label" value={selectedBin.binNumber} />
                      <InfoRow label="Zone" value={selectedBin.side} />
                      <InfoRow label="Data Source" value={dataMode} />
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 text-sm font-semibold text-gray-900">
                      Sensor Info
                    </div>
                    <div className="space-y-2 text-sm">
                      <InfoRow label="Sensor Type" value="Ultrasonic" />
                      <InfoRow
                        label="Last Communication"
                        value={selectedBin.currentTimestamp || "—"}
                      />
                      <InfoRow
                        label="Power Source"
                        value={
                          dataMode === "real"
                            ? "Solar-powered sensing frame"
                            : "Simulated"
                        }
                      />
                      <InfoRow
                        label="Forecast Available"
                        value={
                          selectedBin.forecastFillPct !== undefined ? "Yes" : "No"
                        }
                      />
                    </div>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-4 text-center">
                    <div className="text-sm font-semibold text-gray-900">
                      Operational Status
                    </div>
                    <div className="mt-2 text-5xl font-bold text-gray-900">
                      {formatPct(selectedBin.currentFillPct)}
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      Current Fill Level
                    </div>

                    <div className="mt-4 space-y-2 text-sm">
                      <InfoRow
                        label="Forecast Fill"
                        value={
                          dataMode === "real"
                            ? formatPct(selectedBin.forecastFillPct)
                            : "—"
                        }
                      />
                      <InfoRow
                        label="Risk Indicator"
                        value={getRiskIndicator(selectedBin)}
                      />
                      <InfoRow
                        label="Recent Issues"
                        value={
                          getOperationalStatus(selectedBin) === "Offline"
                            ? "No recent communication"
                            : "None"
                        }
                      />
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

function BinStatusPill({ status }: { status: StatusFilter }) {
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