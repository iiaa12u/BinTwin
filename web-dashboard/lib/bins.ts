export type BinPoint = {
  placeName: string;
  side: "East" | "West";
  lat: number;
  lng: number;
  buildingNumber: string;
  binNumber: string;
  fillPct: number; // simulated fill / volume percentage
};

export const bins: BinPoint[] = [
  {
    placeName: "Library",
    side: "East",
    lat: 26.394162,
    lng: 50.190043,
    buildingNumber: "A3",
    binNumber: "B001",
    fillPct: 35,
  },
  {
    placeName: "Supermarket",
    side: "East",
    lat: 26.399964,
    lng: 50.19917,
    buildingNumber: "D9",
    binNumber: "B002",
    fillPct: 82,
  },
  {
    placeName: "Dinning Halls",
    side: "East",
    lat: 26.397525,
    lng: 50.190432,
    buildingNumber: "M3",
    binNumber: "B003",
    fillPct: 67,
  },
  {
    placeName: "Supportive Deanships",
    side: "East",
    lat: 26.393412,
    lng: 50.191372,
    buildingNumber: "D3",
    binNumber: "B004",
    fillPct: 91,
  },
  {
    placeName: "Students Housing - Males",
    side: "East",
    lat: 26.400662,
    lng: 50.199627,
    buildingNumber: "R13",
    binNumber: "B005",
    fillPct: 54,
  },
  {
    placeName: "College of CS & IT - Female",
    side: "West",
    lat: 26.385763,
    lng: 50.188514,
    buildingNumber: "A60",
    binNumber: "B006",
    fillPct: 76,
  },
  {
    placeName: "Family & Community Medicine Center",
    side: "West",
    lat: 26.378264,
    lng: 50.190702,
    buildingNumber: "H3",
    binNumber: "B007",
    fillPct: 43,
  },
  {
    placeName: "Orientation Studies - Male",
    side: "West",
    lat: 26.3856,
    lng: 50.18578,
    buildingNumber: "D25",
    binNumber: "B008",
    fillPct: 88,
  },
  {
    placeName: "College of Basic Medical Sciences",
    side: "West",
    lat: 26.379642,
    lng: 50.192736,
    buildingNumber: "A72",
    binNumber: "B009",
    fillPct: 61,
  },
  {
    placeName: "College of Design",
    side: "West",
    lat: 26.392007,
    lng: 50.185054,
    buildingNumber: "A44",
    binNumber: "B010",
    fillPct: 95,
  },
];