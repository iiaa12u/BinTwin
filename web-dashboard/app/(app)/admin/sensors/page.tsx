"use client";

import { useMemo, useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { mockSensors, type SensorRecord } from "@/lib/admin/sensorsData";

export default function AdminSensorsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedSensorId, setSelectedSensorId] = useState<string>(
    mockSensors[0]?.id ?? ""
  );

  const filteredSensors = useMemo(() => {
    const q = search.trim().toLowerCase();

    return mockSensors.filter((sensor) => {
      const matchesSearch =
        !q ||
        sensor.id.toLowerCase().includes(q) ||
        sensor.binId.toLowerCase().includes(q) ||
        sensor.placeName.toLowerCase().includes(q) ||
        sensor.zoneAssigned.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "ALL" ? true : sensor.healthStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const selectedSensor =
    filteredSensors.find((sensor) => sensor.id === selectedSensorId) ||
    mockSensors.find((sensor) => sensor.id === selectedSensorId) ||
    filteredSensors[0] ||
    mockSensors[0];

  const kpis = useMemo(() => {
    const total = mockSensors.length;
    const healthy = mockSensors.filter((s) => s.healthStatus === "Healthy").length;
    const warnings = mockSensors.filter((s) => s.healthStatus === "Warning").length;
    const critical = mockSensors.filter(
      (s) => s.healthStatus === "Critical" || s.healthStatus === "Offline"
    ).length;

    return { total, healthy, warnings, critical };
  }, []);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-[1500px] px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          <AdminSidebar />

          <section className="col-span-12 lg:col-span-7 space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-1 text-xs text-gray-700">
                Admin › Sensor Health Monitor
              </div>
              <h1 className="text-lg font-semibold text-gray-900">
                Sensor Health Monitor
              </h1>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Total Sensors" value={kpis.total} />
                <KpiCard label="Healthy" value={kpis.healthy} />
                <KpiCard label="Warnings" value={kpis.warnings} />
                <KpiCard label="Critical" value={kpis.critical} />
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search sensors..."
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-200"
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="ALL">All Health Statuses</option>
                  <option value="Healthy">Healthy</option>
                  <option value="Warning">Warning</option>
                  <option value="Critical">Critical</option>
                  <option value="Offline">Offline</option>
                </select>
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Sensor ID</th>
                      <th className="px-4 py-3 text-left font-semibold">Bin ID</th>
                      <th className="px-4 py-3 text-left font-semibold">Location</th>
                      <th className="px-4 py-3 text-left font-semibold">Battery</th>
                      <th className="px-4 py-3 text-left font-semibold">Signal</th>
                      <th className="px-4 py-3 text-left font-semibold">Health</th>
                      <th className="px-4 py-3 text-left font-semibold">Last Communication</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredSensors.map((sensor) => (
                      <tr
                        key={sensor.id}
                        onClick={() => setSelectedSensorId(sensor.id)}
                        className={
                          "cursor-pointer bg-white transition " +
                          (selectedSensor?.id === sensor.id
                            ? "bg-emerald-50/40"
                            : "hover:bg-gray-50")
                        }
                      >
                        <td className="px-4 py-4 font-semibold text-gray-900">
                          {sensor.id}
                        </td>
                        <td className="px-4 py-4 text-gray-700">{sensor.binId}</td>
                        <td className="px-4 py-4 text-gray-700">{sensor.placeName}</td>
                        <td className="px-4 py-4 text-gray-700">{sensor.batteryLevel}%</td>
                        <td className="px-4 py-4 text-gray-700">{sensor.signalStrength} dBm</td>
                        <td className="px-4 py-4">
                          <SensorStatusPill status={sensor.healthStatus} />
                        </td>
                        <td className="px-4 py-4 text-gray-700">
                          {sensor.lastCommunication}
                        </td>
                      </tr>
                    ))}

                    {filteredSensors.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                          No sensors found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <aside className="col-span-12 lg:col-span-3 space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 text-base font-semibold text-gray-900">
                Selected Sensor Overview
              </div>

              {selectedSensor ? (
                <div className="space-y-4 text-sm">
                  <InfoRow label="Sensor ID" value={selectedSensor.id} />
                  <InfoRow label="Bin ID" value={selectedSensor.binId} />
                  <InfoRow label="Location" value={selectedSensor.placeName} />
                  <InfoRow label="Zone" value={selectedSensor.zoneAssigned} />
                  <InfoRow label="Sensor Type" value={selectedSensor.sensorType} />
                  <InfoRow label="Battery Level" value={`${selectedSensor.batteryLevel}%`} />
                  <InfoRow
                    label="Signal Strength"
                    value={`${selectedSensor.signalStrength} dBm`}
                  />
                  <InfoRow
                    label="Last Communication"
                    value={selectedSensor.lastCommunication}
                  />
                  <InfoRow
                    label="Firmware Version"
                    value={selectedSensor.firmwareVersion}
                  />
                  <InfoRow
                    label="Current Fill Level"
                    value={`${selectedSensor.currentFillLevel}%`}
                  />
                  <InfoRow label="Health Status" value={selectedSensor.healthStatus} />
                  <InfoRow label="Alerts" value={selectedSensor.alerts} />

                  <div className="space-y-2 pt-2">
                    <button className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
                      Run Sensor Diagnostics
                    </button>
                    <button className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
                      View Communication Log
                    </button>
                    <button className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
                      Schedule Maintenance
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No sensor selected.</div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-xs text-gray-600">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function SensorStatusPill({ status }: { status: SensorRecord["healthStatus"] }) {
  const cls =
    status === "Healthy"
      ? "bg-emerald-50 text-emerald-700"
      : status === "Warning"
      ? "bg-amber-50 text-amber-700"
      : "bg-red-50 text-red-700";

  return (
    <span className={"rounded-full px-2 py-1 text-xs font-semibold " + cls}>
      {status}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value}</span>
    </div>
  );
}