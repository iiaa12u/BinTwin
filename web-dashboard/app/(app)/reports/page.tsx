"use client";

import { useEffect, useMemo, useState } from "react";

type ReportView = "approved" | "dynamic" | "static";
type RouteKind = "approved" | "dynamic" | "static";
type RiskLevel = "High" | "Medium" | "Low";
type PeriodValue = "today" | "week" | "month" | "3m" | "6m" | "9m";

type RouteStop = {
  id?: string;
  binId?: string;
  fillPct?: number;
  forecastPct?: number;
  afterFillPct?: number;
  eta?: string;
  fillInHours?: string;
  risk?: RiskLevel;
  priority?: number;
};

type DriverStop = {
  id?: string;
  binId?: string;
  placeName?: string;
  fillPct?: number;
  afterFillPct?: number;
  distanceKm?: number;
  etaMin?: number;
  eta?: string;
  shiftWindow?: string;
  address?: string;
  lat?: number;
  lng?: number;
  status?: string;
};

type DriverRoute = {
  routeId?: string;
  totalStops?: number;
  estDuration?: string;
  binsToCollect?: number;
  truckCapacityPct?: number;
  stops?: DriverStop[];
};

type RoutePlan = {
  kpis?: {
    totalActiveBins?: number;
    binsAbove80?: number;
    selectedBins?: number;
    averageFillLevel?: number;
    overThreshold?: number;
  };
  summary?: {
    totalBins?: number;
    totalDistanceKm?: number;
    estimatedTimeMin?: number;
    overflowPrevented?: number;
  };
  routeStops?: RouteStop[];
  routeGeometry?: any;
  driverRoute?: DriverRoute;
};

type OptimizationSession = {
  filters?: {
    dataMode?: string;
    selectedDateTime?: string;
    zone?: string;
    threshold?: number;
    truckLabel?: string;
    truckCapacityKg?: number;
    shiftStart?: string;
    shiftEnd?: string;
    goal?: string;
    autoSelect?: boolean;
    manualBinId?: string;
    forecastHorizon?: string;
  };
  baselinePlan?: RoutePlan | null;
  dynamicPlan?: RoutePlan | null;
  approvedPlan?: RoutePlan | null;
  savedAt?: string;
};

type SavedScenario = {
  id?: string;
  name?: string;
  type?: "dynamic" | "static";
  routeType?: string;
  createdAt?: string;
  dataMode?: string;
  selectedDateTime?: string;
  zone?: string;
  threshold?: number;
  truck?: string;
  truckCapacityKg?: number;
  dynamicOperatingWindow?: string | null;
  staticScheduledWindows?: string[] | null;
  selectedStaticWindow?: string | null;
  summary?: RoutePlan["summary"];
  routeStops?: RouteStop[];
  routeGeometry?: any;
  driverRoute?: DriverRoute;
  baselinePlan?: RoutePlan | null;
  dynamicPlan?: RoutePlan | null;
  approvedPlan?: RoutePlan | null;
};

type NormalizedStop = {
  id: string;
  binId: string;
  fillPct: number;
  forecastPct?: number;
  afterFillPct: number;
  eta: string;
  risk: RiskLevel;
  shiftWindow: string;
};

type NormalizedRoute = {
  key: RouteKind;
  title: string;
  routeTypeLabel: string;
  sourceLabel: string;
  snapshotLabel: string;
  createdAt: string;
  truckLabel: string;
  truckCapacityKg: number;
  threshold: number;
  totalDistanceKm: number;
  totalTimeMin: number;
  totalBins: number;
  overflowPrevented: number;
  collectedWasteKg: number;
  remainingCapacityKg: number;
  capacityUsedPct: number;
  routeEfficiencyKgKm: number;
  co2EstimateKg: number;
  stops: NormalizedStop[];
};

type ReportData = {
  approved: NormalizedRoute;
  dynamic: NormalizedRoute;
  static: NormalizedRoute;
  hasSavedData: boolean;
  savedScenarios: SavedScenario[];
};

