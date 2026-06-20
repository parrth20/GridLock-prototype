// Parking-Induced Congestion Risk Index.
//
// "This index estimates parking-related congestion risk using violation
//  frequency, recurrence, junction proximity, obstruction severity and
//  time-of-day patterns. It is not a direct measurement of traffic speed."
//
// Every input is an aggregate of the supplied dataset. Nothing here measures
// vehicle speed, travel time, occupancy or capacity.

import {
  getSummary,
  getWindowDays,
} from "@/lib/server/data-source";
import type {
  Hotspot,
  HotspotDetail,
  JunctionRecord,
  RecommendedWindow,
  RiskFactor,
  RiskLevel,
} from "@/lib/types";

export const METRIC_NAME = "Parking-Induced Congestion Risk Index";

export const METRIC_EXPLANATION =
  "This index estimates parking-related congestion risk using violation frequency, recurrence, junction proximity, obstruction severity and time-of-day patterns. It is not a direct measurement of traffic speed.";

/** Relative obstruction weight per violation label (0 = minor, 1 = severe). */
const SEVERITY_WEIGHTS: Record<string, number> = {
  "PARKING ON FOOTPATH": 0.95,
  "PARKING NEAR TRAFFIC LIGHT OR ZEBRA CROSS": 0.92,
  "PARKING NEAR BUSTOP/SCHOOL/HOSPITAL ETC": 0.9,
  "PARKING NEAR ROAD CROSSING": 0.85,
  "PARKING IN A MAIN ROAD": 0.8,
  "DOUBLE PARKING": 0.72,
  "AGAINST ONE WAY/NO ENTRY": 0.7,
  "PARKING OPPOSITE TO ANOTHER PARKED VEHICLE": 0.66,
  "OBSTRUCTING DRIVER": 0.66,
  "NO PARKING": 0.6,
  "PARKING OTHER THAN BUS STOP": 0.6,
  "WRONG PARKING": 0.55,
  "H T V PROHIBITED": 0.5,
  "REFUSE TO GO FOR HIRE": 0.32,
  "DEMANDING EXCESS FARE": 0.28,
  "DEFECTIVE NUMBER PLATE": 0.2,
  "USING BLACK FILM/OTHER MATERIALS": 0.15,
  "WITHOUT SIDE MIRROR": 0.12,
};
const DEFAULT_SEVERITY = 0.5;

/** Weights for the five factors; they sum to 1. */
export const RISK_WEIGHTS = {
  frequency: 0.3,
  recurrence: 0.15,
  proximity: 0.15,
  severity: 0.25,
  concentration: 0.15,
} as const;

/** Absolute risk bands (documented and stable). */
export const RISK_BANDS: { level: RiskLevel; min: number }[] = [
  { level: "critical", min: 70 },
  { level: "high", min: 55 },
  { level: "moderate", min: 40 },
  { level: "low", min: 0 },
];

export function riskLevelFor(index: number): RiskLevel {
  return (RISK_BANDS.find((b) => index >= b.min)?.level ?? "low") as RiskLevel;
}

const WINDOW_LENGTH_HOURS = 3;
const PROXIMITY_RADIUS_KM = 1.5;

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Best contiguous WINDOW_LENGTH_HOURS block by record volume. */
export function bestWindow(hourly: number[]): RecommendedWindow {
  const total = hourly.reduce((s, n) => s + n, 0) || 1;
  let bestStart = 0;
  let bestSum = -1;
  for (let start = 0; start < 24; start += 1) {
    let sum = 0;
    for (let k = 0; k < WINDOW_LENGTH_HOURS; k += 1) {
      sum += hourly[(start + k) % 24];
    }
    if (sum > bestSum) {
      bestSum = sum;
      bestStart = start;
    }
  }
  const endHour = (bestStart + WINDOW_LENGTH_HOURS) % 24;
  return {
    startHour: bestStart,
    endHour,
    label: `${String(bestStart).padStart(2, "0")}:00–${String(endHour).padStart(2, "0")}:00`,
    shareOfDay: bestSum / total,
  };
}

