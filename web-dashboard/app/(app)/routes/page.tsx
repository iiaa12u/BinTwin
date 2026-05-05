"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import DashboardMap, { type PlannedStop } from "@/components/DashboardMap";
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

type ZoneValue = "All" | "East" | "West";
type GoalValue = "distance" | "time" | "overflow";
type ViewMode = "dynamic" | "baseline";
type StaticWindowView = "all" | "window1" | "window2";
type RouteRisk = "Low" | "Medium" | "High";
type RouteGeometry = any;

type RouteStop = {
  id: string;
  binId: string;
  fillPct: number;
  forecastPct: number;
  afterFillPct?: number;
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
  afterFillPct?: number;
  distanceKm: number;
  etaMin: number;
  eta?: string;
  shiftWindow?: string;
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
  routeGeometry: RouteGeometry;
  driverRoute: DriverRoute;
};

type OptimizationSession = {
  filters: {
    dataMode: DataSourceMode;
    selectedDateTime: string;
    zone: ZoneValue;
    threshold: number;
    truckLabel: string;
    truckCapacityKg: number;
    shiftStart: string;
    shiftEnd: string;
    goal: GoalValue;
    autoSelect: boolean;
    manualBinId: string;
    forecastHorizon: string;
  };
  baselinePlan: RoutePlan | null;
  dynamicPlan: RoutePlan | null;
  approvedPlan: RoutePlan | null;
  savedAt: string;
};

type LocalRouteMode = "dynamic" | "static";

type PlanBuildOptions = {
  mode: LocalRouteMode;
  bins: UnifiedBinRecord[];
  zone: ZoneValue;
  threshold: number;
  shiftStart: string;
  shiftEnd: string;
  autoSelect: boolean;
  manualBinId: string;
};

const REAL_TRUCK_CAPACITY_KG = 2500;
const TRUCK_LABEL = "Truck Alpha (2500kg)";

const STATIC_WINDOW_1 = "15:00–17:00";
const STATIC_WINDOW_2 = "20:00–22:00";
const STATIC_SHIFT_START = "15:00";
const STATIC_SHIFT_END = "22:00";

const STATIC_FIXED_THRESHOLD = 75;
const RESET_FILL_AFTER_COLLECTION = 5;

const EAST_TRUCK_START = { lat: 26.39782, lng: 50.204268 };
const WEST_TRUCK_START = { lat: 26.383639, lng: 50.186365 };
const LANDFILL_POINT = { lat: 26.160087740331367, lng: 49.86990882883503 };

const BIN_CAPACITY_KG = 440;
const CAMPUS_SPEED_KMPH = 20;
const LANDFILL_SPEED_KMPH = 45;
const SERVICE_TIME_BIN_MIN = 3;
const LANDFILL_SERVICE_MIN = 15;

const MAX_DYNAMIC_STOPS = 4;
const MAX_STATIC_STOPS = 8;

function shiftMinutes(value: string, minutes: number) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

function getStaticWindowKey(stop: RouteStop): StaticWindowView {
  const label = stop.fillInHours || "";

  if (label.includes("20:00")) return "window2";
  if (label.includes("15:00")) return "window1";

  return "window1";
}

function clampPct(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getCurrentFill(bin: UnifiedBinRecord) {
  return clampPct(bin.currentFillPct ?? 0);
}

function getForecastFill(bin: UnifiedBinRecord) {
  if (
    typeof bin.forecastFillPct === "number" &&
    Number.isFinite(bin.forecastFillPct)
  ) {
    return clampPct(bin.forecastFillPct);
  }

  const current = getCurrentFill(bin);
  const boost = current >= 85 ? 7 : current >= 75 ? 6 : current >= 60 ? 5 : 3;

  return clampPct(current + boost);
}

function getScopedRecords(records: UnifiedBinRecord[], selectedZone: ZoneValue) {
  if (selectedZone === "All") return records;
  return records.filter((bin) => bin.side === selectedZone);
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;

  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);

  const q =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) *
      Math.cos(toRad(bLat)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(q));
}

function estimateTravelMin(distanceKm: number, speedKmph = CAMPUS_SPEED_KMPH) {
  return Math.max(1, Math.round((distanceKm / speedKmph) * 60));
}

function getStartPointForRoute(
  selectedZone: ZoneValue,
  selectedBins: UnifiedBinRecord[]
) {
  if (selectedZone === "East") return EAST_TRUCK_START;
  if (selectedZone === "West") return WEST_TRUCK_START;

  const first = selectedBins[0];

  if (first?.side === "West") return WEST_TRUCK_START;
  return EAST_TRUCK_START;
}

function riskFromFill(fillPct: number): RouteRisk {
  if (fillPct >= 80) return "High";
  if (fillPct >= 60) return "Medium";
  return "Low";
}

function etaFromShiftStart(start: string, minutesToAdd: number) {
  const [h, m] = start.split(":").map(Number);
  const safeH = Number.isFinite(h) ? h : 6;
  const safeM = Number.isFinite(m) ? m : 0;

  const totalMinutes = safeH * 60 + safeM + minutesToAdd;
  const hh24 = Math.floor((totalMinutes % (24 * 60)) / 60);
  const mm = totalMinutes % 60;
  const suffix = hh24 >= 12 ? "PM" : "AM";
  const hh12 = hh24 % 12 === 0 ? 12 : hh24 % 12;

  return `${String(hh12).padStart(2, "0")}:${String(mm).padStart(
    2,
    "0"
  )} ${suffix}`;
}

