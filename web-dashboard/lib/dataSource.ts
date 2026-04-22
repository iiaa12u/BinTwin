export type DataSourceMode = "synthetic" | "real";

let currentDataSource: DataSourceMode = "synthetic";

export function getDataSource(): DataSourceMode {
  return currentDataSource;
}

export function setDataSource(mode: DataSourceMode) {
  currentDataSource = mode;
}