// Enforcement patrol planner.
//
// Ranks junctions for a chosen shift window using the risk index and the
// junction's own historical activity inside that window, then distributes the
// top zones across the available patrol units. Coverage is expressed as a share
// of the modelled in-window risk — never as a promised congestion reduction.

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

function rangeHours(start: number, end: number): number[] {
  const len = ((end - start + 24) % 24) || 24; // start===end => full day
  return Array.from({ length: len }, (_, i) => (start + i) % 24);
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
  const junctionById = new Map(summary.junctions.map((j) => [j.id, j]));

  interface Candidate {
    hotspot: Hotspot;
    windowRecords: number;
    windowShare: number;
    score: number;
    window: RecommendedWindow;
  }

  const candidates: Candidate[] = getHotspots()
    .map((h) => {
      const j = junctionById.get(h.id);
      if (!j) return null;
      const total = j.hourlyRecordCounts.reduce((s, n) => s + n, 0) || 1;
      const windowRecords = windowHours.reduce(
        (s, hr) => s + (j.hourlyRecordCounts[hr] ?? 0),
        0,
      );
      if (windowRecords <= 0) return null;
      const windowShare = windowRecords / total;
      return {
        hotspot: h,
        windowRecords,
        windowShare,
        score: h.riskIndex * windowShare,
        window: bestWindowWithin(j.hourlyRecordCounts, windowHours),
      };
    })
    .filter((c): c is Candidate => c !== null)
    .sort((a, b) => b.score - a.score);

  const capacity = patrolUnits * maxZonesPerUnit;
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
      topViolation: c.hotspot.topViolation,
      rationale: `Index ${c.hotspot.riskIndex} (${c.hotspot.riskLevel}); about ${perDay} violation${perDay === 1 ? "" : "s"}/day historically logged in this shift, busiest ${c.window.label}. Most common issue: ${c.hotspot.topViolation.toLowerCase()}.`,
    };
  };

  // Snake assignment across units keeps risk balanced between patrols.
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

  // Order each unit's stops by the start of their recommended sub-window.
  units.forEach((unit) => {
    unit.zones.sort((a, b) => a.window.startHour - b.window.startHour);
    unit.zones.forEach((z, i) => {
      z.order = i + 1;
    });
  });

  const rankedZones = selected.map((c, i) => toAssignment(c, i + 1));

  const totalCandidateRisk = candidates.reduce(
    (s, c) => s + c.hotspot.riskIndex,
    0,
  );
  const coveredRisk = selected.reduce((s, c) => s + c.hotspot.riskIndex, 0);
  const estimatedRiskCoverage =
    totalCandidateRisk > 0
      ? Math.round((coveredRisk / totalCandidateRisk) * 100)
      : 0;

  const shiftLabel = `${String(shiftStartHour).padStart(2, "0")}:00–${String(shiftEndHour).padStart(2, "0")}:00`;

  const explanation =
    selected.length === 0
      ? `No junction in the supplied data has recorded violations during ${shiftLabel}. Try widening the shift window.`
      : `For the ${shiftLabel} shift, ${selected.length} priority zone${selected.length === 1 ? "" : "s"} ${selected.length === 1 ? "was" : "were"} assigned across ${patrolUnits} patrol unit${patrolUnits === 1 ? "" : "s"} (max ${maxZonesPerUnit} per unit). Zones are ranked by their congestion-risk index weighted by how active each junction historically is during this window. Together they cover an estimated ${estimatedRiskCoverage}% of the modelled in-window risk across ${candidates.length} candidate junctions. Each unit's stops are time-ordered so patrols arrive as each junction's busiest window begins.`;

  return {
    datasetMode: getDatasetMode(),
    shift: { startHour: shiftStartHour, endHour: shiftEndHour, label: shiftLabel },
    patrolUnits,
    maxZonesPerUnit,
    units,
    rankedZones,
    estimatedRiskCoverage,
    candidateZoneCount: candidates.length,
    explanation,
    caveats: [
      "Coverage is a share of modelled risk, not a guaranteed reduction in congestion or travel time.",
      "Windows reflect when violations were historically recorded, which can be influenced by past enforcement patterns.",
      "Decision-support aid — final deployment remains an operator decision.",
    ],
    generatedAtIST: nowIST(),
  };
}
