"use client";

import { useMemo, useState } from "react";
import {
  collectionsVsOverflows,
  forecastAccuracy,
  historicalPerformance,
  keyInsights,
  reportKpis,
  routeDistanceVsTime,
  co2PerTonTrend,
  savedReports,
} from "@/lib/reportsData";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("Operations");
  const [dateRange, setDateRange] = useState("Last 30 days");
  const [zone, setZone] = useState("All City Zones");
  const [showOverflows, setShowOverflows] = useState(true);
  const [includeMissedCollections, setIncludeMissedCollections] = useState(false);
  const [threshold, setThreshold] = useState(80);

  const forecastAccuracyAvg = useMemo(() => {
    const total = forecastAccuracy.reduce((sum, item) => sum + item.actual, 0);
    return Math.round(total / forecastAccuracy.length);
  }, []);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-[1650px] px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Filters */}
          <aside className="col-span-12 xl:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900">Report Filters</h2>

              <div className="mt-4 space-y-4">
                <Field label="Report type">
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                  >
                    <option>Operations</option>
                    <option>Sustainability</option>
                    <option>Service Quality</option>
                  </select>
                </Field>

                <Field label="Date range">
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                  >
                    <option>Last 30 days</option>
                    <option>Last 7 days</option>
                    <option>Last 90 days</option>
                  </select>
                </Field>

                <Field label="Zone">
                  <select
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                  >
                    <option>All City Zones</option>
                    <option>North Zone</option>
                    <option>Central Zone</option>
                    <option>South Zone</option>
                  </select>
                </Field>

                <Field label="Truck fleet">
                  <div className="space-y-2 text-sm">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked />
                      Standard Diesel
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked />
                      Electric
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" />
                      Hybrid
                    </label>
                  </div>
                </Field>

                <Field label={`Show bins with fill at pickup above: ${threshold}%`}>
                  <input
                    type="range"
                    min={50}
                    max={100}
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full"
                  />
                </Field>

                <label className="flex items-center justify-between text-sm text-gray-700">
                  <span>Include overflow events</span>
                  <Toggle checked={showOverflows} onChange={setShowOverflows} />
                </label>

                <label className="flex items-center justify-between text-sm text-gray-700">
                  <span>Include missed collections</span>
                  <Toggle
                    checked={includeMissedCollections}
                    onChange={setIncludeMissedCollections}
                  />
                </label>

                <div className="space-y-2 pt-2">
                  <button className="w-full rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-black">
                    Apply Filters
                  </button>
                  <button className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50">
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <section className="col-span-12 xl:col-span-8 space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <KpiCard
                label="Collections completed"
                value={String(reportKpis.collectionsCompleted)}
                sublabel="selected period"
              />
              <KpiCard
                label="Overflows occurred"
                value={String(reportKpis.overflowsOccurred)}
                sublabel="vs previous period"
                badge="-35%"
                badgeTone="red"
              />
              <KpiCard
                label="Avg fill at pickup"
                value={`${reportKpis.avgFillAtPickup}%`}
                sublabel="overall average"
              />
              <KpiCard
                label="Avg route efficiency"
                value={`${reportKpis.routeEfficiencyKmPerBin} km/bin`}
                sublabel="selected period"
              />
              <KpiCard
                label="CO₂ emitted"
                value={`${reportKpis.co2EmittedTons} t CO₂e`}
                sublabel="vs previous period"
                badge="-18%"
                badgeTone="green"
              />
            </div>

            {/* Charts row 1 */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <ChartCard
                title="Collections & Overflows Over Time"
                subtitle=""
              >
                <SimpleDualChart
                  bars={collectionsVsOverflows.map((d) => d.collections)}
                  line={collectionsVsOverflows.map((d) => d.overflows)}
                  labels={collectionsVsOverflows.map((d) => d.month)}
                />
              </ChartCard>

              <ChartCard
                title="Forecast Accuracy"
                subtitle={`Overall accuracy: ${forecastAccuracyAvg}%`}
              >
                <SimpleGroupedBarChart
                  actual={forecastAccuracy.map((d) => d.actual)}
                  predicted={forecastAccuracy.map((d) => d.predicted)}
                  labels={forecastAccuracy.map((d) => d.month)}
                />
              </ChartCard>
            </div>

            {/* Charts row 2 */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <ChartCard title="Route Distance & Time per Day" subtitle="">
                <SimpleBarWithTinySeries
                  bars={routeDistanceVsTime.map((d) => d.distance)}
                  tiny={routeDistanceVsTime.map((d) => d.time)}
                  labels={routeDistanceVsTime.map((d) => d.day)}
                />
              </ChartCard>

              <ChartCard title="CO₂ per ton collected" subtitle="">
                <SimpleLineChart
                  values={co2PerTonTrend.map((d) => d.value)}
                  target={co2PerTonTrend.map((d) => d.target)}
                  labels={co2PerTonTrend.map((d) => d.date.slice(5))}
                />
              </ChartCard>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 text-base font-semibold text-gray-900">
                Historical Performance (Daily)
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Date</th>
                      <th className="px-4 py-3 text-left font-semibold">Zone</th>
                      <th className="px-4 py-3 text-left font-semibold">Collections</th>
                      <th className="px-4 py-3 text-left font-semibold">Overflows</th>
                      <th className="px-4 py-3 text-left font-semibold">Avg fill at pickup</th>
                      <th className="px-4 py-3 text-left font-semibold">Route distance (km)</th>
                      <th className="px-4 py-3 text-left font-semibold">Collection time (h)</th>
                      <th className="px-4 py-3 text-left font-semibold">CO₂ per ton</th>
                      <th className="px-4 py-3 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historicalPerformance.map((row) => (
                      <tr key={`${row.date}-${row.zone}`} className="bg-white hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900">{row.date}</td>
                        <td className="px-4 py-3 text-gray-700">{row.zone}</td>
                        <td className="px-4 py-3 text-gray-700">{row.collections}</td>
                        <td className="px-4 py-3 text-gray-700">{row.overflows}</td>
                        <td className="px-4 py-3 text-gray-700">{row.avgFillAtPickup}%</td>
                        <td className="px-4 py-3 text-gray-700">{row.routeDistanceKm}</td>
                        <td className="px-4 py-3 text-gray-700">{row.collectionTimeH}</td>
                        <td className="px-4 py-3 text-gray-700">{row.co2PerTon}</td>
                        <td className="px-4 py-3 text-gray-900">View details</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Right side */}
          <aside className="col-span-12 xl:col-span-2 space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-gray-900">
                Key Insights — Selected Period
              </div>

              <ul className="mt-4 space-y-3 text-sm text-gray-700">
                {keyInsights.map((item, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gray-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-gray-900">
                Saved & Scheduled Reports
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-800">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Report name</th>
                      <th className="px-3 py-2 text-left font-semibold">Type</th>
                      <th className="px-3 py-2 text-left font-semibold">Freq</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {savedReports.map((report) => (
                      <tr key={report.name}>
                        <td className="px-3 py-3 text-gray-900">{report.name}</td>
                        <td className="px-3 py-3 text-gray-700">{report.type}</td>
                        <td className="px-3 py-3 text-gray-700">{report.frequency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 text-sm font-semibold text-gray-900">
                Quick Actions
              </div>

              <div className="space-y-2">
                <button className="w-full rounded-lg bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-black">
                  Generate PDF Report
                </button>
                <button className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
                  Export CSV
                </button>
                <button className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
                  Email Report to Stakeholders
                </button>
                <button className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
                  Create New Scheduled Report
                </button>
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
      <div className="mb-1 text-xs font-medium text-gray-800">{label}</div>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={
        "relative inline-flex h-6 w-11 items-center rounded-full transition " +
        (checked ? "bg-emerald-500" : "bg-gray-300")
      }
    >
      <span
        className={
          "inline-block h-5 w-5 transform rounded-full bg-white transition " +
          (checked ? "translate-x-5" : "translate-x-1")
        }
      />
    </button>
  );
}

function KpiCard({
  label,
  value,
  sublabel,
  badge,
  badgeTone,
}: {
  label: string;
  value: string;
  sublabel?: string;
  badge?: string;
  badgeTone?: "red" | "green";
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-gray-600">{label}</div>
      <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
      {sublabel && <div className="mt-1 text-xs text-gray-500">{sublabel}</div>}
      {badge && (
        <div
          className={
            "mt-2 inline-flex rounded-full px-2 py-1 text-xs font-medium " +
            (badgeTone === "red"
              ? "bg-red-50 text-red-600"
              : "bg-emerald-50 text-emerald-600")
          }
        >
          {badge}
        </div>
      )}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="text-base font-semibold text-gray-900">{title}</div>
      {subtitle && <div className="mt-1 text-sm text-gray-500">{subtitle}</div>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function SimpleDualChart({
  bars,
  line,
  labels,
}: {
  bars: number[];
  line: number[];
  labels: string[];
}) {
  const maxBar = Math.max(...bars, 1);
  const maxLine = Math.max(...line, 1);

  return (
    <div>
      <div className="flex h-48 items-end gap-3">
        {bars.map((bar, i) => (
          <div key={labels[i]} className="flex flex-1 items-end gap-1">
            <div className="flex-1 rounded-t bg-slate-950" style={{ height: `${(bar / maxBar) * 100}%` }} />
            <div
              className="w-1 rounded-full bg-red-400"
              style={{ height: `${(line[i] / maxLine) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-xs text-gray-500">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

function SimpleGroupedBarChart({
  actual,
  predicted,
  labels,
}: {
  actual: number[];
  predicted: number[];
  labels: string[];
}) {
  const max = Math.max(...actual, ...predicted, 1);

  return (
    <div>
      <div className="flex h-48 items-end gap-3">
        {actual.map((value, i) => (
          <div key={labels[i]} className="flex flex-1 items-end gap-1">
            <div
              className="flex-1 rounded-t bg-emerald-700"
              style={{ height: `${(value / max) * 100}%` }}
            />
            <div
              className="flex-1 rounded-t bg-emerald-300"
              style={{ height: `${(predicted[i] / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-xs text-gray-500">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

function SimpleBarWithTinySeries({
  bars,
  tiny,
  labels,
}: {
  bars: number[];
  tiny: number[];
  labels: string[];
}) {
  const maxBar = Math.max(...bars, 1);
  const maxTiny = Math.max(...tiny, 1);

  return (
    <div>
      <div className="flex h-48 items-end gap-4">
        {bars.map((bar, i) => (
          <div key={labels[i]} className="flex flex-1 items-end gap-1">
            <div
              className="flex-1 rounded-t bg-emerald-700"
              style={{ height: `${(bar / maxBar) * 100}%` }}
            />
            <div
              className="w-2 rounded-t bg-emerald-300"
              style={{ height: `${(tiny[i] / maxTiny) * 30}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between text-xs text-gray-500">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

function SimpleLineChart({
  values,
  target,
  labels,
}: {
  values: number[];
  target: number[];
  labels: string[];
}) {
  const max = Math.max(...values, ...target, 1);

  return (
    <div>
      <div className="relative h-48">
        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="#111827"
            strokeWidth="2"
            points={values
              .map((v, i) => `${(i / (values.length - 1)) * 100},${100 - (v / max) * 100}`)
              .join(" ")}
          />
          <polyline
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            points={target
              .map((v, i) => `${(i / (target.length - 1)) * 100},${100 - (v / max) * 100}`)
              .join(" ")}
          />
        </svg>
      </div>
      <div className="mt-3 flex justify-between text-xs text-gray-500">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}