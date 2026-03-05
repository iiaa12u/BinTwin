"use client";

import { useMemo, useState } from "react";
import DashboardMap from "@/components/DashboardMap";
import FilterControlSidebar from "@/components/FilterControlSidebar";
import BinDetailsDrawer from "@/components/BinDetailsDrawer";
import { bins } from "@/lib/bins";
import type { BinPoint } from "@/lib/bins";

export default function BinsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedBin: BinPoint | null = useMemo(
    () => bins.find((b) => b.id === selectedId) ?? null,
    [selectedId]
  );

  const totalBins = bins.length;
  const binsAbove80 = bins.filter((b) => b.fillPct >= 80).length;

  const avgFill = Math.round(
    bins.reduce((sum, b) => sum + b.fillPct, 0) / (bins.length || 1)
  );

  // For now (until forecasting team API exists), we simulate predicted exceed:
  const predictedToExceed = bins.filter((b) => b.fillPct >= 70).length; // temporary rule

  return (
    <div className="min-h-[calc(100vh-56px)] bg-white text-black">
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <aside className="col-span-12 lg:col-span-3">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <FilterControlSidebar />
            </div>
          </aside>

          {/* Main */}
          <section className="col-span-12 lg:col-span-9 space-y-6">
            {/* KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: "Total Active Bins", value: totalBins },
                { label: "Bins > 80%", value: binsAbove80 },
                { label: "Forecasted Overflows", value: "—" }, // keep mock for now
                { label: "Average Fill Level", value: `${avgFill}%` },
                { label: "Predicted to Exceed", value: predictedToExceed },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="text-xs font-medium text-gray-700">
                    {item.label}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-black">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Map */}
            <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
              <DashboardMap onBinSelect={(id) => setSelectedId(id)} />
            </div>

            {/* Bin Table */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-black">
                  Bin Inventory
                </div>
                <div className="text-xs text-gray-700">
                  Click a row or map marker to view details
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-800">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">Bin ID</th>
                      <th className="text-left py-3 px-4 font-semibold">Location</th>
                      <th className="text-left py-3 px-4 font-semibold">Zone</th>
                      <th className="text-left py-3 px-4 font-semibold">Fill %</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {bins.map((bin) => (
                      <tr
                        key={bin.id}
                        className={
                          "cursor-pointer bg-white hover:bg-gray-50 " +
                          (selectedId === bin.id ? "bg-emerald-50" : "")
                        }
                        onClick={() => setSelectedId(bin.id)}
                      >
                        <td className="py-3 px-4 font-medium text-black">
                          {bin.id}
                        </td>
                        <td className="py-3 px-4 text-black">{bin.placeName}</td>
                        <td className="py-3 px-4 text-black">{bin.side}</td>
                        <td className="py-3 px-4 text-black">{bin.fillPct}%</td>
                        <td className="py-3 px-4">
                          <span
                            className={
                              "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold " +
                              (bin.fillPct >= 80
                                ? "bg-red-100 text-red-800"
                                : bin.fillPct >= 60
                                ? "bg-orange-100 text-orange-800"
                                : "bg-emerald-100 text-emerald-800")
                            }
                          >
                            {bin.fillPct >= 80
                              ? "High Risk"
                              : bin.fillPct >= 60
                              ? "Medium"
                              : "Low"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>

      <BinDetailsDrawer bin={selectedBin} onClose={() => setSelectedId(null)} />
    </div>
  );
}