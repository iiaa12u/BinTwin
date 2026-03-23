"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { mockDriverRoute, type DriverRoute, type DriverStop } from "@/lib/driverRoute";

function getFillColor(fillPct: number) {
  if (fillPct >= 80) return "bg-red-500";
  if (fillPct >= 60) return "bg-amber-400";
  return "bg-emerald-500";
}

function getStatusIcon(status: DriverStop["status"]) {
  if (status === "completed") return "✅";
  if (status === "issue") return "⚠️";
  if (status === "current") return "⭕";
  return "•";
}

export default function DriverActivePage() {
  const router = useRouter();

  const [route, setRoute] = useState<DriverRoute | null>(null);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [collectionResult, setCollectionResult] = useState<"completed" | "issue">("completed");

  useEffect(() => {
    const stored = localStorage.getItem("driverRouteState");
    if (stored) {
      setRoute(JSON.parse(stored));
    } else {
      setRoute(mockDriverRoute);
      localStorage.setItem("driverRouteState", JSON.stringify(mockDriverRoute));
    }
  }, []);

  const currentStop = useMemo(() => {
    return route?.stops.find((s) => s.status === "current") ?? null;
  }, [route]);

  const currentIndex = useMemo(() => {
    if (!route || !currentStop) return 0;
    return route.stops.findIndex((s) => s.id === currentStop.id);
  }, [route, currentStop]);

  function saveRoute(nextRoute: DriverRoute) {
    setRoute(nextRoute);
    localStorage.setItem("driverRouteState", JSON.stringify(nextRoute));
  }

  function handleConfirmCollection() {
    if (!route || !currentStop) return;

    const nextStops = [...route.stops];
    const idx = nextStops.findIndex((s) => s.id === currentStop.id);

    nextStops[idx] = {
      ...nextStops[idx],
      status: collectionResult === "completed" ? "completed" : "issue",
      fillPct: collectionResult === "completed" ? 0 : nextStops[idx].fillPct,
    };

    const nextPendingIndex = nextStops.findIndex((s) => s.status === "pending");
    if (nextPendingIndex !== -1) {
      nextStops[nextPendingIndex] = {
        ...nextStops[nextPendingIndex],
        status: "current",
      };
    }

    const nextRoute = {
      ...route,
      stops: nextStops,
    };

    saveRoute(nextRoute);
    setShowCollectModal(false);
  }

  function restartRoute() {
    localStorage.setItem("driverRouteState", JSON.stringify(mockDriverRoute));
    setRoute(mockDriverRoute);
  }

  if (!route) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gray-50 flex items-center justify-center">
        <div className="text-gray-700">Loading route...</div>
      </div>
    );
  }

  if (!currentStop) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gray-50 flex justify-center px-4 py-6">
        <div className="w-full max-w-sm rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-black">Route Complete</h1>
          <p className="mt-3 text-gray-700">All assigned stops have been processed.</p>

          <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
            <div className="text-sm text-gray-600">Completed stops</div>
            <div className="mt-1 text-3xl font-bold text-black">
              {route.stops.filter((s) => s.status === "completed").length}
            </div>
          </div>

          <button
            onClick={restartRoute}
            className="mt-6 w-full rounded-xl bg-slate-950 py-3 text-lg font-semibold text-white"
          >
            Restart Mock Route
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 flex justify-center px-4 py-6">
      <div className="w-full max-w-sm rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm relative">
        <div className="flex items-center justify-between pb-4">
          <button onClick={() => router.push("/driver")} className="text-xl text-gray-700">
            ←
          </button>
          <h1 className="text-2xl font-bold text-black">Active Route</h1>
          <button className="text-xl text-gray-700">⌖</button>
        </div>

        <div className="rounded-2xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">
            Stop {currentIndex + 1} of {route.totalStops}
          </div>

          <div className="mt-3 text-3xl font-bold text-black">{currentStop.binId}</div>

          <div className="mt-4 grid grid-cols-2 gap-y-4">
            <div>
              <div className="text-sm text-gray-500">Fill level</div>
              <div className="mt-1 flex items-center gap-2 text-xl font-semibold text-black">
                {currentStop.fillPct}%
                <span className={`h-2.5 w-2.5 rounded-full ${getFillColor(currentStop.fillPct)}`} />
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500">ETA</div>
              <div className="mt-1 text-xl font-semibold text-black">{currentStop.etaMin} min</div>
            </div>

            <div>
              <div className="text-sm text-gray-500">Distance</div>
              <div className="mt-1 text-xl font-semibold text-black">{currentStop.distanceKm} km</div>
            </div>

            <div>
              <div className="text-sm text-gray-500">Location</div>
              <div className="mt-1 text-sm font-medium text-black">{currentStop.placeName}</div>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">{currentStop.address}</div>

          <button className="mt-4 w-full rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-200">
            📍 Navigate
          </button>
        </div>

        <div className="mt-4 rounded-2xl overflow-hidden border border-gray-200 bg-gray-100">
          <div className="h-44 w-full bg-[linear-gradient(135deg,#f3f4f6_25%,#e5e7eb_25%,#e5e7eb_50%,#f3f4f6_50%,#f3f4f6_75%,#e5e7eb_75%,#e5e7eb_100%)] bg-[length:24px_24px] flex items-center justify-center text-gray-500 text-sm">
            Route map preview
          </div>
        </div>

        <div className="mt-5">
          <h2 className="text-lg font-bold text-black">Route Progress</h2>

          <div className="mt-3 space-y-4">
            {route.stops.map((stop, index) => (
              <div key={stop.id} className="flex items-start gap-3">
                <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-xs text-white">
                  {index + 1}
                </div>

                <div className="flex-1 border-b border-gray-100 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-black">{stop.binId}</div>
                      <div className="text-sm text-gray-600">Fill {stop.fillPct}%</div>
                    </div>

                    <div className="text-right text-sm text-gray-600">
                      <div>{stop.distanceKm} km</div>
                      <div className="mt-1">{getStatusIcon(stop.status)}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            setCollectionResult("completed");
            setShowCollectModal(true);
          }}
          className="mt-5 w-full rounded-xl bg-slate-950 py-3 text-lg font-semibold text-white"
        >
          Mark as Collected
        </button>

        <button
          onClick={() => {
            setCollectionResult("issue");
            setShowCollectModal(true);
          }}
          className="mt-3 w-full rounded-xl border border-gray-300 bg-white py-3 text-lg font-semibold text-gray-700"
        >
          Report Issue
        </button>

        {showCollectModal && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full rounded-[24px] border-2 border-slate-950 bg-white p-5 shadow-xl">
              <h3 className="text-center text-xl font-bold text-black">
                {collectionResult === "completed"
                  ? "Mark Bin as Collected?"
                  : "Report Bin Issue?"}
              </h3>

              <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
                <div className="font-semibold text-black">Bin ID: {currentStop.binId}</div>
                <div className="mt-2 text-sm text-gray-700">
                  Fill level: {currentStop.fillPct}% →{" "}
                  {collectionResult === "completed" ? "0%" : `${currentStop.fillPct}%`}
                </div>
                <div className="text-sm text-gray-700">Distance: {currentStop.distanceKm} km</div>
                <div className="text-sm text-gray-700">ETA: {currentStop.etaMin} min</div>
              </div>

              <div className="mt-5 space-y-3">
                <label className="flex items-center gap-2 text-sm text-black">
                  <input
                    type="radio"
                    checked={collectionResult === "completed"}
                    onChange={() => setCollectionResult("completed")}
                  />
                  Bin was successfully emptied
                </label>

                <label className="flex items-center gap-2 text-sm text-black">
                  <input
                    type="radio"
                    checked={collectionResult === "issue"}
                    onChange={() => setCollectionResult("issue")}
                  />
                  Bin was blocked or inaccessible
                </label>
              </div>

              <button
                onClick={handleConfirmCollection}
                className="mt-5 w-full rounded-xl bg-slate-950 py-3 text-lg font-semibold text-white"
              >
                Confirm Collection
              </button>

              <button
                onClick={() => setShowCollectModal(false)}
                className="mt-3 w-full rounded-xl border border-gray-300 bg-white py-3 text-lg font-semibold text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}