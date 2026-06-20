// Next-shift forecast.
//
// This is NOT a live prediction. Each junction's upcoming-shift demand is
// predicted by the fitted harmonic-regression model (lib/server/ml-model.ts)
// and scaled by a weekday seasonal index, with 95% Poisson prediction
// intervals. The basis is "fitted-harmonic-model".

import { getSummary, getWindowDays, nowIST } from "@/lib/server/data-source";
import { getDatasetMode } from "@/lib/server/data-source";
import { getHotspots } from "@/lib/server/risk-engine";
import {
  getModelAccuracy,
  predictShift,
  weekdayFactorForToday,
} from "@/lib/server/ml-model";
import type {
  ForecastResponse,
  ShiftWindow,
  ZoneForecast,
} from "@/lib/types";

export const SHIFTS: ShiftWindow[] = [
  { id: "late-night", label: "Late night (00:00–06:00)", startHour: 0, endHour: 6 },
  { id: "morning", label: "Morning (06:00–12:00)", startHour: 6, endHour: 12 },
  { id: "afternoon", label: "Afternoon (12:00–18:00)", startHour: 12, endHour: 18 },
  { id: "evening", label: "Evening (18:00–24:00)", startHour: 18, endHour: 24 },
];

export function shiftHours(shift: ShiftWindow): number[] {
  // endHour is exclusive; the defined shifts never wrap past midnight.
  const hours: number[] = [];
  for (let h = shift.startHour; h < shift.endHour; h += 1) {
    hours.push(h % 24);
  }
  return hours;
}

export function nextShiftFor(hour: number): ShiftWindow {
  // The shift that starts strictly after the current hour's shift.
  const current =
    SHIFTS.find((s) => hour >= s.startHour && hour < s.endHour) ?? SHIFTS[0];
  const idx = SHIFTS.findIndex((s) => s.id === current.id);
  return SHIFTS[(idx + 1) % SHIFTS.length];
}

export function getShiftById(id: string | null | undefined): ShiftWindow | null {
  if (!id) return null;
  return SHIFTS.find((s) => s.id === id) ?? null;
}

function confidenceFor(recordCount: number): ZoneForecast["confidence"] {
  if (recordCount >= 2000) return "high";
  if (recordCount >= 500) return "medium";
  return "low";
}

export function buildForecast(
  referenceHour: number,
  shiftOverride?: ShiftWindow | null,
  limit = 12,
): ForecastResponse {
  const summary = getSummary();
  const windowDays = getWindowDays();
  const shift = shiftOverride ?? nextShiftFor(referenceHour);
  const hours = shiftHours(shift);

  const junctionById = new Map(summary.junctions.map((j) => [j.id, j]));
  const weekdayFactor = weekdayFactorForToday();

  const zones: ZoneForecast[] = getHotspots()
    .map((h) => {
      const j = junctionById.get(h.id);
      if (!j) return null;
      const total = j.hourlyRecordCounts.reduce((s, n) => s + n, 0) || 1;
      const windowRecords = hours.reduce(
        (s, hr) => s + (j.hourlyRecordCounts[hr] ?? 0),
        0,
      );
      const windowRecordShare = windowRecords / total;

      // Share for each shift, to express pressure relative to the zone's peak.
      const shiftShares = SHIFTS.map((s) =>
        shiftHours(s).reduce((sum, hr) => sum + (j.hourlyRecordCounts[hr] ?? 0), 0),
      );
      const maxShiftRecords = Math.max(1, ...shiftShares);
      const relativePressure = Math.round((windowRecords / maxShiftRecords) * 100);

      // Fitted ML prediction for the upcoming shift on this weekday.
      const prediction = predictShift(h.id, hours, weekdayFactor);

      const zone: ZoneForecast = {
        id: h.id,
        name: h.name,
        policeStation: h.policeStation,
        riskIndex: h.riskIndex,
        riskLevel: h.riskLevel,
        windowRecordShare: Math.round(windowRecordShare * 1000) / 1000,
        projectedRecordsInWindow: Math.round(windowRecords / windowDays),
        baselinePerHour: Math.round((total / windowDays / 24) * 10) / 10,
        relativePressure,
        confidence: prediction?.confidence ?? confidenceFor(j.recordCount),
        predictedPerDay: prediction?.expectedPerDay ?? 0,
        predictedLower: prediction?.lower ?? 0,
        predictedUpper: prediction?.upper ?? 0,
        modelR2: prediction?.r2 ?? 0,
      };
      return zone;
    })
    .filter((z): z is ZoneForecast => z !== null && z.windowRecordShare > 0)
    .sort(
      (a, b) =>
        b.riskIndex * b.windowRecordShare - a.riskIndex * a.windowRecordShare,
    )
    .slice(0, limit);

  const acc = getModelAccuracy();

  return {
    datasetMode: getDatasetMode(),
    basis: "fitted-harmonic-model",
    disclaimer:
      "Predicted by a harmonic-regression demand model fitted to the historical record, scaled by a weekday seasonal index. Estimates of violation volume — not a measurement of traffic speed.",
    referenceHourIST: referenceHour,
    weekdayFactor: Math.round(weekdayFactor * 100) / 100,
    shift,
    windowHours: hours,
    model: {
      method: acc.method,
      harmonics: acc.harmonics,
      junctionsModelled: acc.junctionsModelled,
      weightedR2: acc.weightedR2,
      meanMape: acc.meanMape,
      cityWideR2: acc.cityWideR2,
    },
    zones,
    generatedAtIST: nowIST(),
  };
}