function severityScore(junction: JunctionRecord): number {
  const rows = junction.topViolationTypes;
  const total = rows.reduce((s, r) => s + r.count, 0);
  if (total === 0) return DEFAULT_SEVERITY * 100;
  const weighted = rows.reduce(
    (s, r) => s + (SEVERITY_WEIGHTS[r.label] ?? DEFAULT_SEVERITY) * r.count,
    0,
  );
  return clamp((weighted / total) * 100);
}

function recurrenceScore(junction: JunctionRecord, windowDays: number): number {
  const first = new Date(junction.firstSeenIST).getTime();
  const last = new Date(junction.lastSeenIST).getTime();
  const spanDays = Math.max(0, (last - first) / (1000 * 60 * 60 * 24));
  const spanRatio = clamp(spanDays / windowDays, 0, 1);
  const activeHours = junction.hourlyRecordCounts.filter((c) => c > 0).length;
  const activeHourRatio = activeHours / 24;
  return clamp((0.5 * spanRatio + 0.5 * activeHourRatio) * 100);
}

interface ScoredFactors {
  frequency: number;
  recurrence: number;
  proximity: number;
  severity: number;
  concentration: number;
}

function buildScored(): {
  hotspots: Hotspot[];
  factorsById: Map<string, ScoredFactors>;
} {
  const summary = getSummary();
  const junctions = summary.junctions;
  const windowDays = getWindowDays();

  if (junctions.length === 0) {
    return { hotspots: [], factorsById: new Map() };
  }

  const maxCount = Math.max(...junctions.map((j) => j.recordCount));
  const logMax = Math.log(1 + maxCount);

  // Proximity: weighted neighbour volume within radius, normalised to its max.
  const rawProximity = junctions.map((j) => {
    let sum = 0;
    for (const other of junctions) {
      if (other.id === j.id) continue;
      const d = haversineKm(
        j.latitude,
        j.longitude,
        other.latitude,
        other.longitude,
      );
      if (d <= PROXIMITY_RADIUS_KM) {
        // closer + busier neighbours contribute more
        sum += other.recordCount * (1 - d / PROXIMITY_RADIUS_KM);
      }
    }
    return sum;
  });
  const maxProximity = Math.max(1, ...rawProximity);

  const factorsById = new Map<string, ScoredFactors>();

  const hotspots: Hotspot[] = junctions.map((j, i) => {
    const frequency = clamp((Math.log(1 + j.recordCount) / logMax) * 100);
    const recurrence = recurrenceScore(j, windowDays);
    const proximity = clamp((rawProximity[i] / maxProximity) * 100);
    const severity = severityScore(j);
    const window = bestWindow(j.hourlyRecordCounts);
    const concentration = clamp(window.shareOfDay * 100);

    const factors: ScoredFactors = {
      frequency,
      recurrence,
      proximity,
      severity,
      concentration,
    };
    factorsById.set(j.id, factors);

    const riskIndex = Math.round(
      frequency * RISK_WEIGHTS.frequency +
        recurrence * RISK_WEIGHTS.recurrence +
        proximity * RISK_WEIGHTS.proximity +
        severity * RISK_WEIGHTS.severity +
        concentration * RISK_WEIGHTS.concentration,
    );

    const first = new Date(j.firstSeenIST).getTime();
    const last = new Date(j.lastSeenIST).getTime();
    const activeDays = Math.max(
      1,
      Math.round((last - first) / (1000 * 60 * 60 * 24)),
    );

    return {
      id: j.id,
      name: j.name,
      policeStation: j.policeStation,
      latitude: j.latitude,
      longitude: j.longitude,
      recordCount: j.recordCount,
      shareOfAllRecords: j.shareOfAllRecords,
      riskIndex,
      riskLevel: riskLevelFor(riskIndex),
      peakHourIST: j.peakRecordedHourIST,
      recommendedWindow: window,
      topViolation: j.topViolationTypes[0]?.label ?? "Not recorded",
      topVehicle: j.topVehicleTypes[0]?.label ?? "Not recorded",
      firstSeenIST: j.firstSeenIST,
      lastSeenIST: j.lastSeenIST,
      activeDays,
    };
  });

  hotspots.sort((a, b) => b.riskIndex - a.riskIndex);
  return { hotspots, factorsById };
}

