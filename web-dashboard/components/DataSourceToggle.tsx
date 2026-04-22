"use client";

import { DataSourceMode } from "@/lib/dataSource";

export default function DataSourceToggle({
  value,
  onChange,
}: {
  value: DataSourceMode;
  onChange: (value: DataSourceMode) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
      <button
        onClick={() => onChange("synthetic")}
        className={
          "rounded-lg px-4 py-2 text-sm font-medium transition " +
          (value === "synthetic"
            ? "bg-slate-900 text-white"
            : "text-gray-700 hover:bg-gray-50")
        }
      >
        Synthetic Data
      </button>

      <button
        onClick={() => onChange("real")}
        className={
          "rounded-lg px-4 py-2 text-sm font-medium transition " +
          (value === "real"
            ? "bg-emerald-600 text-white"
            : "text-gray-700 hover:bg-gray-50")
        }
      >
        Real Data
      </button>
    </div>
  );
}