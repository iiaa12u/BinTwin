"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardMap from "@/components/DashboardMap";
import FilterControlSidebar from "@/components/FilterControlSidebar";
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

function trendLabel(direction?: "up" | "down" | "flat", delta?: number) {
  if (direction === "up") return `↑ ${Math.abs(delta ?? 0).toFixed(1)}%`;
  if (direction === "down") return `↓ ${Math.abs(delta ?? 0).toFixed(1)}%`;
  return `→ ${(delta ?? 0).toFixed(1)}%`;
}

export default function BinsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dataMode, setDataMode] = useState<DataSourceMode>("synthetic");
  const [bins, setBins] = useState<UnifiedBinRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [minTimestamp, setMinTimestamp] = useState<string | null>(null);
  const [maxTimestamp, setMaxTimestamp] = useState<string | null>(null);
  const [selectedDateTime, setSelectedDateTime] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function loadRangeFirst() {
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

  const legacyBins: BinPoint[] = useMemo(
    () =>
      bins.map((bin) => ({
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
    [bins]
  );

  // ✅ important: drawer should use full unified bin, not legacy bin
  const selectedBin: UnifiedBinRecord | null = useMemo(
    () => bins.find((b) => b.id === selectedId) ?? null,
    [selectedId, bins]
  );

  const totalBins = bins.length;
  const binsAbove80 = bins.filter((b) => (b.currentFillPct ?? 0) >= 80).length;

  const avgFill =
    bins.length > 0
      ? (
          bins.reduce((sum, b) => sum + (b.currentFillPct ?? 0), 0) /
          bins.length
        ).toFixed(1)
      : "0.0";

  const predictedToExceed = bins.filter(
    (b) => (b.forecastFillPct ?? 0) >= 70
  ).length;

  function setCombinedDateTime(date: string, time: string) {
    const next = combineDateAndTime(date, time);
    const clamped = clampDateTimeToRange(next, minTimestamp, maxTimestamp);
    setSelectedDateTime(clamped);
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-white text-black">
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          <aside className="col-span-12 lg:col-span-3">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <FilterControlSidebar />
            </div>
          </aside>

          <section className="col-span-12 lg:col-span-9 space-y-6">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">
                Bins ({dataMode === "real" ? "Real + Forecast" : "Synthetic"})
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
              {[
                { label: "Total Active Bins", value: totalBins },
                { label: "Bins > 80%", value: binsAbove80 },
                { label: "Forecasted Overflows", value: predictedToExceed },
                { label: "Average Fill Level", value: `${avgFill}%` },
                { label: "Predicted to Exceed", value: predictedToExceed },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="text-xs font-medium text-gray-700">
                    {item.label}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-black">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
              <DashboardMap
                bins={legacyBins}
                onBinSelect={(id) => setSelectedId(id)}
              />
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-black">
                  Bin Inventory
                </div>
                <div className="text-xs text-gray-700">
                  {loading
                    ? "Loading..."
                    : "Click a row or map marker to view details"}
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">
                        Bin ID
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Location
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Zone
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Current Fill
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Forecast Fill
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Trend
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Updated
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {bins.map((bin) => {
                      const currentFill = bin.currentFillPct;
                      const forecastFill = bin.forecastFillPct;

                      return (
                        <tr
                          key={bin.id}
                          className={
                            "cursor-pointer bg-white hover:bg-gray-50 " +
                            (selectedId === bin.id ? "bg-emerald-50" : "")
                          }
                          onClick={() => setSelectedId(bin.id)}
                        >
                          <td className="px-4 py-3 font-medium text-black">
                            {bin.id}
                          </td>
                          <td className="px-4 py-3 text-black">
                            {bin.placeName}
                          </td>
                          <td className="px-4 py-3 text-black">{bin.side}</td>
                          <td className="px-4 py-3 text-black">
                            {formatPct(currentFill)}
                          </td>
                          <td className="px-4 py-3 text-black">
                            {formatPct(forecastFill)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold " +
                                ((currentFill ?? 0) >= 80
                                  ? "bg-red-100 text-red-800"
                                  : (currentFill ?? 0) >= 60
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-emerald-100 text-emerald-800")
                              }
                            >
                              {bin.currentStatus ??
                                ((currentFill ?? 0) >= 80
                                  ? "High Risk"
                                  : (currentFill ?? 0) >= 60
                                  ? "Medium"
                                  : "Low")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-black">
                            <span
                              className={
                                "inline-flex rounded-full px-2 py-1 text-xs font-semibold " +
                                (bin.trendDirection === "up"
                                  ? "bg-red-100 text-red-700"
                                  : bin.trendDirection === "down"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-700")
                              }
                            >
                              {trendLabel(bin.trendDirection, bin.trendDelta)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-black">
                            {bin.currentTimestamp || "—"}
                          </td>
                        </tr>
                      );
                    })}

                    {!loading && bins.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-8 text-center text-sm text-gray-500"
                        >
                          No bins loaded. Check your CSV files and paths.
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