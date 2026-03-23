import { bins } from "@/lib/bins";

export type BinStatus = "Active" | "Maintenance Due" | "Offline";

export type BinRecord = {
  id: string;
  placeName: string;
  type: string;
  zoneAssigned: string;
  fillLevelSensor: string;
  batteryLevel: string;
  status: BinStatus;
  lastCommunication: string;
  installationDate: string;
  volumeCapacity: string;
  sensorType: string;
  signalStrength: string;
  firmwareVersion: string;
  currentFillLevel: number;
  riskIndicator: "Low" | "Medium" | "High";
  recentIssues: string;
};

function getRiskIndicator(fillPct: number): "Low" | "Medium" | "High" {
  if (fillPct >= 80) return "High";
  if (fillPct >= 60) return "Medium";
  return "Low";
}

export const mockBins: BinRecord[] = bins.map((bin, index) => ({
  id: bin.id,
  placeName: bin.placeName,
  type: "240L Smart Bin",
  zoneAssigned: `${bin.side} Campus`,
  fillLevelSensor: "Ultrasonic",
  batteryLevel: `${85 - (index % 5) * 8}%`,
  status: "Active",
  lastCommunication: "2025-10-27 10:30 AM",
  installationDate: "2024-03-15",
  volumeCapacity: "240 Liters",
  sensorType: "Ultrasonic",
  signalStrength: `${-60 - (index % 6) * 3} dBm`,
  firmwareVersion: "v2.1.0",
  currentFillLevel: bin.fillPct,
  riskIndicator: getRiskIndicator(bin.fillPct),
  recentIssues: "None",
}));