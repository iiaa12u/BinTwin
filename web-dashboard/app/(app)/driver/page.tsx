"use client";

import { useRouter } from "next/navigation";
import { mockDriverRoute } from "@/lib/driverRoute";

function getFillColor(fillPct: number) {
  if (fillPct >= 80) return "bg-red-500";
  if (fillPct >= 60) return "bg-amber-400";
  return "bg-emerald-500";
}

export default function DriverPage() {
  const router = useRouter();

  const route = mockDriverRoute;

  function startRoute() {
    localStorage.setItem("driverRouteState", JSON.stringify(route));
    router.push("/driver/active");
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 flex justify-center px-4 py-6">
      <div className="w-full max-w-sm rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between pb-4">
          <button className="text-xl text-gray-700">←</button>
          <h1 className="text-2xl font-bold text-black">Today&apos;s Route</h1>
          <button className="text-xl text-gray-700">⌖</button>
        </div>

        <div className="rounded-2xl bg-emerald-50 p-5">
          <div className="grid grid-cols-2 gap-y-6 gap-x-4 text-center">
            <div>
              <div className="text-sm text-gray-600">Total Stops</div>
              <div className="mt-1 text-3xl font-bold text-black">{route.totalStops}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Est. Duration</div>
              <div className="mt-1 text-3xl font-bold text-black">{route.estDuration}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Bins to Collect</div>
              <div className="mt-1 text-3xl font-bold text-black">{route.binsToCollect}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Truck Capacity %</div>
              <div className="mt-1 text-3xl font-bold text-black">{route.truckCapacityPct}%</div>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {route.stops.map((stop, index) => (
            <div
              key={stop.id}
              className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                  {index + 1}
                </div>

                <div>
                  <div className="text-lg font-bold text-black">{stop.binId}</div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className={`h-2.5 w-2.5 rounded-full ${getFillColor(stop.fillPct)}`} />
                    <span>Fill: {stop.fillPct}%</span>
                  </div>
                </div>
              </div>

              <div className="text-right text-sm text-gray-600">
                <div>{stop.distanceKm} km</div>
                <div>{stop.etaMin} min</div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={startRoute}
          className="mt-6 w-full rounded-xl bg-slate-950 py-3 text-lg font-semibold text-white hover:bg-black"
        >
          Start Route
        </button>
      </div>
    </div>
  );
}