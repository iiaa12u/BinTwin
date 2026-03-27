export type TruckStatus = "Active" | "Inactive" | "Maintenance";

export type TruckRecord = {
  id: string;
  name: string;
  type: "Collection Truck";
  capacityKg: number;
  fuelType: "Diesel" | "Electric";
  zoneAssigned: "East Campus" | "West Campus";
  status: TruckStatus;

  // important for routing
  startLat: number;
  startLng: number;

  // optional (for UI display)
  routeAssigned?: string;
};

export const trucks: TruckRecord[] = [
  {
    id: "TRK001",
    name: "East Campus Truck",
    type: "Collection Truck",
    capacityKg: 2500,
    fuelType: "Diesel",
    zoneAssigned: "East Campus",
    status: "Active",
    startLat: 26.405756086418595,
    startLng: 50.20762562466443,
    routeAssigned: "East Route",
  },
  {
    id: "TRK002",
    name: "West Campus Truck",
    type: "Collection Truck",
    capacityKg: 2500,
    fuelType: "Diesel",
    zoneAssigned: "West Campus",
    status: "Active",
    startLat: 26.405756086418595,
    startLng: 50.20762562466443,
    routeAssigned: "West Route",
  },
];