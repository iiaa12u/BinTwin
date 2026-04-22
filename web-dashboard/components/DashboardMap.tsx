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
  showRoute?: boolean;
};

export default function DashboardMap({
  bins,
  onBinSelect,
  plannedStops = [],
  showRoute = false,
}: DashboardMapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const mapBins = bins ?? defaultBins;

  const routeGeoJSON = useMemo(() => {
    if (!showRoute || plannedStops.length === 0) return null;

    const depot: [number, number] = [50.1905, 26.3898];

    const coordinates: [number, number][] = [
      depot,
      ...plannedStops.map((stop) => [stop.lng, stop.lat] as [number, number]),
    ];

    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates,
          },
          properties: {},
        },
      ],
    };
  }, [plannedStops, showRoute]);

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
          "circle-opacity": 0.65,
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

        const coords = (feature.geometry as any).coordinates.slice();
        const props = feature.properties as any;

        if (onBinSelect && props?.id) {
          onBinSelect(props.id);
        }

        const html = `
          <div style="font-family: ui-sans-serif; font-size: 12px;">
            <div style="font-weight: 700; margin-bottom: 6px;">
              ${props.id} • ${props.side}
            </div>
            <div><b>Place:</b> ${props.placeName}</div>
            <div><b>Building:</b> ${props.buildingNumber}</div>
            <div><b>Fill:</b> ${props.fillPct}%</div>
          </div>
        `;

        new mapboxgl.Popup({ offset: 12 })
          .setLngLat(coords)
          .setHTML(html)
          .addTo(map);
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
          "line-color": "#111827",
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

      map.on("click", "route-stops-layer", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;

        const coords = (feature.geometry as any).coordinates.slice();
        const props = feature.properties as any;

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

      map.on("mouseenter", "route-stops-layer", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "route-stops-layer", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [binsGeoJSON, onBinSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const binSource = map.getSource("bins") as mapboxgl.GeoJSONSource | undefined;
    if (binSource) {
      binSource.setData(binsGeoJSON);
    }

    if (mapBins.length > 0 && plannedStops.length === 0) {
      const bounds = new mapboxgl.LngLatBounds();
      mapBins.forEach((bin) => bounds.extend([bin.lng, bin.lat]));

      map.fitBounds(bounds, {
        padding: 60,
        duration: 700,
      });
    }

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

    if (plannedStops.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([50.1905, 26.3898]);
      plannedStops.forEach((stop) => bounds.extend([stop.lng, stop.lat]));

      map.fitBounds(bounds, {
        padding: 60,
        duration: 700,
      });
    }
  }, [binsGeoJSON, mapBins, routeGeoJSON, stopGeoJSON, plannedStops]);

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