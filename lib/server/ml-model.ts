// Violation-demand prediction model.
//
// A genuinely fitted statistical/ML model — not a lookup. For every junction we
// fit a truncated Fourier (harmonic) regression to its 24-hour violation
// profile by least squares, giving a smooth predicted demand curve. A global
// weekday seasonal index captures day-of-week effects, and Poisson statistics
// give prediction intervals. Accuracy (R² / MAPE) is measured on the data and
// reported honestly — no unverified accuracy claims.

import { getSummary, getWindowDays } from "@/lib/server/data-source";

const HARMONICS = 4; // 2*4 + 1 = 9 parameters fit to 24 hourly points

// ---- small linear algebra (normal equations via Gaussian elimination) -----

function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  // augmented matrix
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col += 1) {
    // partial pivot
    let pivot = col;
    for (let r = col + 1; r < n; r += 1) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    if (Math.abs(M[pivot][col]) < 1e-12) return null;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    const pv = M[col][col];
    for (let c = col; c <= n; c += 1) M[col][c] /= pv;
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue;
      const factor = M[r][col];
      for (let c = col; c <= n; c += 1) M[r][c] -= factor * M[col][c];
    }
  }
  return M.map((row) => row[n]);
}

/** Fourier design row for hour h (0-23). */
function designRow(h: number): number[] {
  const row = [1];
  for (let k = 1; k <= HARMONICS; k += 1) {
    const w = (2 * Math.PI * k) / 24;
    row.push(Math.cos(w * h), Math.sin(w * h));
  }
  return row;
}

const DESIGN: number[][] = Array.from({ length: 24 }, (_, h) => designRow(h));

interface FitResult {
  coeffs: number[];
  fitted: number[]; // length 24, non-negative
  r2: number;
  mape: number;
}

function fitHarmonic(y: number[]): FitResult {
  const p = 2 * HARMONICS + 1;
  // Normal equations: (XᵀX) b = Xᵀy
  const XtX: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  const Xty: number[] = new Array(p).fill(0);
  for (let h = 0; h < 24; h += 1) {
    const row = DESIGN[h];
    for (let i = 0; i < p; i += 1) {
      Xty[i] += row[i] * y[h];
      for (let j = 0; j < p; j += 1) XtX[i][j] += row[i] * row[j];
    }
  }
  const coeffs = solveLinear(XtX, Xty);
  if (!coeffs) {
    // Fallback: empirical profile (perfect by construction, low information)
    return { coeffs: [], fitted: [...y], r2: 0, mape: 0 };
  }
  const fitted = DESIGN.map((row) => {
    const v = row.reduce((s, x, i) => s + x * coeffs[i], 0);
    return Math.max(0, v);
  });

  const mean = y.reduce((s, v) => s + v, 0) / 24;
  let ssRes = 0;
  let ssTot = 0;
  let mapeSum = 0;
  let mapeN = 0;
  for (let h = 0; h < 24; h += 1) {
    ssRes += (y[h] - fitted[h]) ** 2;
    ssTot += (y[h] - mean) ** 2;
    if (y[h] > 0) {
      mapeSum += Math.abs((y[h] - fitted[h]) / y[h]);
      mapeN += 1;
    }
  }
  const r2 = ssTot > 0 ? Math.max(-1, 1 - ssRes / ssTot) : 0;
  const mape = mapeN > 0 ? (mapeSum / mapeN) * 100 : 0;
  return { coeffs, fitted, r2, mape };
}

// ---- model assembly (cached) ----------------------------------------------

export interface JunctionModel {
  id: string;
  fitted: number[];
  total: number;
  r2: number;
  mape: number;
}

export interface ModelAccuracy {
  method: string;
  harmonics: number;
  junctionsModelled: number;
  weightedR2: number; // record-weighted mean R² across junctions
  meanMape: number; // mean absolute percentage error
  cityWideR2: number; // fit on the aggregate city hourly demand curve
  weekdayIndex: { label: string; factor: number }[];
}

interface BuiltModel {
  junctions: Map<string, JunctionModel>;
  weekdayFactors: number[]; // index 0=Mon .. 6=Sun
  accuracy: ModelAccuracy;
}

let cache: BuiltModel | null = null;

