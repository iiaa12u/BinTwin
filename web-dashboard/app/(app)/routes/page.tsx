"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardMap, { type PlannedStop } from "@/components/DashboardMap";
import { bins } from "@/lib/bins";

type ZoneValue = "All" | "East" | "West";
type GoalValue = "distance" | "time" | "overflow";
type ViewMode = "dynamic" | "baseline";

type RouteRisk = "Low" | "Medium" | "High";

type RouteStop = {
  id: string;
  binId: string;
  fillPct: number;
  forecastPct: number;
  eta: string;
  fillInHours: string;
  risk: RouteRisk;
  priority: number;
  topPct: number;
  leftPct: number;
};

type DriverStop = {
  id: string;
  binId: string;
  placeName: string;
  fillPct: number;
  distanceKm: number;
  etaMin: number;
  address: string;
  lat: number;
  lng: number;
  status: "pending" | "current" | "completed" | "issue";
};

type DriverRoute = {
  routeId: string;
  totalStops: number;
  estDuration: string;
  binsToCollect: number;
  truckCapacityPct: number;
  stops: DriverStop[];
};

type RoutePlan = {
  kpis: {
    totalActiveBins: number;
    binsAbove80: number;
    selectedBins: number;
    averageFillLevel: number;
    overThreshold: number;
  };
  summary: {
    totalBins: number;
    totalDistanceKm: number;
    estimatedTimeMin: number;
    overflowPrevented: number;
  };
  routeStops: RouteStop[];
  driverRoute: DriverRoute;
};

type OptimizationSession = {
  filters: {
    zone: ZoneValue;
    threshold: number;
    truckLabel: string;
    truckCapacityKg: number;
    shiftStart: string;
    shiftEnd: string;
    goal: GoalValue;
    autoSelect: boolean;
    manualBinId: string;
  };
  baselinePlan: RoutePlan;
  dynamicPlan: RoutePlan;
  approvedPlan: RoutePlan | null;
  savedAt: string;
};

