"use client";

import { useState } from "react";
import { routeKpis, routeStops } from "@/lib/routesData";

export default function RoutesPage() {
  const [zone, setZone] = useState("North District");
  const [manualBin, setManualBin] = useState("BIN-001");
  const [truck, setTruck] = useState("Truck Alpha (1500kg)");
  const [shiftStart, setShiftStart] = useState("06:00");
  const [shiftEnd, setShiftEnd] = useState("14:00");
  const [goal, setGoal] = useState("distance");
  const [threshold, setThreshold] = useState(80);
  const [forecastHorizon, setForecastHorizon] = useState("Next 6 Hours");
  const [autoSelect, setAutoSelect] = useState(true);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left controls */}
          <aside className="col-span-12 xl:col-span-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                Route Planning Controls
              </h2>

              <div className="mt-5 space-y-4">
                <Field label="Zone">
                  <select
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                  >
                    <option>North District</option>
                    <option>Central District</option>
                    <option>South District</option>
                  </select>
                </Field>

                <Field label="Manual Bin Selection">
                  <select
                    value={manualBin}
                    onChange={(e) => setManualBin(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                  >
                    <option>BIN-001</option>
                    <option>BIN-002</option>
                    <option>BIN-003</option>
                    <option>BIN-006</option>
                  </select>
                </Field>

                <Field label="Select Truck">
                  <select
                    value={truck}
                    onChange={(e) => setTruck(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                  >
                    <option>Truck Alpha (1500kg)</option>
                    <option>Truck Beta (2000kg)</option>
                    <option>Truck Gamma (1200kg)</option>
                  </select>
                </Field>

                <div>
                  <div className="mb-1 text-sm font-medium text-gray-800">
                    Shift Time
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={shiftStart}
                      onChange={(e) => setShiftStart(e.target.value)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                    <input
                      value={shiftEnd}
                      onChange={(e) => setShiftEnd(e.target.value)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-sm font-medium text-gray-800">
                    Optimization Goal
                  </div>
                  <div className="space-y-2 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={goal === "distance"}
                        onChange={() => setGoal("distance")}
                      />
                      Minimize Distance
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={goal === "time"}
                        onChange={() => setGoal("time")}
                      />
                      Minimize Time
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={goal === "overflow"}
                        onChange={() => setGoal("overflow")}
                      />
                      Minimize Overflow Risk
                    </label>
                  </div>
                </div>

                <Field label={`Service Threshold (collect above ${threshold}%)`}>
                  <input
                    type="range"
                    min={50}
                    max={100}
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full"
                  />
                </Field>

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
                  Currently selecting bins predicted to exceed threshold within
                  the chosen horizon.
                </p>

                <button className="mt-2 w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600">
                  Generate Optimal Routes
                </button>
              </div>
            </div>
          </aside>

          {/* Middle */}
          <section className="col-span-12 xl:col-span-6 space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <KpiCard label="Total Active Bins" value={routeKpis.totalActiveBins} />
              <KpiCard label="Bins > 80%" value={routeKpis.binsAbove80} accent="red" />
              <KpiCard label="Forecasted Overflows" value={routeKpis.forecastedOverflows} />
              <KpiCard label="Average Fill Level" value={`${routeKpis.averageFillLevel}%`} />
              <KpiCard
                label="Bins predicted to threshold"
                value={routeKpis.binsPredictedToThreshold}
              />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="relative h-[520px] overflow-hidden rounded-xl border border-gray-200 bg-[linear-gradient(135deg,#f3f4f6_25%,#e5e7eb_25%,#e5e7eb_50%,#f3f4f6_50%,#f3f4f6_75%,#e5e7eb_75%,#e5e7eb_100%)] bg-[length:24px_24px]">
                <svg className="absolute inset-0 h-full w-full">
                  <path
                    d="M110 170 L270 260 L250 390 L430 305 L560 215"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="4"
                    strokeDasharray="8 6"
                  />
                </svg>

                {routeStops.map((stop) => (
                  <div
                    key={stop.id}
                    className="absolute"
                    style={{ left: `${stop.leftPct}%`, top: `${stop.topPct}%` }}
                  >
                    <div className="relative">
                      <div
                        className={
                          "flex h-10 w-10 items-center justify-center rounded-full border-4 border-white text-xs font-bold text-white shadow " +
                          (stop.risk === "High"
                            ? "bg-red-500"
                            : stop.risk === "Medium"
                            ? "bg-amber-400"
                            : "bg-emerald-500")
                        }
                      >
                        {stop.priority}
                      </div>

                      <div className="absolute left-12 top-1 w-40 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm">
                        <div className="font-semibold text-gray-900">{stop.binId}</div>
                        <div className="text-gray-600">Fill in: {stop.fillInHours}</div>
                        <div className="text-gray-600">
                          Forecast: +{stop.forecastPct}% in 6h
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="absolute bottom-4 right-4 rounded-lg border border-gray-200 bg-white p-3 text-xs shadow-sm">
                  <div className="mb-2 font-semibold text-gray-900">Bin Status</div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span>Low Risk (&lt;60%)</span>
                  </div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-amber-400" />
                    <span>Medium Risk (60-80%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-500" />
                    <span>High Risk (&gt;80%)</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Right */}
          <aside className="col-span-12 xl:col-span-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                Route Plan – 06:00 AM to 14:00 PM
              </h2>

              <div className="mt-3 text-sm text-gray-600">
                Selected Truck: Truck Alpha (1500kg)
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <MiniCard label="Total Bins" value="4" />
                <MiniCard label="Total Distance" value="78km" />
                <MiniCard label="Estimated Time" value="4h 30m" />
                <MiniCard label="Overflow Prevented" value="5 bins" />
              </div>

              <div className="mt-6 border-t pt-5">
                <div className="mb-4 text-base font-semibold text-gray-900">
                  Route Steps (4 Stops)
                </div>

                <div className="space-y-4">
                  {routeStops.map((stop) => (
                    <div key={stop.id} className="flex gap-3">
                      <div
                        className={
                          "mt-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white " +
                          (stop.risk === "High"
                            ? "bg-red-500"
                            : stop.risk === "Medium"
                            ? "bg-amber-400"
                            : "bg-emerald-500")
                        }
                      >
                        {stop.priority}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-gray-900">
                              {stop.binId}
                            </div>
                            <div className="text-xs text-gray-600">
                              Fill: {stop.fillPct}% • Forecast: {stop.forecastPct}% in 6h
                            </div>
                            <div className="text-xs text-gray-600">
                              Fill in: {stop.fillInHours} •{" "}
                              <span
                                className={
                                  stop.risk === "High"
                                    ? "text-red-600"
                                    : stop.risk === "Medium"
                                    ? "text-amber-600"
                                    : "text-emerald-600"
                                }
                              >
                                {stop.risk} Risk
                              </span>
                            </div>
                          </div>

                          <div className="text-sm font-medium text-gray-900">
                            {stop.eta}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-3">
                  <button className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600">
                    Send to Driver
                  </button>
                  <button className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50">
                    Export Route (PDF)
                  </button>
                  <button className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50">
                    Save Scenario
                  </button>
                </div>
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
  children: React.ReactNode;
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
        className={
          "mb-3 h-1 w-full rounded-full " +
          (accent === "red" ? "bg-red-400" : "bg-emerald-400")
        }
      />
      <div className="text-4xl font-bold text-gray-900">{value}</div>
      <div className="mt-2 text-sm text-gray-600">{label}</div>
    </div>
  );
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-xs text-gray-600">{label}</div>
      <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}