"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardMap from "@/components/DashboardMap";
import BinDetailsDrawer from "@/components/BinDetailsDrawer";
import DataSourceToggle from "@/components/DataSourceToggle";
import DataTimelineControls from "@/components/DataTimelineControls";

import {
  loadBinsFromSource,
  loadDataRange,
  splitDateTimeForInputs,
  combineDateAndTime,
  clampDateTimeToRange,
  type UnifiedBinRecord,
  type DataSourceMode,
} from "@/lib/binsData";

import type { BinPoint } from "@/lib/bins";

type ZoneFilter = "All" | "East" | "West";
type ViewFilter = "all" | "threshold" | "forecast" | "urgent";
type RiskLevel = "Low" | "Medium" | "High";

function formatPct(value?: number) {
  if (value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shiftMinutes(value: string, minutes: number) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

function trendLabel(direction?: "up" | "down" | "flat", delta?: number) {
  if (direction === "up") return `↑ ${Math.abs(delta ?? 0).toFixed(1)}%`;
  if (direction === "down") return `↓ ${Math.abs(delta ?? 0).toFixed(1)}%`;
  return `→ ${(delta ?? 0).toFixed(1)}%`;
}

function getRiskLevel(fillPct?: number): RiskLevel {
  const fill = fillPct ?? 0;

  if (fill >= 80) return "High";
  if (fill >= 60) return "Medium";

  return "Low";
}

function getStatusLabel(fillPct?: number) {
  const risk = getRiskLevel(fillPct);

  if (risk === "High") return "High Risk";
  if (risk === "Medium") return "Medium Risk";

  return "Low Risk";
}

function riskBadgeClass(risk: RiskLevel) {
  if (risk === "High") return "bg-red-100 text-red-800";
  if (risk === "Medium") return "bg-amber-100 text-amber-800";

  return "bg-emerald-100 text-emerald-800";
}

function trendBadgeClass(direction?: "up" | "down" | "flat") {
  if (direction === "up") return "bg-red-100 text-red-700";
  if (direction === "down") return "bg-blue-100 text-blue-700";

  return "bg-gray-100 text-gray-700";
}

export default function BinsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [dataMode, setDataMode] = useState<DataSourceMode>("synthetic");
  const [bins, setBins] = useState<UnifiedBinRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [minTimestamp, setMinTimestamp] = useState<string | null>(null);
  const [maxTimestamp, setMaxTimestamp] = useState<string | null>(null);
  const [selectedDateTime, setSelectedDateTime] = useState<string>("");

  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>("All");
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
  const [serviceThreshold, setServiceThreshold] = useState(70);
  const [showMapBins, setShowMapBins] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRangeFirst() {
      setLoading(true);

      const range = await loadDataRange(dataMode);

      if (cancelled) return;

      setMinTimestamp(range.minTimestamp);
      setMaxTimestamp(range.maxTimestamp);

      const initial = range.maxTimestamp ?? "";
      setSelectedDateTime(initial);
    }

    loadRangeFirst();

    return () => {
      cancelled = true;
    };
  }, [dataMode]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);

      const data = await loadBinsFromSource(dataMode, selectedDateTime);

      if (!cancelled) {
        setBins(data);
        setLoading(false);
      }
    }

    if (selectedDateTime) {
      run();
    }

    return () => {
      cancelled = true;
    };
  }, [dataMode, selectedDateTime]);

  const { date: selectedDate, time: selectedTime } =
    splitDateTimeForInputs(selectedDateTime);

  const filteredBins = useMemo(() => {
    return bins.filter((bin) => {
      const currentFill = bin.currentFillPct ?? 0;
      const forecastFill = bin.forecastFillPct ?? 0;
      const side = String(bin.side ?? "");

      const zoneMatch =
        zoneFilter === "All" ||
        side.toLowerCase() === zoneFilter.toLowerCase();

      if (!zoneMatch) return false;

      if (viewFilter === "threshold") {
        return currentFill >= serviceThreshold;
      }

      if (viewFilter === "forecast") {
        return forecastFill >= serviceThreshold;
      }

      if (viewFilter === "urgent") {
        return currentFill >= 80 || forecastFill >= 80;
      }

      return true;
    });
  }, [bins, zoneFilter, viewFilter, serviceThreshold]);

  useEffect(() => {
    if (!selectedId) return;

    const stillVisible = filteredBins.some((bin) => bin.id === selectedId);

    if (!stillVisible) {
      setSelectedId(null);
    }
  }, [filteredBins, selectedId]);

  const legacyBins: BinPoint[] = useMemo(
    () =>
      (showMapBins ? filteredBins : []).map((bin) => ({
        id: bin.id,
        placeName: bin.placeName,
        side: bin.side,
        lat: bin.lat,
        lng: bin.lng,
        fillPct: Number((bin.currentFillPct ?? 0).toFixed(1)),
        buildingNumber: bin.buildingNumber,
        binNumber: bin.binNumber,
        lastUpdate: bin.currentTimestamp ?? "",
      })),
    [filteredBins, showMapBins]
  );

  const selectedBin: UnifiedBinRecord | null = useMemo(
    () => bins.find((b) => b.id === selectedId) ?? null,
    [selectedId, bins]
  );

  const totalShownBins = filteredBins.length;

  const urgentBins = filteredBins.filter(
    (b) => (b.currentFillPct ?? 0) >= 80
  ).length;

  const aboveThreshold = filteredBins.filter(
    (b) => (b.currentFillPct ?? 0) >= serviceThreshold
  ).length;

  const forecastedToExceed = filteredBins.filter(
    (b) => (b.forecastFillPct ?? 0) >= serviceThreshold
  ).length;

  const avgFill =
    filteredBins.length > 0
      ? (
          filteredBins.reduce((sum, b) => sum + (b.currentFillPct ?? 0), 0) /
          filteredBins.length
        ).toFixed(1)
      : "0.0";

  const highRiskPct =
    filteredBins.length > 0
      ? Math.round((urgentBins / filteredBins.length) * 100)
      : 0;

  function setCombinedDateTime(date: string, time: string) {
    const next = combineDateAndTime(date, time);
    const clamped = clampDateTimeToRange(next, minTimestamp, maxTimestamp);
    setSelectedDateTime(clamped);
  }

  function clearFilters() {
    setZoneFilter("All");
    setViewFilter("all");
    setServiceThreshold(70);
    setShowMapBins(true);
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 text-slate-900">
      <div className="mx-auto max-w-[1500px] px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          <aside className="col-span-12 lg:col-span-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Bin Controls
              </h2>

              <div className="mt-5 space-y-5">
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Zone view
                  </label>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(["All", "East", "West"] as ZoneFilter[]).map((zone) => (
                      <button
                        key={zone}
                        onClick={() => setZoneFilter(zone)}
                        className={
                          "rounded-xl px-3 py-2 text-sm font-semibold transition " +
                          (zoneFilter === zone
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200")
                        }
                      >
                        {zone}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Bin view
                  </label>

                  <select
                    value={viewFilter}
                    onChange={(event) =>
                      setViewFilter(event.target.value as ViewFilter)
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="all">All bins</option>
                    <option value="threshold">Currently above threshold</option>
                    <option value="forecast">Forecasted to exceed threshold</option>
                    <option value="urgent">Urgent bins only</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700">
                      Service threshold
                    </label>

                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                      {serviceThreshold}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min={50}
                    max={90}
                    step={5}
                    value={serviceThreshold}
                    onChange={(event) =>
                      setServiceThreshold(Number(event.target.value))
                    }
                    className="mt-3 w-full accent-emerald-500"
                  />

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Used to count bins that need collection now or are predicted
                    to exceed the threshold.
                  </p>
                </div>

                <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700">
                  <span>Show bins on map</span>

                  <button
                    type="button"
                    onClick={() => setShowMapBins((prev) => !prev)}
                    className={
                      "relative inline-flex h-6 w-11 items-center rounded-full transition " +
                      (showMapBins ? "bg-emerald-500" : "bg-slate-300")
                    }
                  >
                    <span
                      className={
                        "inline-block h-5 w-5 transform rounded-full bg-white transition " +
                        (showMapBins ? "translate-x-5" : "translate-x-1")
                      }
                    />
                  </button>
                </label>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Current filter result</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">
                    {totalShownBins}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    bins shown from {bins.length} total bins
                  </div>
                </div>

                <button
                  onClick={clearFilters}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </aside>

          <section className="col-span-12 lg:col-span-9 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xl font-bold text-slate-900">
                  Bins ({dataMode === "real" ? "Real + Forecast" : "Synthetic"})
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Showing {totalShownBins} bins • Zone: {zoneFilter} • Threshold:{" "}
                  {serviceThreshold}%
                </p>
              </div>

              <DataSourceToggle value={dataMode} onChange={setDataMode} />
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <KpiCard
                label="Bins Shown"
                value={totalShownBins}
                sub="after active filters"
              />

              <KpiCard
                label="Urgent Bins"
                value={urgentBins}
                sub="fill level ≥ 80%"
                accent="red"
              />

              <KpiCard
                label="Above Threshold"
                value={aboveThreshold}
                sub={`current fill ≥ ${serviceThreshold}%`}
              />

              <KpiCard
                label="Average Fill Level"
                value={`${avgFill}%`}
                sub={`${highRiskPct}% urgent share`}
              />

              <KpiCard
                label="Predicted to Exceed"
                value={forecastedToExceed}
                sub={`forecast ≥ ${serviceThreshold}%`}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <DashboardMap
                bins={legacyBins}
                onBinSelect={(id) => setSelectedId(id)}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-base font-bold text-slate-900">
                    Bin Inventory
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {loading
                      ? "Loading..."
                      : "Click a row or map marker to view bin details"}
                  </div>
                </div>

                <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  {dataMode === "real" ? "Real Data" : "Synthetic Data"}
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <TableHead>Bin ID</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Zone</TableHead>
                      <TableHead>Current Fill</TableHead>
                      <TableHead>Forecast Fill</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Trend</TableHead>
                      <TableHead>Updated</TableHead>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredBins.map((bin) => {
                      const currentFill = bin.currentFillPct;
                      const forecastFill = bin.forecastFillPct;
                      const risk = getRiskLevel(currentFill);

                      return (
                        <tr
                          key={bin.id}
                          className={
                            "cursor-pointer bg-white hover:bg-emerald-50/60 " +
                            (selectedId === bin.id ? "bg-emerald-50" : "")
                          }
                          onClick={() => setSelectedId(bin.id)}
                        >
                          <td className="px-4 py-3 font-bold text-slate-900">
                            {bin.id}
                          </td>

                          <td className="px-4 py-3 text-slate-800">
                            {bin.placeName}
                          </td>

                          <td className="px-4 py-3 text-slate-800">
                            {bin.side}
                          </td>

                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {formatPct(currentFill)}
                          </td>

                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {formatPct(forecastFill)}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={
                                "inline-flex items-center rounded-full px-2 py-1 text-xs font-bold " +
                                riskBadgeClass(risk)
                              }
                            >
                              {bin.currentStatus ?? getStatusLabel(currentFill)}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={
                                "inline-flex rounded-full px-2 py-1 text-xs font-bold " +
                                trendBadgeClass(bin.trendDirection)
                              }
                            >
                              {trendLabel(bin.trendDirection, bin.trendDelta)}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-slate-700">
                            {formatDateTime(bin.currentTimestamp)}
                          </td>
                        </tr>
                      );
                    })}

                    {loading && (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-8 text-center text-sm text-slate-500"
                        >
                          Loading bins...
                        </td>
                      </tr>
                    )}

                    {!loading && filteredBins.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-8 text-center text-sm text-slate-500"
                        >
                          No bins match the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>

      <BinDetailsDrawer
        bin={selectedBin}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent = "green",
}: {
  label: string;
  value: number | string;
  sub: string;
  accent?: "green" | "red";
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className={
          "mb-3 h-1 w-20 rounded-full " +
          (accent === "red" ? "bg-red-400" : "bg-emerald-400")
        }
      />

      <div className="text-xs font-medium text-slate-500">{label}</div>

      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>

      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}