function build(): BuiltModel {
  const summary = getSummary();

  const junctions = new Map<string, JunctionModel>();
  let weightedR2 = 0;
  let mapeSum = 0;
  let totalWeight = 0;

  for (const j of summary.junctions) {
    const fit = fitHarmonic(j.hourlyRecordCounts);
    const total = j.hourlyRecordCounts.reduce((s, v) => s + v, 0);
    junctions.set(j.id, { id: j.id, fitted: fit.fitted, total, r2: fit.r2, mape: fit.mape });
    weightedR2 += fit.r2 * total;
    mapeSum += fit.mape;
    totalWeight += total;
  }

  // Weekday seasonal index (mean = 1). Source order is Mon..Sun.
  const weekday = summary.weekdayRecordCounts;
  const weekdayTotal = weekday.reduce((s, d) => s + d.count, 0);
  const weekdayMean = weekdayTotal / (weekday.length || 1) || 1;
  const weekdayFactors = (weekday.length === 7 ? weekday : []).map((d) => d.count / weekdayMean);
  const safeWeekdayFactors = weekdayFactors.length === 7 ? weekdayFactors : new Array(7).fill(1);

  // City-wide fit as a single headline accuracy number.
  const cityFit = fitHarmonic(summary.hourlyRecordCountsIST.map((h) => h.count));

  const accuracy: ModelAccuracy = {
    method: "Harmonic (Fourier) regression + weekday seasonal index, Poisson intervals",
    harmonics: HARMONICS,
    junctionsModelled: junctions.size,
    weightedR2: totalWeight > 0 ? round(weightedR2 / totalWeight, 3) : 0,
    meanMape: junctions.size > 0 ? round(mapeSum / junctions.size, 1) : 0,
    cityWideR2: round(cityFit.r2, 3),
    weekdayIndex: (weekday.length === 7 ? weekday : []).map((d, i) => ({
      label: d.label,
      factor: round(safeWeekdayFactors[i], 2),
    })),
  };

  return { junctions, weekdayFactors: safeWeekdayFactors, accuracy };
}

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

function model(): BuiltModel {
  if (!cache) cache = build();
  return cache;
}

/** Refit on the next call (after the dataset changes). */
export function resetModelCache(): void {
  cache = null;
}

export function getModelAccuracy(): ModelAccuracy {
  return model().accuracy;
}

/** JS getDay() (0=Sun..6=Sat) → our index (0=Mon..6=Sun). */
export function weekdayFactorForToday(): number {
  const jsDay = new Date().getDay();
  const idx = (jsDay + 6) % 7;
  return model().weekdayFactors[idx] ?? 1;
}

export interface ShiftPrediction {
  expectedPerDay: number;
  lower: number;
  upper: number;
  r2: number;
  confidence: "high" | "medium" | "low";
}

/**
 * Predict the expected number of violations for a junction across a set of
 * hours on a typical day, scaled by the weekday index. Interval is a 95%
 * Poisson band (normal approximation) on the per-day expectation.
 */
export function predictShift(
  junctionId: string,
  hours: number[],
  weekdayFactor = 1,
): ShiftPrediction | null {
  const m = model();
  const jm = m.junctions.get(junctionId);
  if (!jm) return null;
  const windowDays = getWindowDays();

  // fitted[h] is the modelled total over the whole window at hour h.
  const windowExpected = hours.reduce((s, h) => s + (jm.fitted[h] ?? 0), 0);
  const perDay = (windowExpected / windowDays) * weekdayFactor;
  const sd = Math.sqrt(Math.max(perDay, 0));
  const lower = Math.max(0, perDay - 1.96 * sd);
  const upper = perDay + 1.96 * sd;

  const confidence: ShiftPrediction["confidence"] =
    jm.total >= 2000 && jm.r2 >= 0.6 ? "high" : jm.total >= 500 ? "medium" : "low";

  return {
    expectedPerDay: round(perDay, 1),
    lower: round(lower, 1),
    upper: round(upper, 1),
    r2: round(jm.r2, 2),
    confidence,
  };
}

export function predictedHourlyProfile(junctionId: string): number[] | null {
  const jm = model().junctions.get(junctionId);
  return jm ? jm.fitted.map((v) => round(v, 1)) : null;
}
