import {
  generateDynamicRoute,
  type DriverRoute,
  type DriverStop,
  type DriverStopStatus,
} from "@/lib/routeEngine";

export type { DriverRoute, DriverStop, DriverStopStatus };

export const mockDriverRoute: DriverRoute = generateDynamicRoute({
  zone: "All",
  threshold: 80,
  truckLabel: "Truck Alpha (1500kg)",
  truckCapacityKg: 1500,
  shiftStart: "06:00",
  shiftEnd: "14:00",
  goal: "overflow",
  autoSelect: true,
  manualBinId: "BIN-001",
}).driverRoute;