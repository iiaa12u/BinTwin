"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

type RouteKind = "dynamic" | "static";
type ScenarioMode = "dynamic" | "static";
type ZoneView = "All" | "East" | "West";
type RiskLevel = "High" | "Medium" | "Low";

type RouteStop = {
  id: string;
  binId: string;
  fillPct: number;
  forecastPct?: number;
  afterFillPct?: number;
  eta: string;
  fillInHours: string;
  risk: RiskLevel;
  priority: number;
  topPct?: number;
  leftPct?: number;
};

type DriverStop = {
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
  kpis?: {
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
  driverRoute?: DriverRoute;
};

type OptimizationSession = {
  filters: {
    dataMode: string;
    selectedDateTime: string;
    zone: string;
    threshold: number;
    truckLabel: string;
    truckCapacityKg: number;
    shiftStart: string;
    shiftEnd: string;
    goal: string;
    autoSelect: boolean;
    manualBinId: string;
    forecastHorizon: string;
  };
  baselinePlan: RoutePlan | null;
  dynamicPlan: RoutePlan | null;
  approvedPlan: RoutePlan | null;
  savedAt: string;
};

type SavedScenario = {
  id: string;
  name: string;
  type: ScenarioMode;
  routeType: string;
  createdAt: string;
  dataMode: string;
  selectedDateTime: string;
  zone: string;
  threshold: number;
  truck: string;
  truckCapacityKg: number;
  dynamicOperatingWindow: string | null;
  staticScheduledWindows: string[] | null;
  selectedStaticWindow: string | null;
  summary: RoutePlan["summary"];
  routeStops: RouteStop[];
  routeGeometry?: any;
  driverRoute?: DriverRoute;
  baselinePlan: RoutePlan | null;
  dynamicPlan: RoutePlan | null;
  approvedPlan: RoutePlan | null;
};

type NormalizedRoute = {
  key: RouteKind;
  title: string;
  label: string;
  description: string;
  plan: RoutePlan;
  totalBins: number;
  totalDistanceKm: number;
  estimatedTimeMin: number;
  overflowPrevented: number;
  collectedWasteKg: number;
  remainingCapacityKg: number;
  capacityUsedPct: number;
  truckCapacityKg: number;
  threshold: number;
  truckLabel: string;
  selectedDateTime: string;
  dataMode: string;
  zone: string;
  stops: RouteStop[];
  driverStops: DriverStop[];
};

const BIN_CAPACITY_KG = 440;
const DEFAULT_TRUCK_CAPACITY_KG = 2500;

const EAST_TRUCK: [number, number] = [50.204268, 26.39782];
const WEST_TRUCK: [number, number] = [50.186365, 26.383639];
const LANDFILL: [number, number] = [49.86990882883503, 26.160087740331367];

const EMPTY_PLAN: RoutePlan = {
  summary: {
    totalBins: 0,
    totalDistanceKm: 0,
    estimatedTimeMin: 0,
    overflowPrevented: 0,
  },
  routeStops: [],
  routeGeometry: {
    type: "FeatureCollection",
    features: [],
  },
  driverRoute: {
    routeId: "EMPTY-ROUTE",
    totalStops: 0,
    estDuration: "0h 0m",
    binsToCollect: 0,
    truckCapacityPct: 0,
    stops: [],
  },
};

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
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

function formatMinutes(totalMinutes?: number) {
  if (!totalMinutes && totalMinutes !== 0) return "—";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;

  return `${hours} hr ${minutes} min`;
}

function estimateCollectedKgFromRouteStops(stops: RouteStop[]) {
  const total = stops.reduce((sum, stop) => {
    const before = Math.max(0, Math.min(100, Number(stop.fillPct ?? 0)));
    const after = Math.max(0, Math.min(100, Number(stop.afterFillPct ?? 5)));
    const collectedPct = Math.max(0, before - after);

    return sum + (collectedPct / 100) * BIN_CAPACITY_KG;
  }, 0);

  return Math.round(total);
}

function percentReduction(baseline?: number, current?: number) {
  if (!baseline || !current || baseline <= 0) return null;
  return Number((((baseline - current) / baseline) * 100).toFixed(1));
}

function riskColor(risk: RiskLevel) {
  if (risk === "High") return "#ef4444";
  if (risk === "Medium") return "#f59e0b";
  return "#10b981";
}

function riskClass(risk: RiskLevel) {
  if (risk === "High") return "bg-red-500";
  if (risk === "Medium") return "bg-amber-400";
  return "bg-emerald-500";
}

function riskTextColor(risk: RiskLevel) {
  if (risk === "High") return "text-red-700 bg-red-50";
  if (risk === "Medium") return "text-amber-700 bg-amber-50";
  return "text-emerald-700 bg-emerald-50";
}

function routeLineColor(kind: RouteKind) {
  if (kind === "static") return "#ef4444";
  return "#2563eb";
}

function getStopZoneFromDriver(stop?: DriverStop): ZoneView {
  if (!stop) return "All";
  return stop.lng < 50.19 ? "West" : "East";
}

function inferZoneFromBinId(binId: string): ZoneView {
  const match = binId.match(/\d+/);
  const number = match ? Number(match[0]) : 0;

  if (number >= 1 && number <= 5) return "East";
  if (number >= 6) return "West";

  return "All";
}

function getZoneForRouteStop(stop: RouteStop, driverMap: Map<string, DriverStop>) {
  const driverStop = driverMap.get(stop.binId);
  if (driverStop) return getStopZoneFromDriver(driverStop);
  return inferZoneFromBinId(stop.binId);
}

function getDriverStopsFromPlan(plan: RoutePlan): DriverStop[] {
  return plan.driverRoute?.stops ?? [];
}

function normalizeRoute(
  key: RouteKind,
  plan: RoutePlan | null,
  session: OptimizationSession | null,
  scenario: SavedScenario | null
): NormalizedRoute {
  const safePlan = plan ?? EMPTY_PLAN;
  const stops = safePlan.routeStops ?? [];
  const driverStops = getDriverStopsFromPlan(safePlan);

  const truckCapacityKg =
    session?.filters?.truckCapacityKg ??
    scenario?.truckCapacityKg ??
    DEFAULT_TRUCK_CAPACITY_KG;

  const collectedWasteKg = estimateCollectedKgFromRouteStops(stops);
  const remainingCapacityKg = Math.max(0, truckCapacityKg - collectedWasteKg);

  const capacityUsedPct =
    truckCapacityKg > 0
      ? Math.min(100, Math.round((collectedWasteKg / truckCapacityKg) * 100))
      : 0;

  const isStatic = key === "static";

  return {
    key,
    title: isStatic ? "Static Fixed Baseline" : "Dynamic Forecast-Aware Route",
    label: isStatic ? "Static Baseline" : "Dynamic Route",
    description: isStatic
      ? "Fixed scheduled baseline using static collection windows and truck capacity handling."
      : "Forecast-aware route using a flexible operating window and priority-based collection.",
    plan: safePlan,
    totalBins: stops.length,
    totalDistanceKm: safePlan.summary.totalDistanceKm ?? 0,
    estimatedTimeMin: safePlan.summary.estimatedTimeMin ?? 0,
    overflowPrevented: safePlan.summary.overflowPrevented ?? stops.length,
    collectedWasteKg,
    remainingCapacityKg,
    capacityUsedPct,
    truckCapacityKg,
    threshold: session?.filters?.threshold ?? scenario?.threshold ?? 75,
    truckLabel:
      session?.filters?.truckLabel ?? scenario?.truck ?? "Truck Alpha (2500kg)",
    selectedDateTime:
      session?.filters?.selectedDateTime ??
      scenario?.selectedDateTime ??
      scenario?.createdAt ??
      new Date().toISOString(),
    dataMode: session?.filters?.dataMode ?? scenario?.dataMode ?? "Synthetic Data",
    zone: session?.filters?.zone ?? scenario?.zone ?? "All",
    stops,
    driverStops,
  };
}

function buildFilteredRoute(
  route: NormalizedRoute,
  zoneView: ZoneView
): NormalizedRoute {
  const driverMap = new Map<string, DriverStop>();
  route.driverStops.forEach((stop) => driverMap.set(stop.binId, stop));

  const filteredStops =
    zoneView === "All"
      ? route.stops
      : route.stops.filter((stop) => {
          return getZoneForRouteStop(stop, driverMap) === zoneView;
        });

  const filteredDriverStops =
    zoneView === "All"
      ? route.driverStops
      : route.driverStops.filter((stop) => {
          return getStopZoneFromDriver(stop) === zoneView;
        });

  const factor =
    route.stops.length > 0 ? filteredStops.length / route.stops.length : 0;

  const collectedWasteKg = estimateCollectedKgFromRouteStops(filteredStops);
  const remainingCapacityKg = Math.max(0, route.truckCapacityKg - collectedWasteKg);

  const capacityUsedPct =
    route.truckCapacityKg > 0
      ? Math.min(100, Math.round((collectedWasteKg / route.truckCapacityKg) * 100))
      : 0;

  const totalDistanceKm =
    zoneView === "All" ? route.totalDistanceKm : round2(route.totalDistanceKm * factor);

  const estimatedTimeMin =
    zoneView === "All"
      ? route.estimatedTimeMin
      : Math.round(route.estimatedTimeMin * factor);

  return {
    ...route,
    title:
      zoneView === "All"
        ? route.title
        : `${route.title} — ${zoneView} Zone`,
    totalBins: filteredStops.length,
    totalDistanceKm,
    estimatedTimeMin,
    overflowPrevented: filteredStops.filter((stop) => {
      const fill = Number(stop.forecastPct ?? stop.fillPct ?? 0);
      return fill >= 80;
    }).length,
    collectedWasteKg,
    remainingCapacityKg,
    capacityUsedPct,
    stops: filteredStops,
    driverStops: filteredDriverStops,
    zone: zoneView,
    plan: {
      ...route.plan,
      summary: {
        totalBins: filteredStops.length,
        totalDistanceKm,
        estimatedTimeMin,
        overflowPrevented: filteredStops.filter((stop) => {
          const fill = Number(stop.forecastPct ?? stop.fillPct ?? 0);
          return fill >= 80;
        }).length,
      },
      routeStops: filteredStops,
      driverRoute: {
        routeId: `${route.key.toUpperCase()}-${zoneView}-ROUTE`,
        totalStops: filteredDriverStops.length,
        estDuration: formatMinutes(estimatedTimeMin),
        binsToCollect: filteredDriverStops.length,
        truckCapacityPct: capacityUsedPct,
        stops: filteredDriverStops,
      },
      routeGeometry:
        zoneView === "All" && route.plan.routeGeometry?.features?.length > 0
          ? route.plan.routeGeometry
          : buildFallbackGeometry(route.key, zoneView, filteredDriverStops),
    },
  };
}

function buildDriverRoute(route: NormalizedRoute): DriverRoute {
  return {
    routeId: `${route.key.toUpperCase()}-ROUTE-${Date.now()}`,
    totalStops: route.driverStops.length,
    estDuration: formatMinutes(route.estimatedTimeMin),
    binsToCollect: route.driverStops.length,
    truckCapacityPct: route.capacityUsedPct,
    stops: route.driverStops,
  };
}

function buildScenarioPayload(
  selectedRoute: NormalizedRoute,
  rawDynamicPlan: RoutePlan | null,
  rawStaticPlan: RoutePlan | null
): SavedScenario {
  return {
    id: `${selectedRoute.key}-scenario-${Date.now()}`,
    name: selectedRoute.title,
    type: selectedRoute.key,
    routeType: selectedRoute.title,
    createdAt: new Date().toISOString(),
    dataMode: selectedRoute.dataMode,
    selectedDateTime: selectedRoute.selectedDateTime,
    zone: selectedRoute.zone,
    threshold: selectedRoute.threshold,
    truck: selectedRoute.truckLabel,
    truckCapacityKg: selectedRoute.truckCapacityKg,
    dynamicOperatingWindow:
      selectedRoute.key === "dynamic" ? "06:00–22:00" : null,
    staticScheduledWindows:
      selectedRoute.key === "static" ? ["15:00–17:00", "20:00–22:00"] : null,
    selectedStaticWindow: null,
    summary: selectedRoute.plan.summary,
    routeStops: selectedRoute.stops,
    routeGeometry: selectedRoute.plan.routeGeometry,
    driverRoute: buildDriverRoute(selectedRoute),
    baselinePlan: rawStaticPlan,
    dynamicPlan: rawDynamicPlan,
    approvedPlan: selectedRoute.plan,
  };
}

function buildFallbackGeometry(
  routeKey: RouteKind,
  zoneView: ZoneView,
  driverStops: DriverStop[]
) {
  if (driverStops.length === 0) {
    return {
      type: "FeatureCollection",
      features: [],
    };
  }

  const firstZone =
    zoneView === "All" ? getStopZoneFromDriver(driverStops[0]) : zoneView;

  const start = firstZone === "West" ? WEST_TRUCK : EAST_TRUCK;

  const stopCoords: [number, number][] = driverStops
    .filter((stop) => stop.lng && stop.lat)
    .map((stop) => [stop.lng, stop.lat]);

  const coordinates = [start, ...stopCoords, LANDFILL];

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
          fallback: true,
          routeType: routeKey,
        },
      },
    ],
  };
}

