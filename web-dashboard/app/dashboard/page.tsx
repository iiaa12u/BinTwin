import DashboardMap from "@/components/DashboardMap";
import FilterControlSidebar from "@/components/FilterControlSidebar";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top header */}
      <header className="h-16 border-b bg-white flex items-center px-6">
        <div className="flex items-center gap-2">
          <img
            src="/bintwin-logo.png"
            alt="BinTwin logo"
            className="h-14 w-auto"
          />
        </div>

        <nav className="ml-8 flex gap-6 text-sm text-gray-600">
          <a className="text-emerald-600 font-medium" href="/dashboard">
            Dashboard
          </a>
          <a href="#">Bins</a>
          <a href="#">Routes</a>
          <a href="#">Scenarios</a>
          <a href="#">Reports</a>
          <a href="#">Admin</a>
        </nav>

        <div className="ml-auto text-sm text-gray-500">🔔</div>
      </header>

      {/* Main content */}
      <main className="p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar */}
          <section className="col-span-3">
            <FilterControlSidebar />
          </section>

          {/* Middle Main Dashboard */}
          <section className="col-span-6 space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-4">
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
                  className="rounded-xl border bg-white p-4"
                >
                  <div className="text-xs text-gray-500">{label}</div>
                  <div className="mt-2 text-xl font-semibold">—</div>
                </div>
              ))}
            </div>

            {/* Map */}
            <DashboardMap />

            {/* Charts */}
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

            {/* Alerts */}
            <div className="rounded-xl border bg-white p-4">
              <div className="text-sm font-semibold mb-3">Alerts</div>
              <div className="text-gray-400 text-sm">
                Alerts table placeholder
              </div>
            </div>
          </section>

          {/* Right Sidebar */}
          <aside className="col-span-3 space-y-6">
            <div className="rounded-xl border bg-white p-4">
              <div className="text-sm font-semibold mb-2">
                Citywide Insights
              </div>
              <div className="text-gray-400 text-sm">
                Insights placeholder
              </div>
            </div>

            <div className="rounded-xl border bg-white p-4">
              <div className="text-sm font-semibold mb-2">
                Daily Summary
              </div>
              <div className="text-gray-400 text-sm">
                Summary placeholder
              </div>
            </div>

            <div className="rounded-xl border bg-white p-4">
              <div className="text-sm font-semibold mb-3">
                Quick Actions
              </div>
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
      </main>
    </div>
  );
}