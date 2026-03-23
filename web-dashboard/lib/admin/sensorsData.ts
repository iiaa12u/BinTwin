import { bins } from "@/lib/bins";

export type SensorHealthStatus = "Healthy" | "Warning" | "Critical" | "Offline";

export type SensorRecord = {
  id: string;
  binId: string;
  placeName: string;
  zoneAssigned: string;
  sensorType: "Ultrasonic";
  batteryLevel: number;
  signalStrength: number;
  lastCommunication: string;
  firmwareVersion: string;
  healthStatus: SensorHealthStatus;
  currentFillLevel: number;
  alerts: string;
};

function getHealthStatus(
  batteryLevel: number,
  signalStrength: number
): SensorHealthStatus {
  if (batteryLevel < 20 || signalStrength < -90) return "Critical";
  if (batteryLevel < 40 || signalStrength < -80) return "Warning";
  return "Healthy";
}

function getAlerts(status: SensorHealthStatus): string {
  if (status === "Critical") return "Immediate attention required";
  if (status === "Warning") return "Monitor closely";
  return "None";
}

export const mockSensors: SensorRecord[] = bins.map((bin, index) => {
  const batteryLevel = 88 - (index % 6) * 11;
  const signalStrength = -58 - (index % 6) * 6;
  const healthStatus = getHealthStatus(batteryLevel, signalStrength);

  return {
    id: `SNS-${String(index + 1).padStart(3, "0")}`,
    binId: bin.id,
    placeName: bin.placeName,
    zoneAssigned: `${bin.side} Campus`,
    sensorType: "Ultrasonic",
    batteryLevel,
    signalStrength,
    lastCommunication: "2025-10-27 10:30 AM",
    firmwareVersion: "v2.1.0",
    healthStatus,
    currentFillLevel: bin.fillPct,
    alerts: getAlerts(healthStatus),
  };
});