export default function RoutesPage() {
  const router = useRouter();

  const [zone, setZone] = useState<ZoneValue>("All");
  const [manualBin, setManualBin] = useState("BIN-001");
  const [truck, setTruck] = useState("Truck Alpha (1500kg)");
  const [shiftStart, setShiftStart] = useState("06:00");
  const [shiftEnd, setShiftEnd] = useState("14:00");
  const [goal, setGoal] = useState<GoalValue>("distance");
  const [threshold, setThreshold] = useState(80);
  const [forecastHorizon, setForecastHorizon] = useState("Next 6 Hours");
  const [autoSelect, setAutoSelect] = useState(true);

  const [baselinePlan, setBaselinePlan] = useState<RoutePlan | null>(null);
  const [dynamicPlan, setDynamicPlan] = useState<RoutePlan | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("dynamic");
  const [isLoading, setIsLoading] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  const manualBinOptions = useMemo(() => {
    if (zone === "All") return bins;
    return bins.filter((bin) => bin.side === zone);
  }, [zone]);

  useEffect(() => {
    if (
      manualBinOptions.length > 0 &&
      !manualBinOptions.some((bin) => bin.id === manualBin)
    ) {
      setManualBin(manualBinOptions[0].id);
    }
  }, [manualBin, manualBinOptions]);

  function getTruckCapacityKg(selectedTruck: string) {
    if (selectedTruck.includes("2000")) return 2000;
    if (selectedTruck.includes("1500")) return 1500;
    return 1200;
  }

  async function fetchPlan(mode: "dynamic" | "static") {
    const body = {
      mode,
      zone,
      threshold,
      truckLabel: truck,
      truckCapacityKg: getTruckCapacityKg(truck),
      shiftStart,
      shiftEnd,
      goal,
      autoSelect,
      manualBinId: manualBin,
      forecastHorizon,
    };

    const response = await fetch("http://127.0.0.1:8000/solve-route", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    return (await response.json()) as RoutePlan;
  }

  async function buildSession() {
    setIsLoading(true);
    setBackendError(null);

    try {
      const [baseline, dynamic] = await Promise.all([
        fetchPlan("static"),
        fetchPlan("dynamic"),
      ]);

      const session: OptimizationSession = {
        filters: {
          zone,
          threshold,
          truckLabel: truck,
          truckCapacityKg: getTruckCapacityKg(truck),
          shiftStart,
          shiftEnd,
          goal,
          autoSelect,
          manualBinId: manualBin,
        },
        baselinePlan: baseline,
        dynamicPlan: dynamic,
        approvedPlan: null,
        savedAt: new Date().toISOString(),
      };

      localStorage.setItem("optimizationSession", JSON.stringify(session));
      setBaselinePlan(baseline);
      setDynamicPlan(dynamic);
      setViewMode("dynamic");

      return session;
    } catch (error) {
      console.error(error);
      setBackendError(
        "Failed to get route from Python backend. Make sure uvicorn is still running on port 8000."
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerateRoute() {
    await buildSession();
  }

  async function handleSendToDriver() {
    let selectedPlan = viewMode === "dynamic" ? dynamicPlan : baselinePlan;

    if (!selectedPlan) {
      const session = await buildSession();
      if (!session) return;
      selectedPlan = viewMode === "dynamic" ? session.dynamicPlan : session.baselinePlan;
    }

    localStorage.setItem("driverRouteState", JSON.stringify(selectedPlan.driverRoute));
    router.push("/driver");
  }

  async function handleSaveScenario() {
    let sessionRaw = localStorage.getItem("optimizationSession");

    if (!sessionRaw) {
      const session = await buildSession();
      if (!session) return;
    }

    router.push("/scenarios");
  }

  const hasGenerated = baselinePlan !== null && dynamicPlan !== null;

  const displayPlan = hasGenerated
    ? viewMode === "dynamic"
      ? dynamicPlan
      : baselinePlan
    : null;

  const displayKpis = displayPlan?.kpis ?? {
    totalActiveBins: 0,
    binsAbove80: 0,
    selectedBins: 0,
    averageFillLevel: 0,
    overThreshold: 0,
  };

  const displaySummary = displayPlan?.summary ?? {
    totalBins: 0,
    totalDistanceKm: 0,
    estimatedTimeMin: 0,
    overflowPrevented: 0,
  };

  const displayStops = displayPlan?.routeStops ?? [];

  const plannedStopsForMap: PlannedStop[] = displayStops
    .map((stop) => {
      const bin = bins.find((b) => b.id === stop.binId);
      if (!bin) return null;

      return {
        binId: stop.binId,
        lat: bin.lat,
        lng: bin.lng,
        priority: stop.priority,
        eta: stop.eta,
        fillPct: stop.fillPct,
        risk: stop.risk,
      };
    })
    .filter((item): item is PlannedStop => item !== null);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          <aside className="col-span-12 xl:col-span-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                Route Planning Controls
              </h2>

              <div className="mt-5 space-y-4">
                <Field label="Zone">
                  <select
                    value={zone}
                    onChange={(e) => setZone(e.target.value as ZoneValue)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                  >
                    <option value="All">All</option>
                    <option value="East">East</option>
                    <option value="West">West</option>
                  </select>
                </Field>

                <Field label="Manual Bin Selection">
                  <select
                    value={manualBin}
                    onChange={(e) => setManualBin(e.target.value)}
                    disabled={autoSelect}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-gray-100"
                  >
                    {manualBinOptions.map((bin) => (
                      <option key={bin.id} value={bin.id}>
                        {bin.id} — {bin.placeName}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Select Truck">
                  <select
                    value={truck}
                    onChange={(e) => setTruck(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                  >
                    <option>Truck Alpha (1500kg)</option>
                    <option>Truck Beta (2000kg)</option>
                    <option>Truck Gamma (1200kg)</option>
                  </select>
                </Field>

                <div>
                  <div className="mb-1 text-sm font-medium text-gray-800">Shift Time</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={shiftStart}
                      onChange={(e) => setShiftStart(e.target.value)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                    <input
                      value={shiftEnd}
                      onChange={(e) => setShiftEnd(e.target.value)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-sm font-medium text-gray-800">Optimization Goal</div>
                  <div className="space-y-2 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={goal === "distance"}
                        onChange={() => setGoal("distance")}
                      />
                      Minimize Distance
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={goal === "time"}
                        onChange={() => setGoal("time")}
                      />
                      Minimize Time
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={goal === "overflow"}
                        onChange={() => setGoal("overflow")}
                      />
                      Minimize Overflow Risk
                    </label>
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-sm font-medium text-gray-800">
                    Service Threshold (collect above {threshold}%)
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={95}
                    step={1}
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                </div>

                <Field label="Forecast Horizon">
                  <select
                    value={forecastHorizon}
                    onChange={(e) => setForecastHorizon(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                  >
                    <option>Next 6 Hours</option>
                    <option>Next 12 Hours</option>
                    <option>Next 24 Hours</option>
                  </select>
                </Field>

                <label className="flex items-center justify-between text-sm text-gray-700">
                  <span>Auto-select bins based on threshold</span>
                  <button
                    type="button"
                    onClick={() => setAutoSelect((v) => !v)}
                    className={
                      "relative inline-flex h-6 w-11 items-center rounded-full transition " +
                      (autoSelect ? "bg-emerald-500" : "bg-gray-300")
                    }
                  >
                    <span
                      className={
                        "inline-block h-5 w-5 transform rounded-full bg-white transition " +
                        (autoSelect ? "translate-x-5" : "translate-x-1")
                      }
                    />
                  </button>
                </label>

                <p className="text-xs text-gray-500">
                  Dynamic uses the Python backend route solver. Static is the baseline for comparison.
                </p>

                {backendError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {backendError}
                  </div>
                )}

                <button
                  onClick={handleGenerateRoute}
                  disabled={isLoading}
                  className="mt-2 w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Generating..." : "Generate Optimal Routes"}
                </button>
              </div>
            </div>
          </aside>

          <section className="col-span-12 xl:col-span-6 space-y-6">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("dynamic")}
                disabled={!hasGenerated}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  viewMode === "dynamic"
                    ? "bg-emerald-500 text-white"
                    : "border border-gray-200 bg-white"
                } ${!hasGenerated ? "cursor-not-allowed opacity-50" : ""}`}
              >
                Dynamic
              </button>
              <button
                onClick={() => setViewMode("baseline")}
                disabled={!hasGenerated}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  viewMode === "baseline"
                    ? "bg-slate-900 text-white"
                    : "border border-gray-200 bg-white"
                } ${!hasGenerated ? "cursor-not-allowed opacity-50" : ""}`}
              >
                Static Baseline
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <KpiCard label="Total Active Bins" value={displayKpis.totalActiveBins} />
              <KpiCard label="Bins > 80%" value={displayKpis.binsAbove80} accent="red" />
              <KpiCard label="Selected Bins" value={displayKpis.selectedBins} />
              <KpiCard label="Average Fill Level" value={`${displayKpis.averageFillLevel}%`} />
              <KpiCard label="Above Threshold" value={displayKpis.overThreshold} />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <DashboardMap plannedStops={plannedStopsForMap} showRoute={hasGenerated} />
            </div>
          </section>

          <aside className="col-span-12 xl:col-span-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                {viewMode === "dynamic" ? "Dynamic Route" : "Static Baseline"} — {shiftStart} to {shiftEnd}
              </h2>

              <div className="mt-3 text-sm text-gray-600">Selected Truck: {truck}</div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <MiniCard label="Total Bins" value={String(displaySummary.totalBins)} />
                <MiniCard label="Total Distance" value={`${displaySummary.totalDistanceKm} km`} />
                <MiniCard label="Estimated Time" value={`${displaySummary.estimatedTimeMin} min`} />
                <MiniCard label="Overflow Prevented" value={String(displaySummary.overflowPrevented)} />
              </div>

              <div className="mt-6 border-t border-gray-200 pt-5">
                <h3 className="text-lg font-semibold text-gray-900">
                  Route Steps ({displayStops.length} Stops)
                </h3>

                <div className="mt-4 space-y-4">
                  {displayStops.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                      No route yet. Generate a route first.
                    </div>
                  ) : (
                    displayStops.map((stop) => (
                      <div key={stop.id} className="flex items-start justify-between gap-3">
                        <div className="flex gap-3">
                          <div
                            className={
                              "mt-1 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white " +
                              (stop.risk === "High"
                                ? "bg-red-500"
                                : stop.risk === "Medium"
                                ? "bg-amber-400"
                                : "bg-emerald-500")
                            }
                          >
                            {stop.priority}
                          </div>

                          <div>
                            <div className="font-semibold text-gray-900">{stop.binId}</div>
                            <div className="text-sm text-gray-600">
                              Fill: {stop.fillPct}% • {stop.risk} Risk
                            </div>
                          </div>
                        </div>

                        <div className="text-sm text-gray-600">{stop.eta}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  onClick={handleSendToDriver}
                  disabled={!hasGenerated}
                  className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Send to Driver
                </button>

                <button
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  disabled={!hasGenerated}
                >
                  Export Route
                </button>

                <button
                  onClick={handleSaveScenario}
                  disabled={!hasGenerated}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
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
    <div>
      <div className="mb-1 text-sm font-medium text-gray-800">{label}</div>
      {children}
    </div>
  );
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "red";
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div
        className={`mb-3 h-1.5 w-24 rounded-full ${
          accent === "red" ? "bg-red-400" : "bg-emerald-400"
        }`}
      />
      <div className="text-3xl font-bold tracking-tight text-gray-900">{value}</div>
      <div className="mt-2 text-sm text-gray-600">{label}</div>
    </div>
  );
}

function MiniCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="mt-3 text-3xl font-bold text-gray-900">{value}</div>
    </div>
  );
}
