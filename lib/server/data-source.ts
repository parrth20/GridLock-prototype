// Server-only access to the processed parking aggregates.
//
// The file data/processed/parking-summary.json is produced offline by
// scripts/build_factual_dataset.py from the official HackerEarth Round 2 CSV.
// We read it at runtime (not `import`) so the ~80 KB of aggregates stay on the
// server and never ship to the browser bundle.
//
// If the processed file is missing we fall back to a clearly-labelled
// deterministic fixture and report datasetMode "prototype" instead of
// silently inventing records.
//
// Server-only by convention: only API route handlers import this module, so
// the dataset is never bundled into the browser.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { DatasetMode, ParkingSummary } from "@/lib/types";
import { generateSampleSummary } from "@/lib/server/sample-data";

const SUMMARY_PATH = path.join(
  process.cwd(),
  "data",
  "processed",
  "parking-summary.json",
);

// When a user uploads their own CSV (or connects Bengaluru) we write the rebuilt
// aggregates here and prefer them over the sample. We use the OS temp dir so it
// also works on read-only serverless filesystems (e.g. Vercel, where only /tmp
// is writable). Deleting it reverts to the sample data.
const ACTIVE_PATH = path.join(os.tmpdir(), "clearlane-active-summary.json");

const IST_OFFSET_MINUTES = 5 * 60 + 30;

let cache: { summary: ParkingSummary; mode: DatasetMode } | null = null;
// Reseeded on every reset so the demo sample looks different across sessions.
let sampleSeed = ((Date.now() >>> 0) % 1_000_000) || 1;

function modeForActive(summary: ParkingSummary): DatasetMode {
  return summary.source.title.startsWith("Uploaded") ? "uploaded" : "official-aggregates";
}

/**
 * Minimal, honest fixture used only when the processed dataset is absent.
 * It carries a single illustrative junction and is flagged as "prototype" so
 * the UI never presents it as the supplied data.
 */
function fallbackSummary(): ParkingSummary {
  return {
    source: {
      title: "Deterministic prototype fixture (official dataset not found)",
      url: "",
      timezone: "Asia/Kolkata",
      recordCount: 0,
      firstRecordIST: "2023-11-10T00:00:00+05:30",
      lastRecordIST: "2024-04-08T23:59:59+05:30",
      statement:
        "Official CSV not present. Place it and run `pnpm run data:build` to load real aggregates.",
    },
    coverage: {
      policeStations: 0,
      namedJunctions: 0,
      namedJunctionRecords: 0,
      recordsWithoutNamedJunction: 0,
    },
    hourlyRecordCountsIST: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: `${String(hour).padStart(2, "0")}:00`,
      count: 0,
    })),
    weekdayRecordCounts: [],
    monthlyRecordCounts: [],
    validationStatus: [],
    dataSentToScita: [],
    violationTypes: [],
    vehicleTypes: [],
    policeStations: [],
    junctions: [],
  };
}

function readSummaryFrom(file: string): ParkingSummary | null {
  try {
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw) as ParkingSummary;
  } catch {
    return null;
  }
}

function load(): { summary: ParkingSummary; mode: DatasetMode } {
  if (cache) return cache;

  // 1) A connected dataset (uploaded CSV or the Bengaluru preset) takes priority.
  if (fs.existsSync(ACTIVE_PATH)) {
    const active = readSummaryFrom(ACTIVE_PATH);
    if (active && active.source.recordCount > 0) {
      cache = { summary: active, mode: modeForActive(active) };
      return cache;
    }
  }

  // 2) Otherwise, the app is disconnected and explicitly reports prototype mode.
  const prototype = {
    summary: generateSampleSummary(sampleSeed),
    mode: "prototype" as const,
  };
  cache = prototype;
  return prototype;
}

/** Clear the in-memory cache so the next read reloads. */
export function reloadDataset(): void {
  cache = null;
}

/** The bundled real Bengaluru aggregates (used by the "connect Bengaluru" preset). */
export function loadBundledOfficialSummary(): ParkingSummary | null {
  const bundled = readSummaryFrom(SUMMARY_PATH);
  return bundled && bundled.source.recordCount > 0 ? bundled : null;
}

/** Persist a summary as the active (connected) dataset. */
export function setActiveSummary(summary: ParkingSummary): void {
  // Update the in-memory cache first so the request always succeeds, even if
  // the filesystem is read-only.
  cache = { summary, mode: modeForActive(summary) };
  try {
    fs.mkdirSync(path.dirname(ACTIVE_PATH), { recursive: true });
    fs.writeFileSync(ACTIVE_PATH, JSON.stringify(summary), "utf-8");
  } catch {
    /* read-only filesystem (serverless) — keep the in-memory dataset */
  }
}

/** Disconnect: remove the active dataset and revert to a fresh demo sample. */
export function clearActiveSummary(): void {
  try {
    if (fs.existsSync(ACTIVE_PATH)) fs.unlinkSync(ACTIVE_PATH);
  } catch {
    /* ignore */
  }
  sampleSeed = ((Date.now() >>> 0) % 1_000_000) || 1;
  cache = null;
}

export function hasActiveDataset(): boolean {
  return fs.existsSync(ACTIVE_PATH);
}

export function getSummary(): ParkingSummary {
  return load().summary;
}

export function getDatasetMode(): DatasetMode {
  return load().mode;
}

export function isUsingSuppliedData(): boolean {
  return load().mode === "official-aggregates";
}

/** Number of whole days spanned by the dataset window (>= 1). */
export function getWindowDays(): number {
  const { source } = getSummary();
  const first = new Date(source.firstRecordIST).getTime();
  const last = new Date(source.lastRecordIST).getTime();
  const days = Math.round((last - first) / (1000 * 60 * 60 * 24));
  return Math.max(1, days);
}

/** Current time formatted as an IST ISO-ish string for "generated at" labels. */
export function nowIST(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  return ist.toISOString().replace("Z", "+05:30");
}

/** Current hour of day in IST (0-23), regardless of server timezone. */
export function currentHourIST(): number {
  const now = new Date();
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const istMinutes = (utcMinutes + IST_OFFSET_MINUTES) % (24 * 60);
  return Math.floor(istMinutes / 60);
}

export function getStations(): string[] {
  return getSummary().policeStations.map((s) => s.label);
}

export function getViolationTypes(): string[] {
  return getSummary().violationTypes.map((v) => v.label);
}
