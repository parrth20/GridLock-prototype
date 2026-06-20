// Synthetic sample dataset (demo only).
//
// This is NOT real data and is clearly labelled as such. It exists so the app
// has something to show while "disconnected", and so that connecting the real
// Bengaluru data — or uploading your own CSV — produces a visible change.
// It is generated from a seed (so it differs between sessions) but is stable
// within a session.

import type { CountRow, JunctionRecord, ParkingSummary } from "@/lib/types";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMES = [
  "Central Market Circle",
  "North Gate Junction",
  "Riverside Chowk",
  "Old Town Square",
  "Station Road Cross",
  "Tech Park Signal",
  "Lake View Junction",
  "Civil Lines Cross",
  "Greenfield Circle",
  "Harbour Road Junction",
  "University Gate",
  "Grand Trunk Cross",
  "Sunrise Market Chowk",
  "West End Signal",
  "Fort Road Junction",
  "Bus Stand Circle",
  "Hill View Cross",
  "Garden City Junction",
  "Metro Plaza Signal",
  "South Gate Chowk",
  "Heritage Square",
  "Crossroads Junction",
];
const STATIONS = [
  "Central Division",
  "North Division",
  "South Division",
  "East Division",
  "Lakeside Division",
  "Old Town Division",
];
const VIOLATIONS = [
  "WRONG PARKING",
  "NO PARKING",
  "PARKING IN A MAIN ROAD",
  "PARKING ON FOOTPATH",
  "PARKING NEAR BUSTOP/SCHOOL/HOSPITAL ETC",
  "DOUBLE PARKING",
  "DEFECTIVE NUMBER PLATE",
];
const VEHICLES = ["SCOOTER", "CAR", "MOTOR CYCLE", "PASSENGER AUTO", "MAXI-CAB", "LMV"];

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function splitTotal(
  total: number,
  labels: string[],
  rng: () => number,
  globalMap: Map<string, number>,
): CountRow[] {
  let remaining = total;
  const rows = labels.map((label, k) => {
    const isLast = k === labels.length - 1;
    const c = isLast ? remaining : Math.max(1, Math.floor(remaining * (0.3 + 0.3 * rng())));
    remaining = Math.max(0, remaining - c);
    globalMap.set(label, (globalMap.get(label) ?? 0) + c);
    return { label, count: c };
  });
  return rows.sort((a, b) => b.count - a.count);
}

export function generateSampleSummary(seed = 1): ParkingSummary {
  const rng = mulberry32(seed);
  const IST = "+05:30";
  const firstISO = `2024-01-08T06:30:00${IST}`;
  const lastISO = `2024-04-22T21:00:00${IST}`;

  const globalHourly = new Array(24).fill(0);
  const violationTotals = new Map<string, number>();
  const vehicleTotals = new Map<string, number>();
  const stationTotals = new Map<string, number>();

  const junctions: JunctionRecord[] = NAMES.map((name, i) => {
    const total = 300 + Math.floor(rng() * 8700);
    const station = STATIONS[Math.floor(rng() * STATIONS.length)];
    const peak = 8 + Math.floor(rng() * 4); // 8..11

    const weights: number[] = [];
    let wsum = 0;
    for (let h = 0; h < 24; h += 1) {
      const morning = Math.exp(-((h - peak) ** 2) / 6);
      const evening = 0.35 * Math.exp(-((h - 19) ** 2) / 5);
      const w = (morning + evening) * (0.7 + 0.6 * rng());
      weights.push(w);
      wsum += w;
    }
    const hourly = weights.map((w) => Math.round((w / wsum) * total));
    const hsum = hourly.reduce((a, b) => a + b, 0);
    hourly[peak] = Math.max(0, hourly[peak] + (total - hsum));
    for (let h = 0; h < 24; h += 1) globalHourly[h] += hourly[h];

    const topViolationTypes = splitTotal(
      total,
      shuffle([...VIOLATIONS], rng).slice(0, 3 + Math.floor(rng() * 3)),
      rng,
      violationTotals,
    );
    const topVehicleTypes = splitTotal(
      total,
      shuffle([...VEHICLES], rng).slice(0, 3 + Math.floor(rng() * 3)),
      rng,
      vehicleTotals,
    );

    stationTotals.set(station, (stationTotals.get(station) ?? 0) + total);

    const lat = 19.0 + (i % 6) * 0.018 + rng() * 0.008;
    const lng = 73.0 + Math.floor(i / 6) * 0.02 + rng() * 0.008;
    const peakHour = hourly.indexOf(Math.max(...hourly));

    return {
      id: slug(name),
      name,
      policeStation: station,
      latitude: Math.round(lat * 1e6) / 1e6,
      longitude: Math.round(lng * 1e6) / 1e6,
      recordCount: total,
      shareOfAllRecords: 0,
      firstSeenIST: firstISO,
      lastSeenIST: lastISO,
      peakRecordedHourIST: peakHour < 0 ? peak : peakHour,
      hourlyRecordCounts: hourly,
      topViolationTypes,
      topVehicleTypes,
    };
  });

  const grandTotal = globalHourly.reduce((a, b) => a + b, 0) || 1;
  junctions.forEach((j) => {
    j.shareOfAllRecords = Math.round((j.recordCount / grandTotal) * 10000) / 100;
  });
  junctions.sort((a, b) => b.recordCount - a.recordCount);

  const weekdayWeights = [0.135, 0.15, 0.15, 0.16, 0.15, 0.135, 0.12];
  const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const monthLabels = ["2024-01", "2024-02", "2024-03", "2024-04"];
  const monthWeights = [0.2, 0.3, 0.28, 0.22];
  const validationSplit: [string, number][] = [
    ["approved", 0.45],
    ["Not recorded", 0.3],
    ["rejected", 0.18],
    ["created1", 0.05],
    ["processing", 0.015],
    ["duplicate", 0.005],
  ];

  const toRows = (m: Map<string, number>): CountRow[] =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));

  return {
    source: {
      title: "Synthetic sample data (demo)",
      url: "",
      timezone: "Asia/Kolkata",
      recordCount: grandTotal,
      firstRecordIST: firstISO,
      lastRecordIST: lastISO,
      statement:
        "Generated sample for demonstration only — not real records. Connect the Bengaluru dataset or upload your own CSV to use real data.",
    },
    coverage: {
      policeStations: stationTotals.size,
      namedJunctions: junctions.length,
      namedJunctionRecords: grandTotal,
      recordsWithoutNamedJunction: 0,
    },
    hourlyRecordCountsIST: globalHourly.map((count, hour) => ({
      hour,
      label: `${String(hour).padStart(2, "0")}:00`,
      count,
    })),
    weekdayRecordCounts: weekdays.map((label, i) => ({
      label,
      count: Math.round(grandTotal * weekdayWeights[i]),
    })),
    monthlyRecordCounts: monthLabels.map((label, i) => ({
      label,
      count: Math.round(grandTotal * monthWeights[i]),
    })),
    validationStatus: validationSplit.map(([label, w]) => ({
      label,
      count: Math.round(grandTotal * w),
    })),
    dataSentToScita: [
      { label: "TRUE", count: Math.round(grandTotal * 0.85) },
      { label: "FALSE", count: Math.round(grandTotal * 0.15) },
    ],
    violationTypes: toRows(violationTotals),
    vehicleTypes: toRows(vehicleTotals),
    policeStations: toRows(stationTotals),
    junctions,
  };
}