function collectGeometryCoordinates(featureCollection: any): [number, number][] {
  const coords: [number, number][] = [];
  const features = featureCollection?.features ?? [];

  for (const feature of features) {
    const geometry = feature?.geometry;

    if (!geometry) continue;

    if (geometry.type === "LineString" && Array.isArray(geometry.coordinates)) {
      for (const point of geometry.coordinates) {
        if (
          Array.isArray(point) &&
          typeof point[0] === "number" &&
          typeof point[1] === "number"
        ) {
          coords.push([point[0], point[1]]);
        }
      }
    }

    if (geometry.type === "MultiLineString" && Array.isArray(geometry.coordinates)) {
      for (const line of geometry.coordinates) {
        for (const point of line) {
          if (
            Array.isArray(point) &&
            typeof point[0] === "number" &&
            typeof point[1] === "number"
          ) {
            coords.push([point[0], point[1]]);
          }
        }
      }
    }
  }

  return coords;
}

function createMarkerElement({
  label,
  bg,
  size = 34,
}: {
  label: string;
  bg: string;
  size?: number;
}) {
  const el = document.createElement("div");

  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.borderRadius = "999px";
  el.style.background = bg;
  el.style.color = "white";
  el.style.fontWeight = "800";
  el.style.fontSize = "13px";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.border = "3px solid white";
  el.style.boxShadow = "0 4px 12px rgba(15,23,42,0.25)";
  el.style.cursor = "pointer";
  el.innerText = label;

  return el;
}

