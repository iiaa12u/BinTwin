"use client";

import { useMemo, useState } from "react";
import {
  scenarioMapBins,
  scenarioMetrics,
  scenarioSummary,
  type ScenarioType,
} from "@/lib/scenariosData";

export default function ScenariosPage() {
  const [scenarioName, setScenarioName] = useState("Morning Collection Route v1");
  const [scenarioType, setScenarioType] =
    useState<ScenarioType>("Route Optimization");
  const [zone, setZone] = useState("Central District");
  const [dateRange, setDateRange] = useState("Jun 01, 2024 - Jun 07, 2024");
  const [truckCount, setTruckCount] = useState(5);
  const [truckTypes, setTruckTypes] = useState("Standard Diesel, Electric");
  const [truckCapacity, setTruckCapacity] = useState("2000 kg");
  const [maxShift, setMaxShift] = useState("8 hours");
  const [collectThreshold, setCollectThreshold] = useState(80);
  const [forecastHorizon, setForecastHorizon] = useState("Next 12 hours");
  const [mapMode, setMapMode] = useState<"Baseline" | "Scenario">("Scenario");
  const [showForecastedFill, setShowForecastedFill] = useState(true);

  const displayedBins = useMemo(() => {
    return scenarioMapBins;
  }, [mapMode, showForecastedFill]);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left controls */}
          <aside className="col-span-12 xl:col-span-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                Scenario Controls
              </h2>

              <div className="mt-5 space-y-5">
                <div>
                  <div className="mb-2 text-sm font-semibold text-gray-900">
                    General Information
                  </div>

                  <Field label="Scenario Name">
                    <input
                      value={scenarioName}
                      onChange={(e) => setScenarioName(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </Field>

                  <Field label="Scenario Type">
                    <select
                      value={scenarioType}
                      onChange={(e) => setScenarioType(e.target.value as ScenarioType)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                    >
                      <option>Route Optimization</option>
                      <option>Overflow Prevention</option>
                      <option>Fuel Reduction</option>
                      <option>Balanced Workload</option>
                    </select>
                  </Field>

                  <Field label="Zone">
                    <select
                      value={zone}
                      onChange={(e) => setZone(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                    >
                      <option>Central District</option>
                      <option>North District</option>
                      <option>East District</option>
                      <option>West District</option>
                    </select>
                  </Field>

                  <Field label="Planning Date Range">
                    <input
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </Field>
                </div>

                <div>
                  <div className="mb-2 text-sm font-semibold text-gray-900">
                    Scenario Assumptions
                  </div>

                  <Field label="Number of Trucks">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTruckCount((v) => Math.max(1, v - 1))}
                        className="h-10 w-10 rounded-lg border border-gray-200 text-lg"
                      >
                        −
                      </button>
                      <div className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-center text-sm font-medium">
                        {truckCount}
                      </div>
                      <button
                        onClick={() => setTruckCount((v) => v + 1)}
                        className="h-10 w-10 rounded-lg border border-gray-200 text-lg"
                      >
                        +
                      </button>
                    </div>
                  </Field>

                  <Field label="Select Multiple Truck Types">
                    <input
                      value={truckTypes}
                      onChange={(e) => setTruckTypes(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </Field>

                  <Field label="Truck Capacity (kg or m³)">
                    <input
                      value={truckCapacity}
                      onChange={(e) => setTruckCapacity(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </Field>

                  <Field label="Max Shift Length">
                    <select
                      value={maxShift}
                      onChange={(e) => setMaxShift(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                    >
                      <option>8 hours</option>
                      <option>10 hours</option>
                      <option>12 hours</option>
                    </select>
                  </Field>

                  <Field label={`Collect Above Threshold: ${collectThreshold}%`}>
                    <input
                      type="range"
                      min={50}
                      max={100}
                      value={collectThreshold}
                      onChange={(e) => setCollectThreshold(Number(e.target.value))}
                      className="w-full"
                    />
                  </Field>

                  <Field label="Forecast Horizon">
                    <select
                      value={forecastHorizon}
                      onChange={(e) => setForecastHorizon(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                    >
                      <option>Next 6 hours</option>
                      <option>Next 12 hours</option>
                      <option>Next 24 hours</option>
                    </select>
                  </Field>
                </div>
              </div>
            </div>
          </aside>

          {/* Map / visual */}
          <section className="col-span-12 xl:col-span-5">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Map & Visual Preview
                  </h2>
                </div>

                <div className="text-sm text-gray-600">
                  Planning for: Jun 01 - Jun 07, 2024
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-lg bg-gray-100 p-1">
                  <button
                    onClick={() => setMapMode("Baseline")}
                    className={
                      "rounded-md px-3 py-1.5 text-sm font-medium " +
                      (mapMode === "Baseline"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600")
                    }
                  >
                    Baseline
                  </button>
                  <button
                    onClick={() => setMapMode("Scenario")}
                    className={
                      "rounded-md px-3 py-1.5 text-sm font-medium " +
                      (mapMode === "Scenario"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600")
                    }
                  >
                    Scenario
                  </button>
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <span
                    className={
                      "relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition " +
                      (showForecastedFill ? "bg-emerald-500" : "bg-gray-300")
                    }
                    onClick={() => setShowForecastedFill((v) => !v)}
                  >
                    <span
                      className={
                        "inline-block h-5 w-5 transform rounded-full bg-white transition " +
                        (showForecastedFill ? "translate-x-5" : "translate-x-1")
                      }
                    />
                  </span>
                  Show Forecasted Fill Levels
                </label>
              </div>

              <div className="mt-5 relative h-[500px] overflow-hidden rounded-xl border border-gray-200 bg-[linear-gradient(135deg,#f3f4f6_25%,#e5e7eb_25%,#e5e7eb_50%,#f3f4f6_50%,#f3f4f6_75%,#e5e7eb_75%,#e5e7eb_100%)] bg-[length:24px_24px]">
                {/* simple route lines */}
                <svg className="absolute inset-0 h-full w-full">
                  <path
                    d="M90 160 L190 210 L180 340 L310 270 L420 210"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="4"
                    strokeDasharray="8 6"
                  />
                </svg>

                {displayedBins.map((bin) => {
                  const color =
                    bin.fillPct >= 80 ? "bg-red-500" : bin.fillPct >= 60 ? "bg-amber-400" : "bg-emerald-500";
                  return (
                    <div
                      key={bin.id}
                      className="absolute"
                      style={{ left: `${bin.latPct}%`, top: `${bin.topPct}%` }}
                    >
                      <div className="relative">
                        <div
                          className={
                            "flex h-9 w-9 items-center justify-center rounded-full border-4 border-white text-xs font-bold text-white shadow " +
                            color
                          }
                        >
                          {bin.priority}
                        </div>

                        <div className="absolute left-10 top-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm w-36">
                          <div className="font-semibold text-gray-900">{bin.label}</div>
                          <div className="text-gray-600">Fill now: {bin.fillPct}%</div>
                          {showForecastedFill && (
                            <div className="text-gray-600">
                              Forecast: +{bin.forecast6h}% in 6h
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="absolute bottom-4 right-4 rounded-lg border border-gray-200 bg-white p-3 text-xs shadow-sm">
                  <div className="mb-2 font-semibold text-gray-900">Bin Status</div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span>Low Risk (&lt;60%)</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="h-3 w-3 rounded-full bg-amber-400" />
                    <span>Medium Risk (60-80%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-500" />
                    <span>High Risk (&gt;80%)</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Results */}
          <aside className="col-span-12 xl:col-span-4 space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                Scenario Results — Compare with Baseline
              </h2>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <MetricCard
                  label="Total Route Distance"
                  value={`${scenarioMetrics.totalRouteDistanceKm} km`}
                  subtext={`${scenarioMetrics.distanceDeltaPct}% vs baseline`}
                />
                <MetricCard
                  label="Total Collection Time"
                  value={`${scenarioMetrics.totalCollectionTimeHrs} hrs`}
                  subtext={`${scenarioMetrics.timeDeltaPct}% vs baseline`}
                />
                <MetricCard
                  label="Bins Serviced"
                  value={String(scenarioMetrics.binsServiced)}
                  subtext={`+${scenarioMetrics.binsDeltaPct}% vs baseline`}
                  highlight="red"
                />
                <MetricCard
                  label="Predicted Overflows"
                  value={String(scenarioMetrics.predictedOverflows)}
                  subtext={`+${scenarioMetrics.overflowDelta} overflow`}
                />
                <MetricCard
                  label="Estimated CO₂ / Fuel Use"
                  value={`${scenarioMetrics.estimatedFuelOrCO2} kg`}
                />
                <MetricCard
                  label="Average Bin Fill Rate"
                  value={`${scenarioMetrics.averageFillRate}%`}
                />
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-base font-semibold text-gray-900">
                Scenario Summary
              </div>

              <ul className="mt-4 space-y-3 text-sm text-gray-700">
                {scenarioSummary.map((point) => (
                  <li key={point.id} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gray-500" />
                    <span>{point.text}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 text-base font-semibold text-gray-900">
                Scenario Actions
              </div>

              <div className="mt-3 space-y-3">
                <button className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-600">
                  Approve Scenario as Operational Plan
                </button>
                <button className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50">
                  Save Scenario
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
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
    <div className="mt-3">
      <div className="mb-1 text-sm font-medium text-gray-800">{label}</div>
      {children}
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  highlight,
}: {
  label: string;
  value: string;
  subtext?: string;
  highlight?: "red";
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="mt-2 text-3xl font-bold text-gray-900">{value}</div>
      {subtext && (
        <div
          className={
            "mt-2 inline-flex rounded-full px-2 py-1 text-xs font-medium " +
            (highlight === "red"
              ? "bg-red-50 text-red-600"
              : "text-gray-600")
          }
        >
          {subtext}
        </div>
      )}
    </div>
  );
}