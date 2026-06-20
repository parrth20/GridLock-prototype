import { json, badRequest, serverError } from "@/lib/server/http";
import {
  clearActiveSummary,
  getDatasetMode,
  getSummary,
  hasActiveDataset,
  loadBundledOfficialSummary,
  setActiveSummary,
} from "@/lib/server/data-source";
import { resetRiskCache } from "@/lib/server/risk-engine";
import { resetModelCache, getModelAccuracy } from "@/lib/server/ml-model";
import { buildSummaryFromCsv, CsvIngestError, REQUIRED_COLUMNS } from "@/lib/server/csv-ingest";

export const dynamic = "force-dynamic";

const MAX_BYTES = 150 * 1024 * 1024; // 150 MB

function meta() {
  const s = getSummary();
  // getModelAccuracy() also warms the refit model on the (possibly new) data.
  const acc = getModelAccuracy();
  return {
    datasetMode: getDatasetMode(),
    usingUploaded: hasActiveDataset(),
    source: s.source.title,
    recordCount: s.source.recordCount,
    policeStations: s.coverage.policeStations,
    namedJunctions: s.coverage.namedJunctions,
    firstRecordIST: s.source.firstRecordIST,
    lastRecordIST: s.source.lastRecordIST,
    model: { cityWideR2: acc.cityWideR2, meanMape: acc.meanMape, junctionsModelled: acc.junctionsModelled },
    requiredColumns: REQUIRED_COLUMNS,
  };
}

export async function GET(): Promise<Response> {
  try {
    return json(meta());
  } catch {
    return serverError("Failed to read dataset");
  }
}

export async function POST(request: Request): Promise<Response> {
  let csvText: string | null = null;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!file || typeof file === "string") {
        return badRequest("Attach a CSV file in the 'file' field.");
      }
      if (file.size > MAX_BYTES) {
        return badRequest("File is too large (max 150 MB).");
      }
      csvText = await file.text();
    } else {
      csvText = await request.text();
    }
  } catch {
    return badRequest("Could not read the uploaded file.");
  }

  if (!csvText || csvText.trim().length === 0) {
    return badRequest("The uploaded file is empty.");
  }

  let summary;
  try {
    summary = buildSummaryFromCsv(csvText);
  } catch (e) {
    if (e instanceof CsvIngestError) return badRequest(e.message);
    return serverError("Failed to process the CSV.");
  }

  try {
    setActiveSummary(summary);
    resetRiskCache();
    resetModelCache();
    return json({ ok: true, message: "Dataset updated. Models refitted.", ...meta() });
  } catch {
    return serverError("Failed to save the new dataset.");
  }
}

// Connect the bundled real Bengaluru dataset (no upload needed).
export async function PUT(): Promise<Response> {
  try {
    const bundled = loadBundledOfficialSummary();
    if (!bundled) return badRequest("The Bengaluru dataset isn't available in this build.");
    setActiveSummary(bundled);
    resetRiskCache();
    resetModelCache();
    return json({ ok: true, message: "Connected the Bengaluru dataset.", ...meta() });
  } catch {
    return serverError("Failed to connect the dataset.");
  }
}

export async function DELETE(): Promise<Response> {
  try {
    clearActiveSummary();
    resetRiskCache();
    resetModelCache();
    return json({ ok: true, message: "Disconnected — back to the demo sample.", ...meta() });
  } catch {
    return serverError("Failed to reset the dataset.");
  }
}
