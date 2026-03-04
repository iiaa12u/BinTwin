import DashboardMap from "@/components/DashboardMap";
import FilterControlSidebar from "@/components/FilterControlSidebar";

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left Sidebar */}
      <section className="col-span-3">
        <FilterControlSidebar />
      </section>

      {/* Middle Main Dashboard */}
      <section className="col-span-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[
            "Total Active Bins",
            "Bins > 80%",
            "Forecasted Overflows (Next 6h)",
            "Average Fill Level",
            "Total Collection Time Today",
            "Total Route Distance Today",
          ].map((label) => (
            <div key={label} className="rounded-xl border bg-white p-4">
              <div className="text-xs text-gray-500">{label}</div>
              <div className="mt-2 text-xl font-semibold">—</div>
            </div>
          ))}
        </div>

        <DashboardMap />

        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-xl border bg-white p-4 h-[240px]">
            <div className="text-sm font-semibold mb-2">
              Fill Level Trends (Last 7 Days)
            </div>
            <div className="text-gray-400 text-sm">Chart placeholder</div>
          </div>

          <div className="rounded-xl border bg-white p-4 h-[240px]">
            <div className="text-sm font-semibold mb-2">
              Collections & Overflow Events
            </div>
            <div className="text-gray-400 text-sm">Chart placeholder</div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm font-semibold mb-3">Alerts</div>
          <div className="text-gray-400 text-sm">Alerts table placeholder</div>
        </div>
      </section>

      {/* Right Sidebar */}
      <aside className="col-span-3 space-y-6">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm font-semibold mb-2">Citywide Insights</div>
          <div className="text-gray-400 text-sm">Insights placeholder</div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm font-semibold mb-2">Daily Summary</div>
          <div className="text-gray-400 text-sm">Summary placeholder</div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm font-semibold mb-3">Quick Actions</div>
          <div className="flex flex-col gap-2">
            <button className="rounded-lg bg-emerald-600 text-white py-2 text-sm">
              Generate Optimal Routes
            </button>
            <button className="rounded-lg border py-2 text-sm">
              Run Forecast
            </button>
            <button className="rounded-lg border py-2 text-sm">
              Open Scenario Simulation
            </button>
            <button className="rounded-lg border py-2 text-sm">
              Download Daily Report (PDF)
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}