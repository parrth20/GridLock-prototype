// In-app CSV ingestion.
//
// A TypeScript port of scripts/build_factual_dataset.py so users can upload
// their own violation CSV and rebuild the same aggregate shape the engines use.
// No rows are stored long-term and nothing is invented — it only computes
// counts, shares and time-of-day distributions, converting timestamps UTC→IST.

import type { CountRow, JunctionRecord, ParkingSummary } from "@/lib/types";

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const MISSING = new Set(["", "NULL", "null", "None", "NaN"]);
const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const REQUIRED_COLUMNS = [
  "created_datetime",
  "police_station",
  "junction_name",
  "violation_type",
  "latitude",
  "longitude",
];

/** Streaming CSV record reader: handles quotes, escaped quotes and CRLF. */
function* iterateRecords(text: string): Generator<string[]> {
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  let sawContent = false;
  const n = text.length;

  for (let i = 0; i < n; i += 1) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      sawContent = true;
    } else if (c === ",") {
      record.push(field);
      field = "";
      sawContent = true;
    } else if (c === "\n") {
      record.push(field);
      if (sawContent) yield record;
      record = [];
      field = "";
      sawContent = false;
    } else if (c === "\r") {
      // ignore
    } else {
      field += c;
      sawContent = true;
    }
  }
  if (sawContent || field.length > 0) {
    record.push(field);
    yield record;
  }
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function parseViolationList(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((v) => String(v)) : [];
  } catch {
    // Some exports use plain text instead of a JSON array.
    const t = value.trim();
    return t && !MISSING.has(t) ? [t] : [];
  }
}

function istParts(value: string) {
  // The official export uses "YYYY-MM-DD HH:MM:SS+00" (space separator, 2-digit
  // offset). Normalise to strict ISO so Date.parse is reliable across engines.
  let norm = value.trim().replace(/^(\d{4}-\d{2}-\d{2}) /, "$1T");
  // Expand a trailing numeric offset: +00 → +00:00, +0530 → +05:30.
  norm = norm.replace(/([+-]\d{2})(\d{2})?$/, (_m, hh, mm) => `${hh}:${mm ?? "00"}`);
  // No timezone at all → assume UTC.
  if (!/(z|[+-]\d{2}:\d{2})$/i.test(norm)) norm += "Z";
  const ms = Date.parse(norm);
  if (Number.isNaN(ms)) return null;
  const ist = new Date(ms + IST_OFFSET_MS);
  const pad = (x: number) => String(x).padStart(2, "0");
  const iso =
    `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}` +
    `T${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}:${pad(ist.getUTCSeconds())}+05:30`;
  return {
    ms,
    hour: ist.getUTCHours(),
    weekday: WEEKDAYS[(ist.getUTCDay() + 6) % 7], // 0=Sun → Mon-first
    month: `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}`,
    iso,
  };
}

