import DashboardMap from "@/components/DashboardMap";
import FilterControlSidebar from "@/components/FilterControlSidebar";

export default function DashboardPage() {
  return (
    <div className="min-h-[calc(100vh-56px)] bg-white text-black">
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar */}
          <section className="col-span-12 lg:col-span-3">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <FilterControlSidebar />
            </div>
          </section>

          {/* Middle Main Dashboard */}
          <section className="col-span-12 lg:col-span-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                "Total Active Bins",
                "Bins > 80%",
                "Forecasted Overflows (Next 6h)",
                "Average Fill Level",
                "Total Collection Time Today",
                "Total Route Distance Today",
              ].map((label) => (
                <div
                  key={label}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="text-xs font-medium text-gray-700">{label}</div>
                  <div className="mt-2 text-2xl font-semibold text-black">—</div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
              <DashboardMap />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 h-[240px] shadow-sm">
                <div className="text-sm font-semibold text-black mb-2">
                  Fill Level Trends (Last 7 Days)
                </div>
                <div className="text-gray-700 text-sm">Chart placeholder</div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 h-[240px] shadow-sm">
                <div className="text-sm font-semibold text-black mb-2">
                  Collections & Overflow Events
                </div>
                <div className="text-gray-700 text-sm">Chart placeholder</div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-black mb-3">Alerts</div>
              <div className="text-gray-700 text-sm">Alerts table placeholder</div>
            </div>
          </section>

          {/* Right Sidebar */}
          <aside className="col-span-12 lg:col-span-3 space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-black mb-2">
                Citywide Insights
              </div>
              <div className="text-gray-700 text-sm">Insights placeholder</div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-black mb-2">
                Daily Summary
              </div>
              <div className="text-gray-700 text-sm">Summary placeholder</div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-black mb-3">
                Quick Actions
              </div>
              <div className="flex flex-col gap-2">
                <button className="rounded-lg bg-emerald-600 text-white py-2 text-sm font-medium hover:bg-emerald-700">
                  Generate Optimal Routes
                </button>
                <button className="rounded-lg border border-gray-300 py-2 text-sm text-black hover:bg-gray-100">
                  Run Forecast
                </button>
                <button className="rounded-lg border border-gray-300 py-2 text-sm text-black hover:bg-gray-100">
                  Open Scenario Simulation
                </button>
                <button className="rounded-lg border border-gray-300 py-2 text-sm text-black hover:bg-gray-100">
                  Download Daily Report (PDF)
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}