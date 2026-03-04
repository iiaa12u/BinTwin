"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { bins } from "@/lib/bins";

export default function DashboardMap({
  onBinSelect,
}: {
  onBinSelect?: (binId: string) => void;
}) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (mapRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    const map = new mapboxgl.Map({
      container: mapContainer.current as HTMLDivElement,
      style: "mapbox://styles/mapbox/light-v11",
      center: [50.1905, 26.3898], // lng, lat
      zoom: 14,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      // Convert bins to GeoJSON (include id)
      const geojson: GeoJSON.FeatureCollection<GeoJSON.Point> = {
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

      map.addSource("bins", {
        type: "geojson",
        data: geojson,
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
        },
      });

      // Hover cursor
      map.on("mouseenter", "bins-circles", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "bins-circles", () => {
        map.getCanvas().style.cursor = "";
      });

      // Click handler
      map.on("click", "bins-circles", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;

        const coords = (feature.geometry as any).coordinates.slice();
        const props = feature.properties as any;

        // 🔥 Trigger drawer open
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
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [onBinSelect]);

  return (
    <div className="relative w-full h-[500px] rounded-xl overflow-hidden border bg-white">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Legend */}
      <div className="absolute left-4 top-4 rounded-lg border bg-white/95 p-3 text-xs shadow">
        <div className="font-semibold mb-2">Legend</div>

        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block h-3 w-3 rounded-full bg-red-500 border border-white" />
          <span>Urgent (Fill ≥ 80%)</span>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block h-3 w-3 rounded-full bg-emerald-500 border border-white" />
          <span>East campus</span>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span className="inline-block h-3 w-3 rounded-full bg-blue-500 border border-white" />
          <span>West campus</span>
        </div>

        <div className="text-[11px] text-gray-600">
          Circle size = fill/volume %
        </div>
      </div>
    </div>
  );
}