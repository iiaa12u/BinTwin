export type BinMeta = {
  id: string; // map/display id, e.g. BIN-001
  placeName: string;
  side: "East" | "West";
  lat: number;
  lng: number;
  buildingNumber: string;
  binNumber: string; // app-facing label shown in UI
  sourceBinId?: string; // actual ID inside source files, used for real data lookup
};

export const syntheticBinMeta: BinMeta[] = [
  {
    id: "BIN-001",
    placeName: "Library",
    side: "East",
    lat: 26.394162,
    lng: 50.190043,
    buildingNumber: "A3",
    binNumber: "B001",
  },
  {
    id: "BIN-002",
    placeName: "Supermarket",
    side: "East",
    lat: 26.399964,
    lng: 50.19917,
    buildingNumber: "D9",
    binNumber: "B002",
  },
  {
    id: "BIN-003",
    placeName: "Dinning Halls",
    side: "East",
    lat: 26.397525,
    lng: 50.190432,
    buildingNumber: "M3",
    binNumber: "B003",
  },
  {
    id: "BIN-004",
    placeName: "Supportive Deanships",
    side: "East",
    lat: 26.393412,
    lng: 50.191372,
    buildingNumber: "D3",
    binNumber: "B004",
  },
  {
    id: "BIN-005",
    placeName: "Students Housing - Males",
    side: "East",
    lat: 26.400662,
    lng: 50.199627,
    buildingNumber: "R13",
    binNumber: "B005",
  },
  {
    id: "BIN-006",
    placeName: "College of CS & IT - Female",
    side: "West",
    lat: 26.385763,
    lng: 50.188514,
    buildingNumber: "A60",
    binNumber: "B006",
  },
  {
    id: "BIN-007",
    placeName: "Family & Community Medicine Center",
    side: "West",
    lat: 26.378264,
    lng: 50.190702,
    buildingNumber: "H3",
    binNumber: "B007",
  },
  {
    id: "BIN-008",
    placeName: "Orientation Studies - Male",
    side: "West",
    lat: 26.3856,
    lng: 50.18578,
    buildingNumber: "D25",
    binNumber: "B008",
  },
  {
    id: "BIN-009",
    placeName: "College of Basic Medical Sciences",
    side: "West",
    lat: 26.379642,
    lng: 50.192736,
    buildingNumber: "A72",
    binNumber: "B009",
  },
  {
    id: "BIN-010",
    placeName: "College of Design",
    side: "West",
    lat: 26.392007,
    lng: 50.185054,
    buildingNumber: "A44",
    binNumber: "B010",
  },
];

export const realBinMeta: BinMeta[] = [
  {
    id: "BIN-001",
    placeName: "Family & Community Medicine Center",
    side: "West",
    lat: 26.378264,
    lng: 50.190702,
    buildingNumber: "H3",
    binNumber: "B001",
    sourceBinId: "B007",
  },
  {
    id: "BIN-002",
    placeName: "College of Basic Medical Sciences",
    side: "West",
    lat: 26.379642,
    lng: 50.192736,
    buildingNumber: "A72",
    binNumber: "B002",
    sourceBinId: "B009",
  },
  {
    id: "BIN-003",
    placeName: "Students Housing - Males",
    side: "East",
    lat: 26.400662,
    lng: 50.199627,
    buildingNumber: "R13",
    binNumber: "B003",
    sourceBinId: "B005",
  },
  {
    id: "BIN-004",
    placeName: "Dinning Halls",
    side: "East",
    lat: 26.397525,
    lng: 50.190432,
    buildingNumber: "M3",
    binNumber: "B004",
    sourceBinId: "B003",
  },
  {
    id: "BIN-005",
    placeName: "Supermarket",
    side: "East",
    lat: 26.399964,
    lng: 50.19917,
    buildingNumber: "D9",
    binNumber: "B005",
    sourceBinId: "B002",
  },
];