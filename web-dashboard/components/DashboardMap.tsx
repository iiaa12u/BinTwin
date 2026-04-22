"use client";

import { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { bins } from "@/lib/bins";

export type PlannedStop = {
  binId: string;
  lat: number;
  lng: number;
  priority: number;
  eta: string;
  fillPct: number;
  risk: "Low" | "Medium" | "High";
};

const EAST_DEPOT: [number, number] = [50.204268, 26.397820];
const WEST_DEPOT: [number, number] = [50.186365, 26.383639];
const LANDFILL: [number, number] = [49.86990882883503, 26.160087740331367];

export default function DashboardMap({
  onBinSelect,
  plannedStops = [],
  routeGeometry = null,
  showRoute = false,
}: {
  onBinSelect?: (binId: string) => void;
  plannedStops?: PlannedStop[];
  routeGeometry?: GeoJSON.FeatureCollection<GeoJSON.LineString> | null;
  showRoute?: boolean;
}) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const routeGeoJSON = useMemo(() => {
    if (!showRoute || !routeGeometry) return null;
    return routeGeometry;
  }, [routeGeometry, showRoute]);

  const stopGeoJSON = useMemo(() => {
    if (!plannedStops.length) return null;

    return {
      type: "FeatureCollection" as const,
      features: plannedStops.map((stop) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
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
  }, [plannedStops]);

  useEffect(() => {
    if (mapRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    const map = new mapboxgl.Map({
      container: mapContainer.current as HTMLDivElement,
      style: "mapbox://styles/mapbox/light-v11",
      center: [50.1905, 26.3898],
      zoom: 14,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      const binsGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Point> = {
        type: "FeatureCollection",
        features: bins.map((b) => ({
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
      };

      const specialGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Point> = {
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
      };

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
            0, 6,
            50, 10,
            80, 14,
            100, 18,
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
              "East", "#10b981",
              "West", "#3b82f6",
              "#9ca3af",
            ],
          ],
          "circle-opacity": 0.65,
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
            "east_depot", "#10b981",
            "west_depot", "#3b82f6",
            "landfill", "#111827",
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
            "east_depot", "E",
            "west_depot", "W",
            "landfill", "L",
            "?"
          ],
          "text-size": 12,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      map.addSource("route-line", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
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
            "East", "#2563eb",
            "West", "#ef4444",
            "#111827",
          ],
          "line-width": 4,
          "line-opacity": 0.85,
        },
      });

      map.addSource("route-stops", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: "route-stops-layer",
        type: "circle",
        source: "route-stops",
        paint: {
          "circle-radius": 14,
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
          "circle-color": [
            "match",
            ["get", "risk"],
            "High", "#ef4444",
            "Medium", "#f59e0b",
            "Low", "#10b981",
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
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onBinSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const lineSource = map.getSource("route-line") as mapboxgl.GeoJSONSource | undefined;
    if (lineSource) {
      lineSource.setData(
        routeGeoJSON ?? {
          type: "FeatureCollection",
          features: [],
        }
      );
    }

    const stopSource = map.getSource("route-stops") as mapboxgl.GeoJSONSource | undefined;
    if (stopSource) {
      stopSource.setData(
        stopGeoJSON ?? {
          type: "FeatureCollection",
          features: [],
        }
      );
    }

    if (plannedStops.length > 0 || routeGeoJSON) {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend(EAST_DEPOT);
      bounds.extend(WEST_DEPOT);
      bounds.extend(LANDFILL);

      plannedStops.forEach((stop) => bounds.extend([stop.lng, stop.lat]));

      if (routeGeoJSON) {
        routeGeoJSON.features.forEach((feature) => {
          if (feature.geometry.type === "LineString") {
            feature.geometry.coordinates.forEach((coord) => {
              bounds.extend(coord as [number, number]);
            });
          }
        });
      }

      map.fitBounds(bounds, {
        padding: 60,
        duration: 700,
      });
    }
  }, [routeGeoJSON, stopGeoJSON, plannedStops]);

  return (
    <div className="relative w-full h-[520px] rounded-xl overflow-hidden border bg-white">
      <div ref={mapContainer} className="w-full h-full" />

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
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">E</span>
          <span>East truck</span>
        </div>

        <div className="mb-1 flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">W</span>
          <span>West truck</span>
        </div>

        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">L</span>
          <span>Landfill</span>
        </div>

        <div className="mb-2 flex items-center gap-2">
          <span className="inline-block h-1 w-6 bg-slate-900" />
          <span>Optimized route</span>
        </div>

        <div className="text-[11px] text-gray-600">Route markers show visit order</div>
      </div>
    </div>
  );
}