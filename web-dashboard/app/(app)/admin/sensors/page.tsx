"use client";

import { useEffect, useMemo, useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { mockSensors } from "@/lib/admin/sensorsData";

type AdminSensor = (typeof mockSensors)[number];

type ManagedSensor = AdminSensor & {
  diagnosticsRunAt?: string;
  diagnosticsResult?: string;
  maintenanceDate?: string;
  maintenanceReason?: string;
  communicationEvents?: string[];
};

type HealthFilter = "ALL" | "Healthy" | "Warning" | "Critical" | "Offline";
type ModalType = "diagnostics" | "communication" | "maintenance" | null;

const STORAGE_KEY = "adminSensorsState";

function readSavedSensors(): ManagedSensor[] {
  if (typeof window === "undefined") return mockSensors as ManagedSensor[];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return mockSensors as ManagedSensor[];

    const saved = JSON.parse(raw) as ManagedSensor[];
    if (!Array.isArray(saved) || saved.length === 0) {
      return mockSensors as ManagedSensor[];
    }

    return saved;
  } catch {
    return mockSensors as ManagedSensor[];
  }
}

function saveSensors(sensors: ManagedSensor[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sensors));
}

function getSensorHealth(sensor: ManagedSensor): AdminSensor["healthStatus"] {
  if (sensor.healthStatus === "Offline" || sensor.healthStatus === "Critical") {
    return sensor.healthStatus;
  }

  if (sensor.batteryLevel <= 20) return "Critical" as AdminSensor["healthStatus"];
  if (sensor.signalStrength <= -90) return "Critical" as AdminSensor["healthStatus"];
  if (sensor.batteryLevel <= 45) return "Warning" as AdminSensor["healthStatus"];
  if (sensor.signalStrength <= -80) return "Warning" as AdminSensor["healthStatus"];

  return sensor.healthStatus;
}

function getDiagnosticResult(sensor: ManagedSensor) {
  const health = getSensorHealth(sensor);

  if (health === "Critical") {
    return "Critical issue detected. Sensor requires immediate inspection.";
  }

  if (health === "Warning") {
    return "Warning detected. Sensor is working but maintenance is recommended.";
  }

  if (health === "Offline") {
    return "Sensor is offline. No recent communication was detected.";
  }

  return "Sensor is healthy. Battery, signal, and communication are within acceptable range.";
}

function getDefaultEvents(sensor: ManagedSensor) {
  return [
    `${sensor.lastCommunication} — Fill reading received (${sensor.currentFillLevel}%).`,
    `${sensor.lastCommunication} — Signal strength recorded at ${sensor.signalStrength} dBm.`,
    `${sensor.lastCommunication} — Battery level recorded at ${sensor.batteryLevel}%.`,
  ];
}

