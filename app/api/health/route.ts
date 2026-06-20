import { json, serverError } from "@/lib/server/http";
import {
  getDatasetMode,
  getSummary,
  isUsingSuppliedData,
  nowIST,
} from "@/lib/server/data-source";
import { METRIC_EXPLANATION, METRIC_NAME } from "@/lib/server/risk-engine";
import { getModelAccuracy } from "@/lib/server/ml-model";
import type { HealthResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const summary = getSummary();
    const body: HealthResponse = {
      status: "ok",
      service: "clearlane-bengaluru",
      datasetMode: getDatasetMode(),
      usingSuppliedData: isUsingSuppliedData(),
      runtimeLabel: "Decision support",
      dataset: {
        recordCount: summary.source.recordCount,
        policeStations: summary.coverage.policeStations,
        namedJunctions: summary.coverage.namedJunctions,
        firstRecordIST: summary.source.firstRecordIST,
        lastRecordIST: summary.source.lastRecordIST,
        source: summary.source.title,
      },
      metric: { name: METRIC_NAME, explanation: METRIC_EXPLANATION },
      model: (() => {
        const a = getModelAccuracy();
        return {
          method: a.method,
          harmonics: a.harmonics,
          junctionsModelled: a.junctionsModelled,
          weightedR2: a.weightedR2,
          meanMape: a.meanMape,
          cityWideR2: a.cityWideR2,
        };
      })(),
      generatedAtIST: nowIST(),
    };
    return json(body);
  } catch {
    return serverError("Failed to read dataset");
  }
}
