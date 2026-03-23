export type ScenarioType =
  | "Route Optimization"
  | "Overflow Prevention"
  | "Fuel Reduction"
  | "Balanced Workload";

export type ScenarioMapBin = {
  id: string;
  label: string;
  fillPct: number;
  forecast6h: number;
  latPct: number;
  topPct: number;
  priority: 1 | 2 | 3 | 4;
};

export type ScenarioMetrics = {
  totalRouteDistanceKm: number;
  totalCollectionTimeHrs: number;
  binsServiced: number;
  predictedOverflows: number;
  estimatedFuelOrCO2: number;
  averageFillRate: number;
  distanceDeltaPct: number;
  timeDeltaPct: number;
  binsDeltaPct: number;
  overflowDelta: number;
};

export type ScenarioSummaryPoint = {
  id: string;
  text: string;
};

export const scenarioMapBins: ScenarioMapBin[] = [
  {
    id: "BIN-001",
    label: "BIN-001",
    fillPct: 35,
    forecast6h: 40,
    latPct: 14,
    topPct: 30,
    priority: 4,
  },
  {
    id: "BIN-002",
    label: "BIN-002",
    fillPct: 78,
    forecast6h: 95,
    latPct: 38,
    topPct: 58,
    priority: 2,
  },
  {
    id: "BIN-006",
    label: "BIN-006",
    fillPct: 65,
    forecast6h: 85,
    latPct: 26,
    topPct: 78,
    priority: 3,
  },
  {
    id: "BIN-004",
    label: "BIN-004",
    fillPct: 92,
    forecast6h: 100,
    latPct: 72,
    topPct: 42,
    priority: 1,
  },
];

export const scenarioMetrics: ScenarioMetrics = {
  totalRouteDistanceKm: 1200,
  totalCollectionTimeHrs: 24.5,
  binsServiced: 350,
  predictedOverflows: 3,
  estimatedFuelOrCO2: 450,
  averageFillRate: 78,
  distanceDeltaPct: -10,
  timeDeltaPct: -5,
  binsDeltaPct: 2,
  overflowDelta: 1,
};

export const scenarioSummary: ScenarioSummaryPoint[] = [
  {
    id: "s1",
    text: "Optimized routing reduces total distance by 10%, leading to lower transport and fuel costs.",
  },
  {
    id: "s2",
    text: "Collection time is reduced by 5%, improving operational efficiency within the same service window.",
  },
  {
    id: "s3",
    text: "The scenario services 350 planned bins while maintaining feasible truck capacity assumptions.",
  },
  {
    id: "s4",
    text: "Forecasted fill levels indicate 3 bins at high overflow risk during the selected horizon.",
  },
  {
    id: "s5",
    text: "Using 5 trucks provides a balanced plan between service quality and operational effort.",
  },
];