import { bins } from "@/lib/bins";
import type { RouteStop } from "@/lib/routesData";

export type GoalValue = "distance" | "time" | "overflow";
export type ZoneValue = "All" | "East" | "West";

export type PlannerFilters = {
  zone: ZoneValue;
  threshold: number;
  truckLabel: string;
  truckCapacityKg: number;
  shiftStart: string;
  shiftEnd: string;
  goal: GoalValue;
  autoSelect: boolean;
  manualBinId?: string;
};

export type DriverStopStatus = "pending" | "current" | "completed" | "issue";

export type DriverStop = {
  id: string;
  binId: string;
  placeName: string;
  fillPct: number;
  distanceKm: number;
  etaMin: number;
  address: string;
  lat: number;
  lng: number;
  status: DriverStopStatus;
};

export type DriverRoute = {
  routeId: string;
  totalStops: number;
  estDuration: string;
  binsToCollect: number;
  truckCapacityPct: number;
  stops: DriverStop[];
};

export type RoutePlan = {
  mode: "static" | "dynamic";
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

export type RouteComparison = {
  distanceDeltaPct: number;
  timeDeltaPct: number;
  binsDeltaPct: number;
  overflowDelta: number;
};

export type OptimizationSession = {
  filters: PlannerFilters;
  baselinePlan: RoutePlan;
  dynamicPlan: RoutePlan;
  comparison: RouteComparison;
  approvedPlan: "baseline" | "dynamic" | null;
  savedAt: string;
};

const BIN_CAPACITY_KG = 440;
const CAMPUS_SPEED_KMPH = 20;
const MAX_STOPS_PER_TRIP = 6;
const MAX_ROUTE_DURATION_MIN = 120;
const SERVICE_TIME_BIN_MIN = 3;

const DEPOT = {
  lat: 26.3898,
  lng: 50.1905,
};

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

function estimateTravelMin(distanceKm: number) {
  return Math.round((distanceKm / CAMPUS_SPEED_KMPH) * 60);
}

function demandKg(fillPct: number) {
  return Math.round((fillPct / 100) * BIN_CAPACITY_KG);
}

function durationLabel(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours}h ${mins}m`;
}

function etaFromMinutes(start: string, minutesToAdd: number) {
  const [h, m] = start.split(":").map(Number);
  const totalMinutes = h * 60 + m + minutesToAdd;
  const hh24 = Math.floor((totalMinutes % (24 * 60)) / 60);
  const mm = totalMinutes % 60;
  const suffix = hh24 >= 12 ? "PM" : "AM";
  const hh12 = hh24 % 12 === 0 ? 12 : hh24 % 12;
  return `${String(hh12).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${suffix}`;
}

function riskLabel(fillPct: number): "Low" | "Medium" | "High" {
  if (fillPct >= 80) return "High";
  if (fillPct >= 60) return "Medium";
  return "Low";
}

function normalizePosition(
  lat: number,
  lng: number,
  referenceBins: typeof bins
): { leftPct: number; topPct: number } {
  const lats = referenceBins.map((b) => b.lat);
  const lngs = referenceBins.map((b) => b.lng);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latRange = maxLat - minLat || 1;
  const lngRange = maxLng - minLng || 1;

  const leftPct = 12 + ((lng - minLng) / lngRange) * 70;
  const topPct = 12 + (1 - (lat - minLat) / latRange) * 70;

  return {
    leftPct: Number(leftPct.toFixed(1)),
    topPct: Number(topPct.toFixed(1)),
  };
}

function scopedBins(zone: ZoneValue) {
  if (zone === "All") return bins;
  return bins.filter((b) => b.side === zone);
}

function getAverageFill(selected: typeof bins) {
  if (selected.length === 0) return 0;
  return Math.round(selected.reduce((sum, b) => sum + b.fillPct, 0) / selected.length);
}

function getStaticCandidates(filters: PlannerFilters) {
  const available = scopedBins(filters.zone);

  if (!filters.autoSelect && filters.manualBinId) {
    return available.filter((b) => b.id === filters.manualBinId);
  }

  return [...available]
    .filter((b) => b.fillPct >= filters.threshold)
    .sort((a, b) => {
      const distA = haversineKm(DEPOT.lat, DEPOT.lng, a.lat, a.lng);
      const distB = haversineKm(DEPOT.lat, DEPOT.lng, b.lat, b.lng);
      return distA - distB;
    });
}

function getDynamicCandidates(filters: PlannerFilters) {
  const available = scopedBins(filters.zone);

  if (!filters.autoSelect && filters.manualBinId) {
    return available.filter((b) => b.id === filters.manualBinId);
  }

  return [...available]
    .filter((b) => b.fillPct >= filters.threshold)
    .sort((a, b) => {
      if (filters.goal === "overflow") {
        if (b.fillPct !== a.fillPct) return b.fillPct - a.fillPct;
      }

      const distA = haversineKm(DEPOT.lat, DEPOT.lng, a.lat, a.lng);
      const distB = haversineKm(DEPOT.lat, DEPOT.lng, b.lat, b.lng);

      if (filters.goal === "distance" || filters.goal === "time") {
        if (distA !== distB) return distA - distB;
      }

      return b.fillPct - a.fillPct;
    });
}

function buildPlan(
  filters: PlannerFilters,
  mode: "static" | "dynamic"
): RoutePlan {
  const available = scopedBins(filters.zone);
  const selected =
    mode === "static"
      ? getStaticCandidates(filters)
      : getDynamicCandidates(filters);

  let currentLat = DEPOT.lat;
  let currentLng = DEPOT.lng;
  let currentLoadKg = 0;
  let totalDistanceKm = 0;
  let totalTimeMin = 0;

  const plannerStops: RouteStop[] = [];
  const driverStops: DriverStop[] = [];

  for (const bin of selected) {
    if (plannerStops.length >= MAX_STOPS_PER_TRIP) break;

    const legKm = haversineKm(currentLat, currentLng, bin.lat, bin.lng);
    const travelMin = estimateTravelMin(legKm);
    const binDemandKg = demandKg(bin.fillPct);

    if (currentLoadKg + binDemandKg > filters.truckCapacityKg) break;
    if (totalTimeMin + travelMin + SERVICE_TIME_BIN_MIN > MAX_ROUTE_DURATION_MIN) break;

    totalDistanceKm += legKm;
    totalTimeMin += travelMin + SERVICE_TIME_BIN_MIN;
    currentLoadKg += binDemandKg;

    const priority = plannerStops.length + 1;
    const pos = normalizePosition(bin.lat, bin.lng, available);

    plannerStops.push({
      id: String(priority),
      binId: bin.id,
      fillPct: bin.fillPct,
      forecastPct: bin.fillPct,
      eta: etaFromMinutes(filters.shiftStart, totalTimeMin),
      fillInHours: mode === "dynamic" ? "Now" : "Scheduled",
      risk: riskLabel(bin.fillPct),
      priority,
      topPct: pos.topPct,
      leftPct: pos.leftPct,
    });

    driverStops.push({
      id: `stop-${priority}`,
      binId: bin.id,
      placeName: bin.placeName,
      fillPct: bin.fillPct,
      distanceKm: Number(legKm.toFixed(2)),
      etaMin: totalTimeMin,
      address: `${bin.placeName}, ${bin.side} Campus, IAU`,
      lat: bin.lat,
      lng: bin.lng,
      status: priority === 1 ? "current" : "pending",
    });

    currentLat = bin.lat;
    currentLng = bin.lng;
  }

  return {
    mode,
    kpis: {
      totalActiveBins: available.length,
      binsAbove80: available.filter((b) => b.fillPct >= 80).length,
      selectedBins: plannerStops.length,
      averageFillLevel: getAverageFill(available),
      overThreshold: selected.length,
    },
    summary: {
      totalBins: plannerStops.length,
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
      estimatedTimeMin: totalTimeMin,
      overflowPrevented: plannerStops.length,
    },
    routeStops: plannerStops,
    driverRoute: {
      routeId: `${mode.toUpperCase()}-${Date.now()}`,
      totalStops: driverStops.length,
      estDuration: durationLabel(totalTimeMin),
      binsToCollect: driverStops.length,
      truckCapacityPct:
        filters.truckCapacityKg > 0
          ? Math.min(100, Math.round((currentLoadKg / filters.truckCapacityKg) * 100))
          : 0,
      stops: driverStops,
    },
  };
}

export function generateStaticRoute(filters: PlannerFilters) {
  return buildPlan(filters, "static");
}

export function generateDynamicRoute(filters: PlannerFilters) {
  return buildPlan(filters, "dynamic");
}

export function comparePlans(
  baselinePlan: RoutePlan,
  dynamicPlan: RoutePlan
): RouteComparison {
  const baseDist = baselinePlan.summary.totalDistanceKm || 1;
  const baseTime = baselinePlan.summary.estimatedTimeMin || 1;
  const baseBins = baselinePlan.summary.totalBins || 1;

  return {
    distanceDeltaPct: Number(
      (((dynamicPlan.summary.totalDistanceKm - baselinePlan.summary.totalDistanceKm) / baseDist) * 100).toFixed(2)
    ),
    timeDeltaPct: Number(
      (((dynamicPlan.summary.estimatedTimeMin - baselinePlan.summary.estimatedTimeMin) / baseTime) * 100).toFixed(2)
    ),
    binsDeltaPct: Number(
      (((dynamicPlan.summary.totalBins - baselinePlan.summary.totalBins) / baseBins) * 100).toFixed(2)
    ),
    overflowDelta:
      dynamicPlan.summary.overflowPrevented - baselinePlan.summary.overflowPrevented,
  };
}