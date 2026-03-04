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
    <div className="flex h-[calc(100vh-56px)] bg-gray-50">
      
      {/* Sidebar */}
      <FilterControlSidebar />

      {/* Main Content */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">

        {/* KPI Row */}
        <div className="grid grid-cols-5 gap-4">
{[
  { label: "Total Active Bins", value: totalBins },
  { label: "Bins > 80%", value: binsAbove80 },
  { label: "Forecasted Overflows", value: "—" }, // keep mock for now
  { label: "Average Fill Level", value: `${avgFill}%` },
  { label: "Predicted to Exceed", value: predictedToExceed },
].map((item) => (
            <div
              key={item.label}
              className="bg-white rounded-xl p-4 border shadow-sm"
            >
              <div className="text-xs text-gray-500">{item.label}</div>
              <div className="mt-2 text-2xl font-semibold">
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Map */}
        <DashboardMap onBinSelect={(id) => setSelectedId(id)} />

        {/* Bin Table */}
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <div className="text-sm font-semibold mb-4">
            Bin Inventory
          </div>

          <table className="w-full text-sm">
            <thead className="text-gray-500 border-b">
              <tr>
                <th className="text-left py-2">Bin ID</th>
                <th className="text-left py-2">Location</th>
                <th className="text-left py-2">Zone</th>
                <th className="text-left py-2">Fill %</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>

            <tbody>
              {bins.map((bin) => (
                <tr
                  key={bin.id}
                  className={`border-b last:border-0 cursor-pointer hover:bg-gray-50 ${
                    selectedId === bin.id ? "bg-emerald-50" : ""
                  }`}
                  onClick={() => setSelectedId(bin.id)}
                >
                  <td className="py-3 font-medium">{bin.id}</td>
                  <td>{bin.placeName}</td>
                  <td>{bin.side}</td>
                  <td>{bin.fillPct}%</td>
                  <td>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        bin.fillPct >= 80
                          ? "bg-red-100 text-red-700"
                          : bin.fillPct >= 60
                          ? "bg-orange-100 text-orange-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {bin.fillPct >= 80 ? "High Risk" : bin.fillPct >= 60 ? "Medium" : "Low"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <BinDetailsDrawer bin={selectedBin} onClose={() => setSelectedId(null)} />
    </div>
  );
}