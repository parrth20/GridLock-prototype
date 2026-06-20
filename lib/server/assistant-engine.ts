// ClearLane Sahayak — deterministic, dataset-grounded assistant.
//
// No external LLM. Intent is matched by keywords, answers are composed from the
// same engines that drive the dashboard. Hard guardrails: it never issues
// challans, never collects personal or vehicle information, and never claims to
// be an official Bengaluru Traffic Police or Parivahan service.

import { getSummary, nowIST } from "@/lib/server/data-source";
import {
  getHotspots,
  getHotspotById,
  getHotspotDetail,
  METRIC_EXPLANATION,
  METRIC_NAME,
  RISK_WEIGHTS,
} from "@/lib/server/risk-engine";
import { buildPlan } from "@/lib/server/planner";
import { buildForecast } from "@/lib/server/forecast-engine";
import { getModelAccuracy } from "@/lib/server/ml-model";
import { currentHourIST } from "@/lib/server/data-source";
import type { AssistantResponse, AssistantSource } from "@/lib/types";

const DISCLAIMER =
  "I use Bengaluru's past parking data, not live traffic. I can't issue challans or look up any vehicle or person.";

const BASE_QUESTIONS = [
  "Which zones have the highest risk?",
  "What is the best enforcement window?",
  "Generate a patrol plan for two units.",
  "Explain the risk methodology.",
];

function reply(
  intent: string,
  answer: string,
  bullets: string[],
  sources: AssistantSource[],
  suggestedQuestions: string[],
): AssistantResponse {
  return {
    intent,
    answer,
    bullets,
    sources,
    suggestedQuestions,
    disclaimer: DISCLAIMER,
    generatedAtIST: nowIST(),
  };
}

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
};

function detectUnitCount(message: string): number {
  const digit = message.match(/\b(\d{1,2})\s*(?:units?|patrols?|teams?|bikes?)/);
  if (digit) return Math.min(6, Math.max(1, Number(digit[1])));
  for (const [word, n] of Object.entries(WORD_NUMBERS)) {
    if (new RegExp(`\\b${word}\\b`).test(message)) return n;
  }
  return 2;
}

function bestContiguous(counts: number[], len: number): { start: number; end: number } {
  let bestStart = 0;
  let bestSum = -1;
  for (let s = 0; s < 24; s += 1) {
    let sum = 0;
    for (let k = 0; k < len; k += 1) sum += counts[(s + k) % 24] ?? 0;
    if (sum > bestSum) {
      bestSum = sum;
      bestStart = s;
    }
  }
  return { start: bestStart, end: (bestStart + len) % 24 };
}

function has(message: string, ...terms: string[]): boolean {
  return terms.some((t) => message.includes(t));
}