function ScenarioMap({
  route,
  zoneView,
}: {
  route: NormalizedRoute;
  zoneView: ZoneView;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    if (!token) {
      setMapError("Mapbox token is missing. Add NEXT_PUBLIC_MAPBOX_TOKEN in .env.");
      return;
    }

    mapboxgl.accessToken = token;

    if (!mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [50.1905, 26.3898],
      zoom: 12.3,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function updateMap() {
      const sourceId = "scenario-route-source";
      const layerId = "scenario-route-layer";

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      const fullGeometry =
        zoneView === "All" && route.plan.routeGeometry?.features?.length > 0
          ? route.plan.routeGeometry
          : buildFallbackGeometry(route.key, zoneView, route.driverStops);

      const geometryCoordinates = collectGeometryCoordinates(fullGeometry);

      const binMarkers = route.driverStops
        .filter(
          (stop) =>
            typeof stop.lng === "number" &&
            typeof stop.lat === "number" &&
            stop.lng !== 0 &&
            stop.lat !== 0
        )
        .map((driverStop, index) => {
          const routeStop =
            route.stops.find((item) => item.binId === driverStop.binId) ??
            route.stops[index];

          return {
            lng: driverStop.lng,
            lat: driverStop.lat,
            label: String(index + 1),
            title: `${driverStop.binId} • Fill: ${
              routeStop?.fillPct ?? driverStop.fillPct
            }%`,
            risk: routeStop?.risk ?? "Low",
          };
        });

      const allCoordinates: [number, number][] = [
        ...geometryCoordinates,
        ...binMarkers.map((marker) => [marker.lng, marker.lat] as [number, number]),
      ];

      if (map.getSource(sourceId)) {
        const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
        source.setData(fullGeometry);
      } else {
        map.addSource(sourceId, {
          type: "geojson",
          data: fullGeometry,
        });

        map.addLayer({
          id: layerId,
          type: "line",
          source: sourceId,
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": routeLineColor(route.key),
            "line-width": route.key === "dynamic" ? 5 : 4,
            "line-opacity": 0.9,
            "line-dasharray": route.key === "static" ? [2, 1.2] : [1, 0],
          },
        });
      }

      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, "line-color", routeLineColor(route.key));
        map.setPaintProperty(layerId, "line-width", route.key === "dynamic" ? 5 : 4);
        map.setPaintProperty(
          layerId,
          "line-dasharray",
          route.key === "static" ? [2, 1.2] : [1, 0]
        );
      }

      const firstCoord = geometryCoordinates[0];
      const lastCoord = geometryCoordinates[geometryCoordinates.length - 1];

      if (firstCoord) {
        const startMarker = new mapboxgl.Marker({
          element: createMarkerElement({
            label: "T",
            bg: "#3b82f6",
            size: 34,
          }),
        })
          .setLngLat(firstCoord)
          .setPopup(new mapboxgl.Popup({ offset: 20 }).setText("Truck Start"))
          .addTo(map);

        markersRef.current.push(startMarker);
      }

      if (lastCoord) {
        const landfillMarker = new mapboxgl.Marker({
          element: createMarkerElement({
            label: "L",
            bg: "#020617",
            size: 34,
          }),
        })
          .setLngLat(lastCoord)
          .setPopup(new mapboxgl.Popup({ offset: 20 }).setText("Landfill"))
          .addTo(map);

        markersRef.current.push(landfillMarker);
      }

      for (const markerData of binMarkers) {
        const marker = new mapboxgl.Marker({
          element: createMarkerElement({
            label: markerData.label,
            bg: riskColor(markerData.risk),
            size: 36,
          }),
        })
          .setLngLat([markerData.lng, markerData.lat])
          .setPopup(new mapboxgl.Popup({ offset: 20 }).setText(markerData.title))
          .addTo(map);

        markersRef.current.push(marker);
      }

      if (allCoordinates.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();

        allCoordinates.forEach((coord) => {
          bounds.extend(coord);
        });

        map.fitBounds(bounds, {
          padding: 70,
          maxZoom: 15,
          duration: 700,
        });
      }
    }

    if (map.loaded()) {
      updateMap();
    } else {
      map.once("load", updateMap);
    }
  }, [route, zoneView]);

  return (
    <div className="relative mt-5 h-[520px] overflow-hidden rounded-2xl border border-slate-200">
      {mapError ? (
        <div className="flex h-full items-center justify-center bg-red-50 p-6 text-center text-sm font-semibold text-red-700">
          {mapError}
        </div>
      ) : (
        <div ref={mapContainerRef} className="h-full w-full" />
      )}

      <div className="pointer-events-none absolute left-5 top-5 rounded-xl border border-slate-200 bg-white/95 p-4 text-sm shadow-sm">
        <div className="font-bold text-slate-900">Legend</div>
        <LegendItem color="bg-red-500" label="High risk / urgent" />
        <LegendItem color="bg-amber-400" label="Medium risk" />
        <LegendItem color="bg-emerald-500" label="Low risk" />
        <LegendItem color="bg-blue-500" label="Truck start" />
        <LegendItem color="bg-slate-950" label="Landfill" />
        <div className="mt-3 flex items-center gap-2">
          <span
            className="h-1 w-8 rounded-full"
            style={{ background: routeLineColor(route.key) }}
          />
          <span className="text-slate-600">
            {route.key === "static" ? "Static route" : "Optimized route"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ScenariosPage() {
  const router = useRouter();

  const [session, setSession] = useState<OptimizationSession | null>(null);
  const [selectedScenario, setSelectedScenario] =
    useState<SavedScenario | null>(null);
  const [approvedScenario, setApprovedScenario] =
    useState<SavedScenario | null>(null);
  const [routeView, setRouteView] = useState<RouteKind>("dynamic");
  const [zoneView, setZoneView] = useState<ZoneView>("All");
  const [message, setMessage] = useState<string | null>(null);

  function loadData() {
    const sessionData = safeParse<OptimizationSession>(
      localStorage.getItem("optimizationSession")
    );

    if (sessionData) {
      setSession(sessionData);
      setSelectedScenario(null);
      setApprovedScenario(null);
      setRouteView("dynamic");
      return;
    }

    const selectedData = safeParse<SavedScenario>(
      localStorage.getItem("selectedScenario")
    );

    const approvedData = safeParse<SavedScenario>(
      localStorage.getItem("approvedScenario")
    );

    setSession(null);
    setSelectedScenario(selectedData);
    setApprovedScenario(approvedData);

    if (selectedData?.type === "static") {
      setRouteView("static");
    } else {
      setRouteView("dynamic");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function showMessage(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 3500);
  }

  const dynamicPlan =
    session?.dynamicPlan ??
    selectedScenario?.dynamicPlan ??
    approvedScenario?.dynamicPlan ??
    (selectedScenario?.type === "dynamic"
      ? selectedScenario.approvedPlan
      : null);

  const staticPlan =
    session?.baselinePlan ??
    selectedScenario?.baselinePlan ??
    approvedScenario?.baselinePlan ??
    (selectedScenario?.type === "static"
      ? selectedScenario.approvedPlan
      : null);

  const rawDynamicRoute = normalizeRoute(
    "dynamic",
    dynamicPlan,
    session,
    selectedScenario ?? approvedScenario
  );

  const rawStaticRoute = normalizeRoute(
    "static",
    staticPlan,
    session,
    selectedScenario ?? approvedScenario
  );

  const dynamicRoute = buildFilteredRoute(rawDynamicRoute, zoneView);
  const staticRoute = buildFilteredRoute(rawStaticRoute, zoneView);

  const selectedRoute = routeView === "static" ? staticRoute : dynamicRoute;

  const distanceReduction = percentReduction(
    staticRoute.totalDistanceKm,
    dynamicRoute.totalDistanceKm
  );

  const timeReduction = percentReduction(
    staticRoute.estimatedTimeMin,
    dynamicRoute.estimatedTimeMin
  );

  const approvedType =
    approvedScenario?.type === "static"
      ? "Static Baseline"
      : approvedScenario?.type === "dynamic"
      ? "Dynamic Route"
      : "No approved route yet";

  function handleSaveScenario() {
    const scenario = buildScenarioPayload(selectedRoute, dynamicPlan, staticPlan);

    localStorage.setItem("selectedScenario", JSON.stringify(scenario));

    const existing =
      safeParse<SavedScenario[]>(localStorage.getItem("savedScenarios")) ?? [];

    const updated = [
      scenario,
      ...existing.filter((item) => item.id !== scenario.id),
    ].slice(0, 10);

    localStorage.setItem("savedScenarios", JSON.stringify(updated));

    setSelectedScenario(scenario);
    showMessage(`${selectedRoute.label} scenario saved for ${zoneView} zone.`);
  }

  function handleApproveScenario() {
    const scenario = buildScenarioPayload(selectedRoute, dynamicPlan, staticPlan);

    localStorage.setItem("approvedScenario", JSON.stringify(scenario));
    localStorage.setItem("selectedScenario", JSON.stringify(scenario));

    setApprovedScenario(scenario);
    setSelectedScenario(scenario);

    showMessage(`${selectedRoute.label} approved as operational plan.`);
  }

  function handleSendToDriver() {
    const scenario = buildScenarioPayload(selectedRoute, dynamicPlan, staticPlan);
    const driverRoute = buildDriverRoute(selectedRoute);

    localStorage.setItem("approvedScenario", JSON.stringify(scenario));
    localStorage.setItem("selectedScenario", JSON.stringify(scenario));
    localStorage.setItem("activeDriverRoute", JSON.stringify(driverRoute));
    localStorage.setItem("driverRoute", JSON.stringify(driverRoute));
    localStorage.setItem("currentDriverRoute", JSON.stringify(driverRoute));

    showMessage("Route sent to driver.");

    window.setTimeout(() => {
      router.push("/driver");
    }, 500);
  }

  const hasRouteData = selectedRoute.stops.length > 0;

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 text-slate-900">
      <div className="mx-auto max-w-[1650px] px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          <aside className="col-span-12 xl:col-span-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Scenario Controls
              </h2>

              <div className="mt-5">
                <div className="text-sm font-semibold text-slate-700">
                  Route view
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setRouteView("dynamic")}
                    className={
                      "rounded-xl px-4 py-3 text-sm font-semibold transition " +
                      (routeView === "dynamic"
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200")
                    }
                  >
                    Dynamic Route
                  </button>

                  <button
                    onClick={() => setRouteView("static")}
                    className={
                      "rounded-xl px-4 py-3 text-sm font-semibold transition " +
                      (routeView === "static"
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200")
                    }
                  >
                    Static Baseline
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <div className="text-sm font-semibold text-slate-700">
                  Zone view
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(["All", "East", "West"] as ZoneView[]).map((zone) => (
                    <button
                      key={zone}
                      onClick={() => setZoneView(zone)}
                      className={
                        "rounded-xl px-3 py-2.5 text-sm font-semibold transition " +
                        (zoneView === zone
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200")
                      }
                    >
                      {zone}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Current view</div>
                <div className="mt-1 font-bold text-slate-900">
                  {selectedRoute.title}
                </div>
                <p className="mt-2 text-sm leading-5 text-slate-600">
                  {selectedRoute.description}
                </p>
              </div>

              <div className="mt-4 space-y-3">
                <InfoBox label="Data source" value={selectedRoute.dataMode} />
                <InfoBox
                  label="Snapshot"
                  value={formatDateTime(selectedRoute.selectedDateTime)}
                />
                <InfoBox label="Selected zone" value={zoneView} />
                <InfoBox label="Truck" value={selectedRoute.truckLabel} />
                <InfoBox
                  label="Threshold"
                  value={
                    selectedRoute.threshold
                      ? `${selectedRoute.threshold}%`
                      : "Route default"
                  }
                />
                <InfoBox label="Approved route" value={approvedType} />
              </div>

              {message && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {message}
                </div>
              )}

              <button
                onClick={loadData}
                className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Refresh Saved Data
              </button>
            </div>
          </aside>

          <main className="col-span-12 xl:col-span-6 space-y-6">
            {!hasRouteData && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                No saved route found for this view. Go to Routes, generate
                Dynamic and Static, then save the scenario.
              </div>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    Map & Route Preview
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Showing: {selectedRoute.title}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                  Snapshot: {formatDateTime(selectedRoute.selectedDateTime)}
                </div>
              </div>

              <ScenarioMap route={selectedRoute} zoneView={zoneView} />

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="font-bold text-slate-900">
                  Current Preview: {selectedRoute.title}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {selectedRoute.totalBins} stops •{" "}
                  {selectedRoute.totalDistanceKm.toFixed(2)} km •{" "}
                  {formatMinutes(selectedRoute.estimatedTimeMin)}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Route Stops
              </h2>

              <div className="mt-4 max-h-[460px] space-y-3 overflow-y-auto pr-2">
                {selectedRoute.stops.map((stop, index) => (
                  <div
                    key={`${stop.binId}-${index}`}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={
                          "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white " +
                          riskClass(stop.risk)
                        }
                      >
                        {index + 1}
                      </div>

                      <div>
                        <div className="font-bold text-slate-900">
                          {stop.binId}
                        </div>
                        <div className="text-sm text-slate-600">
                          Fill: {stop.fillPct}% → {stop.afterFillPct ?? 5}%
                          after collection
                        </div>
                        <div
                          className={
                            "mt-1 inline-flex rounded-full px-2 py-1 text-xs font-semibold " +
                            riskTextColor(stop.risk)
                          }
                        >
                          {stop.risk} Risk
                        </div>
                      </div>
                    </div>

                    <div className="text-right text-sm text-slate-600">
                      <div className="font-semibold text-slate-900">
                        {stop.eta}
                      </div>
                      <div>{stop.fillInHours}</div>
                    </div>
                  </div>
                ))}

                {selectedRoute.stops.length === 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                    No route stops available for this zone.
                  </div>
                )}
              </div>
            </section>
          </main>

          <aside className="col-span-12 xl:col-span-3 space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Scenario Results
              </h2>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <ResultCard
                  label="Distance"
                  value={`${selectedRoute.totalDistanceKm.toFixed(2)} km`}
                />
                <ResultCard
                  label="Collection Time"
                  value={formatMinutes(selectedRoute.estimatedTimeMin)}
                />
                <ResultCard
                  label="Bins Serviced"
                  value={String(selectedRoute.totalBins)}
                />
                <ResultCard
                  label="Overflow Prevented"
                  value={String(selectedRoute.overflowPrevented)}
                />
                <ResultCard
                  label="Collected Waste"
                  value={`${selectedRoute.collectedWasteKg} kg`}
                />
                <ResultCard
                  label="Capacity Left"
                  value={`${selectedRoute.remainingCapacityKg} kg`}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Dynamic vs Static
              </h2>

              <div className="mt-4 space-y-4">
                <CompareRow
                  label="Distance"
                  dynamic={`${dynamicRoute.totalDistanceKm.toFixed(2)} km`}
                  staticValue={`${staticRoute.totalDistanceKm.toFixed(2)} km`}
                  improvement={
                    distanceReduction !== null
                      ? `${distanceReduction}% less`
                      : "—"
                  }
                />

                <CompareRow
                  label="Time"
                  dynamic={formatMinutes(dynamicRoute.estimatedTimeMin)}
                  staticValue={formatMinutes(staticRoute.estimatedTimeMin)}
                  improvement={
                    timeReduction !== null ? `${timeReduction}% less` : "—"
                  }
                />

                <CompareRow
                  label="Stops"
                  dynamic={String(dynamicRoute.totalBins)}
                  staticValue={String(staticRoute.totalBins)}
                  improvement="Forecast-aware selection"
                />

                <CompareRow
                  label="Collected waste"
                  dynamic={`${dynamicRoute.collectedWasteKg} kg`}
                  staticValue={`${staticRoute.collectedWasteKg} kg`}
                  improvement="Calculated separately"
                />

                <CompareRow
                  label="Capacity left"
                  dynamic={`${dynamicRoute.remainingCapacityKg} kg`}
                  staticValue={`${staticRoute.remainingCapacityKg} kg`}
                  improvement="Separate capacity tracking"
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Scenario Summary
              </h2>

              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                {selectedRoute.key === "static" ? (
                  <>
                    <p>
                      Static baseline follows fixed scheduled windows and a fixed
                      threshold.
                    </p>
                    <p>
                      It includes truck capacity handling before continuing the
                      route.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      Dynamic routing uses a flexible operating window and
                      selects bins based on forecast, threshold, and priority.
                    </p>
                    <p>
                      It supports more efficient collection by avoiding
                      unnecessary stops.
                    </p>
                  </>
                )}

                <p>
                  This route services <strong>{selectedRoute.totalBins}</strong>{" "}
                  bins in the <strong>{zoneView}</strong> view with a distance of{" "}
                  <strong>{selectedRoute.totalDistanceKm.toFixed(2)} km</strong>.
                </p>

                <p>
                  Estimated collected waste is{" "}
                  <strong>{selectedRoute.collectedWasteKg} kg</strong>, leaving{" "}
                  <strong>{selectedRoute.remainingCapacityKg} kg</strong> of truck
                  capacity.
                </p>

                <p>
                  After collection, serviced bins are reset to{" "}
                  <strong>5%</strong> to reflect updated fill status.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Scenario Actions
              </h2>

              <div className="mt-4 space-y-3">
                <button
                  onClick={handleApproveScenario}
                  className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-600"
                >
                  Approve Current Route
                </button>

                <button
                  onClick={handleSendToDriver}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50"
                >
                  Send Current Route to Driver
                </button>

                <button
                  onClick={handleSaveScenario}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50"
                >
                  Save Current Scenario
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 font-bold text-slate-900">{value}</div>
    </div>
  );
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ${color}`} />
      <span className="text-slate-600">{label}</span>
    </div>
  );
}

function CompareRow({
  label,
  dynamic,
  staticValue,
  improvement,
}: {
  label: string;
  dynamic: string;
  staticValue: string;
  improvement: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="font-bold text-slate-900">{label}</div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-xs text-slate-500">Dynamic</div>
          <div className="font-semibold text-emerald-700">{dynamic}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Static</div>
          <div className="font-semibold text-slate-900">{staticValue}</div>
        </div>
      </div>
      <div className="mt-2 text-xs font-semibold text-emerald-700">
        {improvement}
      </div>
    </div>
  );
}