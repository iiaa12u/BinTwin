"use client";

import MiniBinChart from "@/components/MiniBinChart";
import type { UnifiedBinRecord } from "@/lib/binsData";

type DrawerBin = UnifiedBinRecord | null;

function formatPct(value?: number) {
  if (value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function trendLabel(
  direction?: "up" | "down" | "flat",
  delta?: number
) {
  if (direction === "up") return `↑ ${Math.abs(delta ?? 0).toFixed(1)}%`;
  if (direction === "down") return `↓ ${Math.abs(delta ?? 0).toFixed(1)}%`;
  return `→ ${(delta ?? 0).toFixed(1)}%`;
}

function trendClasses(direction?: "up" | "down" | "flat") {
  if (direction === "up") return "bg-red-100 text-red-700";
  if (direction === "down") return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-700";
}

function statusClasses(status?: string) {
  const s = (status ?? "").toLowerCase();

  if (s.includes("high")) return "bg-red-100 text-red-800";
  if (s.includes("medium")) return "bg-orange-100 text-orange-800";
  return "bg-emerald-100 text-emerald-800";
}

type Props = {
  bin: DrawerBin;
  onClose: () => void;
};

export default function BinDetailsDrawer({ bin, onClose }: Props) {
  if (!bin) return null;

  return (
    <aside className="fixed right-0 top-14 z-30 h-[calc(100vh-56px)] w-[340px] border-l border-gray-200 bg-white shadow-xl">
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between border-b border-gray-200 px-4 py-4">
          <div>
            <div className="text-xs text-gray-500">Bin ID</div>
            <div className="text-3xl font-semibold text-black">{bin.id}</div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                bin.currentStatus
              )}`}
            >
              {bin.currentStatus ?? "Low"}
            </span>
            <button
              onClick={onClose}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-black hover:bg-gray-50"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <section>
            <div className="text-5xl font-bold tracking-tight text-black">
              {formatPct(bin.currentFillPct)}
            </div>
            <div className="mt-1 text-sm text-gray-500">
              Last sensor update: {bin.currentTimestamp || "—"}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${trendClasses(
                  bin.trendDirection
                )}`}
              >
                {trendLabel(bin.trendDirection, bin.trendDelta)}
              </span>

              {bin.forecastFillPct !== undefined && (
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  Forecast: {formatPct(bin.forecastFillPct)}
                </span>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 p-4">
            <div className="mb-3 text-sm font-semibold text-black">Location</div>
            <div className="space-y-1 text-sm text-gray-700">
              <div>
                <span className="font-medium">Place:</span> {bin.placeName}
              </div>
              <div>
                <span className="font-medium">Building:</span> {bin.buildingNumber}
              </div>
              <div>
                <span className="font-medium">Campus:</span> {bin.side}
              </div>
              <div>
                <span className="font-medium">Bin Label:</span> {bin.binNumber}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 p-4">
            <div className="mb-3 text-sm font-semibold text-black">
              Forecast Summary
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Forecast</div>
                <div className="mt-1 text-sm font-semibold text-black">
                  {formatPct(bin.forecastFillPct)}
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-xs text-gray-500">CI Lower</div>
                <div className="mt-1 text-sm font-semibold text-black">
                  {formatPct(bin.ciLower)}
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-3">
                <div className="text-xs text-gray-500">CI Upper</div>
                <div className="mt-1 text-sm font-semibold text-black">
                  {formatPct(bin.ciUpper)}
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              Forecast timestamp: {bin.forecastTimestamp || "—"}
            </div>
          </section>

          <section>
            <MiniBinChart points={bin.history} />
          </section>
        </div>
      </div>
    </aside>
  );
}