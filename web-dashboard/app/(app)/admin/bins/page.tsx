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
type ModalType = "add" | "edit" | "diagnostics" | "history" | "reassign" | "maintenance" | null;

type BinForm = {
  id: string;
  placeName: string;
  buildingNumber: string;
  binNumber: string;
  side: "East" | "West";
  lat: string;
  lng: string;
  currentFillPct: string;
};

type BinOverride = Partial<UnifiedBinRecord> & {
  deleted?: boolean;
};

const STORAGE_KEY = "adminBinsOverrides";

const emptyForm: BinForm = {
  id: "",
  placeName: "",
  buildingNumber: "",
  binNumber: "",
  side: "East",
  lat: "",
  lng: "",
  currentFillPct: "0",
};

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

function safeReadOverrides(): Record<string, BinOverride> {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveOverrides(overrides: Record<string, BinOverride>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

function applyOverrides(
  sourceBins: UnifiedBinRecord[],
  overrides: Record<string, BinOverride>
) {
  const merged = sourceBins
    .filter((bin) => !overrides[bin.id]?.deleted)
    .map((bin) => ({
      ...bin,
      ...overrides[bin.id],
    }));

  const sourceIds = new Set(sourceBins.map((bin) => bin.id));

  const addedBins = Object.entries(overrides)
    .filter(([id, override]) => !sourceIds.has(id) && !override.deleted)
    .map(([, override]) => override as UnifiedBinRecord);

  return [...merged, ...addedBins];
}

function exportCsv(rows: UnifiedBinRecord[]) {
  const headers = [
    "id",
    "placeName",
    "buildingNumber",
    "binNumber",
    "zone",
    "lat",
    "lng",
    "currentFillPct",
    "forecastFillPct",
    "status",
    "lastCommunication",
  ];

  const csvRows = rows.map((bin) => [
    bin.id,
    bin.placeName,
    bin.buildingNumber,
    bin.binNumber,
    bin.side,
    bin.lat,
    bin.lng,
    bin.currentFillPct ?? "",
    bin.forecastFillPct ?? "",
    getOperationalStatus(bin),
    bin.currentTimestamp ?? "",
  ]);

  const csv = [headers, ...csvRows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `bintwin-bins-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AdminBinsPage() {
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [selectedBinId, setSelectedBinId] = useState<string>("");

  const [dataMode, setDataMode] = useState<DataSourceMode>("synthetic");
  const [sourceBins, setSourceBins] = useState<UnifiedBinRecord[]>([]);
  const [overrides, setOverrides] = useState<Record<string, BinOverride>>({});
  const [loading, setLoading] = useState(true);

  const [minTimestamp, setMinTimestamp] = useState<string | null>(null);
  const [maxTimestamp, setMaxTimestamp] = useState<string | null>(null);
  const [selectedDateTime, setSelectedDateTime] = useState<string>("");

  const [modal, setModal] = useState<ModalType>(null);
  const [form, setForm] = useState<BinForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");

  const bins = useMemo(
    () => applyOverrides(sourceBins, overrides),
    [sourceBins, overrides]
  );

  useEffect(() => {
    setOverrides(safeReadOverrides());
  }, []);

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
        setSourceBins(data);
        setLoading(false);

        const merged = applyOverrides(data, safeReadOverrides());

        if (merged.length > 0) {
          setSelectedBinId((prev) =>
            merged.some((bin) => bin.id === prev) ? prev : merged[0].id
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

  function showMessage(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 3000);
  }

  function updateOverrides(next: Record<string, BinOverride>) {
    setOverrides(next);
    saveOverrides(next);
  }

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
        String(bin.id ?? "").toLowerCase().includes(q) ||
        String(bin.binNumber ?? "").toLowerCase().includes(q) ||
        String(bin.placeName ?? "").toLowerCase().includes(q) ||
        String(bin.buildingNumber ?? "").toLowerCase().includes(q);

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

  const stats = useMemo(() => {
    const total = bins.length;
    const active = bins.filter((bin) => getOperationalStatus(bin) === "Active").length;
    const maintenance = bins.filter(
      (bin) => getOperationalStatus(bin) === "Maintenance Due"
    ).length;
    const offline = bins.filter((bin) => getOperationalStatus(bin) === "Offline").length;

    const avgFill =
      bins.length > 0
        ? bins.reduce((sum, bin) => sum + (bin.currentFillPct ?? 0), 0) / bins.length
        : 0;

    return {
      total,
      active,
      maintenance,
      offline,
      avgFill: Number(avgFill.toFixed(1)),
    };
  }, [bins]);

  function openAddModal() {
    setForm({
      ...emptyForm,
      id: `BIN-${String(bins.length + 1).padStart(3, "0")}`,
      binNumber: `B${String(bins.length + 1).padStart(3, "0")}`,
      currentFillPct: "10",
    });
    setFormError("");
    setModal("add");
  }

  function openEditModal(bin: UnifiedBinRecord) {
    setForm({
      id: bin.id,
      placeName: bin.placeName ?? "",
      buildingNumber: bin.buildingNumber ?? "",
      binNumber: bin.binNumber ?? "",
      side: bin.side as "East" | "West",
      lat: String(bin.lat ?? ""),
      lng: String(bin.lng ?? ""),
      currentFillPct: String(bin.currentFillPct ?? 0),
    });
    setFormError("");
    setModal("edit");
  }

  function openReassignModal(bin: UnifiedBinRecord) {
    setForm({
      id: bin.id,
      placeName: bin.placeName ?? "",
      buildingNumber: bin.buildingNumber ?? "",
      binNumber: bin.binNumber ?? "",
      side: bin.side as "East" | "West",
      lat: String(bin.lat ?? ""),
      lng: String(bin.lng ?? ""),
      currentFillPct: String(bin.currentFillPct ?? 0),
    });
    setFormError("");
    setModal("reassign");
  }

  function validateForm() {
    const id = form.id.trim().toUpperCase();
    const placeName = form.placeName.trim();
    const buildingNumber = form.buildingNumber.trim();
    const binNumber = form.binNumber.trim();
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    const currentFillPct = Number(form.currentFillPct);

    if (!id || !placeName || !buildingNumber || !binNumber) {
      return "Bin ID, location, building, and bin label are required.";
    }

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return "Latitude and longitude must be valid numbers.";
    }

    if (Number.isNaN(currentFillPct) || currentFillPct < 0 || currentFillPct > 100) {
      return "Current fill must be between 0 and 100.";
    }

    if (modal === "add" && bins.some((bin) => bin.id === id)) {
      return "This Bin ID already exists.";
    }

    return "";
  }

  function saveBinForm() {
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }

    const id = form.id.trim().toUpperCase();

    const nextBin: BinOverride = {
      id,
      placeName: form.placeName.trim(),
      buildingNumber: form.buildingNumber.trim(),
      binNumber: form.binNumber.trim(),
      side: form.side,
      lat: Number(form.lat),
      lng: Number(form.lng),
      currentFillPct: Number(form.currentFillPct),
      currentTimestamp: selectedDateTime || new Date().toISOString(),
    } as BinOverride;

    const next = {
      ...overrides,
      [id]: {
        ...overrides[id],
        ...nextBin,
        deleted: false,
      },
    };

    updateOverrides(next);
    setSelectedBinId(id);
    setModal(null);
    setFormError("");
    showMessage(modal === "add" ? "New bin added successfully." : "Bin details updated.");
  }

  function saveReassign() {
    if (!selectedBin) return;

    const next = {
      ...overrides,
      [selectedBin.id]: {
        ...overrides[selectedBin.id],
        side: form.side,
      },
    };

    updateOverrides(next);
    setModal(null);
    showMessage(`${selectedBin.id} reassigned to ${form.side} zone.`);
  }

  function deleteSelectedBin() {
    if (!selectedBin) return;

    const ok = window.confirm(`Delete ${selectedBin.id}? This only affects the demo data.`);
    if (!ok) return;

    const next = {
      ...overrides,
      [selectedBin.id]: {
        ...overrides[selectedBin.id],
        deleted: true,
      },
    };

    updateOverrides(next);

    const remaining = bins.filter((bin) => bin.id !== selectedBin.id);
    setSelectedBinId(remaining[0]?.id ?? "");
    showMessage(`${selectedBin.id} deleted from admin view.`);
  }

  function resetDemoChanges() {
    const ok = window.confirm("Reset all Admin/Bins demo changes?");
    if (!ok) return;

    localStorage.removeItem(STORAGE_KEY);
    setOverrides({});
    showMessage("Admin/Bins demo changes were reset.");
  }

  function markMaintenance(bin: UnifiedBinRecord) {
    const next = {
      ...overrides,
      [bin.id]: {
        ...overrides[bin.id],
        currentFillPct: 95,
      },
    };

    updateOverrides(next);
    setSelectedBinId(bin.id);
    showMessage(`${bin.id} marked as Maintenance Due.`);
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
                    Admin › Bins Database
                  </div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    Bins Database ({dataMode === "real" ? "Real + Forecast" : "Synthetic"})
                  </h1>
                  <p className="mt-1 text-xs text-gray-500">
                    Manage bin records, diagnostics, maintenance, and zone assignment.
                  </p>
                </div>

                <button
                  onClick={openAddModal}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  + Add New Bin
                </button>
              </div>

              {message && (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {message}
                </div>
              )}

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
                <StatCard label="Total Bins" value={String(stats.total)} />
                <StatCard label="Active" value={String(stats.active)} />
                <StatCard label="Maintenance" value={String(stats.maintenance)} />
                <StatCard label="Avg. Fill" value={`${stats.avgFill}%`} />
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
                  placeholder="Search by ID, location, building..."
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-200"
                />

                <select
                  value={zoneFilter}
                  onChange={(e) => setZoneFilter(e.target.value as ZoneFilter)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="ALL">All Zones</option>
                  <option value="East">East</option>
                  <option value="West">West</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Maintenance Due">Maintenance Due</option>
                  <option value="Offline">Offline</option>
                </select>

                <button
                  onClick={() => {
                    setSearch("");
                    setZoneFilter("ALL");
                    setStatusFilter("ALL");
                  }}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Clear Filters
                </button>
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Bin ID</th>
                      <th className="px-4 py-3 text-left font-semibold">Location</th>
                      <th className="px-4 py-3 text-left font-semibold">Zone</th>
                      <th className="px-4 py-3 text-left font-semibold">Sensor</th>
                      <th className="px-4 py-3 text-left font-semibold">Power</th>
                      <th className="px-4 py-3 text-left font-semibold">Fill</th>
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
                              ? "bg-emerald-50/60"
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
                          <td className="px-4 py-4 text-gray-700">Ultrasonic</td>
                          <td className="px-4 py-4 text-gray-700">
                            {dataMode === "real" ? "Solar" : "Simulated"}
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
                          <td className="px-4 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(bin);
                                }}
                                className="rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markMaintenance(bin);
                                }}
                                className="rounded-md border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                              >
                                Flag
                              </button>
                            </div>
                          </td>
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
                  <button
                    onClick={() => exportCsv(filteredBins)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
                  >
                    Export Bins CSV
                  </button>

                  <button
                    onClick={() => setModal("maintenance")}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
                  >
                    Open Maintenance Log
                  </button>

                  <button
                    onClick={() => {
                      localStorage.setItem(
                        "adminRouteAssignedBins",
                        JSON.stringify(filteredBins.map((bin) => bin.id))
                      );
                      showMessage("Filtered bins were assigned to route planning list.");
                    }}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
                  >
                    Assign Bins to Routes
                  </button>

                  <button
                    onClick={resetDemoChanges}
                    className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-black"
                  >
                    Reset Demo Changes
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
                        value={selectedBin.forecastFillPct !== undefined ? "Yes" : "No"}
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
                      <InfoRow label="Risk Indicator" value={getRiskIndicator(selectedBin)} />
                      <InfoRow
                        label="Recent Issues"
                        value={
                          getOperationalStatus(selectedBin) === "Offline"
                            ? "No recent communication"
                            : getOperationalStatus(selectedBin) === "Maintenance Due"
                            ? "Fill level requires service"
                            : "None"
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => openEditModal(selectedBin)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
                    >
                      Edit Bin Details
                    </button>
                    <button
                      onClick={() => setModal("diagnostics")}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
                    >
                      View Sensor Diagnostics
                    </button>
                    <button
                      onClick={() => setModal("history")}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
                    >
                      Open Bin History
                    </button>
                    <button
                      onClick={() => openReassignModal(selectedBin)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
                    >
                      Reassign to Zone
                    </button>
                    <button
                      onClick={deleteSelectedBin}
                      className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                    >
                      Delete Bin
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

      {(modal === "add" || modal === "edit") && (
        <Modal
          title={modal === "add" ? "Add New Bin" : "Edit Bin Details"}
          onClose={() => setModal(null)}
        >
          <BinFormView
            form={form}
            setForm={setForm}
            formError={formError}
            mode={modal}
          />

          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={() => setModal(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={saveBinForm}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Save
            </button>
          </div>
        </Modal>
      )}

      {modal === "reassign" && selectedBin && (
        <Modal title={`Reassign ${selectedBin.id}`} onClose={() => setModal(null)}>
          <div>
            <label className="text-sm font-semibold text-gray-700">New Zone</label>
            <select
              value={form.side}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  side: e.target.value as "East" | "West",
                }))
              }
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="East">East</option>
              <option value="West">West</option>
            </select>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={() => setModal(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={saveReassign}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Reassign
            </button>
          </div>
        </Modal>
      )}

      {modal === "diagnostics" && selectedBin && (
        <Modal
          title={`Sensor Diagnostics — ${selectedBin.id}`}
          onClose={() => setModal(null)}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <DiagnosticBox label="Sensor Type" value="Ultrasonic" />
            <DiagnosticBox
              label="Power Source"
              value={dataMode === "real" ? "Solar-powered" : "Simulated"}
            />
            <DiagnosticBox
              label="Signal Status"
              value={getOperationalStatus(selectedBin) === "Offline" ? "No Signal" : "Connected"}
            />
            <DiagnosticBox
              label="Calibration"
              value={getRiskIndicator(selectedBin) === "High" ? "Needs Review" : "Normal"}
            />
            <DiagnosticBox
              label="Current Fill"
              value={formatPct(selectedBin.currentFillPct)}
            />
            <DiagnosticBox
              label="Forecast Fill"
              value={dataMode === "real" ? formatPct(selectedBin.forecastFillPct) : "Not available"}
            />
          </div>

          <div className="mt-5 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
            Diagnostic result: sensor is readable and linked to the selected bin record.
          </div>
        </Modal>
      )}

      {modal === "history" && selectedBin && (
        <Modal title={`Bin History — ${selectedBin.id}`} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <HistoryRow
              title="Latest reading loaded"
              detail={`${formatPct(selectedBin.currentFillPct)} at ${
                selectedBin.currentTimestamp || "current snapshot"
              }`}
            />
            <HistoryRow
              title="Risk assessment"
              detail={`${getRiskIndicator(selectedBin)} risk based on fill and forecast`}
            />
            <HistoryRow
              title="Last admin update"
              detail={
                overrides[selectedBin.id]
                  ? "Edited in Admin demo storage"
                  : "No manual admin edits"
              }
            />
            <HistoryRow
              title="Collection recommendation"
              detail={
                (selectedBin.currentFillPct ?? 0) >= 80
                  ? "Should be prioritized for route planning"
                  : "No immediate collection required"
              }
            />
          </div>
        </Modal>
      )}

      {modal === "maintenance" && (
        <Modal title="Maintenance Log" onClose={() => setModal(null)}>
          <div className="space-y-3">
            {bins
              .filter((bin) => getOperationalStatus(bin) !== "Active")
              .map((bin) => (
                <HistoryRow
                  key={bin.id}
                  title={`${bin.id} — ${getOperationalStatus(bin)}`}
                  detail={`${bin.placeName} • Fill ${formatPct(bin.currentFillPct)} • ${bin.side} Zone`}
                />
              ))}

            {bins.filter((bin) => getOperationalStatus(bin) !== "Active").length === 0 && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                No maintenance issues detected.
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function BinFormView({
  form,
  setForm,
  formError,
  mode,
}: {
  form: BinForm;
  setForm: (updater: (prev: BinForm) => BinForm) => void;
  formError: string;
  mode: "add" | "edit";
}) {
  function update<K extends keyof BinForm>(key: K, value: BinForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div>
      {formError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <FormField label="Bin ID">
          <input
            value={form.id}
            onChange={(e) => update("id", e.target.value)}
            disabled={mode === "edit"}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-gray-100"
          />
        </FormField>

        <FormField label="Location">
          <input
            value={form.placeName}
            onChange={(e) => update("placeName", e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </FormField>

        <FormField label="Building">
          <input
            value={form.buildingNumber}
            onChange={(e) => update("buildingNumber", e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </FormField>

        <FormField label="Bin Label">
          <input
            value={form.binNumber}
            onChange={(e) => update("binNumber", e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </FormField>

        <FormField label="Zone">
          <select
            value={form.side}
            onChange={(e) => update("side", e.target.value as "East" | "West")}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="East">East</option>
            <option value="West">West</option>
          </select>
        </FormField>

        <FormField label="Current Fill %">
          <input
            value={form.currentFillPct}
            onChange={(e) => update("currentFillPct", e.target.value)}
            type="number"
            min={0}
            max={100}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </FormField>

        <FormField label="Latitude">
          <input
            value={form.lat}
            onChange={(e) => update("lat", e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </FormField>

        <FormField label="Longitude">
          <input
            value={form.lng}
            onChange={(e) => update("lng", e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </FormField>
      </div>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
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

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <div className="mb-1 text-sm font-semibold text-gray-700">{label}</div>
      {children}
    </label>
  );
}

function DiagnosticBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-2 font-bold text-gray-900">{value}</div>
    </div>
  );
}

function HistoryRow({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="font-bold text-gray-900">{title}</div>
      <div className="mt-1 text-sm text-gray-600">{detail}</div>
    </div>
  );
}