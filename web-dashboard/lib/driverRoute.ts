export type DriverStopStatus = "pending" | "current" | "completed" | "issue";

export type DriverStop = {
  id: string;
  binId: string;
  placeName: string;
  fillPct: number;
  distanceKm: number;
  etaMin: number;
  address: string;
  lat: number;
  lng: number;
  status: DriverStopStatus;
};

export type DriverRoute = {
  routeId: string;
  totalStops: number;
  estDuration: string;
  binsToCollect: number;
  truckCapacityPct: number;
  stops: DriverStop[];
};

export const mockDriverRoute: DriverRoute = {
  routeId: "ROUTE-001",
  totalStops: 5,
  estDuration: "2h 45m",
  binsToCollect: 28,
  truckCapacityPct: 65,
  stops: [
    {
      id: "stop-1",
      binId: "BIN-4532",
      placeName: "Library",
      fillPct: 78,
      distanceKm: 0.5,
      etaMin: 4,
      address: "Library, IAU Campus, Dammam",
      lat: 26.394162,
      lng: 50.190043,
      status: "current",
    },
    {
      id: "stop-2",
      binId: "BIN-1123",
      placeName: "Supermarket",
      fillPct: 92,
      distanceKm: 0.8,
      etaMin: 7,
      address: "Supermarket, IAU Campus, Dammam",
      lat: 26.399964,
      lng: 50.19917,
      status: "pending",
    },
    {
      id: "stop-3",
      binId: "BIN-2345",
      placeName: "Dining Halls",
      fillPct: 60,
      distanceKm: 0.9,
      etaMin: 8,
      address: "Dining Halls, IAU Campus, Dammam",
      lat: 26.397525,
      lng: 50.190432,
      status: "pending",
    },
    {
      id: "stop-4",
      binId: "BIN-9102",
      placeName: "Supportive Deanships",
      fillPct: 70,
      distanceKm: 1.2,
      etaMin: 11,
      address: "Supportive Deanships, IAU Campus, Dammam",
      lat: 26.393412,
      lng: 50.191372,
      status: "pending",
    },
    {
      id: "stop-5",
      binId: "BIN-7890",
      placeName: "Students Housing - Males",
      fillPct: 88,
      distanceKm: 1.5,
      etaMin: 14,
      address: "Students Housing - Males, IAU Campus, Dammam",
      lat: 26.400662,
      lng: 50.199627,
      status: "pending",
    },
  ],
};