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
  currentFillPct?: number;
  afterFillPct?: number;
  distanceKm: number;
  etaMin: number;
  eta?: string;
  shiftWindow?: string;
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
  routeGeometry?: any;
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

type BinPoint = (typeof bins)[number];

type EngineRouteStop = RouteStop & {
  afterFillPct?: number;
};

const BIN_CAPACITY_KG = 440;
const CAMPUS_SPEED_KMPH = 20;

const MAX_STATIC_STOPS_PER_TRIP = 6;
const MAX_DYNAMIC_STOPS_PER_TRIP = 5;

const MAX_ROUTE_DURATION_MIN = 120;
const SERVICE_TIME_BIN_MIN = 3;
const AFTER_COLLECTION_PCT = 5;

const EAST_TRUCK = {
  lat: 26.39782,
  lng: 50.204268,
};

const WEST_TRUCK = {
  lat: 26.383639,
  lng: 50.186365,
};

const LANDFILL = {
  lat: 26.160087740331367,
  lng: 49.86990882883503,
};

function getNumberField(bin: BinPoint, key: string, fallback = 0) {
  const value = (bin as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getStartPoint(zone: ZoneValue, selected: BinPoint[]) {
  if (zone === "East") return EAST_TRUCK;
  if (zone === "West") return WEST_TRUCK;

  const first = selected[0];

  if (first?.side === "West") return WEST_TRUCK;
  return EAST_TRUCK;
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

function estimateTravelMin(distanceKm: number) {
  return Math.round((distanceKm / CAMPUS_SPEED_KMPH) * 60);
}

function collectedDemandKg(fillPct: number, afterFillPct = AFTER_COLLECTION_PCT) {
  const before = Math.max(0, Math.min(100, fillPct));
  const after = Math.max(0, Math.min(100, afterFillPct));
  const collectedPct = Math.max(0, before - after);

  return Math.round((collectedPct / 100) * BIN_CAPACITY_KG);
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

  return `${String(hh12).padStart(2, "0")}:${String(mm).padStart(
    2,
    "0"
  )} ${suffix}`;
}

function riskLabel(fillPct: number): "Low" | "Medium" | "High" {
  if (fillPct >= 80) return "High";
  if (fillPct >= 60) return "Medium";
  return "Low";
}

function normalizePosition(
  lat: number,
  lng: number,
  referenceBins: BinPoint[]
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

function getAverageFill(selected: BinPoint[]) {
  if (selected.length === 0) return 0;
  return Math.round(
    selected.reduce((sum, b) => sum + b.fillPct, 0) / selected.length
  );
}

function getForecastFill(bin: BinPoint) {
  const directForecast =
    getNumberField(bin, "forecastPct", -1) >= 0
      ? getNumberField(bin, "forecastPct", bin.fillPct)
      : getNumberField(bin, "predictedFillPct", -1) >= 0
      ? getNumberField(bin, "predictedFillPct", bin.fillPct)
      : null;

  if (directForecast !== null) {
    return Math.max(0, Math.min(100, Math.round(directForecast)));
  }

  const growthBoost =
    bin.fillPct >= 80 ? 8 : bin.fillPct >= 70 ? 6 : bin.fillPct >= 60 ? 4 : 2;

  return Math.max(0, Math.min(100, Math.round(bin.fillPct + growthBoost)));
}

function getDistanceFromStart(bin: BinPoint, zone: ZoneValue, selected: BinPoint[]) {
  const start = getStartPoint(zone, selected);
  return haversineKm(start.lat, start.lng, bin.lat, bin.lng);
}

/*
  STATIC BASELINE:
  Fixed scheduled collection.
  It does NOT behave smartly.
  It may collect bins that are not urgent, so it can use more truck capacity.
*/
function getStaticCandidates(filters: PlannerFilters) {
  const available = scopedBins(filters.zone);

  if (!filters.autoSelect && filters.manualBinId) {
    return available.filter((b) => b.id === filters.manualBinId);
  }

  const staticMinimumFill = Math.max(25, filters.threshold - 35);

  return [...available]
    .filter((b) => b.fillPct >= staticMinimumFill)
    .sort((a, b) => {
      if (a.side !== b.side) {
        return a.side === "East" ? -1 : 1;
      }

      const distA = getDistanceFromStart(a, filters.zone, available);
      const distB = getDistanceFromStart(b, filters.zone, available);

      return distA - distB;
    });
}

/*
  DYNAMIC ROUTE:
  Forecast-aware and priority-based.
  It focuses on urgent/high-value bins and avoids unnecessary scheduled stops.
*/
function getDynamicCandidates(filters: PlannerFilters) {
  const available = scopedBins(filters.zone);

  if (!filters.autoSelect && filters.manualBinId) {
    return available.filter((b) => b.id === filters.manualBinId);
  }

  const effectiveThreshold = Math.max(70, filters.threshold);

  return [...available]
    .map((bin) => {
      const forecastPct = getForecastFill(bin);
      const distanceFromStart = getDistanceFromStart(bin, filters.zone, available);

      const urgencyScore =
        forecastPct * 1.4 +
        bin.fillPct * 1.1 -
        distanceFromStart * 2;

      return {
        bin,
        forecastPct,
        distanceFromStart,
        urgencyScore,
      };
    })
    .filter((item) => {
      return (
        item.bin.fillPct >= effectiveThreshold ||
        item.forecastPct >= effectiveThreshold ||
        item.bin.fillPct >= 80
      );
    })
    .sort((a, b) => {
      if (filters.goal === "distance" || filters.goal === "time") {
        if (a.distanceFromStart !== b.distanceFromStart) {
          return a.distanceFromStart - b.distanceFromStart;
        }
      }

      if (filters.goal === "overflow") {
        if (b.forecastPct !== a.forecastPct) {
          return b.forecastPct - a.forecastPct;
        }
      }

      return b.urgencyScore - a.urgencyScore;
    })
    .map((item) => item.bin);
}

function buildRouteGeometry(
  zone: ZoneValue,
  mode: "static" | "dynamic",
  selected: DriverStop[]
) {
  if (selected.length === 0) {
    return {
      type: "FeatureCollection",
      features: [],
    };
  }

  const start = getStartPoint(
    zone,
    selected.map((stop) => {
      return {
        id: stop.binId,
        side: stop.lng < 50.19 ? "West" : "East",
        lat: stop.lat,
        lng: stop.lng,
        fillPct: stop.fillPct,
        placeName: stop.placeName,
      } as BinPoint;
    })
  );

  const coordinates = [
    [start.lng, start.lat],
    ...selected.map((stop) => [stop.lng, stop.lat]),
    [LANDFILL.lng, LANDFILL.lat],
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
        },
      },
    ],
  };
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

  const start = getStartPoint(filters.zone, selected);

  let currentLat = start.lat;
  let currentLng = start.lng;

  let currentLoadKg = 0;
  let totalDistanceKm = 0;
  let totalTimeMin = 0;

  const plannerStops: EngineRouteStop[] = [];
  const driverStops: DriverStop[] = [];

  const maxStops =
    mode === "static" ? MAX_STATIC_STOPS_PER_TRIP : MAX_DYNAMIC_STOPS_PER_TRIP;

  for (const bin of selected) {
    if (plannerStops.length >= maxStops) break;

    const legKm = haversineKm(currentLat, currentLng, bin.lat, bin.lng);
    const travelMin = estimateTravelMin(legKm);
    const binDemandKg = collectedDemandKg(bin.fillPct);

    if (currentLoadKg + binDemandKg > filters.truckCapacityKg) break;
    if (totalTimeMin + travelMin + SERVICE_TIME_BIN_MIN > MAX_ROUTE_DURATION_MIN) {
      break;
    }

    totalDistanceKm += legKm;
    totalTimeMin += travelMin + SERVICE_TIME_BIN_MIN;
    currentLoadKg += binDemandKg;

    const priority = plannerStops.length + 1;
    const pos = normalizePosition(bin.lat, bin.lng, available);
    const forecastPct = mode === "dynamic" ? getForecastFill(bin) : bin.fillPct;

    plannerStops.push({
      id: String(priority),
      binId: bin.id,
      fillPct: bin.fillPct,
      forecastPct,
      afterFillPct: AFTER_COLLECTION_PCT,
      eta: etaFromMinutes(filters.shiftStart, totalTimeMin),
      fillInHours: mode === "dynamic" ? "Forecast-priority" : "Fixed schedule",
      risk: riskLabel(forecastPct),
      priority,
      topPct: pos.topPct,
      leftPct: pos.leftPct,
    });

    driverStops.push({
      id: `stop-${priority}`,
      binId: bin.id,
      placeName: bin.placeName,
      fillPct: bin.fillPct,
      currentFillPct: bin.fillPct,
      afterFillPct: AFTER_COLLECTION_PCT,
      distanceKm: Number(legKm.toFixed(2)),
      etaMin: totalTimeMin,
      eta: etaFromMinutes(filters.shiftStart, totalTimeMin),
      shiftWindow: `${filters.shiftStart}–${filters.shiftEnd}`,
      address: `${bin.placeName}, ${bin.side} Campus, IAU`,
      lat: bin.lat,
      lng: bin.lng,
      status: priority === 1 ? "current" : "pending",
    });

    currentLat = bin.lat;
    currentLng = bin.lng;
  }

  const landfillKm = plannerStops.length
    ? haversineKm(currentLat, currentLng, LANDFILL.lat, LANDFILL.lng)
    : 0;

  const landfillTravelMin = estimateTravelMin(landfillKm);

  if (plannerStops.length > 0) {
    totalDistanceKm += landfillKm;
    totalTimeMin += landfillTravelMin;
  }

  const overflowPrevented = plannerStops.filter((stop) => {
    const fill = Number(stop.forecastPct ?? stop.fillPct ?? 0);
    return fill >= 80;
  }).length;

  return {
    mode,
    kpis: {
      totalActiveBins: available.length,
      binsAbove80: available.filter((b) => b.fillPct >= 80).length,
      selectedBins: plannerStops.length,
      averageFillLevel: getAverageFill(available),
      overThreshold:
        mode === "dynamic"
          ? available.filter((b) => getForecastFill(b) >= filters.threshold).length
          : available.filter((b) => b.fillPct >= Math.max(25, filters.threshold - 35))
              .length,
    },
    summary: {
      totalBins: plannerStops.length,
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
      estimatedTimeMin: totalTimeMin,
      overflowPrevented,
    },
    routeStops: plannerStops,
    routeGeometry: buildRouteGeometry(filters.zone, mode, driverStops),
    driverRoute: {
      routeId: `${mode.toUpperCase()}-${Date.now()}`,
      totalStops: driverStops.length,
      estDuration: durationLabel(totalTimeMin),
      binsToCollect: driverStops.length,
      truckCapacityPct:
        filters.truckCapacityKg > 0
          ? Math.min(
              100,
              Math.round((currentLoadKg / filters.truckCapacityKg) * 100)
            )
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
      (
        ((dynamicPlan.summary.totalDistanceKm -
          baselinePlan.summary.totalDistanceKm) /
          baseDist) *
        100
      ).toFixed(2)
    ),
    timeDeltaPct: Number(
      (
        ((dynamicPlan.summary.estimatedTimeMin -
          baselinePlan.summary.estimatedTimeMin) /
          baseTime) *
        100
      ).toFixed(2)
    ),
    binsDeltaPct: Number(
      (
        ((dynamicPlan.summary.totalBins - baselinePlan.summary.totalBins) /
          baseBins) *
        100
      ).toFixed(2)
    ),
    overflowDelta:
      dynamicPlan.summary.overflowPrevented -
      baselinePlan.summary.overflowPrevented,
  };
}