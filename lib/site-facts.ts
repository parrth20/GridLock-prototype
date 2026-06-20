// Small, client-safe constants for the landing page and shared microcopy.
// These mirror the headline figures in data/processed/parking-summary.json so
// the marketing surface never bundles the full dataset. Verified against the
// processed aggregates (recordCount 298,450; 54 stations; 168 named junctions;
// 10 Nov 2023 → 08 Apr 2024).

export const DATA_FACTS = {
  recordCount: 298450,
  recordCountLabel: "298,450",
  policeStations: 54,
  namedJunctions: 168,
  windowLabel: "Nov 2023 – Apr 2024",
  windowMonths: "≈5 months",
  firstRecord: "10 Nov 2023",
  lastRecord: "08 Apr 2024",
} as const;

export const METRIC_NAME = "Parking-Induced Congestion Risk Index";

export const METRIC_EXPLANATION =
  "This index estimates parking-related congestion risk using violation frequency, recurrence, junction proximity, obstruction severity and time-of-day patterns. It is not a direct measurement of traffic speed.";

export const BILINGUAL_LABEL =
  "ಬೆಂಗಳೂರು ಸಂಚಾರ ಬುದ್ಧಿಮತ್ತೆ / Bengaluru Traffic Intelligence";

// Honest provenance line, without the word "prototype".
export const PROTOTYPE_DISCLAIMER =
  "Independent decision-support tool — not an official government service.";

export const DATA_BADGE = `Powered by ${DATA_FACTS.recordCountLabel} official violation records`;

export const DATA_STATEMENT =
  "All displayed values are aggregates of supplied records; they are not live conditions or forecasts.";

export const CREDIBILITY_STRIP = [
  { value: DATA_FACTS.recordCountLabel, label: "Violation records", sub: "Supplied dataset" },
  { value: String(DATA_FACTS.policeStations), label: "Police stations", sub: "Across Bengaluru" },
  { value: String(DATA_FACTS.namedJunctions), label: "Named junctions", sub: "Geocoded labels" },
  { value: DATA_FACTS.windowLabel, label: "Data window", sub: DATA_FACTS.windowMonths },
] as const;
