// Shared domain types for ClearLane Bengaluru.
//
// Everything here is derived ONLY from the supplied HackerEarth Round 2
// anonymised parking-violation dataset (298,450 records, Nov 2023 - Apr 2024).
// No capacities, occupancy, travel times, live feeds or invented locations.

/** A label + count pair, as emitted by scripts/build_factual_dataset.py. */
export interface CountRow {
  label: string;
  count: number;
}

/** Provenance block for the processed aggregates. */
export interface SourceMeta {
  title: string;
  url: string;
  timezone: string;
  recordCount: number;
  firstRecordIST: string;
  lastRecordIST: string;
  statement: string;
}

export interface Coverage {
  policeStations: number;
  namedJunctions: number;
  namedJunctionRecords: number;
  recordsWithoutNamedJunction: number;
}

export interface HourCount {
  hour: number;
  label: string;
  count: number;
}

/** One named junction exactly as stored in parking-summary.json. */
export interface JunctionRecord {
  id: string;
  name: string;
  policeStation: string;
  latitude: number;
  longitude: number;
  recordCount: number;
  shareOfAllRecords: number;
  firstSeenIST: string;
  lastSeenIST: string;
  peakRecordedHourIST: number;
  hourlyRecordCounts: number[];
  topViolationTypes: CountRow[];
  topVehicleTypes: CountRow[];
}

/** The whole processed dataset. */
export interface ParkingSummary {
  source: SourceMeta;
  coverage: Coverage;
  hourlyRecordCountsIST: HourCount[];
  weekdayRecordCounts: CountRow[];
  monthlyRecordCounts: CountRow[];
  validationStatus: CountRow[];
  dataSentToScita: CountRow[];
  violationTypes: CountRow[];
  vehicleTypes: CountRow[];
  policeStations: CountRow[];
  junctions: JunctionRecord[];
}

// ---------------------------------------------------------------------------
// Derived / computed types (produced by the server engines)
// ---------------------------------------------------------------------------

export type RiskLevel = "critical" | "high" | "moderate" | "low";

/**
 * Whether a number is read straight from the dataset (`observed`),
 * computed from it by an engine (`calculated`), or projected forward from the
 * historical distribution (`forecast`). Surfaced in the UI so officers always
 * know what kind of value they are looking at.
 */
export type ValueBasis = "observed" | "calculated" | "forecast";

export interface RecommendedWindow {
  startHour: number;
  endHour: number;
  label: string;
  shareOfDay: number; // fraction (0-1) of the junction's records inside the window
}

/** A scored junction (the unit the dashboard map and lists work with). */
export interface Hotspot {
  id: string;
  name: string;
  policeStation: string;
  latitude: number;
  longitude: number;
  recordCount: number;
  shareOfAllRecords: number;
  riskIndex: number; // Parking-Induced Congestion Risk Index, 0-100 (calculated)
  riskLevel: RiskLevel;
  peakHourIST: number; // observed
  recommendedWindow: RecommendedWindow; // calculated
  topViolation: string; // observed
  topVehicle: string; // observed
  firstSeenIST: string;
  lastSeenIST: string;
  activeDays: number; // observed span in days
}

export interface RiskFactor {
  key: string;
  label: string;
  value: number; // 0-100 contribution score
  weight: number; // 0-1
  weighted: number; // value * weight
  basis: ValueBasis;
  description: string;
}

export interface HotspotDetail extends Hotspot {
  factors: RiskFactor[];
  topViolationTypes: CountRow[];
  topVehicleTypes: CountRow[];
  hourlyRecordCounts: number[]; // observed time-of-day profile
  explanation: string; // plain-language, for the right-side drawer
  nearbyJunctions: { id: string; name: string; distanceKm: number; riskIndex: number }[];
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface HotspotListResponse {
  datasetMode: DatasetMode;
  generatedAtIST: string;
  filters: HotspotFilters;
  pagination: Pagination;
  hotspots: Hotspot[];
}

export interface HotspotFilters {
  station: string | null;
  riskLevel: RiskLevel | null;
  hour: number | null;
  violationType: string | null;
}

export type DatasetMode = "official-aggregates" | "uploaded" | "prototype";

export interface HealthResponse {
  status: "ok";
  service: string;
  datasetMode: DatasetMode;
  usingSuppliedData: boolean;
  runtimeLabel: string; // always "Prototype mode"
  dataset: {
    recordCount: number;
    policeStations: number;
    namedJunctions: number;
    firstRecordIST: string;
    lastRecordIST: string;
    source: string;
  };
  metric: {
    name: string;
    explanation: string;
  };
  model: ModelMeta;
  generatedAtIST: string;
}

// --- Forecast -------------------------------------------------------------

export interface ShiftWindow {
  id: string;
  label: string;
  startHour: number;
  endHour: number; // exclusive; may wrap past midnight
}

export interface ZoneForecast {
  id: string;
  name: string;
  policeStation: string;
  riskIndex: number;
  riskLevel: RiskLevel;
  windowRecordShare: number; // share of this zone's records inside the shift (observed)
  projectedRecordsInWindow: number; // calculated from historical daily average
  baselinePerHour: number; // historical average records/hour across the whole day
  relativePressure: number; // 0-100, projected vs. its own busiest shift
  confidence: "high" | "medium" | "low";
  // ML model output
  predictedPerDay: number; // expected violations in window on a typical day
  predictedLower: number; // 95% Poisson interval low
  predictedUpper: number; // 95% Poisson interval high
  modelR2: number; // fit quality for this junction
}

export interface ModelMeta {
  method: string;
  harmonics: number;
  junctionsModelled: number;
  weightedR2: number;
  meanMape: number;
  cityWideR2: number;
}

export interface ForecastResponse {
  datasetMode: DatasetMode;
  basis: "fitted-harmonic-model";
  disclaimer: string;
  referenceHourIST: number;
  weekdayFactor: number;
  shift: ShiftWindow;
  windowHours: number[];
  model: ModelMeta;
  zones: ZoneForecast[];
  generatedAtIST: string;
}

// --- Enforcement plan -----------------------------------------------------

export interface PlanZoneAssignment {
  order: number;
  hotspotId: string;
  name: string;
  policeStation: string;
  riskIndex: number;
  riskLevel: RiskLevel;
  window: RecommendedWindow;
  topViolation: string;
  rationale: string;
}

export interface PatrolUnitPlan {
  unit: number;
  label: string;
  zones: PlanZoneAssignment[];
  coveredRisk: number;
}

export interface EnforcementPlanResponse {
  datasetMode: DatasetMode;
  shift: { startHour: number; endHour: number; label: string };
  patrolUnits: number;
  maxZonesPerUnit: number;
  units: PatrolUnitPlan[];
  rankedZones: PlanZoneAssignment[];
  estimatedRiskCoverage: number; // % of modelled in-window risk covered
  candidateZoneCount: number;
  explanation: string;
  caveats: string[];
  generatedAtIST: string;
}

// --- Assistant ------------------------------------------------------------

export interface AssistantSource {
  label: string;
  value: string;
  basis?: ValueBasis;
}

export interface AssistantResponse {
  intent: string;
  answer: string;
  bullets: string[];
  sources: AssistantSource[];
  suggestedQuestions: string[];
  disclaimer: string;
  generatedAtIST: string;
}