function topCounts(map: Map<string, number>, limit?: number): CountRow[] {
  const rows = [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
  return limit ? rows.slice(0, limit) : rows;
}

function inc(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

interface JunctionAgg {
  name: string;
  count: number;
  stations: Map<string, number>;
  violations: Map<string, number>;
  vehicles: Map<string, number>;
  hours: number[];
  lats: number[];
  lngs: number[];
  firstMs: number;
  lastMs: number;
  firstIso: string;
  lastIso: string;
}

export class CsvIngestError extends Error {}

export function buildSummaryFromCsv(text: string): ParkingSummary {
  const it = iterateRecords(text);
  const headerRec = it.next();
  if (headerRec.done) throw new CsvIngestError("The file is empty.");

  const header = headerRec.value.map((h) => h.trim());
  const idx: Record<string, number> = {};
  header.forEach((h, i) => {
    idx[h] = i;
  });
  const missing = REQUIRED_COLUMNS.filter((c) => !(c in idx));
  if (missing.length) {
    throw new CsvIngestError(
      `Missing required column(s): ${missing.join(", ")}. Expected the official dataset format.`,
    );
  }

  const get = (rec: string[], col: string): string =>
    (rec[idx[col]] ?? "").trim();

  let records = 0;
  let namedJunctionRecords = 0;
  let firstMs = Infinity;
  let lastMs = -Infinity;
  let firstIso = "";
  let lastIso = "";

  const stations = new Map<string, number>();
  const validation = new Map<string, number>();
  const scita = new Map<string, number>();
  const violations = new Map<string, number>();
  const vehicles = new Map<string, number>();
  const hours = new Array(24).fill(0);
  const weekdays = new Map<string, number>();
  const months = new Map<string, number>();
  const junctions = new Map<string, JunctionAgg>();

  for (const rec of it) {
    const created = get(rec, "created_datetime");
    const parts = istParts(created);
    if (!parts) continue; // skip rows with unparseable dates

    records += 1;
    hours[parts.hour] += 1;
    inc(weekdays, parts.weekday);
    inc(months, parts.month);
    if (parts.ms < firstMs) {
      firstMs = parts.ms;
      firstIso = parts.iso;
    }
    if (parts.ms > lastMs) {
      lastMs = parts.ms;
      lastIso = parts.iso;
    }

    const station = get(rec, "police_station");
    const vehicle = get(rec, "vehicle_type");
    const status = get(rec, "validation_status");
    const junctionName = get(rec, "junction_name");

    if (!MISSING.has(station)) inc(stations, station);
    if (!MISSING.has(vehicle)) inc(vehicles, vehicle);
    inc(validation, MISSING.has(status) ? "Not recorded" : status);
    inc(scita, (get(rec, "data_sent_to_scita") || "NULL").toUpperCase());

    const rowViolations = parseViolationList(get(rec, "violation_type"));
    for (const v of rowViolations) inc(violations, v);

    if (MISSING.has(junctionName) || junctionName === "No Junction") continue;

    const lat = Number(get(rec, "latitude"));
    const lng = Number(get(rec, "longitude"));

    namedJunctionRecords += 1;
    let j = junctions.get(junctionName);
    if (!j) {
      j = {
        name: junctionName,
        count: 0,
        stations: new Map(),
        violations: new Map(),
        vehicles: new Map(),
        hours: new Array(24).fill(0),
        lats: [],
        lngs: [],
        firstMs: parts.ms,
        lastMs: parts.ms,
        firstIso: parts.iso,
        lastIso: parts.iso,
      };
      junctions.set(junctionName, j);
    }
    j.count += 1;
    if (!MISSING.has(station)) inc(j.stations, station);
    for (const v of rowViolations) inc(j.violations, v);
    if (!MISSING.has(vehicle)) inc(j.vehicles, vehicle);
    j.hours[parts.hour] += 1;
    if (Number.isFinite(lat)) j.lats.push(lat);
    if (Number.isFinite(lng)) j.lngs.push(lng);
    if (parts.ms < j.firstMs) {
      j.firstMs = parts.ms;
      j.firstIso = parts.iso;
    }
    if (parts.ms > j.lastMs) {
      j.lastMs = parts.ms;
      j.lastIso = parts.iso;
    }
  }

  if (records === 0) {
    throw new CsvIngestError("No rows with a valid created_datetime were found.");
  }

  const median = (arr: number[]): number => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };

  const junctionRecords: JunctionRecord[] = [...junctions.values()]
    .sort((a, b) => b.count - a.count)
    .map((j) => {
      const peakHour = j.hours.reduce(
        (best, c, h) => (c > j.hours[best] ? h : best),
        0,
      );
      const topStation = topCounts(j.stations, 1)[0]?.label ?? "Not recorded";
      return {
        id: slugify(j.name),
        name: j.name,
        policeStation: topStation,
        latitude: Math.round(median(j.lats) * 1e6) / 1e6,
        longitude: Math.round(median(j.lngs) * 1e6) / 1e6,
        recordCount: j.count,
        shareOfAllRecords: Math.round((j.count / records) * 10000) / 100,
        firstSeenIST: j.firstIso,
        lastSeenIST: j.lastIso,
        peakRecordedHourIST: peakHour,
        hourlyRecordCounts: j.hours,
        topViolationTypes: topCounts(j.violations, 5),
        topVehicleTypes: topCounts(j.vehicles, 5),
      };
    });

  const summary: ParkingSummary = {
    source: {
      title: "Uploaded dataset (rebuilt in-app)",
      url: "",
      timezone: "Asia/Kolkata",
      recordCount: records,
      firstRecordIST: firstIso,
      lastRecordIST: lastIso,
      statement:
        "All displayed values are aggregates of the uploaded records; they are not live conditions or forecasts.",
    },
    coverage: {
      policeStations: stations.size,
      namedJunctions: junctions.size,
      namedJunctionRecords,
      recordsWithoutNamedJunction: records - namedJunctionRecords,
    },
    hourlyRecordCountsIST: hours.map((count, hour) => ({
      hour,
      label: `${String(hour).padStart(2, "0")}:00`,
      count,
    })),
    weekdayRecordCounts: WEEKDAYS.map((label) => ({
      label,
      count: weekdays.get(label) ?? 0,
    })),
    monthlyRecordCounts: [...months.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ label, count })),
    validationStatus: topCounts(validation),
    dataSentToScita: topCounts(scita),
    violationTypes: topCounts(violations),
    vehicleTypes: topCounts(vehicles),
    policeStations: topCounts(stations),
    junctions: junctionRecords,
  };

  return summary;
}
