"use client";

import { useState } from "react";

export default function FilterControlSidebar() {
  const [zone, setZone] = useState("North District");
  const [fillRange, setFillRange] = useState("0-100");
  const [forecastHorizon, setForecastHorizon] = useState("Next 6 hours");
  const [dateRange, setDateRange] = useState("Next 24h");

  const [showRoutes, setShowRoutes] = useState(true);
  const [showTrucks, setShowTrucks] = useState(true);
  const [showBins, setShowBins] = useState(true);

  return (
    <aside className="rounded-xl border bg-white p-4">
      <div className="text-sm font-semibold mb-4">Filter &amp; Control</div>

      {/* Zone */}
      <div className="mb-4">
        <label className="block text-xs text-gray-500 mb-1">Zone</label>
        <select
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm bg-white"
        >
          <option>North District</option>
          <option>East District</option>
          <option>West District</option>
          <option>Central District</option>
          <option>South District</option>
        </select>
      </div>

      {/* Fill Level Range */}
      <div className="mb-4">
        <label className="block text-xs text-gray-500 mb-1">
          Fill Level Range (0% - 100%)
        </label>
        <select
          value={fillRange}
          onChange={(e) => setFillRange(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm bg-white"
        >
          <option value="0-100">0 - 100</option>
          <option value="0-50">0 - 50</option>
          <option value="50-80">50 - 80</option>
          <option value="80-100">80 - 100</option>
        </select>
      </div>

      {/* Forecast Horizon */}
      <div className="mb-4">
        <label className="block text-xs text-gray-500 mb-1">
          Forecast Horizon
        </label>
        <select
          value={forecastHorizon}
          onChange={(e) => setForecastHorizon(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm bg-white"
        >
          <option>Next 6 hours</option>
          <option>Next 12 hours</option>
          <option>Next 24 hours</option>
        </select>
      </div>

      {/* Date Range */}
      <div className="mb-5">
        <label className="block text-xs text-gray-500 mb-1">Date Range</label>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm bg-white"
        >
          <option>Next 24h</option>
          <option>Last 24h</option>
          <option>Last 7 days</option>
          <option>Last 30 days</option>
        </select>
      </div>

      {/* Toggles */}
      <ToggleRow
        label="Show Routes"
        checked={showRoutes}
        onChange={setShowRoutes}
      />
      <ToggleRow
        label="Show Trucks"
        checked={showTrucks}
        onChange={setShowTrucks}
      />
      <ToggleRow label="Show Bins" checked={showBins} onChange={setShowBins} />

      <button className="mt-5 w-full rounded-lg border bg-white py-2 text-sm">
        Clear Filters
      </button>
    </aside>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="text-sm text-gray-700">{label}</div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          checked ? "bg-emerald-600" : "bg-gray-300"
        }`}
        aria-pressed={checked}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}