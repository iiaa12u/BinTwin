"use client";

import { BinPoint } from "@/lib/bins";

export default function BinDetailsDrawer({
  bin,
  onClose,
}: {
  bin: BinPoint | null;
  onClose: () => void;
}) {
  if (!bin) return null;

  const risk =
    bin.fillPct >= 80 ? "High Risk" : bin.fillPct >= 60 ? "Medium Risk" : "Low Risk";

  const riskClass =
    bin.fillPct >= 80
      ? "bg-red-100 text-red-700"
      : bin.fillPct >= 60
      ? "bg-orange-100 text-orange-700"
      : "bg-emerald-100 text-emerald-700";

  return (
    <div className="fixed right-0 top-16 h-[calc(100vh-64px)] w-[380px] bg-white border-l shadow-xl z-50">
      <div className="p-4 border-b flex items-start justify-between">
        <div>
          <div className="text-xs text-gray-500">Bin ID</div>
          <div className="text-lg font-semibold">{bin.id}</div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${riskClass}`}>
            {risk}
          </span>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg border hover:bg-gray-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="p-4 space-y-5">
        <div>
          <div className="text-4xl font-semibold">{bin.fillPct}%</div>
          <div className="text-xs text-gray-500">Last sensor update: {bin.lastUpdate}</div>
        </div>

        <div className="rounded-xl border p-3">
          <div className="text-sm font-semibold mb-2">Location</div>
          <div className="text-sm text-gray-700 space-y-1">
            <div>
              <span className="text-gray-500">Place:</span> {bin.placeName}
            </div>
            <div>
              <span className="text-gray-500">Building:</span> {bin.buildingNumber}
            </div>
            <div>
              <span className="text-gray-500">Campus:</span> {bin.side}
            </div>
            <div>
              <span className="text-gray-500">Bin Label:</span> {bin.binNumber}
            </div>
          </div>
        </div>

        {/* Forecast Summary (mock for now) */}
        <div className="rounded-xl border p-3">
          <div className="text-sm font-semibold mb-2">Forecast Summary</div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-lg bg-gray-50 p-2">
              <div className="text-xs text-gray-500">2h</div>
              <div className="font-semibold">{Math.min(100, bin.fillPct + 8)}%</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-2">
              <div className="text-xs text-gray-500">6h</div>
              <div className="font-semibold">{Math.min(100, bin.fillPct + 22)}%</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-2">
              <div className="text-xs text-gray-500">12h</div>
              <div className="font-semibold">{Math.min(100, bin.fillPct + 35)}%</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border p-3">
          <div className="text-sm font-semibold mb-2">Charts</div>
          <div className="text-xs text-gray-500">(We’ll plug real charts later)</div>
        </div>
      </div>
    </div>
  );
}