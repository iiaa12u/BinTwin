"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardMap from "@/components/DashboardMap";
import FilterControlSidebar from "@/components/FilterControlSidebar";
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

import type { BinPoint } from "@/lib/bins";

type AiSummary = {
  citywideInsights: string[];
  dailySummary: string;
  alerts: string[];
};

function shiftMinutes(value: string, minutes: number) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

export default function DashboardPage() {
  const [dataMode, setDataMode] = useState<DataSourceMode>("synthetic");
  const [bins, setBins] = useState<UnifiedBinRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [minTimestamp, setMinTimestamp] = useState<string | null>(null);
  const [maxTimestamp, setMaxTimestamp] = useState<string | null>(null);
  const [selectedDateTime, setSelectedDateTime] = useState<string>("");

  const [aiSummary, setAiSummary] = useState<AiSummary>({
    citywideInsights: ["AI insights will appear after data is loaded."],
    dailySummary: "AI daily summary is waiting for dashboard data.",
    alerts: ["No AI alerts generated yet."],
  });
  const [aiLoading, setAiLoading] = useState(false);

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
      }
    }

    loadBins();

    return () => {
      cancelled = true;
    };
  }, [dataMode, selectedDateTime]);

  async function generateAiSummary() {
    if (bins.length === 0) return;

    setAiLoading(true);

    try {
      const response = await fetch("/api/dashboard-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          dataMode,
          selectedDateTime,
          bins: bins.map((bin) => ({
            id: bin.id,
            placeName: bin.placeName,
            side: bin.side,
            currentFillPct: bin.currentFillPct,
            currentStatus: bin.currentStatus,
            currentTimestamp: bin.currentTimestamp,
            forecastFillPct: bin.forecastFillPct,
            forecastStatus: bin.forecastStatus,
            forecastTimestamp: bin.forecastTimestamp,
            trendDirection: bin.trendDirection,
            trendDelta: bin.trendDelta,
          })),
        }),
      });

      const data = (await response.json()) as AiSummary;
      setAiSummary(data);
    } catch (error) {
      console.error("AI dashboard summary failed:", error);
      setAiSummary({
        citywideInsights: ["Unable to generate AI insights right now."],
        dailySummary: "AI daily summary is temporarily unavailable.",
        alerts: ["Please review the dashboard metrics manually."],
      });
    } finally {
      setAiLoading(false);
    }
  }

  useEffect(() => {
    if (!loading && bins.length > 0) {
      generateAiSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, bins, dataMode, selectedDateTime]);

  const { date: selectedDate, time: selectedTime } =
    splitDateTimeForInputs(selectedDateTime);

  const mapBins: BinPoint[] = useMemo(
    () =>
      bins.map((bin) => ({
        id: bin.id,
        placeName: bin.placeName,
        side: bin.side,
        lat: bin.lat,
        lng: bin.lng,
        fillPct: bin.currentFillPct ?? 0,
        buildingNumber: bin.buildingNumber,
        binNumber: bin.binNumber,
        lastUpdate: bin.currentTimestamp ?? "",
      })),
    [bins]
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

  const forecastedOverflows = bins.filter(
    (b) => (b.forecastFillPct ?? 0) >= 80
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
          <section className="col-span-12 lg:col-span-3">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <FilterControlSidebar />
            </div>
          </section>

          <section className="col-span-12 lg:col-span-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">
                Dashboard ({dataMode === "real" ? "Real + Forecast" : "Synthetic"})
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: "Total Active Bins", value: totalBins },
                { label: "Bins > 80%", value: binsAbove80 },
                {
                  label: "Forecasted Overflows (Next 6h)",
                  value: dataMode === "real" ? forecastedOverflows : "—",
                },
                { label: "Average Fill Level", value: `${avgFill}%` },
                { label: "Total Collection Time Today", value: "—" },
                { label: "Total Route Distance Today", value: "—" },
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
              <DashboardMap bins={mapBins} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 h-[240px] shadow-sm">
                <div className="text-sm font-semibold text-black mb-2">
                  Fill Level Trends
                </div>
                <div className="text-gray-700 text-sm">
                  Showing snapshot at {selectedDateTime || "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 h-[240px] shadow-sm">
                <div className="text-sm font-semibold text-black mb-2">
                  Collections & Overflow Events
                </div>
                <div className="text-gray-700 text-sm">Chart placeholder</div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-black">AI Alerts</div>
                <button
                  onClick={generateAiSummary}
                  disabled={aiLoading || bins.length === 0}
                  className="rounded-lg border border-gray-300 px-3 py-1 text-xs text-black hover:bg-gray-100 disabled:opacity-50"
                >
                  {aiLoading ? "Generating..." : "Regenerate"}
                </button>
              </div>

              <div className="space-y-2 text-sm text-gray-700">
                {aiSummary.alerts.map((alert, index) => (
                  <div
                    key={`${alert}-${index}`}
                    className="rounded-lg bg-gray-50 px-3 py-2"
                  >
                    {alert}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="col-span-12 lg:col-span-3 space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold text-black">
                  AI Citywide Insights
                </div>
                {aiLoading && (
                  <span className="text-xs text-gray-500">Thinking...</span>
                )}
              </div>

              <div className="space-y-2 text-sm text-gray-700">
                {aiSummary.citywideInsights.map((insight, index) => (
                  <div key={`${insight}-${index}`} className="rounded-lg bg-gray-50 p-2">
                    {insight}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-black mb-2">
                AI Daily Summary
              </div>
              <div className="text-gray-700 text-sm leading-6">
                {aiSummary.dailySummary}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-black mb-3">
                Quick Actions
              </div>
              <div className="flex flex-col gap-2">
                <button className="rounded-lg bg-emerald-600 text-white py-2 text-sm font-medium hover:bg-emerald-700">
                  Generate Optimal Routes
                </button>
                <button
                  onClick={generateAiSummary}
                  disabled={aiLoading || bins.length === 0}
                  className="rounded-lg border border-gray-300 py-2 text-sm text-black hover:bg-gray-100 disabled:opacity-50"
                >
                  Regenerate AI Insights
                </button>
                <button className="rounded-lg border border-gray-300 py-2 text-sm text-black hover:bg-gray-100">
                  Open Scenario Simulation
                </button>
                <button className="rounded-lg border border-gray-300 py-2 text-sm text-black hover:bg-gray-100">
                  Download Daily Report (PDF)
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}