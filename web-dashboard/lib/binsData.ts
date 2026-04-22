import { realBinMeta, syntheticBinMeta, type BinMeta } from "./binMeta";

export type DataSourceMode = "synthetic" | "real";

export type UnifiedBinRecord = {
  id: string;
  placeName: string;
  side: "East" | "West";
  lat: number;
  lng: number;
  buildingNumber: string;
  binNumber: string;

  currentFillPct?: number;
  currentStatus?: string;
  currentTimestamp?: string;

  forecastFillPct?: number;
  forecastStatus?: string;
  forecastTimestamp?: string;
  ciLower?: number;
  ciUpper?: number;

  trendDirection?: "up" | "down" | "flat";
  trendDelta?: number;
  history?: { timestamp: string; fillPct: number }[];

  source: DataSourceMode;
};

export type DataRangeInfo = {
  minTimestamp: string | null;
  maxTimestamp: string | null;
};

function parseCSV(text: string) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return [];

  const headers = lines[0].split(",").map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] ?? "";
    });
    return obj;
  });
}

function statusFromFill(fill: number) {
  if (fill >= 80) return "High Risk";
  if (fill >= 60) return "Medium";
  return "Low";
}

function buildBase(meta: BinMeta, source: DataSourceMode): UnifiedBinRecord {
  return {
    id: meta.id,
    placeName: meta.placeName,
    side: meta.side,
    lat: meta.lat,
    lng: meta.lng,
    buildingNumber: meta.buildingNumber,
    binNumber: meta.binNumber,
    source,
  };
}

function parseDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toLocalDateInputValue(value?: string | null) {
  const d = parseDate(value ?? undefined);
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toLocalTimeInputValue(value?: string | null) {
  const d = parseDate(value ?? undefined);
  if (!d) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function splitDateTimeForInputs(value?: string | null) {
  return {
    date: toLocalDateInputValue(value),
    time: toLocalTimeInputValue(value),
  };
}

export function combineDateAndTime(date: string, time: string) {
  if (!date) return "";
  return `${date}T${time || "00:00"}:00`;
}

export function clampDateTimeToRange(
  value: string,
  minTimestamp: string | null,
  maxTimestamp: string | null
) {
  const target = parseDate(value);
  const min = parseDate(minTimestamp ?? undefined);
  const max = parseDate(maxTimestamp ?? undefined);

  if (!target) return maxTimestamp ?? minTimestamp ?? "";

  if (min && target < min) return min.toISOString();
  if (max && target > max) return max.toISOString();

  return target.toISOString();
}

function getTrendDirection(delta: number): "up" | "down" | "flat" {
  if (delta > 0.5) return "up";
  if (delta < -0.5) return "down";
  return "flat";
}

function extractHistoricalSnapshot(
  rows: Record<string, string>[],
  timestampField: string,
  fillField: string,
  selectedDateTime?: string,
  historyLimit = 12
) {
  const target = selectedDateTime ? new Date(selectedDateTime) : null;

  const validRows = rows
    .filter((row) => row[timestampField] && row[fillField] !== undefined)
    .map((row) => ({
      row,
      dt: new Date(row[timestampField]),
      fill: Number(row[fillField] ?? 0),
    }))
    .filter((x) => !Number.isNaN(x.dt.getTime()) && !Number.isNaN(x.fill))
    .sort((a, b) => a.dt.getTime() - b.dt.getTime());

  if (!validRows.length) {
    return {
      current: undefined,
      previous: undefined,
      history: [] as { timestamp: string; fillPct: number }[],
    };
  }

  let chosenIndex = validRows.length - 1;

  if (target) {
    const filteredIndex = validRows.findLastIndex(
      (x) => x.dt.getTime() <= target.getTime()
    );
    chosenIndex = filteredIndex >= 0 ? filteredIndex : 0;
  }

  const current = validRows[chosenIndex];
  const previous = chosenIndex > 0 ? validRows[chosenIndex - 1] : undefined;

  const start = Math.max(0, chosenIndex - historyLimit + 1);
  const history = validRows.slice(start, chosenIndex + 1).map((x) => ({
    timestamp: x.dt.toISOString(),
    fillPct: Number(x.fill.toFixed(1)),
  }));

  return { current, previous, history };
}

export async function loadBinsFromSource(
  mode: DataSourceMode,
  selectedDateTime?: string
): Promise<UnifiedBinRecord[]> {
  return mode === "real"
    ? loadRealUnifiedBins(selectedDateTime)
    : loadSyntheticUnifiedBins(selectedDateTime);
}

export async function loadDataRange(
  mode: DataSourceMode
): Promise<DataRangeInfo> {
  return mode === "real" ? loadRealDataRange() : loadSyntheticDataRange();
}

// ================= REAL =================

async function loadRealUnifiedBins(
  selectedDateTime?: string
): Promise<UnifiedBinRecord[]> {
  const actualRowsByBin = await loadRealCurrentRows();
  const forecastRowsByBin = await loadRealForecastRows();

  const results: UnifiedBinRecord[] = [];

  for (const meta of realBinMeta) {
    const record = buildBase(meta, "real");

    // ✅ Actual/current real data comes from app-facing B001..B005
    const actualKey = meta.binNumber;

    // ✅ Forecast currently comes from mapped source IDs
    const forecastKey = meta.sourceBinId ?? meta.binNumber;

    const actualRows = actualRowsByBin[actualKey] ?? [];
    if (actualRows.length) {
      const snapshot = extractHistoricalSnapshot(
        actualRows,
        "timestamp",
        "fill_corrected",
        selectedDateTime,
        12
      );

      if (snapshot.current) {
        record.currentFillPct = Number(snapshot.current.fill.toFixed(1));
        record.currentStatus =
          snapshot.current.row.fill_class || statusFromFill(record.currentFillPct);
        record.currentTimestamp = snapshot.current.row.timestamp ?? "";
        record.history = snapshot.history;

        if (snapshot.previous) {
          const delta = snapshot.current.fill - snapshot.previous.fill;
          record.trendDelta = Number(delta.toFixed(1));
          record.trendDirection = getTrendDirection(delta);
        } else {
          record.trendDelta = 0;
          record.trendDirection = "flat";
        }
      }
    }

    const forecast = forecastRowsByBin[forecastKey];
    if (forecast) {
      record.forecastFillPct = Number(
        Number(forecast.predicted_fill ?? 0).toFixed(1)
      );
      record.forecastStatus =
        forecast.fill_class || statusFromFill(record.forecastFillPct);
      record.forecastTimestamp = forecast.timestamp ?? "";
      record.ciLower =
        forecast.ci_lower !== undefined && forecast.ci_lower !== ""
          ? Number(Number(forecast.ci_lower).toFixed(1))
          : undefined;
      record.ciUpper =
        forecast.ci_upper !== undefined && forecast.ci_upper !== ""
          ? Number(Number(forecast.ci_upper).toFixed(1))
          : undefined;
    }

    results.push(record);
  }

  return results;
}

async function loadRealDataRange(): Promise<DataRangeInfo> {
  try {
    const res = await fetch("/data/real/cleaned_ALL_BINS.csv", {
      cache: "no-store",
    });

    if (!res.ok) return { minTimestamp: null, maxTimestamp: null };

    const text = await res.text();
    const rows = parseCSV(text);

    const timestamps = rows
      .map((row) => row.timestamp)
      .filter(Boolean)
      .map((ts) => new Date(ts))
      .filter((d) => !Number.isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (!timestamps.length) return { minTimestamp: null, maxTimestamp: null };

    return {
      minTimestamp: timestamps[0].toISOString(),
      maxTimestamp: timestamps[timestamps.length - 1].toISOString(),
    };
  } catch {
    return { minTimestamp: null, maxTimestamp: null };
  }
}

async function loadRealCurrentRows(): Promise<Record<string, Record<string, string>[]>> {
  try {
    const res = await fetch("/data/real/cleaned_ALL_BINS.csv", {
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn("Missing real current file: cleaned_ALL_BINS.csv");
      return {};
    }

    const text = await res.text();
    const rows = parseCSV(text);

    const grouped: Record<string, Record<string, string>[]> = {};

    rows.forEach((row) => {
      const binId = String(row.bin_id ?? "").trim();
      if (!binId) return;

      if (!grouped[binId]) grouped[binId] = [];
      grouped[binId].push(row);
    });

    return grouped;
  } catch (err) {
    console.error("Error loading real current data:", err);
    return {};
  }
}

async function loadRealForecastRows(): Promise<Record<string, Record<string, string>>> {
  const latest: Record<string, Record<string, string>> = {};

  for (const meta of realBinMeta) {
    const forecastKey = meta.sourceBinId ?? meta.binNumber;

    try {
      const res = await fetch(`/data/forecast/forecast_${forecastKey}.csv`, {
        cache: "no-store",
      });

      if (!res.ok) continue;

      const text = await res.text();
      const rows = parseCSV(text);
      if (!rows.length) continue;

      latest[forecastKey] = rows[rows.length - 1];
    } catch (err) {
      console.error(`Error loading forecast for ${forecastKey}:`, err);
    }
  }

  return latest;
}

// ================= SYNTHETIC =================

async function loadSyntheticUnifiedBins(
  selectedDateTime?: string
): Promise<UnifiedBinRecord[]> {
  try {
    const res = await fetch("/data/synthetic/all.csv", {
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn("Missing synthetic file: all.csv");
      return [];
    }

    const text = await res.text();
    const rows = parseCSV(text);

    const grouped: Record<string, Record<string, string>[]> = {};

    rows.forEach((row) => {
      const rawId = String(row.BinID ?? "").trim();
      const num = Number(rawId);

      if (!Number.isFinite(num) || num < 1 || num > 10) return;

      const key = `B${String(num).padStart(3, "0")}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    });

    const results: UnifiedBinRecord[] = [];

    for (const meta of syntheticBinMeta) {
      const record = buildBase(meta, "synthetic");
      const binRows = grouped[meta.binNumber];

      if (!binRows?.length) {
        results.push(record);
        continue;
      }

      const snapshot = extractHistoricalSnapshot(
        binRows,
        "Timestamp",
        "Fill(%)",
        selectedDateTime,
        12
      );

      if (!snapshot.current) {
        results.push(record);
        continue;
      }

      record.currentFillPct = Number(snapshot.current.fill.toFixed(1));
      record.currentStatus = statusFromFill(record.currentFillPct);
      record.currentTimestamp = snapshot.current.row["Timestamp"] ?? "";
      record.history = snapshot.history;

      if (snapshot.previous) {
        const delta = snapshot.current.fill - snapshot.previous.fill;
        record.trendDelta = Number(delta.toFixed(1));
        record.trendDirection = getTrendDirection(delta);
      } else {
        record.trendDelta = 0;
        record.trendDirection = "flat";
      }

      results.push(record);
    }

    return results;
  } catch (err) {
    console.error("Error loading synthetic bins:", err);
    return [];
  }
}

async function loadSyntheticDataRange(): Promise<DataRangeInfo> {
  try {
    const res = await fetch("/data/synthetic/all.csv", {
      cache: "no-store",
    });

    if (!res.ok) return { minTimestamp: null, maxTimestamp: null };

    const text = await res.text();
    const rows = parseCSV(text);

    const timestamps = rows
      .map((row) => row["Timestamp"])
      .filter(Boolean)
      .map((ts) => new Date(ts))
      .filter((d) => !Number.isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (!timestamps.length) return { minTimestamp: null, maxTimestamp: null };

    return {
      minTimestamp: timestamps[0].toISOString(),
      maxTimestamp: timestamps[timestamps.length - 1].toISOString(),
    };
  } catch {
    return { minTimestamp: null, maxTimestamp: null };
  }
}