let scoredCache: ReturnType<typeof buildScored> | null = null;
function scored() {
  if (!scoredCache) scoredCache = buildScored();
  return scoredCache;
}

/** Drop the cached scoring so the next call recomputes (after a data swap). */
export function resetRiskCache(): void {
  scoredCache = null;
}

export function getHotspots(): Hotspot[] {
  return scored().hotspots;
}

export function getHotspotById(id: string): Hotspot | undefined {
  return scored().hotspots.find((h) => h.id === id);
}

function factorBreakdown(id: string): RiskFactor[] {
  const f = scored().factorsById.get(id);
  if (!f) return [];
  const rows: Omit<RiskFactor, "weighted">[] = [
    {
      key: "frequency",
      label: "How many violations",
      value: Math.round(f.frequency),
      weight: RISK_WEIGHTS.frequency,
      basis: "calculated",
      description: "How many violations happen here, compared to the city's busiest spot.",
    },
    {
      key: "severity",
      label: "How serious",
      value: Math.round(f.severity),
      weight: RISK_WEIGHTS.severity,
      basis: "calculated",
      description: "Blocking footpaths, main roads and bus stops counts as more serious.",
    },
    {
      key: "recurrence",
      label: "How often it repeats",
      value: Math.round(f.recurrence),
      weight: RISK_WEIGHTS.recurrence,
      basis: "calculated",
      description: "Whether the problem keeps coming back, day after day.",
    },
    {
      key: "proximity",
      label: "Busy area",
      value: Math.round(f.proximity),
      weight: RISK_WEIGHTS.proximity,
      basis: "calculated",
      description: "How many other busy spots are nearby (within 1.5 km).",
    },
    {
      key: "concentration",
      label: "Rush-hour spike",
      value: Math.round(f.concentration),
      weight: RISK_WEIGHTS.concentration,
      basis: "calculated",
      description: "How much the trouble packs into a few peak hours.",
    },
  ];
  return rows.map((r) => ({ ...r, weighted: Math.round(r.value * r.weight) }));
}

function nearby(id: string): HotspotDetail["nearbyJunctions"] {
  const all = scored().hotspots;
  const self = all.find((h) => h.id === id);
  if (!self) return [];
  return all
    .filter((h) => h.id !== id)
    .map((h) => ({
      id: h.id,
      name: h.name,
      riskIndex: h.riskIndex,
      distanceKm:
        Math.round(
          haversineKm(self.latitude, self.longitude, h.latitude, h.longitude) *
            100,
        ) / 100,
    }))
    .filter((h) => h.distanceKm <= PROXIMITY_RADIUS_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 4);
}

function explain(h: Hotspot, _factors: RiskFactor[]): string {
  const share = (h.shareOfAllRecords ?? 0).toFixed(1);
  return (
    `${h.name} is a ${h.riskLevel}-risk spot, scoring ${h.riskIndex} out of 100. ` +
    `${h.recordCount.toLocaleString()} violations were logged here — about ${share}% of the whole city. ` +
    `The most common problem is ${h.topViolation.toLowerCase()} (mostly ${h.topVehicle.toLowerCase()}s). ` +
    `It's busiest from ${h.recommendedWindow.label}, so that's the best time to send a patrol. ` +
    `Based on past records, not live traffic.`
  );
}

export function getHotspotDetail(id: string): HotspotDetail | null {
  const h = getHotspotById(id);
  if (!h) return null;
  const summary = getSummary();
  const junction = summary.junctions.find((j) => j.id === id);
  if (!junction) return null;
  const factors = factorBreakdown(id);
  return {
    ...h,
    factors,
    topViolationTypes: junction.topViolationTypes,
    topVehicleTypes: junction.topVehicleTypes,
    hourlyRecordCounts: junction.hourlyRecordCounts,
    explanation: explain(h, factors),
    nearbyJunctions: nearby(id),
  };
}

/** Hotspots active (any records) during a given hour. */
export function hotspotsActiveAtHour(hour: number): Hotspot[] {
  const summary = getSummary();
  const activeIds = new Set(
    summary.junctions
      .filter((j) => (j.hourlyRecordCounts[hour] ?? 0) > 0)
      .map((j) => j.id),
  );
  return getHotspots().filter((h) => activeIds.has(h.id));
}
