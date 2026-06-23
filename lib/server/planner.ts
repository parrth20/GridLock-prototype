// Enforcement patrol planner.
//
// Ranks junctions for a chosen shift by how many violations actually happen
// there in that window (weighted by risk), works out how many stops each unit
// can realistically make given the shift length, and builds a timed itinerary
// per unit. "Coverage" is the share of THIS window's recorded violations the
// chosen stops account for — never a promised congestion reduction.

import { getSummary, nowIST, getDatasetMode, getWindowDays } from "@/lib/server/data-source";
import { getHotspots } from "@/lib/server/risk-engine";
import type {
  EnforcementPlanResponse,
  Hotspot,
  PatrolUnitPlan,
  PlanZoneAssignment,
  RecommendedWindow,
} from "@/lib/types";

export interface PlanInput {
  shiftStartHour: number;
  shiftEndHour: number;
  patrolUnits: number;
  maxZonesPerUnit: number;
}

// A unit gives each junction roughly this much presence before moving on.
const STOP_HOURS = 1.5;

function rangeHours(start: number, end: number): number[] {
  const len = ((end - start + 24) % 24) || 24; // start===end => full day
  return Array.from({ length: len }, (_, i) => (start + i) % 24);
}

/** Format a (possibly fractional, possibly >24) hour as HH:MM clock time. */
function fmtClock(hourFloat: number): string {
  const total = ((Math.round(hourFloat * 60) % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function bestWindowWithin(
  hourly: number[],
  windowHours: number[],
  maxLen = 3,
): RecommendedWindow {
  const total = hourly.reduce((s, n) => s + n, 0) || 1;
  const len = Math.min(maxLen, windowHours.length);
  let bestStartIdx = 0;
  let bestSum = -1;
  for (let i = 0; i + len <= windowHours.length; i += 1) {
    let sum = 0;
    for (let k = 0; k < len; k += 1) sum += hourly[windowHours[i + k]] ?? 0;
    if (sum > bestSum) {
      bestSum = sum;
      bestStartIdx = i;
    }
  }
  const startHour = windowHours[bestStartIdx];
  const endHour = (startHour + len) % 24;
  return {
    startHour,
    endHour,
    label: `${String(startHour).padStart(2, "0")}:00–${String(endHour).padStart(2, "0")}:00`,
    shareOfDay: Math.max(0, bestSum) / total,
  };
}

export function buildPlan(input: PlanInput): EnforcementPlanResponse {
  const { shiftStartHour, shiftEndHour, patrolUnits, maxZonesPerUnit } = input;
  const summary = getSummary();
  const windowDays = getWindowDays();
  const windowHours = rangeHours(shiftStartHour, shiftEndHour);
  const shiftHours = windowHours.length;
  const junctionById = new Map(summary.junctions.map((j) => [j.id, j]));

  // Hours of an absolute clock hour measured from the shift start (0..shiftHours).
  const offsetOf = (hr: number) => (((hr - shiftStartHour) % 24) + 24) % 24;

  interface Candidate {
    hotspot: Hotspot;
    windowRecords: number;
    score: number;
    window: RecommendedWindow;
  }

  const candidates: Candidate[] = getHotspots()
    .map((h) => {
      const j = junctionById.get(h.id);
      if (!j) return null;
      const windowRecords = windowHours.reduce(
        (s, hr) => s + (j.hourlyRecordCounts[hr] ?? 0),
        0,
      );
      if (windowRecords <= 0) return null;
      return {
        hotspot: h,
        windowRecords,
        // Worst-first: how many violations actually happen here in this window,
        // nudged up by the junction's risk. High volume AND high risk ranks top.
        score: windowRecords * (0.5 + h.riskIndex / 100),
        window: bestWindowWithin(j.hourlyRecordCounts, windowHours),
      };
    })
    .filter((c): c is Candidate => c !== null)
    .sort((a, b) => b.score - a.score);

  // How many stops can ONE unit realistically work this shift? Driven by the
  // shift length (~1.5 h per junction), capped by the requested maximum.
  const stopsPerUnit = Math.max(1, Math.min(maxZonesPerUnit, Math.round(shiftHours / STOP_HOURS)));
  const capacity = patrolUnits * stopsPerUnit;
  const selected = candidates.slice(0, capacity);

  const toAssignment = (c: Candidate, order: number): PlanZoneAssignment => {
    const perDay = Math.round(c.windowRecords / windowDays);
    return {
      order,
      hotspotId: c.hotspot.id,
      name: c.hotspot.name,
      policeStation: c.hotspot.policeStation,
      latitude: c.hotspot.latitude,
      longitude: c.hotspot.longitude,
      riskIndex: c.hotspot.riskIndex,
      riskLevel: c.hotspot.riskLevel,
      window: c.window,
      // Replaced with the real itinerary slot below; default to the busy window.
      slot: { startHour: c.window.startHour, endHour: c.window.endHour, label: c.window.label, onPeak: true },
      topViolation: c.hotspot.topViolation,
      rationale: `About ${perDay} violation${perDay === 1 ? "" : "s"} a day are logged here during this shift; busiest ${c.window.label}. Most common issue: ${c.hotspot.topViolation.toLowerCase()}.`,
    };
  };

  // Snake assignment across units keeps the workload balanced.
  const units: PatrolUnitPlan[] = Array.from({ length: patrolUnits }, (_, u) => ({
    unit: u + 1,
    label: `Patrol unit ${u + 1}`,
    zones: [] as PlanZoneAssignment[],
    coveredRisk: 0,
  }));

  selected.forEach((c, idx) => {
    const round = Math.floor(idx / patrolUnits);
    const pos = idx % patrolUnits;
    const unitIndex = round % 2 === 0 ? pos : patrolUnits - 1 - pos;
    units[unitIndex].zones.push(toAssignment(c, units[unitIndex].zones.length + 1));
    units[unitIndex].coveredRisk += c.hotspot.riskIndex;
  });

  // Build each unit a real timetable: visit junctions in the order they get
  // busy, splitting the shift into equal time blocks across the unit's stops.
  units.forEach((unit) => {
    unit.zones.sort((a, b) => offsetOf(a.window.startHour) - offsetOf(b.window.startHour));
    const n = unit.zones.length;
    const blockLen = n > 0 ? shiftHours / n : shiftHours;
    unit.zones.forEach((z, i) => {
      z.order = i + 1;
      const blockStartOff = i * blockLen;
      const blockEndOff = (i + 1) * blockLen;
      const peakStartOff = offsetOf(z.window.startHour);
      const peakLen = ((z.window.endHour - z.window.startHour + 24) % 24) || 3;
      const peakEndOff = peakStartOff + peakLen;
      z.slot = {
        startHour: shiftStartHour + blockStartOff,
        endHour: shiftStartHour + blockEndOff,
        label: `${fmtClock(shiftStartHour + blockStartOff)}–${fmtClock(shiftStartHour + blockEndOff)}`,
        onPeak: blockStartOff < peakEndOff && blockEndOff > peakStartOff,
      };
    });
  });

  const rankedZones = selected.map((c, i) => toAssignment(c, i + 1));

  // Legacy risk-coverage (kept for compatibility), plus the meaningful metric:
  // the share of THIS window's violations the chosen stops account for.
  const totalCandidateRisk = candidates.reduce((s, c) => s + c.hotspot.riskIndex, 0);
  const coveredRisk = selected.reduce((s, c) => s + c.hotspot.riskIndex, 0);
  const estimatedRiskCoverage =
    totalCandidateRisk > 0 ? Math.round((coveredRisk / totalCandidateRisk) * 100) : 0;

  const totalWindowRecords = candidates.reduce((s, c) => s + c.windowRecords, 0) || 1;
  const coveredWindowRecords = selected.reduce((s, c) => s + c.windowRecords, 0);
  const violationShare = Math.round((coveredWindowRecords / totalWindowRecords) * 100);

  const shiftLabel = `${String(shiftStartHour).padStart(2, "0")}:00–${String(shiftEndHour).padStart(2, "0")}:00`;

  const explanation =
    selected.length === 0
      ? `No junction in the supplied data has recorded violations during ${shiftLabel}. Try widening the shift window.`
      : `Each unit can work about ${stopsPerUnit} stop${stopsPerUnit === 1 ? "" : "s"} in this ${shiftHours}-hour shift (≈1.5 hours per junction). We picked the ${selected.length} junction${selected.length === 1 ? "" : "s"} with the most violations during ${shiftLabel} and gave each of your ${patrolUnits} unit${patrolUnits === 1 ? "" : "s"} a timed route through them. Together these stops account for about ${violationShare}% of every parking violation logged across the city in this window.`;

  return {
    datasetMode: getDatasetMode(),
    shift: { startHour: shiftStartHour, endHour: shiftEndHour, label: shiftLabel },
    patrolUnits,
    maxZonesPerUnit,
    units,
    rankedZones,
    estimatedRiskCoverage,
    violationShare,
    stopsPerUnit,
    candidateZoneCount: candidates.length,
    explanation,
    caveats: [
      "Coverage is the share of recorded violations at the chosen stops — not a guaranteed drop in congestion or travel time.",
      "Visit times split the shift evenly; windows reflect when violations were historically recorded, which past enforcement can influence.",
      "Decision-support aid — the final deployment remains an operator's call.",
    ],
    generatedAtIST: nowIST(),
  };
}
