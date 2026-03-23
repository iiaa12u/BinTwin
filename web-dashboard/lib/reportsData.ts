export type ReportRow = {
  date: string;
  zone: string;
  collections: number;
  overflows: number;
  avgFillAtPickup: number;
  routeDistanceKm: number;
  collectionTimeH: number;
  co2PerTon: number;
};

export type SavedReport = {
  name: string;
  type: string;
  frequency: string;
};

export const reportKpis = {
  collectionsCompleted: 410,
  collectionsDeltaPct: 0,
  overflowsOccurred: 12,
  overflowsDeltaPct: -35,
  avgFillAtPickup: 72,
  routeEfficiencyKmPerBin: 3.8,
  co2EmittedTons: 1.2,
  co2DeltaPct: -18,
};

export const keyInsights: string[] = [
  "Overflow events decreased by 35% compared to the previous period, indicating improved routing and deployment strategies.",
  "Average fill at pickup remains high at 72%, suggesting efficient collection scheduling.",
  "An 18% reduction in CO₂ contribution supports sustainability goals.",
  "Forecast accuracy is at 87%, providing reliable input for operational planning.",
  "Peak demand times for collections occur mid-week, requiring optimized truck fleet allocation.",
];

export const savedReports: SavedReport[] = [
  {
    name: "Monthly Performance",
    type: "Operations",
    frequency: "Monthly",
  },
  {
    name: "Q2 Sustainability Report",
    type: "Sustainability",
    frequency: "Quarterly",
  },
  {
    name: "Weekly SLA Check",
    type: "Service Quality",
    frequency: "Weekly",
  },
];

export const collectionsVsOverflows = [
  { month: "Jan", collections: 180, overflows: 5 },
  { month: "Feb", collections: 220, overflows: 7 },
  { month: "Mar", collections: 260, overflows: 8 },
  { month: "Apr", collections: 290, overflows: 10 },
  { month: "May", collections: 320, overflows: 12 },
  { month: "Jun", collections: 350, overflows: 9 },
  { month: "Jul", collections: 380, overflows: 11 },
  { month: "Aug", collections: 410, overflows: 12 },
];

export const forecastAccuracy = [
  { month: "Jan", actual: 78, predicted: 82 },
  { month: "Feb", actual: 83, predicted: 85 },
  { month: "Mar", actual: 87, predicted: 89 },
  { month: "Apr", actual: 90, predicted: 91 },
  { month: "May", actual: 92, predicted: 94 },
  { month: "Jun", actual: 88, predicted: 90 },
  { month: "Jul", actual: 95, predicted: 96 },
  { month: "Aug", actual: 89, predicted: 91 },
];

export const routeDistanceVsTime = [
  { day: "Mon", distance: 120, time: 6.2 },
  { day: "Tue", distance: 145, time: 7.1 },
  { day: "Wed", distance: 128, time: 5.8 },
  { day: "Thu", distance: 152, time: 6.5 },
  { day: "Fri", distance: 138, time: 7.8 },
];

export const co2PerTonTrend = [
  { date: "2024-08-01", value: 0.050, target: 0.040 },
  { date: "2024-08-02", value: 0.048, target: 0.040 },
  { date: "2024-08-03", value: 0.045, target: 0.040 },
  { date: "2024-08-04", value: 0.042, target: 0.040 },
  { date: "2024-08-05", value: 0.040, target: 0.040 },
  { date: "2024-08-06", value: 0.039, target: 0.040 },
];

export const historicalPerformance: ReportRow[] = [
  {
    date: "2024-08-28",
    zone: "North",
    collections: 55,
    overflows: 1,
    avgFillAtPickup: 78,
    routeDistanceKm: 120,
    collectionTimeH: 6.2,
    co2PerTon: 0.045,
  },
  {
    date: "2024-08-27",
    zone: "South",
    collections: 62,
    overflows: 0,
    avgFillAtPickup: 85,
    routeDistanceKm: 135,
    collectionTimeH: 7.1,
    co2PerTon: 0.042,
  },
  {
    date: "2024-08-26",
    zone: "East",
    collections: 48,
    overflows: 2,
    avgFillAtPickup: 65,
    routeDistanceKm: 110,
    collectionTimeH: 5.8,
    co2PerTon: 0.051,
  },
  {
    date: "2024-08-25",
    zone: "North",
    collections: 58,
    overflows: 0,
    avgFillAtPickup: 80,
    routeDistanceKm: 125,
    collectionTimeH: 6.5,
    co2PerTon: 0.043,
  },
  {
    date: "2024-08-24",
    zone: "South",
    collections: 70,
    overflows: 1,
    avgFillAtPickup: 90,
    routeDistanceKm: 140,
    collectionTimeH: 7.8,
    co2PerTon: 0.039,
  },
];