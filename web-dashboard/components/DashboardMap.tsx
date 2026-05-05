"use client";

import { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { bins as defaultBins, type BinPoint } from "@/lib/bins";

export type PlannedStop = {
  binId: string;
  lat: number;
  lng: number;
  priority: number;
  eta: string;
  fillPct: number;
  risk: "Low" | "Medium" | "High";
};

type DashboardMapProps = {
  bins?: BinPoint[];
  onBinSelect?: (binId: string) => void;
  plannedStops?: PlannedStop[];
  routeGeometry?: GeoJSON.FeatureCollection<GeoJSON.LineString> | null;
  showRoute?: boolean;
};

const EAST_DEPOT: [number, number] = [50.204268, 26.39782];
const WEST_DEPOT: [number, number] = [50.186365, 26.383639];
const LANDFILL: [number, number] = [49.86990882883503, 26.160087740331367];

const EMPTY_FEATURE_COLLECTION: GeoJSON.FeatureCollection<any> = {
  type: "FeatureCollection",
  features: [],
};

function buildFallbackRouteGeometry(
  plannedStops: PlannedStop[]
): GeoJSON.FeatureCollection<GeoJSON.LineString> | null {
  if (plannedStops.length === 0) return null;

  const sortedStops = [...plannedStops].sort(
    (a, b) => Number(a.priority) - Number(b.priority)
  );

  const firstStop = sortedStops[0];

  const startDepot =
    firstStop && firstStop.lng < 50.19 ? WEST_DEPOT : EAST_DEPOT;

  const coordinates: [number, number][] = [
    startDepot,
    ...sortedStops.map((stop) => [stop.lng, stop.lat] as [number, number]),
    LANDFILL,
  ];

  if (coordinates.length < 2) return null;

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          campus: firstStop && firstStop.lng < 50.19 ? "West" : "East",
          source: "fallback-route",
        },
        geometry: {
          type: "LineString",
          coordinates,
        },
      },
    ],
  };
}