function durationLabel(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

function normalizeStopPosition(
  lat: number,
  lng: number,
  referenceBins: UnifiedBinRecord[]
) {
  const lats = referenceBins.map((bin) => bin.lat);
  const lngs = referenceBins.map((bin) => bin.lng);

  const minLat = Math.min(...lats, lat);
  const maxLat = Math.max(...lats, lat);
  const minLng = Math.min(...lngs, lng);
  const maxLng = Math.max(...lngs, lng);

  const latRange = maxLat - minLat || 1;
  const lngRange = maxLng - minLng || 1;

  return {
    leftPct: Number((12 + ((lng - minLng) / lngRange) * 70).toFixed(1)),
    topPct: Number((12 + (1 - (lat - minLat) / latRange) * 70).toFixed(1)),
  };
}

function buildStraightLineGeometry(
  mode: LocalRouteMode,
  selectedZone: ZoneValue,
  selectedBins: Array<{ lat: number; lng: number; side?: string }>
) {
  if (selectedBins.length === 0) {
    return {
      type: "FeatureCollection",
      features: [],
    };
  }

  const start = getStartPointForRoute(
    selectedZone,
    selectedBins as UnifiedBinRecord[]
  );

  const coordinates = [
    [start.lng, start.lat],
    ...selectedBins.map((bin) => [bin.lng, bin.lat]),
    [LANDFILL_POINT.lng, LANDFILL_POINT.lat],
  ];

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates,
        },
        properties: {
          routeType: mode,
          generatedBy: "straight-line-fallback",
        },
      },
    ],
  };
}

function inferZoneFromDriverStop(stop?: DriverStop): ZoneValue {
  if (!stop) return "All";

  if (stop.address?.includes("West")) return "West";
  if (stop.address?.includes("East")) return "East";

  return stop.lng < 50.19 ? "West" : "East";
}