function formatNow() {
  return new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function exportCsv(sensors: ManagedSensor[]) {
  const headers = [
    "sensor_id",
    "bin_id",
    "location",
    "zone",
    "battery",
    "signal",
    "health",
    "last_communication",
    "firmware",
    "fill_level",
    "alerts",
    "maintenance_date",
  ];

  const rows = sensors.map((sensor) => [
    sensor.id,
    sensor.binId,
    sensor.placeName,
    sensor.zoneAssigned,
    `${sensor.batteryLevel}%`,
    `${sensor.signalStrength} dBm`,
    getSensorHealth(sensor),
    sensor.lastCommunication,
    sensor.firmwareVersion,
    `${sensor.currentFillLevel}%`,
    sensor.alerts,
    sensor.maintenanceDate ?? "",
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `sensor-health-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AdminSensorsPage() {
  const [sensors, setSensors] = useState<ManagedSensor[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<HealthFilter>("ALL");
  const [selectedSensorId, setSelectedSensorId] = useState<string>("");
  const [modal, setModal] = useState<ModalType>(null);
  const [maintenanceDate, setMaintenanceDate] = useState("");
  const [maintenanceReason, setMaintenanceReason] = useState("Routine inspection");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const initial = readSavedSensors();
    setSensors(initial);
    setSelectedSensorId(initial[0]?.id ?? "");
  }, []);

  function showMessage(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 3000);
  }

  function updateSensors(next: ManagedSensor[]) {
    setSensors(next);
    saveSensors(next);
  }

  const filteredSensors = useMemo(() => {
    const q = search.trim().toLowerCase();

    return sensors.filter((sensor) => {
      const health = getSensorHealth(sensor);

      const matchesSearch =
        !q ||
        sensor.id.toLowerCase().includes(q) ||
        sensor.binId.toLowerCase().includes(q) ||
        sensor.placeName.toLowerCase().includes(q) ||
        sensor.zoneAssigned.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "ALL" ? true : health === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [sensors, search, statusFilter]);

  const selectedSensor =
    filteredSensors.find((sensor) => sensor.id === selectedSensorId) ||
    sensors.find((sensor) => sensor.id === selectedSensorId) ||
    filteredSensors[0] ||
    sensors[0];

  const kpis = useMemo(() => {
    const total = sensors.length;
    const healthy = sensors.filter((s) => getSensorHealth(s) === "Healthy").length;
    const warnings = sensors.filter((s) => getSensorHealth(s) === "Warning").length;
    const critical = sensors.filter(
      (s) => getSensorHealth(s) === "Critical" || getSensorHealth(s) === "Offline"
    ).length;

    const averageBattery =
      sensors.length > 0
        ? Math.round(
            sensors.reduce((sum, sensor) => sum + sensor.batteryLevel, 0) /
              sensors.length
          )
        : 0;

    return { total, healthy, warnings, critical, averageBattery };
  }, [sensors]);

  function runDiagnostics(sensor: ManagedSensor) {
    const result = getDiagnosticResult(sensor);
    const now = formatNow();

    const next = sensors.map((item) => {
      if (item.id !== sensor.id) return item;

      const communicationEvents = [
        `${now} — Diagnostics completed: ${result}`,
        ...(item.communicationEvents ?? getDefaultEvents(item)),
      ];

      return {
        ...item,
        healthStatus: getSensorHealth(item),
        diagnosticsRunAt: now,
        diagnosticsResult: result,
        communicationEvents,
      };
    });

    updateSensors(next);
    showMessage(`Diagnostics completed for ${sensor.id}.`);
  }

  function markHealthy(sensor: ManagedSensor) {
    const now = formatNow();

    const next = sensors.map((item) => {
      if (item.id !== sensor.id) return item;

      return {
        ...item,
        healthStatus: "Healthy" as AdminSensor["healthStatus"],
        batteryLevel: Math.max(item.batteryLevel, 75),
        signalStrength: Math.max(item.signalStrength, -65),
        alerts: "None",
        diagnosticsRunAt: now,
        diagnosticsResult: "Sensor manually verified and marked as healthy.",
        maintenanceDate: undefined,
        maintenanceReason: undefined,
        communicationEvents: [
          `${now} — Sensor marked healthy by admin.`,
          ...(item.communicationEvents ?? getDefaultEvents(item)),
        ],
      };
    });

    updateSensors(next);
    showMessage(`${sensor.id} marked as healthy.`);
  }

  function scheduleMaintenance() {
    if (!selectedSensor) return;

    if (!maintenanceDate) {
      showMessage("Please select a maintenance date.");
      return;
    }

    const now = formatNow();

    const next = sensors.map((item) => {
      if (item.id !== selectedSensor.id) return item;

      return {
        ...item,
        healthStatus: "Warning" as AdminSensor["healthStatus"],
        alerts: "Maintenance Scheduled",
        maintenanceDate,
        maintenanceReason,
        communicationEvents: [
          `${now} — Maintenance scheduled for ${maintenanceDate}. Reason: ${maintenanceReason}.`,
          ...(item.communicationEvents ?? getDefaultEvents(item)),
        ],
      };
    });

    updateSensors(next);
    setModal(null);
    showMessage(`Maintenance scheduled for ${selectedSensor.id}.`);
  }

  function resetDemoChanges() {
    const ok = window.confirm("Reset sensor demo changes?");
    if (!ok) return;

    localStorage.removeItem(STORAGE_KEY);
    const initial = mockSensors as ManagedSensor[];
    setSensors(initial);
    setSelectedSensorId(initial[0]?.id ?? "");
    showMessage("Sensor demo changes were reset.");
  }

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

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    Sensor Health Monitor
                  </h1>
                  <p className="mt-1 text-xs text-gray-500">
                    Monitor ultrasonic sensors, communication quality, battery level,
                    and maintenance status.
                  </p>
                </div>

                <button
                  onClick={() => exportCsv(filteredSensors)}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Export Sensor Report
                </button>
              </div>

              {message && (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {message}
                </div>
              )}

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <KpiCard label="Total Sensors" value={kpis.total} />
                <KpiCard label="Healthy" value={kpis.healthy} />
                <KpiCard label="Warnings" value={kpis.warnings} />
                <KpiCard label="Critical" value={kpis.critical} />
                <KpiCard label="Avg. Battery" value={`${kpis.averageBattery}%`} />
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
                  onChange={(e) => setStatusFilter(e.target.value as HealthFilter)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="ALL">All Health Statuses</option>
                  <option value="Healthy">Healthy</option>
                  <option value="Warning">Warning</option>
                  <option value="Critical">Critical</option>
                  <option value="Offline">Offline</option>
                </select>

                <button
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("ALL");
                  }}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Clear
                </button>
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
                      <th className="px-4 py-3 text-left font-semibold">
                        Last Communication
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
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
                            ? "bg-emerald-50/50"
                            : "hover:bg-gray-50")
                        }
                      >
                        <td className="px-4 py-4 font-semibold text-gray-900">
                          {sensor.id}
                        </td>
                        <td className="px-4 py-4 text-gray-700">{sensor.binId}</td>
                        <td className="px-4 py-4 text-gray-700">{sensor.placeName}</td>
                        <td className="px-4 py-4 text-gray-700">
                          {sensor.batteryLevel}%
                        </td>
                        <td className="px-4 py-4 text-gray-700">
                          {sensor.signalStrength} dBm
                        </td>
                        <td className="px-4 py-4">
                          <SensorStatusPill status={getSensorHealth(sensor)} />
                        </td>
                        <td className="px-4 py-4 text-gray-700">
                          {sensor.lastCommunication}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              runDiagnostics(sensor);
                              setSelectedSensorId(sensor.id);
                              setModal("diagnostics");
                            }}
                            className="rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Diagnose
                          </button>
                        </td>
                      </tr>
                    ))}

                    {filteredSensors.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-6 text-center text-gray-500"
                        >
                          No sensors found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <button
                  onClick={() => {
                    sensors.forEach((sensor) => {
                      runDiagnostics(sensor);
                    });
                    showMessage("Diagnostics were run for all sensors.");
                  }}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Run All Diagnostics
                </button>

                <button
                  onClick={() => exportCsv(filteredSensors)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Export Filtered CSV
                </button>

                <button
                  onClick={resetDemoChanges}
                  className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-black"
                >
                  Reset Demo Changes
                </button>
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
                  <InfoRow
                    label="Battery Level"
                    value={`${selectedSensor.batteryLevel}%`}
                  />
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
                  <InfoRow
                    label="Health Status"
                    value={getSensorHealth(selectedSensor)}
                  />
                  <InfoRow label="Alerts" value={selectedSensor.alerts} />

                  {selectedSensor.maintenanceDate && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      Maintenance scheduled for{" "}
                      <span className="font-bold">
                        {selectedSensor.maintenanceDate}
                      </span>
                      <div className="mt-1">
                        Reason: {selectedSensor.maintenanceReason}
                      </div>
                    </div>
                  )}

                  {selectedSensor.diagnosticsResult && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                      <div className="font-bold">Latest Diagnostic Result</div>
                      <div className="mt-1">{selectedSensor.diagnosticsResult}</div>
                      <div className="mt-1 text-xs">
                        Run at: {selectedSensor.diagnosticsRunAt}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => {
                        runDiagnostics(selectedSensor);
                        setModal("diagnostics");
                      }}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
                    >
                      Run Sensor Diagnostics
                    </button>

                    <button
                      onClick={() => setModal("communication")}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
                    >
                      View Communication Log
                    </button>

                    <button
                      onClick={() => {
                        setMaintenanceDate("");
                        setMaintenanceReason("Routine inspection");
                        setModal("maintenance");
                      }}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
                    >
                      Schedule Maintenance
                    </button>

                    <button
                      onClick={() => markHealthy(selectedSensor)}
                      className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      Mark as Healthy
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

      {modal === "diagnostics" && selectedSensor && (
        <Modal
          title={`Sensor Diagnostics — ${selectedSensor.id}`}
          onClose={() => setModal(null)}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <DiagnosticBox label="Sensor Type" value={selectedSensor.sensorType} />
            <DiagnosticBox
              label="Battery Level"
              value={`${selectedSensor.batteryLevel}%`}
            />
            <DiagnosticBox
              label="Signal Strength"
              value={`${selectedSensor.signalStrength} dBm`}
            />
            <DiagnosticBox
              label="Health Status"
              value={getSensorHealth(selectedSensor)}
            />
            <DiagnosticBox
              label="Firmware Version"
              value={selectedSensor.firmwareVersion}
            />
            <DiagnosticBox
              label="Last Communication"
              value={selectedSensor.lastCommunication}
            />
          </div>

          <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
            <div className="font-bold">Diagnostic Result</div>
            <div className="mt-1">
              {selectedSensor.diagnosticsResult ?? getDiagnosticResult(selectedSensor)}
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={() => runDiagnostics(selectedSensor)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Run Again
            </button>
          </div>
        </Modal>
      )}

      {modal === "communication" && selectedSensor && (
        <Modal
          title={`Communication Log — ${selectedSensor.id}`}
          onClose={() => setModal(null)}
        >
          <div className="space-y-3">
            {(selectedSensor.communicationEvents ?? getDefaultEvents(selectedSensor)).map(
              (event, index) => (
                <div
                  key={`${event}-${index}`}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700"
                >
                  {event}
                </div>
              )
            )}
          </div>
        </Modal>
      )}

      {modal === "maintenance" && selectedSensor && (
        <Modal
          title={`Schedule Maintenance — ${selectedSensor.id}`}
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            <label>
              <div className="mb-1 text-sm font-semibold text-gray-700">
                Maintenance Date
              </div>
              <input
                type="date"
                value={maintenanceDate}
                onChange={(e) => setMaintenanceDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </label>

            <label>
              <div className="mb-1 text-sm font-semibold text-gray-700">
                Reason
              </div>
              <select
                value={maintenanceReason}
                onChange={(e) => setMaintenanceReason(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              >
                <option>Routine inspection</option>
                <option>Low battery</option>
                <option>Weak signal</option>
                <option>Sensor calibration</option>
                <option>Physical inspection</option>
              </select>
            </label>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={() => setModal(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              onClick={scheduleMaintenance}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Schedule
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-xs text-gray-600">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function SensorStatusPill({ status }: { status: AdminSensor["healthStatus"] }) {
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

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value}</span>
    </div>
  );
}

function DiagnosticBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-2 font-bold text-gray-900">{value}</div>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-1 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}