export function answerAssistant(input: {
  message: string;
  selectedHotspotId?: string;
  filters?: { station?: string; riskLevel?: string; hour?: number };
}): AssistantResponse {
  const message = input.message.toLowerCase().trim();
  const summary = getSummary();
  const selected = input.selectedHotspotId
    ? getHotspotById(input.selectedHotspotId)
    : undefined;

  // --- Guardrails first ----------------------------------------------------

  if (
    has(message, "challan", "fine", "ticket", "penalt", "fir", "e-challan", "prosecut") &&
    has(message, "issue", "raise", "generate", "send", "file", "pay", "book")
  ) {
    return reply(
      "guardrail-challan",
      "I can't issue or process challans. ClearLane is a decision-support tool — it highlights where parking-congestion risk is high and suggests enforcement windows, but any action is taken by authorised officers through official systems.",
      [],
      [{ label: "Role", value: "Decision-support analytics, not an enforcement system" }],
      ["Which zones have the highest risk?", "What is the best enforcement window?"],
    );
  }

  if (
    has(
      message,
      "number plate",
      "numberplate",
      "vehicle number",
      "registration",
      "rc number",
      "owner",
      "driver name",
      "phone number",
      "address of",
      "personal detail",
      "who owns",
      "license number",
      "licence number",
    )
  ) {
    return reply(
      "guardrail-personal-data",
      "I don't have and won't collect any personal or vehicle information — no number plates, owners or contact details. The dataset behind ClearLane is anonymised and aggregated to the junction level only.",
      [],
      [{ label: "Data", value: "Anonymised, aggregated to junctions", basis: "observed" }],
      BASE_QUESTIONS,
    );
  }

  if (
    has(message, "parivahan", "official", "government service", "are you the police", "real police", "bengaluru traffic police app")
  ) {
    return reply(
      "guardrail-identity",
      "I'm ClearLane Sahayak, an independent decision-support assistant. I'm not Parivahan, not the Bengaluru Traffic Police, and not an official government service. I only help explore the supplied parking-violation dataset.",
      [],
      [{ label: "Status", value: "Independent tool — not an official service" }],
      BASE_QUESTIONS,
    );
  }

  // --- Intents -------------------------------------------------------------

  // Why is this zone critical?
  if (has(message, "why") && (has(message, "critical", "this zone", "this junction", "high risk", "risky") || selected)) {
    const detail = selected ? getHotspotDetail(selected.id) : null;
    if (!detail) {
      return reply(
        "why-critical",
        "Select a zone on the map first, then ask again and I'll explain exactly what's driving its risk index.",
        [],
        [],
        ["Which zones have the highest risk?", "Explain the risk methodology."],
      );
    }
    const top = [...detail.factors].sort((a, b) => b.weighted - a.weighted).slice(0, 3);
    return reply(
      "why-critical",
      detail.explanation,
      top.map(
        (f) => `${f.label}: ${f.value}/100 (weight ${Math.round(f.weight * 100)}%) — ${f.description}`,
      ),
      [
        { label: "Risk index", value: `${detail.riskIndex}/100 (${detail.riskLevel})`, basis: "calculated" },
        { label: "Records here", value: `${detail.recordCount.toLocaleString()} (${detail.shareOfAllRecords}% of all)`, basis: "observed" },
        { label: "Suggested window", value: detail.recommendedWindow.label, basis: "calculated" },
      ],
      ["What is the best enforcement window?", "Generate a patrol plan for two units.", "What are the system limitations?"],
    );
  }

  // Highest-risk zones
  if (has(message, "highest", "top", "most risk", "most critical", "worst", "priority zones", "riskiest") || (has(message, "which") && has(message, "risk", "zones", "junction"))) {
    const top = getHotspots().slice(0, 5);
    return reply(
      "highest-risk-zones",
      `The five highest parking-congestion-risk junctions in the supplied data are led by ${top[0]?.name ?? "—"} (index ${top[0]?.riskIndex ?? "—"}). Risk is the ${METRIC_NAME}, estimated from violation patterns — not a live measurement.`,
      top.map(
        (h, i) => `${i + 1}. ${h.name} — index ${h.riskIndex} (${h.riskLevel}); busiest ${h.recommendedWindow.label}; ${h.recordCount.toLocaleString()} records`,
      ),
      [
        { label: "Metric", value: METRIC_NAME, basis: "calculated" },
        { label: "Dataset", value: `${summary.source.recordCount.toLocaleString()} records, ${summary.coverage.namedJunctions} named junctions`, basis: "observed" },
      ],
      ["Why is this zone critical?", "Generate a patrol plan for two units.", "What data is this based on?"],
    );
  }

  // Best enforcement window
  if (has(message, "window", "best time", "when should", "what time", "enforcement window", "peak hour", "busiest")) {
    if (selected) {
      const d = getHotspotDetail(selected.id);
      if (d) {
        return reply(
          "best-window",
          `For ${d.name}, the busiest 3-hour window in the supplied data is ${d.recommendedWindow.label}, capturing about ${Math.round(d.recommendedWindow.shareOfDay * 100)}% of its recorded violations. That's the suggested enforcement window. Peak single hour: ${String(d.peakHourIST).padStart(2, "0")}:00.`,
          [],
          [
            { label: "Suggested window", value: d.recommendedWindow.label, basis: "calculated" },
            { label: "Peak hour", value: `${String(d.peakHourIST).padStart(2, "0")}:00`, basis: "observed" },
          ],
          ["Why is this zone critical?", "Generate a patrol plan for two units."],
        );
      }
    }
    const { start, end } = bestContiguous(summary.hourlyRecordCountsIST.map((h) => h.count), 3);
    const label = `${String(start).padStart(2, "0")}:00–${String(end).padStart(2, "0")}:00`;
    const top = getHotspots().slice(0, 3);
    return reply(
      "best-window",
      `Across the whole city, recorded violations cluster most heavily around ${label}. Per-zone windows differ — for example ${top.map((h) => `${h.name} (${h.recommendedWindow.label})`).join(", ")}. Select a zone for its specific window.`,
      top.map((h) => `${h.name}: busiest ${h.recommendedWindow.label}`),
      [{ label: "City-wide busy window", value: label, basis: "observed" }],
      ["Which zones have the highest risk?", "Generate a patrol plan for two units."],
    );
  }

  // Forecast / prediction
  if (has(message, "forecast", "predict", "next shift", "expected", "how many", "tomorrow", "upcoming")) {
    const forecast = buildForecast(currentHourIST(), null, 4);
    const top = forecast.zones;
    return reply(
      "forecast",
      `For the ${forecast.shift.label} shift, the demand model expects the most violations at ${top[0]?.name ?? "—"} (≈${top[0]?.predictedPerDay ?? 0}/day). Predictions come from a harmonic-regression model fitted to the record and validated out-of-sample (cross-validated R² ${forecast.model.cvR2}), scaled by a weekday factor of ×${forecast.weekdayFactor}.`,
      top.map(
        (z) => `${z.name}: ≈${z.predictedPerDay}/day (95% CI ${z.predictedLower}–${z.predictedUpper}), ${z.confidence} confidence`,
      ),
      [
        { label: "Model", value: `Harmonic regression, cross-validated R² ${forecast.model.cvR2}`, basis: "forecast" },
        { label: "Shift", value: forecast.shift.label, basis: "forecast" },
      ],
      ["Generate a patrol plan for two units.", "Explain the risk methodology.", "What are the system limitations?"],
    );
  }

  // Patrol plan
  if (has(message, "patrol", "plan", "deploy", "route", "allocate", "assign units", "schedule")) {
    const units = detectUnitCount(message);
    const { start } = bestContiguous(summary.hourlyRecordCountsIST.map((h) => h.count), 6);
    const end = (start + 6) % 24;
    const plan = buildPlan({
      shiftStartHour: start,
      shiftEndHour: end,
      patrolUnits: units,
      maxZonesPerUnit: 2,
    });
    const bullets = plan.units.flatMap((u) => [
      `${u.label}: ${u.zones.map((z) => `${z.name} (${z.window.label})`).join(" → ") || "no zones"}`,
    ]);
    return reply(
      "patrol-plan",
      `Here's a plan for ${units} patrol unit${units === 1 ? "" : "s"} over the ${plan.shift.label} shift (the city's busiest 6-hour band). It covers an estimated ${plan.estimatedRiskCoverage}% of the modelled in-window risk across ${plan.candidateZoneCount} candidate junctions.`,
      bullets,
      [
        { label: "Shift", value: plan.shift.label, basis: "calculated" },
        { label: "Risk coverage", value: `${plan.estimatedRiskCoverage}% of modelled in-window risk`, basis: "calculated" },
      ],
      ["Why is this zone critical?", "What are the system limitations?", "What data is this based on?"],
    );
  }

  // Data basis / provenance
  if (has(message, "what data", "based on", "data source", "dataset", "where does", "provenance", "which data")) {
    return reply(
      "data-basis",
      `Everything here is computed from one source: the ${summary.source.title}. It holds ${summary.source.recordCount.toLocaleString()} anonymised records from ${new Date(summary.source.firstRecordIST).toDateString()} to ${new Date(summary.source.lastRecordIST).toDateString()}, across ${summary.coverage.policeStations} police stations and ${summary.coverage.namedJunctions} named junctions. There are no live feeds, CCTV or speed measurements.`,
      [
        `Records: ${summary.source.recordCount.toLocaleString()}`,
        `Window: ${new Date(summary.source.firstRecordIST).toLocaleDateString()} – ${new Date(summary.source.lastRecordIST).toLocaleDateString()}`,
        `Coverage: ${summary.coverage.policeStations} stations, ${summary.coverage.namedJunctions} junctions`,
      ],
      [
        { label: "Source", value: summary.source.title, basis: "observed" },
        { label: "Statement", value: summary.source.statement },
      ],
      ["Explain the risk methodology.", "What are the system limitations?"],
    );
  }

  // Methodology
  if (has(message, "methodology", "how is", "how do", "calculate", "formula", "risk score", "risk index", "how does", "weights", "model", "accuracy")) {
    const acc = getModelAccuracy();
    return reply(
      "methodology",
      `${METRIC_NAME}: ${METRIC_EXPLANATION} Forecasts use a separate harmonic-regression demand model validated out-of-sample by leave-one-hour-out cross-validation (cross-validated R² ${acc.cvR2}, vs in-sample fit ${acc.cityWideR2}, across ${acc.junctionsModelled} junctions).`,
      [
        `Violation frequency — weight ${Math.round(RISK_WEIGHTS.frequency * 100)}%`,
        `Obstruction severity — weight ${Math.round(RISK_WEIGHTS.severity * 100)}%`,
        `Recurrence — weight ${Math.round(RISK_WEIGHTS.recurrence * 100)}%`,
        `Junction proximity — weight ${Math.round(RISK_WEIGHTS.proximity * 100)}%`,
        `Time-of-day concentration — weight ${Math.round(RISK_WEIGHTS.concentration * 100)}%`,
      ],
      [
        { label: "Risk metric", value: METRIC_NAME, basis: "calculated" },
        { label: "Forecast model", value: `Harmonic regression, cross-validated R² ${acc.cvR2}`, basis: "forecast" },
      ],
      ["Which zones have the highest risk?", "What is the forecast for the next shift?", "What are the system limitations?"],
    );
  }

  // Limitations
  if (has(message, "limitation", "caveat", "weakness", "cannot", "can't do", "bias", "drawback", "responsible", "trust")) {
    return reply(
      "limitations",
      "Honest limitations:",
      [
        "It measures recorded violations, not actual traffic speed, occupancy or travel time.",
        "Recording patterns reflect past enforcement, so well-patrolled areas can look busier.",
        "The data window is ~5 months (Nov 2023–Apr 2024); it is not real-time and has no CCTV or live feeds.",
        "About half of all records have no named junction and are excluded from the map.",
        "Forecasts are model estimates from historical patterns, not guarantees.",
      ],
      [{ label: "Status", value: "Independent tool — not an official deployed system" }],
      ["What data is this based on?", "Explain the risk methodology."],
    );
  }

  // Fallback / help
  return reply(
    "help",
    "I'm ClearLane Sahayak. I can help you read the supplied parking-violation data — highest-risk zones, why a zone is critical, the best enforcement window, a patrol plan, the risk methodology, and the system's limitations. Try one of these:",
    [],
    [{ label: "Scope", value: "Dashboard & dataset questions only" }],
    [
      "Which zones have the highest risk?",
      "Why is this zone critical?",
      "What is the best enforcement window?",
      "Generate a patrol plan for two units.",
      "What data is this recommendation based on?",
      "Explain the risk methodology.",
      "What are the system limitations?",
    ],
  );
}