async function fetchRoadRouteGeometryFromDriverStops(
  mode: LocalRouteMode,
  selectedZone: ZoneValue,
  driverStops: DriverStop[]
): Promise<RouteGeometry> {
  if (driverStops.length === 0) {
    return {
      type: "FeatureCollection",
      features: [],
    };
  }

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!token) {
    console.warn("NEXT_PUBLIC_MAPBOX_TOKEN is missing, using straight line fallback.");
    return buildStraightLineGeometry(
      mode,
      selectedZone,
      driverStops.map((stop) => ({
        lat: stop.lat,
        lng: stop.lng,
      }))
    );
  }

  const effectiveZone =
    selectedZone === "All" ? inferZoneFromDriverStop(driverStops[0]) : selectedZone;

  const start =
    effectiveZone === "West" ? WEST_TRUCK_START : EAST_TRUCK_START;

  const coordinates = [
    `${start.lng},${start.lat}`,
    ...driverStops.map((stop) => `${stop.lng},${stop.lat}`),
    `${LANDFILL_POINT.lng},${LANDFILL_POINT.lat}`,
  ].join(";");

  const url =
    `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}` +
    `?geometries=geojson&overview=full&steps=false&access_token=${token}`;

  try {
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Mapbox Directions error: ${response.status}`);
    }

    const data = await response.json();
    const geometry = data?.routes?.[0]?.geometry;

    if (!geometry) {
      throw new Error("No route geometry returned from Mapbox.");
    }

    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry,
          properties: {
            routeType: mode,
            generatedBy: "mapbox-directions",
          },
        },
      ],
    };
  } catch (error) {
    console.warn("Failed to fetch road geometry, using straight line fallback.", error);

    return buildStraightLineGeometry(
      mode,
      selectedZone,
      driverStops.map((stop) => ({
        lat: stop.lat,
        lng: stop.lng,
      }))
    );
  }
}
function binDemandKg(fillPct: number) {
  const collectedPct = Math.max(0, fillPct - RESET_FILL_AFTER_COLLECTION);
  return Math.round((collectedPct / 100) * BIN_CAPACITY_KG);
}

function getDynamicPriorityCandidates(
  available: UnifiedBinRecord[],
  selectedThreshold: number
) {
  const effectiveThreshold = Math.max(80, selectedThreshold);

  return [...available]
    .map((bin) => {
      const current = getCurrentFill(bin);
      const forecast = getForecastFill(bin);
      const start = getStartPointForRoute(bin.side as ZoneValue, [bin]);
      const distanceFromTruck = haversineKm(
        start.lat,
        start.lng,
        bin.lat,
        bin.lng
      );

      const priorityScore =
        forecast * 1.8 + current * 1.1 - distanceFromTruck * 2.5;

      return {
        bin,
        current,
        forecast,
        distanceFromTruck,
        priorityScore,
      };
    })
    .filter((item) => {
      return (
        item.forecast >= effectiveThreshold ||
        item.current >= effectiveThreshold
      );
    })
    .sort((a, b) => {
      if (b.forecast !== a.forecast) return b.forecast - a.forecast;
      if (b.current !== a.current) return b.current - a.current;
      return b.priorityScore - a.priorityScore;
    })
    .slice(0, MAX_DYNAMIC_STOPS)
    .map((item) => item.bin);
}

function getStaticScheduledCandidates(available: UnifiedBinRecord[]) {
  const scheduledThreshold = 45;

  const scheduledBins = available.filter(
    (bin) => getCurrentFill(bin) >= scheduledThreshold
  );

  const fallbackBins = [...available]
    .sort((a, b) => getCurrentFill(b) - getCurrentFill(a))
    .slice(0, MAX_STATIC_STOPS);

  const selected = scheduledBins.length > 0 ? scheduledBins : fallbackBins;

  return selected
    .slice(0, MAX_STATIC_STOPS)
    .sort((a, b) => {
      if (a.side !== b.side) return a.side === "East" ? -1 : 1;

      const aNumber = Number(String(a.id).replace(/\D/g, "")) || 0;
      const bNumber = Number(String(b.id).replace(/\D/g, "")) || 0;

      return aNumber - bNumber;
    });
}

function orderDynamicStops(
  selectedZone: ZoneValue,
  candidates: UnifiedBinRecord[]
) {
  const remaining = [...candidates];
  const ordered: UnifiedBinRecord[] = [];
  let current = getStartPointForRoute(selectedZone, remaining);

  while (remaining.length > 0) {
    remaining.sort((a, b) => {
      const scoreA =
        getForecastFill(a) * 2 -
        haversineKm(current.lat, current.lng, a.lat, a.lng) * 8;

      const scoreB =
        getForecastFill(b) * 2 -
        haversineKm(current.lat, current.lng, b.lat, b.lng) * 8;

      return scoreB - scoreA;
    });

    const next = remaining.shift();
    if (!next) break;

    ordered.push(next);
    current = { lat: next.lat, lng: next.lng };
  }

  return ordered;
}

function buildCorrectedFrontendPlan(options: PlanBuildOptions): RoutePlan {
  const available = getScopedRecords(options.bins, options.zone);

  let selectedBins: UnifiedBinRecord[] = [];

  if (!options.autoSelect && options.manualBinId) {
    selectedBins = available.filter((bin) => bin.id === options.manualBinId);
  } else if (options.mode === "dynamic") {
    selectedBins = orderDynamicStops(
      options.zone,
      getDynamicPriorityCandidates(available, options.threshold)
    );
  } else {
    selectedBins = getStaticScheduledCandidates(available);
  }

  const start = getStartPointForRoute(options.zone, selectedBins);

  let currentLat = start.lat;
  let currentLng = start.lng;
  let totalDistanceKm = 0;
  let totalTimeMin = 0;
  let currentLoadKg = 0;

  const routeStops: RouteStop[] = [];
  const driverStops: DriverStop[] = [];

  selectedBins.forEach((bin, index) => {
    const legKm = haversineKm(currentLat, currentLng, bin.lat, bin.lng);
    const travelMin = estimateTravelMin(legKm, CAMPUS_SPEED_KMPH);
    const fillPct = getCurrentFill(bin);
    const forecastPct =
      options.mode === "dynamic" ? getForecastFill(bin) : fillPct;

    const stopWindow =
      options.mode === "static"
        ? index % 2 === 0
          ? STATIC_WINDOW_1
          : STATIC_WINDOW_2
        : "Forecast-priority";

    totalDistanceKm += legKm;
    totalTimeMin += travelMin + SERVICE_TIME_BIN_MIN;
    currentLoadKg += binDemandKg(fillPct);

    const pos = normalizeStopPosition(bin.lat, bin.lng, available);
    const priority = index + 1;

    routeStops.push({
      id: String(priority),
      binId: bin.id,
      fillPct,
      forecastPct,
      afterFillPct: RESET_FILL_AFTER_COLLECTION,
      eta: etaFromShiftStart(
        options.mode === "static"
          ? index % 2 === 0
            ? STATIC_SHIFT_START
            : "20:00"
          : options.shiftStart,
        totalTimeMin
      ),
      fillInHours: stopWindow,
      risk: riskFromFill(forecastPct),
      priority,
      topPct: pos.topPct,
      leftPct: pos.leftPct,
    });

    driverStops.push({
      id: `stop-${priority}`,
      binId: bin.id,
      placeName: bin.placeName,
      fillPct,
      afterFillPct: RESET_FILL_AFTER_COLLECTION,
      distanceKm: Number(legKm.toFixed(2)),
      etaMin: totalTimeMin,
      eta: etaFromShiftStart(options.shiftStart, totalTimeMin),
      shiftWindow:
        options.mode === "static"
          ? stopWindow
          : `${options.shiftStart}–${options.shiftEnd}`,
      address: `${bin.placeName}, ${bin.side} Campus, IAU`,
      lat: bin.lat,
      lng: bin.lng,
      status: priority === 1 ? "current" : "pending",
    });

    currentLat = bin.lat;
    currentLng = bin.lng;
  });

  if (selectedBins.length > 0) {
    const landfillKm = haversineKm(
      currentLat,
      currentLng,
      LANDFILL_POINT.lat,
      LANDFILL_POINT.lng
    );

    totalDistanceKm += landfillKm;
    totalTimeMin +=
      estimateTravelMin(landfillKm, LANDFILL_SPEED_KMPH) + LANDFILL_SERVICE_MIN;
  }

  if (options.mode === "static" && selectedBins.length > 0) {
    totalTimeMin += 10 * selectedBins.length;
  }

  const averageFillLevel =
    available.length > 0
      ? Number(
          (
            available.reduce((sum, bin) => sum + getCurrentFill(bin), 0) /
            available.length
          ).toFixed(1)
        )
      : 0;

  const overflowPrevented = routeStops.filter((stop) => {
    return (options.mode === "dynamic" ? stop.forecastPct : stop.fillPct) >= 80;
  }).length;

  return {
    kpis: {
      totalActiveBins: available.length,
      binsAbove80: available.filter((bin) => getCurrentFill(bin) >= 80).length,
      selectedBins: routeStops.length,
      averageFillLevel,
      overThreshold:
        options.mode === "dynamic"
          ? available.filter((bin) => getForecastFill(bin) >= options.threshold)
              .length
          : available.filter((bin) => getCurrentFill(bin) >= STATIC_FIXED_THRESHOLD)
              .length,
    },
    summary: {
      totalBins: routeStops.length,
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
      estimatedTimeMin: totalTimeMin,
      overflowPrevented,
    },
    routeStops,
    routeGeometry: buildStraightLineGeometry(options.mode, options.zone, selectedBins),
    driverRoute: {
      routeId: `${options.mode.toUpperCase()}-${Date.now()}`,
      totalStops: driverStops.length,
      estDuration: durationLabel(totalTimeMin),
      binsToCollect: driverStops.length,
      truckCapacityPct: Math.min(
        100,
        Math.round((currentLoadKg / REAL_TRUCK_CAPACITY_KG) * 100)
      ),
      stops: driverStops,
    },
  };
}

export default function RoutesPage() {
  const router = useRouter();

  const [dataMode, setDataMode] = useState<DataSourceMode>("synthetic");
  const [loadedBins, setLoadedBins] = useState<UnifiedBinRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [minTimestamp, setMinTimestamp] = useState<string | null>(null);
  const [maxTimestamp, setMaxTimestamp] = useState<string | null>(null);
  const [selectedDateTime, setSelectedDateTime] = useState<string>("");

  const [zone, setZone] = useState<ZoneValue>("All");
  const [manualBin, setManualBin] = useState("BIN-001");

  const truck = TRUCK_LABEL;

  const [shiftStart, setShiftStart] = useState("06:00");
  const [shiftEnd, setShiftEnd] = useState("22:00");
  const [threshold, setThreshold] = useState(80);
  const [forecastHorizon, setForecastHorizon] = useState("Next 6 Hours");
  const [autoSelect, setAutoSelect] = useState(true);

  const goal: GoalValue = "distance";

  const [baselinePlan, setBaselinePlan] = useState<RoutePlan | null>(null);
  const [dynamicPlan, setDynamicPlan] = useState<RoutePlan | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("dynamic");
  const [staticWindowView, setStaticWindowView] =
    useState<StaticWindowView>("all");

  const [isLoading, setIsLoading] = useState(false);
  const [isDynamicLoading, setIsDynamicLoading] = useState(false);
  const [isBaselineLoading, setIsBaselineLoading] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

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

    async function loadSelectedBins() {
      if (!selectedDateTime) return;

      setDataLoading(true);

      const data = await loadBinsFromSource(dataMode, selectedDateTime);

      if (!cancelled) {
        setLoadedBins(data);
        setDataLoading(false);
        setBaselinePlan(null);
        setDynamicPlan(null);
      }
    }

    loadSelectedBins();

    return () => {
      cancelled = true;
    };
  }, [dataMode, selectedDateTime]);

  const { date: selectedDate, time: selectedTime } =
    splitDateTimeForInputs(selectedDateTime);

  const mapBins: BinPoint[] = useMemo(
    () =>
      loadedBins.map((bin) => ({
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
    [loadedBins]
  );

  const manualBinOptions = useMemo(() => {
    if (zone === "All") return loadedBins;
    return loadedBins.filter((bin) => bin.side === zone);
  }, [zone, loadedBins]);

  useEffect(() => {
    if (
      manualBinOptions.length > 0 &&
      !manualBinOptions.some((bin) => bin.id === manualBin)
    ) {
      setManualBin(manualBinOptions[0].id);
    }
  }, [manualBin, manualBinOptions]);

  function getFilters() {
    return {
      dataMode,
      selectedDateTime,
      zone,
      threshold,
      truckLabel: truck,
      truckCapacityKg: REAL_TRUCK_CAPACITY_KG,
      shiftStart,
      shiftEnd,
      goal,
      autoSelect,
      manualBinId: manualBin,
      forecastHorizon,
    };
  }

  function setCombinedDateTime(date: string, time: string) {
    const next = combineDateAndTime(date, time);
    const clamped = clampDateTimeToRange(next, minTimestamp, maxTimestamp);

    setSelectedDateTime(clamped);
  }

  async function fetchPlan(mode: "dynamic" | "static"): Promise<RoutePlan> {
  const correctedOptions: PlanBuildOptions = {
    mode,
    bins: loadedBins,
    zone,
    threshold: mode === "static" ? STATIC_FIXED_THRESHOLD : threshold,
    shiftStart: mode === "static" ? STATIC_SHIFT_START : shiftStart,
    shiftEnd: mode === "static" ? STATIC_SHIFT_END : shiftEnd,
    autoSelect,
    manualBinId: manualBin,
  };

  const plan = buildCorrectedFrontendPlan(correctedOptions);

  const roadGeometry = await fetchRoadRouteGeometryFromDriverStops(
    mode,
    correctedOptions.zone,
    plan.driverRoute.stops
  );

  return {
    ...plan,
    routeGeometry: roadGeometry,
  };
}

  async function buildSession(preferredView: ViewMode = viewMode) {
    setIsLoading(true);
    setIsDynamicLoading(true);
    setIsBaselineLoading(true);
    setBackendError(null);

    setDynamicPlan(null);
    setBaselinePlan(null);

    try {
      const [dynamic, baseline] = await Promise.all([
        fetchPlan("dynamic"),
        fetchPlan("static"),
      ]);

      setDynamicPlan(dynamic);
      setBaselinePlan(baseline);

      setViewMode(preferredView);

      const session: OptimizationSession = {
        filters: {
          ...getFilters(),
          threshold:
            preferredView === "baseline" ? STATIC_FIXED_THRESHOLD : threshold,
        },
        baselinePlan: baseline,
        dynamicPlan: dynamic,
        approvedPlan: preferredView === "dynamic" ? dynamic : baseline,
        savedAt: new Date().toISOString(),
      };

      localStorage.setItem("optimizationSession", JSON.stringify(session));
      localStorage.removeItem("selectedScenario");

      return session;
    } catch (error) {
      console.error(error);
      setBackendError("Failed to generate routes.");
      return null;
    } finally {
      setIsDynamicLoading(false);
      setIsBaselineLoading(false);
      setIsLoading(false);
    }
  }

  async function handleGenerateRoute() {
    await buildSession(viewMode);
  }

  async function handleSendToDriver() {
    let selectedPlan = viewMode === "dynamic" ? dynamicPlan : baselinePlan;

    if (!selectedPlan) {
      const session = await buildSession(viewMode);
      if (!session) return;

      selectedPlan =
        viewMode === "dynamic" ? session.dynamicPlan : session.baselinePlan;

      if (!selectedPlan) return;
    }

    localStorage.setItem(
      "driverRouteState",
      JSON.stringify(selectedPlan.driverRoute)
    );
    localStorage.setItem(
      "activeDriverRoute",
      JSON.stringify(selectedPlan.driverRoute)
    );
    localStorage.setItem("driverRoute", JSON.stringify(selectedPlan.driverRoute));
    localStorage.setItem(
      "currentDriverRoute",
      JSON.stringify(selectedPlan.driverRoute)
    );

    alert("Route sent to driver successfully.");
    router.push("/driver");
  }

  async function handleSaveScenario() {
    let selectedPlan = viewMode === "dynamic" ? dynamicPlan : baselinePlan;

    if (!selectedPlan) {
      const session = await buildSession(viewMode);
      if (!session) return;

      selectedPlan =
        viewMode === "dynamic" ? session.dynamicPlan : session.baselinePlan;

      if (!selectedPlan) return;
    }

    const scenarioPayload = {
      id: `scenario-${Date.now()}`,
      name:
        viewMode === "dynamic"
          ? "Dynamic Forecast-Aware Route"
          : "Static Fixed Baseline",
      type: viewMode === "dynamic" ? "dynamic" : "static",
      routeType:
        viewMode === "dynamic"
          ? "Dynamic Forecast-Aware"
          : "Static Fixed Baseline",
      createdAt: new Date().toISOString(),
      dataMode,
      selectedDateTime,
      zone,
      threshold: viewMode === "dynamic" ? threshold : STATIC_FIXED_THRESHOLD,
      truck: TRUCK_LABEL,
      truckCapacityKg: REAL_TRUCK_CAPACITY_KG,
      dynamicOperatingWindow:
        viewMode === "dynamic" ? `${shiftStart}–${shiftEnd}` : null,
      staticScheduledWindows:
        viewMode === "baseline" ? [STATIC_WINDOW_1, STATIC_WINDOW_2] : null,
      selectedStaticWindow: viewMode === "baseline" ? staticWindowView : null,
      summary: selectedPlan.summary,
      routeStops: selectedPlan.routeStops,
      routeGeometry: selectedPlan.routeGeometry,
      driverRoute: selectedPlan.driverRoute,
      baselinePlan,
      dynamicPlan,
      approvedPlan: selectedPlan,
    };

    const session: OptimizationSession = {
      filters: {
        ...getFilters(),
        threshold: viewMode === "baseline" ? STATIC_FIXED_THRESHOLD : threshold,
      },
      baselinePlan,
      dynamicPlan,
      approvedPlan: selectedPlan,
      savedAt: new Date().toISOString(),
    };

    const existingScenariosRaw = localStorage.getItem("savedScenarios");
    let existingScenarios = [];

    try {
      existingScenarios = existingScenariosRaw
        ? JSON.parse(existingScenariosRaw)
        : [];
    } catch {
      existingScenarios = [];
    }

    localStorage.setItem("optimizationSession", JSON.stringify(session));
    localStorage.setItem("selectedScenario", JSON.stringify(scenarioPayload));
    localStorage.setItem(
      "savedScenarios",
      JSON.stringify([scenarioPayload, ...existingScenarios])
    );

    router.push("/scenarios");
  }

  function handleExportRoute() {
    const selectedPlan = viewMode === "dynamic" ? dynamicPlan : baselinePlan;

    if (!selectedPlan) {
      alert("Please generate a route first.");
      return;
    }

    const exportData = {
      routeType:
        viewMode === "dynamic"
          ? "Dynamic Forecast-Aware"
          : "Static Fixed Baseline",
      truck: TRUCK_LABEL,
      truckCapacityKg: REAL_TRUCK_CAPACITY_KG,
      generatedAt: new Date().toISOString(),
      dataMode,
      selectedDateTime,
      zone,
      threshold: viewMode === "dynamic" ? threshold : STATIC_FIXED_THRESHOLD,
      dynamicOperatingWindow:
        viewMode === "dynamic" ? `${shiftStart} to ${shiftEnd}` : null,
      staticScheduledWindows:
        viewMode === "baseline" ? [STATIC_WINDOW_1, STATIC_WINDOW_2] : null,
      selectedStaticWindow: viewMode === "baseline" ? staticWindowView : null,
      summary: selectedPlan.summary,
      routeStops: selectedPlan.routeStops,
      driverRoute: selectedPlan.driverRoute,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download =
      viewMode === "dynamic"
        ? "dynamic-route-bintwin.json"
        : "static-baseline-route-bintwin.json";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  const hasGenerated = baselinePlan !== null || dynamicPlan !== null;
  const displayPlan = viewMode === "dynamic" ? dynamicPlan : baselinePlan;

  const effectiveThreshold =
    viewMode === "dynamic" ? threshold : STATIC_FIXED_THRESHOLD;

  const localKpis = useMemo(() => {
    const activeThreshold =
      viewMode === "dynamic" ? threshold : STATIC_FIXED_THRESHOLD;

    const totalActiveBins = loadedBins.length;

    const binsAbove80 = loadedBins.filter(
      (bin) => (bin.currentFillPct ?? 0) >= 80
    ).length;

    const averageFillLevel =
      loadedBins.length > 0
        ? Number(
            (
              loadedBins.reduce(
                (sum, bin) => sum + (bin.currentFillPct ?? 0),
                0
              ) / loadedBins.length
            ).toFixed(1)
          )
        : 0;

    const overThreshold = loadedBins.filter((bin) => {
      const decisionFill =
        dataMode === "real"
          ? bin.forecastFillPct ?? bin.currentFillPct ?? 0
          : bin.currentFillPct ?? 0;

      return decisionFill >= activeThreshold;
    }).length;

    return {
      totalActiveBins,
      binsAbove80,
      selectedBins: overThreshold,
      averageFillLevel,
      overThreshold,
    };
  }, [loadedBins, threshold, dataMode, viewMode]);

  const displayKpis = displayPlan?.kpis ?? localKpis;

  const displaySummary = displayPlan?.summary ?? {
    totalBins: 0,
    totalDistanceKm: 0,
    estimatedTimeMin: 0,
    overflowPrevented: 0,
  };

  const displayStops = displayPlan?.routeStops ?? [];
  const displayRouteGeometry = displayPlan?.routeGeometry ?? null;

  const staticWindow1Stops = displayStops.filter(
    (stop) => getStaticWindowKey(stop) === "window1"
  );

  const staticWindow2Stops = displayStops.filter(
    (stop) => getStaticWindowKey(stop) === "window2"
  );

  const visibleStops =
    viewMode === "baseline"
      ? staticWindowView === "window1"
        ? staticWindow1Stops
        : staticWindowView === "window2"
        ? staticWindow2Stops
        : displayStops
      : displayStops;

  const plannedStopsForMap: PlannedStop[] = visibleStops
    .map((stop) => {
      const bin = mapBins.find((b) => b.id === stop.binId);
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

  const dynamicTabDisabled = !dynamicPlan && !isDynamicLoading;

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
                <DataSourceToggle value={dataMode} onChange={setDataMode} />

                <DataTimelineControls
                  loading={dataLoading}
                  minTimestamp={minTimestamp}
                  maxTimestamp={maxTimestamp}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  onDateChange={(date) =>
                    setCombinedDateTime(date, selectedTime)
                  }
                  onTimeChange={(time) =>
                    setCombinedDateTime(selectedDate, time)
                  }
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

                <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-3">
                  <div className="text-sm font-semibold text-gray-900">
                    Assigned Truck
                  </div>
                  <div className="mt-1 text-sm text-gray-700">Truck Alpha</div>
                  <div className="mt-1 text-xs text-gray-500">
                    Capacity: 2500 kg • Fixed real truck capacity
                  </div>
                </div>

                <div>
                  {viewMode === "dynamic" ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                      <div className="text-sm font-semibold text-emerald-900">
                        Dynamic Flexible Operating Window
                      </div>

                      <p className="mt-1 text-xs text-emerald-700">
                        Dynamic routing can dispatch when needed within this
                        operating window based on forecast and bin priority.
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Start Time
                          </label>
                          <input
                            value={shiftStart}
                            onChange={(e) => setShiftStart(e.target.value)}
                            className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            End Time
                          </label>
                          <input
                            value={shiftEnd}
                            onChange={(e) => setShiftEnd(e.target.value)}
                            className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                          />
                        </div>
                      </div>

                      <div className="mt-3 rounded-md bg-white px-3 py-2 text-xs text-gray-600">
                        Current dynamic operating window:{" "}
                        <span className="font-semibold text-gray-900">
                          {shiftStart}–{shiftEnd}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="text-sm font-semibold text-slate-900">
                        Static Scheduled Collection Windows
                      </div>

                      <p className="mt-1 text-xs text-slate-600">
                        Static baseline follows fixed scheduled collection
                        windows and does not adapt to forecasts.
                      </p>

                      <div className="mt-3 grid grid-cols-1 gap-2">
                        <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                          <div className="text-xs font-medium text-gray-500">
                            Window 1
                          </div>
                          <div className="text-sm font-semibold text-gray-900">
                            {STATIC_WINDOW_1}
                          </div>
                        </div>

                        <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                          <div className="text-xs font-medium text-gray-500">
                            Window 2
                          </div>
                          <div className="text-sm font-semibold text-gray-900">
                            {STATIC_WINDOW_2}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  {viewMode === "dynamic" ? (
                    <div>
                      <div className="mb-1 text-sm font-medium text-gray-800">
                        Dynamic Service Threshold (collect above {threshold}%)
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
                      <p className="mt-1 text-xs text-gray-500">
                        Dynamic threshold is adjustable because the route reacts
                        to bin priority and forecast.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="text-sm font-semibold text-slate-900">
                        Static Fixed Threshold
                      </div>
                      <div className="mt-2 text-2xl font-bold text-gray-900">
                        {STATIC_FIXED_THRESHOLD}%
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        Static baseline uses a fixed threshold and does not adapt
                        to forecast changes.
                      </p>
                    </div>
                  )}
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
                  Dynamic uses a flexible 06:00–22:00 operating window and
                  adjustable threshold. Static uses fixed scheduled windows and a
                  fixed 75% threshold for comparison.
                </p>

                {backendError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {backendError}
                  </div>
                )}

                <button
                  onClick={handleGenerateRoute}
                  disabled={isLoading || dataLoading || loadedBins.length === 0}
                  className="mt-2 w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading
                    ? "Generating Both Routes..."
                    : viewMode === "dynamic"
                    ? "Generate Dynamic Route"
                    : "Generate Static Baseline"}
                </button>
              </div>
            </div>
          </aside>

          <section className="col-span-12 xl:col-span-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">
                Routes ({dataMode === "real" ? "Real + Forecast" : "Synthetic"})
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => dynamicPlan && setViewMode("dynamic")}
                  disabled={dynamicTabDisabled}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                    viewMode === "dynamic"
                      ? "bg-emerald-500 text-white"
                      : "border border-gray-200 bg-white"
                  } ${
                    dynamicTabDisabled ? "cursor-not-allowed opacity-50" : ""
                  }`}
                >
                  {isDynamicLoading ? "Dynamic..." : "Dynamic Forecast-Aware"}
                </button>

                <button
                  onClick={async () => {
                    if (baselinePlan) {
                      setViewMode("baseline");
                      return;
                    }

                    try {
                      setIsBaselineLoading(true);
                      setBackendError(null);

                      const plan = await fetchPlan("static");

                      setBaselinePlan(plan);
                      setViewMode("baseline");
                    } catch (error) {
                      console.error("Static route error:", error);
                      setBackendError("Static baseline failed.");
                    } finally {
                      setIsBaselineLoading(false);
                    }
                  }}
                  disabled={isBaselineLoading}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                    viewMode === "baseline"
                      ? "bg-slate-900 text-white"
                      : "border border-gray-200 bg-white"
                  } ${
                    isBaselineLoading ? "cursor-not-allowed opacity-50" : ""
                  }`}
                >
                  {isBaselineLoading ? "Static..." : "Static Fixed Baseline"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <KpiCard
                label="Total Active Bins"
                value={displayKpis.totalActiveBins}
              />
              <KpiCard
                label="Bins > 80%"
                value={displayKpis.binsAbove80}
                accent="red"
              />
              <KpiCard
                label={
                  viewMode === "baseline" && staticWindowView !== "all"
                    ? "Window Bins"
                    : "Selected Bins"
                }
                value={
                  viewMode === "baseline" && staticWindowView !== "all"
                    ? visibleStops.length
                    : displayKpis.selectedBins
                }
              />
              <KpiCard
                label="Average Fill Level"
                value={`${displayKpis.averageFillLevel}%`}
              />
              <KpiCard
                label={`Above ${effectiveThreshold}%`}
                value={displayKpis.overThreshold}
              />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <DashboardMap
                bins={mapBins}
                plannedStops={plannedStopsForMap}
                routeGeometry={displayRouteGeometry}
                showRoute={hasGenerated}
              />
            </div>
          </section>

          <aside className="col-span-12 xl:col-span-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                {viewMode === "dynamic"
                  ? "Dynamic Forecast-Aware Route"
                  : "Static Fixed Baseline"}
              </h2>

              {viewMode === "dynamic" ? (
                <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm">
                  <div className="font-semibold text-emerald-900">
                    Flexible Operating Window
                  </div>
                  <div className="mt-1 text-emerald-800">
                    {shiftStart}–{shiftEnd}
                  </div>
                  <div className="mt-1 text-xs text-emerald-700">
                    Dispatches are created only when needed based on forecast and
                    bin priority.
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div className="font-semibold text-slate-900">
                    Scheduled Collection Windows
                  </div>
                  <div className="mt-2 text-slate-800">
                    Window 1: {STATIC_WINDOW_1}
                  </div>
                  <div className="mt-1 text-slate-800">
                    Window 2: {STATIC_WINDOW_2}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    Static uses fixed times and does not change based on
                    forecast.
                  </div>
                </div>
              )}

              <div className="mt-3 text-sm text-gray-600">
                Selected Truck: {truck}
              </div>

              <div className="mt-1 text-sm text-gray-600">
                Threshold: {effectiveThreshold}%
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {viewMode === "baseline" && staticWindowView !== "all" ? (
                  <>
                    <MiniCard
                      label="Window Bins"
                      value={String(visibleStops.length)}
                    />
                    <MiniCard
                      label="Collection Window"
                      value={
                        staticWindowView === "window1"
                          ? STATIC_WINDOW_1
                          : STATIC_WINDOW_2
                      }
                    />
                    <MiniCard
                      label="Window Type"
                      value={
                        staticWindowView === "window1"
                          ? "First Run"
                          : "Second Run"
                      }
                    />
                    <MiniCard
                      label="Window Stops"
                      value={String(visibleStops.length)}
                    />
                  </>
                ) : (
                  <>
                    <MiniCard
                      label="Total Bins"
                      value={String(displaySummary.totalBins)}
                    />
                    <MiniCard
                      label="Total Distance"
                      value={`${displaySummary.totalDistanceKm} km`}
                    />
                    <MiniCard
                      label="Estimated Time"
                      value={`${displaySummary.estimatedTimeMin} min`}
                    />
                    <MiniCard
                      label={
                        viewMode === "dynamic"
                          ? "Overflow Prevented"
                          : "Scheduled Stops"
                      }
                      value={String(displaySummary.overflowPrevented)}
                    />
                  </>
                )}
              </div>

              <div className="mt-6 border-t border-gray-200 pt-5">
                <h3 className="text-lg font-semibold text-gray-900">
                  Route Steps ({visibleStops.length} Stops)
                </h3>

                {viewMode === "baseline" && displayStops.length > 0 && (
                  <div className="mt-3 flex gap-2 rounded-lg bg-slate-50 p-1">
                    <button
                      onClick={() => setStaticWindowView("all")}
                      className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold ${
                        staticWindowView === "all"
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-white"
                      }`}
                    >
                      All
                    </button>

                    <button
                      onClick={() => setStaticWindowView("window1")}
                      className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold ${
                        staticWindowView === "window1"
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-white"
                      }`}
                    >
                      Window 1
                    </button>

                    <button
                      onClick={() => setStaticWindowView("window2")}
                      className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold ${
                        staticWindowView === "window2"
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-white"
                      }`}
                    >
                      Window 2
                    </button>
                  </div>
                )}

                <div className="mt-4 space-y-4">
                  {displayStops.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                      No route yet. Generate a route first.
                    </div>
                  ) : viewMode === "baseline" ? (
                    <>
                      {(staticWindowView === "all" ||
                        staticWindowView === "window1") && (
                        <StaticWindowGroup
                          title="Window 1"
                          time={STATIC_WINDOW_1}
                          stops={staticWindow1Stops}
                        />
                      )}

                      {(staticWindowView === "all" ||
                        staticWindowView === "window2") && (
                        <StaticWindowGroup
                          title="Window 2"
                          time={STATIC_WINDOW_2}
                          stops={staticWindow2Stops}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                        Dynamic window:{" "}
                        <span className="font-semibold">
                          {shiftStart}–{shiftEnd}
                        </span>
                      </div>

                      {displayStops.map((stop) => (
                        <RouteStopRow key={stop.id} stop={stop} />
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  onClick={handleSendToDriver}
                  disabled={!displayPlan}
                  className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Send to Driver
                </button>

                <button
                  onClick={handleExportRoute}
                  disabled={!displayPlan}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Export Route
                </button>

                <button
                  onClick={handleSaveScenario}
                  disabled={!displayPlan}
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
  children: ReactNode;
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
      <div className="text-3xl font-bold tracking-tight text-gray-900">
        {value}
      </div>
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

function StaticWindowGroup({
  title,
  time,
  stops,
}: {
  title: string;
  time: string;
  stops: RouteStop[];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-slate-900">{title}</div>
          <div className="text-xs text-slate-600">{time}</div>
        </div>

        <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
          {stops.length} stops
        </div>
      </div>

      <div className="space-y-4">
        {stops.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-500">
            No scheduled stops in this window.
          </div>
        ) : (
          stops.map((stop) => <RouteStopRow key={stop.id} stop={stop} />)
        )}
      </div>
    </div>
  );
}

function RouteStopRow({ stop }: { stop: RouteStop }) {
  const afterFill = stop.afterFillPct ?? RESET_FILL_AFTER_COLLECTION;

  return (
    <div className="flex items-start justify-between gap-3">
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
            Fill: {stop.fillPct}% → {afterFill}% after collection
          </div>
          <div className="text-xs text-gray-500">
            {stop.risk} Risk • {stop.fillInHours}
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-600">{stop.eta}</div>
    </div>
  );
}