export type RouteStop = {
  id: string;
  binId: string;
  fillPct: number;
  forecastPct: number;
  eta: string;
  fillInHours: string;
  risk: "Low" | "Medium" | "High";
  priority: number;
  topPct: number;
  leftPct: number;
};

export const routeKpis = {
  totalActiveBins: 1245,
  binsAbove80: 128,
  forecastedOverflows: 3,
  averageFillLevel: 58,
  binsPredictedToThreshold: 23,
};

export const routeStops: RouteStop[] = [
  {
    id: "1",
    binId: "BIN-003",
    fillPct: 92,
    forecastPct: 98,
    eta: "06:45 AM",
    fillInHours: "0.5h",
    risk: "High",
    priority: 1,
    topPct: 38,
    leftPct: 74,
  },
  {
    id: "2",
    binId: "BIN-002",
    fillPct: 78,
    forecastPct: 95,
    eta: "07:30 AM",
    fillInHours: "1h",
    risk: "Medium",
    priority: 2,
    topPct: 58,
    leftPct: 44,
  },
  {
    id: "3",
    binId: "BIN-006",
    fillPct: 65,
    forecastPct: 85,
    eta: "08:15 AM",
    fillInHours: "2h",
    risk: "Medium",
    priority: 3,
    topPct: 78,
    leftPct: 28,
  },
  {
    id: "4",
    binId: "BIN-001",
    fillPct: 35,
    forecastPct: 40,
    eta: "09:00 AM",
    fillInHours: "4h",
    risk: "Low",
    priority: 4,
    topPct: 30,
    leftPct: 15,
  },
];