type HistoricalMetrics = {
  periodLabel: string;
  routesCount: number;
  totalBinsServed: number;
  totalWasteKg: number;
  totalDistanceKm: number;
  totalTimeMin: number;
  averageEfficiencyKgKm: number;
  co2EstimateKg: number;
  dynamicDistanceKm: number;
  staticDistanceKm: number;
  distanceSavedKm: number;
  distanceImprovementPct: number;
  dynamicTimeMin: number;
  staticTimeMin: number;
  timeSavedMin: number;
  timeImprovementPct: number;
};

const BIN_CAPACITY_KG = 440;
const DEFAULT_TRUCK_CAPACITY_KG = 2500;
const RESET_FILL_AFTER_COLLECTION = 5;
const CO2_KG_PER_KM = 0.27;

const EMPTY_ROUTE: NormalizedRoute = {
  key: "approved",
  title: "No Route Selected",
  routeTypeLabel: "No saved route",
  sourceLabel: "No saved route found",
  snapshotLabel: "—",
  createdAt: "",
  truckLabel: "Truck Alpha (2500kg)",
  truckCapacityKg: DEFAULT_TRUCK_CAPACITY_KG,
  threshold: 0,
  totalDistanceKm: 0,
  totalTimeMin: 0,
  totalBins: 0,
  overflowPrevented: 0,
  collectedWasteKg: 0,
  remainingCapacityKg: DEFAULT_TRUCK_CAPACITY_KG,
  capacityUsedPct: 0,
  routeEfficiencyKgKm: 0,
  co2EstimateKg: 0,
  stops: [],
};

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function clampNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatDateLabel(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMinutes(totalMinutes: number) {
  const safe = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;

  if (hours <= 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;

  return `${hours} hr ${minutes} min`;
}

function parseMinutesFromText(value?: string) {
  if (!value) return 0;

  const text = value.toLowerCase();
  const hourMatch = text.match(/(\d+)\s*(h|hr|hour)/);
  const minMatch = text.match(/(\d+)\s*(m|min)/);

  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minMatch ? Number(minMatch[1]) : 0;

  return hours * 60 + minutes;
}

function getRisk(fillPct: number): RiskLevel {
  if (fillPct >= 80) return "High";
  if (fillPct >= 60) return "Medium";
  return "Low";
}

function normalizeStop(stop: any, index: number): NormalizedStop {
  const fillPct = clampNumber(stop?.fillPct ?? stop?.currentFillPct, 0);
  const afterFillPct = clampNumber(
    stop?.afterFillPct ?? stop?.after_fill,
    RESET_FILL_AFTER_COLLECTION
  );

  return {
    id: String(stop?.id ?? `stop-${index + 1}`),
    binId: String(stop?.binId ?? stop?.id ?? `BIN-${index + 1}`),
    fillPct,
    forecastPct:
      stop?.forecastPct !== undefined
        ? clampNumber(stop.forecastPct, fillPct)
        : undefined,
    afterFillPct,
    eta: String(stop?.eta ?? stop?.time ?? "—"),
    risk: (stop?.risk as RiskLevel) ?? getRisk(fillPct),
    shiftWindow: String(stop?.shiftWindow ?? stop?.fillInHours ?? ""),
  };
}

function getStopsFromPlan(plan?: RoutePlan | null): NormalizedStop[] {
  const routeStops = plan?.routeStops;
  const driverStops = plan?.driverRoute?.stops;

  const rawStops =
    Array.isArray(routeStops) && routeStops.length > 0
      ? routeStops
      : Array.isArray(driverStops)
      ? driverStops
      : [];

  return rawStops.map((stop, index) => normalizeStop(stop, index));
}

function estimateCollectedWaste(stops: NormalizedStop[]) {
  const total = stops.reduce((sum, stop) => {
    const before = Math.max(0, Math.min(100, stop.fillPct));
    const after = Math.max(0, Math.min(100, stop.afterFillPct));
    const collectedPct = Math.max(0, before - after);

    return sum + (collectedPct / 100) * BIN_CAPACITY_KG;
  }, 0);

  return Math.round(total);
}

function normalizeRoute({
  key,
  plan,
  session,
  scenario,
}: {
  key: RouteKind;
  plan?: RoutePlan | null;
  session?: OptimizationSession | null;
  scenario?: SavedScenario | null;
}): NormalizedRoute {
  if (!plan) {
    return {
      ...EMPTY_ROUTE,
      key,
      title:
        key === "dynamic"
          ? "Dynamic Forecast-Aware Route"
          : key === "static"
          ? "Static Fixed Baseline"
          : "Approved Operational Plan",
      routeTypeLabel:
        key === "dynamic"
          ? "Dynamic Forecast-Aware"
          : key === "static"
          ? "Static Fixed Baseline"
          : "Approved Operational Plan",
    };
  }

  const stops = getStopsFromPlan(plan);

  const truckCapacityKg =
    clampNumber(session?.filters?.truckCapacityKg, 0) ||
    clampNumber(scenario?.truckCapacityKg, 0) ||
    DEFAULT_TRUCK_CAPACITY_KG;

  const collectedWasteKg = estimateCollectedWaste(stops);
  const remainingCapacityKg = Math.max(0, truckCapacityKg - collectedWasteKg);
  const capacityUsedPct =
    truckCapacityKg > 0
      ? Math.min(100, Math.round((collectedWasteKg / truckCapacityKg) * 100))
      : 0;

  const totalDistanceKm = clampNumber(plan.summary?.totalDistanceKm, 0);
  const totalTimeMin =
    clampNumber(plan.summary?.estimatedTimeMin, 0) ||
    parseMinutesFromText(plan.driverRoute?.estDuration);

  const routeEfficiencyKgKm =
    totalDistanceKm > 0
      ? Number((collectedWasteKg / totalDistanceKm).toFixed(1))
      : 0;

  const selectedDateTime =
    session?.filters?.selectedDateTime ??
    scenario?.selectedDateTime ??
    scenario?.createdAt ??
    session?.savedAt ??
    new Date().toISOString();

  const title =
    key === "dynamic"
      ? "Dynamic Forecast-Aware Route"
      : key === "static"
      ? "Static Fixed Baseline"
      : "Approved Operational Plan";

  const routeTypeLabel =
    key === "dynamic"
      ? "Dynamic Forecast-Aware"
      : key === "static"
      ? "Static Fixed Baseline"
      : "Approved Operational Plan";

  return {
    key,
    title,
    routeTypeLabel,
    sourceLabel: "Saved from Routes / Scenario",
    createdAt: selectedDateTime,
    snapshotLabel: formatDateLabel(selectedDateTime),
    truckLabel:
      session?.filters?.truckLabel ?? scenario?.truck ?? "Truck Alpha (2500kg)",
    truckCapacityKg,
    threshold:
      key === "static"
        ? 75
        : clampNumber(session?.filters?.threshold ?? scenario?.threshold, 0),
    totalDistanceKm,
    totalTimeMin,
    totalBins: stops.length || clampNumber(plan.summary?.totalBins, 0),
    overflowPrevented: clampNumber(plan.summary?.overflowPrevented, 0),
    collectedWasteKg,
    remainingCapacityKg,
    capacityUsedPct,
    routeEfficiencyKgKm,
    co2EstimateKg: Number((totalDistanceKm * CO2_KG_PER_KM).toFixed(1)),
    stops,
  };
}

function percentReduction(staticValue: number, dynamicValue: number) {
  if (!staticValue || staticValue <= 0) return 0;
  return Number((((staticValue - dynamicValue) / staticValue) * 100).toFixed(1));
}

function getLatestSavedScenario() {
  const savedScenarios = safeParse<SavedScenario[]>(
    localStorage.getItem("savedScenarios")
  );

  if (!Array.isArray(savedScenarios) || savedScenarios.length === 0) return null;
  return savedScenarios[0];
}

function getAllSavedScenarios() {
  const savedScenarios = safeParse<SavedScenario[]>(
    localStorage.getItem("savedScenarios")
  );

  const approvedScenario = safeParse<SavedScenario>(
    localStorage.getItem("approvedScenario")
  );

  const selectedScenario = safeParse<SavedScenario>(
    localStorage.getItem("selectedScenario")
  );

  const combined: SavedScenario[] = [];

  if (approvedScenario) combined.push(approvedScenario);
  if (selectedScenario) combined.push(selectedScenario);

  if (Array.isArray(savedScenarios)) {
    combined.push(...savedScenarios);
  }

  const unique = new Map<string, SavedScenario>();

  combined.forEach((scenario, index) => {
    const key =
      scenario.id ??
      `${scenario.createdAt ?? scenario.selectedDateTime ?? "unknown"}-${index}`;

    unique.set(key, scenario);
  });

  return Array.from(unique.values()).sort((a, b) => {
    const dateA = new Date(a.createdAt ?? a.selectedDateTime ?? 0).getTime();
    const dateB = new Date(b.createdAt ?? b.selectedDateTime ?? 0).getTime();

    return dateB - dateA;
  });
}

function loadReportData(): ReportData {
  const session = safeParse<OptimizationSession>(
    localStorage.getItem("optimizationSession")
  );

  const approvedScenario = safeParse<SavedScenario>(
    localStorage.getItem("approvedScenario")
  );

  const selectedScenario = safeParse<SavedScenario>(
    localStorage.getItem("selectedScenario")
  );

  const latestSavedScenario = getLatestSavedScenario();

  const scenario = approvedScenario ?? selectedScenario ?? latestSavedScenario;

  const dynamicPlan =
    session?.dynamicPlan ??
    scenario?.dynamicPlan ??
    (scenario?.type === "dynamic" ? scenario?.approvedPlan : null) ??
    null;

  const staticPlan =
    session?.baselinePlan ??
    scenario?.baselinePlan ??
    (scenario?.type === "static" ? scenario?.approvedPlan : null) ??
    null;

  const approvedPlan =
    scenario?.approvedPlan ??
    session?.approvedPlan ??
    (scenario?.type === "static" ? staticPlan : dynamicPlan) ??
    dynamicPlan ??
    staticPlan ??
    null;

  const hasSavedData = Boolean(dynamicPlan || staticPlan || approvedPlan);

  return {
    approved: normalizeRoute({
      key: "approved",
      plan: approvedPlan,
      session,
      scenario,
    }),
    dynamic: normalizeRoute({
      key: "dynamic",
      plan: dynamicPlan,
      session,
      scenario,
    }),
    static: normalizeRoute({
      key: "static",
      plan: staticPlan,
      session,
      scenario,
    }),
    hasSavedData,
    savedScenarios: getAllSavedScenarios(),
  };
}

function getPeriodStart(period: PeriodValue) {
  const now = new Date();
  const start = new Date(now);

  if (period === "today") {
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (period === "week") {
    start.setDate(start.getDate() - 7);
    return start;
  }

  if (period === "month") {
    start.setMonth(start.getMonth() - 1);
    return start;
  }

  if (period === "3m") {
    start.setMonth(start.getMonth() - 3);
    return start;
  }

  if (period === "6m") {
    start.setMonth(start.getMonth() - 6);
    return start;
  }

  start.setMonth(start.getMonth() - 9);
  return start;
}

function getPeriodLabel(period: PeriodValue) {
  if (period === "today") return "Today";
  if (period === "week") return "Last 7 Days";
  if (period === "month") return "Last 30 Days";
  if (period === "3m") return "Last 3 Months";
  if (period === "6m") return "Last 6 Months";
  return "Last 9 Months";
}

function isScenarioInPeriod(scenario: SavedScenario, period: PeriodValue) {
  const dateValue = scenario.createdAt ?? scenario.selectedDateTime;
  if (!dateValue) return false;

  const scenarioDate = new Date(dateValue);
  if (Number.isNaN(scenarioDate.getTime())) return false;

  return scenarioDate >= getPeriodStart(period);
}

function getScenarioPlan(scenario: SavedScenario): RoutePlan | null {
  if (scenario.approvedPlan) return scenario.approvedPlan;

  if (scenario.summary || scenario.routeStops || scenario.driverRoute) {
    return {
      summary: scenario.summary,
      routeStops: scenario.routeStops ?? [],
      routeGeometry: scenario.routeGeometry,
      driverRoute: scenario.driverRoute,
    };
  }

  if (scenario.type === "static") return scenario.baselinePlan ?? null;
  return scenario.dynamicPlan ?? null;
}

function routeFromScenarioPlan(
  scenario: SavedScenario,
  plan: RoutePlan | null,
  key: RouteKind
) {
  return normalizeRoute({
    key,
    plan,
    scenario,
  });
}

function buildHistoricalMetrics(
  scenarios: SavedScenario[],
  period: PeriodValue
): HistoricalMetrics {
  const periodScenarios = scenarios.filter((scenario) =>
    isScenarioInPeriod(scenario, period)
  );

  const approvedRoutes = periodScenarios
    .map((scenario) =>
      routeFromScenarioPlan(scenario, getScenarioPlan(scenario), "approved")
    )
    .filter((route) => route.totalBins > 0 || route.totalDistanceKm > 0);

  const dynamicRoutes = periodScenarios
    .map((scenario) =>
      routeFromScenarioPlan(scenario, scenario.dynamicPlan ?? null, "dynamic")
    )
    .filter((route) => route.totalBins > 0 || route.totalDistanceKm > 0);

  const staticRoutes = periodScenarios
    .map((scenario) =>
      routeFromScenarioPlan(scenario, scenario.baselinePlan ?? null, "static")
    )
    .filter((route) => route.totalBins > 0 || route.totalDistanceKm > 0);

  const totalDistanceKm = approvedRoutes.reduce(
    (sum, route) => sum + route.totalDistanceKm,
    0
  );

  const totalWasteKg = approvedRoutes.reduce(
    (sum, route) => sum + route.collectedWasteKg,
    0
  );

  const totalTimeMin = approvedRoutes.reduce(
    (sum, route) => sum + route.totalTimeMin,
    0
  );

  const totalBinsServed = approvedRoutes.reduce(
    (sum, route) => sum + route.totalBins,
    0
  );

  const dynamicDistanceKm = dynamicRoutes.reduce(
    (sum, route) => sum + route.totalDistanceKm,
    0
  );

  const staticDistanceKm = staticRoutes.reduce(
    (sum, route) => sum + route.totalDistanceKm,
    0
  );

  const dynamicTimeMin = dynamicRoutes.reduce(
    (sum, route) => sum + route.totalTimeMin,
    0
  );

  const staticTimeMin = staticRoutes.reduce(
    (sum, route) => sum + route.totalTimeMin,
    0
  );

  const distanceSavedKm = Math.max(0, staticDistanceKm - dynamicDistanceKm);
  const timeSavedMin = Math.max(0, staticTimeMin - dynamicTimeMin);

  return {
    periodLabel: getPeriodLabel(period),
    routesCount: approvedRoutes.length,
    totalBinsServed,
    totalWasteKg,
    totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    totalTimeMin,
    averageEfficiencyKgKm:
      totalDistanceKm > 0
        ? Number((totalWasteKg / totalDistanceKm).toFixed(1))
        : 0,
    co2EstimateKg: Number((totalDistanceKm * CO2_KG_PER_KM).toFixed(1)),
    dynamicDistanceKm: Number(dynamicDistanceKm.toFixed(2)),
    staticDistanceKm: Number(staticDistanceKm.toFixed(2)),
    distanceSavedKm: Number(distanceSavedKm.toFixed(2)),
    distanceImprovementPct: percentReduction(staticDistanceKm, dynamicDistanceKm),
    dynamicTimeMin,
    staticTimeMin,
    timeSavedMin,
    timeImprovementPct: percentReduction(staticTimeMin, dynamicTimeMin),
  };
}

function barWidth(value: number, max: number) {
  if (!max || max <= 0) return "0%";
  return `${Math.min(100, Math.max(0, (value / max) * 100))}%`;
}

export default function ReportsPage() {
  const [reportView, setReportView] = useState<ReportView>("approved");
  const [period, setPeriod] = useState<PeriodValue>("month");
  const [data, setData] = useState<ReportData>(() => ({
    approved: EMPTY_ROUTE,
    dynamic: {
      ...EMPTY_ROUTE,
      key: "dynamic",
      title: "Dynamic Forecast-Aware Route",
    },
    static: {
      ...EMPTY_ROUTE,
      key: "static",
      title: "Static Fixed Baseline",
    },
    hasSavedData: false,
    savedScenarios: [],
  }));

  useEffect(() => {
    setData(loadReportData());
  }, []);

  function refreshData() {
    setData(loadReportData());
  }

  function exportPdf() {
    window.print();
  }

  const selectedRoute =
    reportView === "dynamic"
      ? data.dynamic
      : reportView === "static"
      ? data.static
      : data.approved;

  const history = useMemo(
    () => buildHistoricalMetrics(data.savedScenarios, period),
    [data.savedScenarios, period]
  );

  const maxDistance = Math.max(
    data.dynamic.totalDistanceKm,
    data.static.totalDistanceKm,
    1
  );

  const maxTime = Math.max(data.dynamic.totalTimeMin, data.static.totalTimeMin, 1);

  const distanceReduction = percentReduction(
    data.static.totalDistanceKm,
    data.dynamic.totalDistanceKm
  );

  const timeReduction = percentReduction(
    data.static.totalTimeMin,
    data.dynamic.totalTimeMin
  );

  const historyMaxDistance = Math.max(
    history.dynamicDistanceKm,
    history.staticDistanceKm,
    1
  );

  const historyMaxTime = Math.max(history.dynamicTimeMin, history.staticTimeMin, 1);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 text-slate-900">
      <div className="mx-auto grid max-w-[1650px] grid-cols-12 gap-6 px-6 py-6">
        <aside className="col-span-12 xl:col-span-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Report Controls</h2>

            <div className="mt-6">
              <label className="text-sm font-semibold text-slate-600">
                Route view
              </label>
              <select
                value={reportView}
                onChange={(e) => setReportView(e.target.value as ReportView)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              >
                <option value="approved">Approved Plan</option>
                <option value="dynamic">Dynamic Route</option>
                <option value="static">Static Baseline</option>
              </select>
            </div>

            <div className="mt-5">
              <label className="text-sm font-semibold text-slate-600">
                Historical period
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as PeriodValue)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              >
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="3m">Last 3 Months</option>
                <option value="6m">Last 6 Months</option>
                <option value="9m">Last 9 Months</option>
              </select>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Current report snapshot</div>
              <div className="mt-2 font-bold text-slate-900">
                {selectedRoute.snapshotLabel}
              </div>
              <div className="mt-3 text-sm text-slate-600">
                Source: {selectedRoute.sourceLabel}
              </div>
            </div>

            {!data.hasSavedData && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                No saved route data found. Go to Routes, generate both routes,
                save the scenario, then return here.
              </div>
            )}

            <button
              onClick={exportPdf}
              className="mt-5 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
            >
              Export PDF Report
            </button>

            <button
              onClick={refreshData}
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50"
            >
              Refresh Saved Data
            </button>

            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <div className="font-bold">Historical reporting</div>
              <p className="mt-2">
                The report now supports Today, Last Week, Last Month, 3 Months,
                6 Months, and 9 Months.
              </p>
            </div>
          </div>
        </aside>

        <main className="col-span-12 space-y-6 xl:col-span-7">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Route Performance Report
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Current view:{" "}
                  <span className="font-bold text-slate-900">
                    {selectedRoute.title}
                  </span>
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                Snapshot: {selectedRoute.snapshotLabel}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-5">
              <MetricCard
                label="Route distance"
                value={`${selectedRoute.totalDistanceKm.toFixed(2)} km`}
                note="selected view"
              />
              <MetricCard
                label="Collection time"
                value={formatMinutes(selectedRoute.totalTimeMin)}
                note="estimated duration"
              />
              <MetricCard
                label="Bins served"
                value={String(selectedRoute.totalBins)}
                note="selected route stops"
              />
              <MetricCard
                label="Route efficiency"
                value={`${selectedRoute.routeEfficiencyKgKm} kg/km`}
                note="waste per km"
              />
              <MetricCard
                label="Est. CO₂ emitted"
                value={`${selectedRoute.co2EstimateKg} kg`}
                note="estimated"
              />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Dynamic vs Static — Route Distance
              </h2>

              <div className="mt-6 space-y-5">
                <CompareBar
                  label="Dynamic"
                  value={`${data.dynamic.totalDistanceKm.toFixed(2)} km`}
                  width={barWidth(data.dynamic.totalDistanceKm, maxDistance)}
                  highlight
                />
                <CompareBar
                  label="Static"
                  value={`${data.static.totalDistanceKm.toFixed(2)} km`}
                  width={barWidth(data.static.totalDistanceKm, maxDistance)}
                />
              </div>

              <div className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                Dynamic reduced distance by {distanceReduction}% compared with
                Static.
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Dynamic vs Static — Collection Time
              </h2>

              <div className="mt-6 space-y-5">
                <CompareBar
                  label="Dynamic"
                  value={formatMinutes(data.dynamic.totalTimeMin)}
                  width={barWidth(data.dynamic.totalTimeMin, maxTime)}
                  highlight
                />
                <CompareBar
                  label="Static"
                  value={formatMinutes(data.static.totalTimeMin)}
                  width={barWidth(data.static.totalTimeMin, maxTime)}
                />
              </div>

              <div className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                Dynamic reduced time by {timeReduction}% compared with Static.
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">
              Truck Capacity Usage
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Capacity is shown separately for{" "}
              <span className="font-bold">Dynamic</span> and{" "}
              <span className="font-bold">Static</span>.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              <CapacityCard route={data.dynamic} />
              <CapacityCard route={data.static} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Operational Performance Over Time
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Selected period:{" "}
                  <span className="font-bold text-slate-900">
                    {history.periodLabel}
                  </span>
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                {history.routesCount} saved route(s)
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <MetricCard
                label="Total routes"
                value={String(history.routesCount)}
                note="approved/saved routes"
              />
              <MetricCard
                label="Total bins served"
                value={String(history.totalBinsServed)}
                note="within selected period"
              />
              <MetricCard
                label="Collected waste"
                value={`${history.totalWasteKg} kg`}
                note="estimated total"
              />
              <MetricCard
                label="Total distance"
                value={`${history.totalDistanceKm.toFixed(2)} km`}
                note="approved routes"
              />
              <MetricCard
                label="Avg. efficiency"
                value={`${history.averageEfficiencyKgKm} kg/km`}
                note="waste per km"
              />
              <MetricCard
                label="Est. CO₂ emitted"
                value={`${history.co2EstimateKg} kg`}
                note="period estimate"
              />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-bold text-slate-900">
                  Period Distance Comparison
                </h3>

                <div className="mt-5 space-y-5">
                  <CompareBar
                    label="Dynamic"
                    value={`${history.dynamicDistanceKm.toFixed(2)} km`}
                    width={barWidth(
                      history.dynamicDistanceKm,
                      historyMaxDistance
                    )}
                    highlight
                  />
                  <CompareBar
                    label="Static"
                    value={`${history.staticDistanceKm.toFixed(2)} km`}
                    width={barWidth(history.staticDistanceKm, historyMaxDistance)}
                  />
                </div>

                <div className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  Distance saved: {history.distanceSavedKm.toFixed(2)} km (
                  {history.distanceImprovementPct}% improvement)
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-bold text-slate-900">
                  Period Time Comparison
                </h3>

                <div className="mt-5 space-y-5">
                  <CompareBar
                    label="Dynamic"
                    value={formatMinutes(history.dynamicTimeMin)}
                    width={barWidth(history.dynamicTimeMin, historyMaxTime)}
                    highlight
                  />
                  <CompareBar
                    label="Static"
                    value={formatMinutes(history.staticTimeMin)}
                    width={barWidth(history.staticTimeMin, historyMaxTime)}
                  />
                </div>

                <div className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  Time saved: {formatMinutes(history.timeSavedMin)} (
                  {history.timeImprovementPct}% improvement)
                </div>
              </div>
            </div>

            {history.routesCount === 0 && (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                No saved route records are available for {history.periodLabel}.
                Generate and save more scenarios to populate this historical
                report.
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Selected Route Stops
            </h2>

            <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-2">
              {selectedRoute.stops.map((stop, index) => (
                <div
                  key={`${stop.binId}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div>
                    <div className="font-bold text-slate-900">
                      {index + 1}. {stop.binId}
                    </div>
                    <div className="text-sm text-slate-600">
                      Fill: {stop.fillPct}% → {stop.afterFillPct}% after
                      collection
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {stop.risk} risk • {stop.shiftWindow || "—"}
                    </div>
                  </div>

                  <div className="text-sm font-semibold text-slate-700">
                    {stop.eta}
                  </div>
                </div>
              ))}

              {selectedRoute.stops.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                  No stops available for this route view.
                </div>
              )}
            </div>
          </section>
        </main>

        <aside className="col-span-12 xl:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Selected Route Summary
            </h2>

            <div className="mt-5 space-y-4">
              <SummaryBox label="Route type" value={selectedRoute.title} />
              <SummaryBox label="Truck" value={selectedRoute.truckLabel} />
              <SummaryBox
                label="Threshold"
                value={`${selectedRoute.threshold}%`}
              />
              <SummaryBox
                label="Stops shown"
                value={String(selectedRoute.totalBins)}
              />
              <SummaryBox
                label="Collected waste"
                value={`${selectedRoute.collectedWasteKg} kg`}
              />
              <SummaryBox
                label="Capacity left"
                value={`${selectedRoute.remainingCapacityKg} kg`}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-bold text-slate-900">{value}</div>
      <div className="mt-2 text-xs text-slate-500">{note}</div>
    </div>
  );
}

function CompareBar({
  label,
  value,
  width,
  highlight = false,
}: {
  label: string;
  value: string;
  width: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="font-bold text-slate-900">{value}</span>
      </div>
      <div className="h-3 rounded-full bg-slate-200">
        <div
          className={
            "h-3 rounded-full " + (highlight ? "bg-emerald-500" : "bg-slate-950")
          }
          style={{ width }}
        />
      </div>
    </div>
  );
}

function CapacityCard({ route }: { route: NormalizedRoute }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-lg font-bold text-slate-900">{route.title}</div>
          <div className="mt-1 text-sm text-slate-600">Collected waste</div>
        </div>
        <div className="text-2xl font-bold text-slate-900">
          {route.collectedWasteKg} kg
        </div>
      </div>

      <div className="mt-5 h-3 rounded-full bg-slate-200">
        <div
          className="h-3 rounded-full bg-emerald-500"
          style={{ width: `${route.capacityUsedPct}%` }}
        />
      </div>

      <div className="mt-3 text-sm text-slate-600">
        {route.capacityUsedPct}% used • {route.remainingCapacityKg} kg remaining
      </div>
    </div>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 font-bold text-slate-900">{value}</div>
    </div>
  );
}