export default function DashboardMap({
  bins,
  onBinSelect,
  plannedStops = [],
  routeGeometry = null,
  showRoute = false,
}: DashboardMapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const mapBins = bins ?? defaultBins;

  const fallbackRouteGeometry = useMemo(() => {
    if (!showRoute || plannedStops.length === 0) return null;
    return buildFallbackRouteGeometry(plannedStops);
  }, [plannedStops, showRoute]);

  const routeGeoJSON = useMemo(() => {
    if (!showRoute) return null;

    if (routeGeometry && routeGeometry.features?.length > 0) {
      return routeGeometry;
    }

    return fallbackRouteGeometry;
  }, [routeGeometry, fallbackRouteGeometry, showRoute]);

  const stopGeoJSON = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point> | null>(() => {
    if (!plannedStops.length || !showRoute) return null;

    return {
      type: "FeatureCollection",
      features: plannedStops.map((stop) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [stop.lng, stop.lat],
        },
        properties: {
          binId: stop.binId,
          priority: stop.priority,
          eta: stop.eta,
          fillPct: stop.fillPct,
          risk: stop.risk,
        },
      })),
    };
  }, [plannedStops, showRoute]);

  const binsGeoJSON = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(
    () => ({
      type: "FeatureCollection",
      features: mapBins.map((b) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [b.lng, b.lat],
        },
        properties: {
          id: b.id,
          placeName: b.placeName,
          side: b.side,
          buildingNumber: b.buildingNumber,
          binNumber: b.binNumber,
          fillPct: b.fillPct,
        },
      })),
    }),
    [mapBins]
  );

  const specialGeoJSON = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(
    () => ({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: EAST_DEPOT },
          properties: { label: "East Truck", kind: "east_depot" },
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: WEST_DEPOT },
          properties: { label: "West Truck", kind: "west_depot" },
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: LANDFILL },
          properties: { label: "Landfill", kind: "landfill" },
        },
      ],
    }),
    []
  );

  function updateMapData() {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const binSource = map.getSource("bins") as mapboxgl.GeoJSONSource | undefined;
    if (binSource) {
      binSource.setData(binsGeoJSON);
    }

    const specialSource = map.getSource("special-points") as
      | mapboxgl.GeoJSONSource
      | undefined;
    if (specialSource) {
      specialSource.setData(specialGeoJSON);
    }

    const lineSource = map.getSource("route-line") as
      | mapboxgl.GeoJSONSource
      | undefined;
    if (lineSource) {
      lineSource.setData(routeGeoJSON ?? EMPTY_FEATURE_COLLECTION);
    }

    const stopSource = map.getSource("route-stops") as
      | mapboxgl.GeoJSONSource
      | undefined;
    if (stopSource) {
      stopSource.setData(stopGeoJSON ?? EMPTY_FEATURE_COLLECTION);
    }

    const bounds = new mapboxgl.LngLatBounds();

    if (mapBins.length > 0) {
      mapBins.forEach((bin) => bounds.extend([bin.lng, bin.lat]));
    }

    if (showRoute && plannedStops.length > 0) {
      plannedStops.forEach((stop) => bounds.extend([stop.lng, stop.lat]));
    }

    if (showRoute && routeGeoJSON?.features?.length) {
      routeGeoJSON.features.forEach((feature) => {
        feature.geometry.coordinates.forEach((coord) => {
          bounds.extend(coord as [number, number]);
        });
      });
    }

    if (showRoute && plannedStops.length > 0) {
      bounds.extend(EAST_DEPOT);
      bounds.extend(WEST_DEPOT);
      bounds.extend(LANDFILL);
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, {
        padding: 70,
        duration: 700,
        maxZoom: 15,
      });
    }
  }

  useEffect(() => {
    if (mapRef.current) return;
    if (!mapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [50.1905, 26.3898],
      zoom: 14,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("bins", {
        type: "geojson",
        data: binsGeoJSON,
      });

      map.addLayer({
        id: "bins-circles",
        type: "circle",
        source: "bins",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "fillPct"],
            0,
            6,
            50,
            10,
            80,
            14,
            100,
            18,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-color": [
            "case",
            [">=", ["get", "fillPct"], 80],
            "#ef4444",
            [
              "match",
              ["get", "side"],
              "East",
              "#10b981",
              "West",
              "#3b82f6",
              "#9ca3af",
            ],
          ],
          "circle-opacity": 0.45,
        },
      });

      map.addSource("special-points", {
        type: "geojson",
        data: specialGeoJSON,
      });

      map.addLayer({
        id: "special-points-layer",
        type: "circle",
        source: "special-points",
        paint: {
          "circle-radius": 10,
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
          "circle-color": [
            "match",
            ["get", "kind"],
            "east_depot",
            "#10b981",
            "west_depot",
            "#3b82f6",
            "landfill",
            "#111827",
            "#6b7280",
          ],
        },
      });

      map.addLayer({
        id: "special-points-labels",
        type: "symbol",
        source: "special-points",
        layout: {
          "text-field": [
            "match",
            ["get", "kind"],
            "east_depot",
            "E",
            "west_depot",
            "W",
            "landfill",
            "L",
            "?",
          ],
          "text-size": 12,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      map.addSource("route-line", {
        type: "geojson",
        data: routeGeoJSON ?? EMPTY_FEATURE_COLLECTION,
      });

      map.addLayer({
        id: "route-line-layer",
        type: "line",
        source: "route-line",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": [
            "match",
            ["get", "campus"],
            "East",
            "#2563eb",
            "West",
            "#ef4444",
            "#111827",
          ],
          "line-width": 5,
          "line-opacity": 0.9,
        },
      });

      map.addSource("route-stops", {
        type: "geojson",
        data: stopGeoJSON ?? EMPTY_FEATURE_COLLECTION,
      });

      map.addLayer({
        id: "route-stops-layer",
        type: "circle",
        source: "route-stops",
        paint: {
          "circle-radius": 15,
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
          "circle-color": [
            "match",
            ["get", "risk"],
            "High",
            "#ef4444",
            "Medium",
            "#f59e0b",
            "Low",
            "#10b981",
            "#6b7280",
          ],
        },
      });

      map.addLayer({
        id: "route-stops-labels",
        type: "symbol",
        source: "route-stops",
        layout: {
          "text-field": ["to-string", ["get", "priority"]],
          "text-size": 12,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      map.on("mouseenter", "bins-circles", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "bins-circles", () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("click", "bins-circles", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;

        const coords = (feature.geometry as GeoJSON.Point).coordinates as [
          number,
          number
        ];

        const props = feature.properties as Record<string, any>;

        if (onBinSelect && props?.id) {
          onBinSelect(String(props.id));
        }

        const html = `
          <div style="font-family: ui-sans-serif; font-size: 12px;">
            <div style="font-weight: 700; margin-bottom: 6px;">
              ${props.id} • ${props.side}
            </div>
            <div><b>Place:</b> ${props.placeName}</div>
            <div><b>Building:</b> ${props.buildingNumber}</div>
            <div><b>Bin:</b> ${props.binNumber}</div>
            <div><b>Fill:</b> ${props.fillPct}%</div>
          </div>
        `;

        new mapboxgl.Popup({ offset: 12 })
          .setLngLat(coords)
          .setHTML(html)
          .addTo(map);
      });

      map.on("mouseenter", "route-stops-layer", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "route-stops-layer", () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("click", "route-stops-layer", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;

        const coords = (feature.geometry as GeoJSON.Point).coordinates as [
          number,
          number
        ];

        const props = feature.properties as Record<string, any>;

        const html = `
          <div style="font-family: ui-sans-serif; font-size: 12px;">
            <div style="font-weight: 700; margin-bottom: 6px;">
              ${props.binId}
            </div>
            <div><b>Order:</b> ${props.priority}</div>
            <div><b>ETA:</b> ${props.eta}</div>
            <div><b>Fill:</b> ${props.fillPct}%</div>
            <div><b>Risk:</b> ${props.risk}</div>
          </div>
        `;

        new mapboxgl.Popup({ offset: 12 })
          .setLngLat(coords)
          .setHTML(html)
          .addTo(map);
      });

      updateMapData();
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map.isStyleLoaded()) {
      updateMapData();
    } else {
      map.once("load", updateMapData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    binsGeoJSON,
    specialGeoJSON,
    routeGeoJSON,
    stopGeoJSON,
    plannedStops,
    mapBins,
    showRoute,
  ]);

  return (
    <div className="relative h-[520px] w-full overflow-hidden rounded-xl border bg-white">
      <div ref={mapContainer} className="h-full w-full" />

      <div className="absolute left-4 top-4 rounded-lg border bg-white/95 p-3 text-xs shadow">
        <div className="mb-2 font-semibold">Legend</div>

        <div className="mb-1 flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full border border-white bg-red-500" />
          <span>Urgent (Fill ≥ 80%)</span>
        </div>

        <div className="mb-1 flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full border border-white bg-emerald-500" />
          <span>East campus</span>
        </div>

        <div className="mb-1 flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full border border-white bg-blue-500" />
          <span>West campus</span>
        </div>

        <div className="mb-1 flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
            E
          </span>
          <span>East truck</span>
        </div>

        <div className="mb-1 flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
            W
          </span>
          <span>West truck</span>
        </div>

        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
            L
          </span>
          <span>Landfill</span>
        </div>

        <div className="mb-2 flex items-center gap-2">
          <span className="inline-block h-1 w-6 bg-slate-900" />
          <span>Optimized route</span>
        </div>

        <div className="text-[11px] text-gray-600">
          Route markers show visit order
        </div>
      </div>
    </div>
  );
}