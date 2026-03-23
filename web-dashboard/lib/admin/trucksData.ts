export type TruckStatus = "Active" | "Inactive" | "Maintenance Due";

export type TruckRecord = {
  id: string;
  type: "Heavy Duty" | "Medium Duty" | "Light Duty";
  capacityTons: number;
  fuelType: "Diesel" | "Petrol" | "Electric" | "CNG";
  zoneAssigned: string;
  status: TruckStatus;
  lastMaintenance: string;
  routeAssigned: string;
  maxDailyHours: string;
  odometerKm: number;
  lastInspection: string;
  nextInspectionDue: string;
};

export const mockTrucks: TruckRecord[] = [
  {
    id: "TRK001",
    type: "Heavy Duty",
    capacityTons: 20,
    fuelType: "Diesel",
    zoneAssigned: "North Zone",
    status: "Active",
    lastMaintenance: "2023-10-15",
    routeAssigned: "R001 - City Perimeter",
    maxDailyHours: "10 Hours",
    odometerKm: 125487,
    lastInspection: "2023-11-01",
    nextInspectionDue: "2024-02-01",
  },
  {
    id: "TRK002",
    type: "Light Duty",
    capacityTons: 5,
    fuelType: "Petrol",
    zoneAssigned: "Central Zone",
    status: "Maintenance Due",
    lastMaintenance: "2023-11-01",
    routeAssigned: "R002 - Downtown Core",
    maxDailyHours: "8 Hours",
    odometerKm: 58210,
    lastInspection: "2023-11-10",
    nextInspectionDue: "2024-01-20",
  },
  {
    id: "TRK003",
    type: "Medium Duty",
    capacityTons: 10,
    fuelType: "Diesel",
    zoneAssigned: "South Zone",
    status: "Active",
    lastMaintenance: "2023-09-20",
    routeAssigned: "R003 - South District",
    maxDailyHours: "9 Hours",
    odometerKm: 87420,
    lastInspection: "2023-10-15",
    nextInspectionDue: "2024-01-15",
  },
  {
    id: "TRK004",
    type: "Heavy Duty",
    capacityTons: 25,
    fuelType: "Diesel",
    zoneAssigned: "East Zone",
    status: "Inactive",
    lastMaintenance: "2023-08-10",
    routeAssigned: "Not Assigned",
    maxDailyHours: "10 Hours",
    odometerKm: 142300,
    lastInspection: "2023-08-25",
    nextInspectionDue: "2023-12-30",
  },
  {
    id: "TRK005",
    type: "Light Duty",
    capacityTons: 7,
    fuelType: "Electric",
    zoneAssigned: "West Zone",
    status: "Active",
    lastMaintenance: "2023-11-25",
    routeAssigned: "R004 - West Campus",
    maxDailyHours: "8 Hours",
    odometerKm: 33210,
    lastInspection: "2023-11-25",
    nextInspectionDue: "2024-02-25",
  },
  {
    id: "TRK006",
    type: "Medium Duty",
    capacityTons: 12,
    fuelType: "CNG",
    zoneAssigned: "North Zone",
    status: "Maintenance Due",
    lastMaintenance: "2023-10-28",
    routeAssigned: "R005 - North Residential",
    maxDailyHours: "9 Hours",
    odometerKm: 93450,
    lastInspection: "2023-10-30",
    nextInspectionDue: "2024-01-30",
  },
];