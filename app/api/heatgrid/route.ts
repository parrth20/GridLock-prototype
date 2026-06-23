import { json, serverError } from "@/lib/server/http";
import { getSummary, nowIST } from "@/lib/server/data-source";

export const dynamic = "force-dynamic";

// Top junctions with their observed 24-hour violation profile, for the
// junction × hour heat-grid. These are observed counts straight from the
// aggregates — no modelling.
export async function GET(): Promise<Response> {
  try {
    const summary = getSummary();
    const junctions = [...summary.junctions]
      .sort((a, b) => b.recordCount - a.recordCount)
      .slice(0, 24)
      .map((j) => ({
        name: j.name,
        recordCount: j.recordCount,
        peakHourIST: j.peakRecordedHourIST,
        hourly: Array.isArray(j.hourlyRecordCounts) ? j.hourlyRecordCounts.slice(0, 24) : [],
      }));
    return json({ basis: "observed-hourly-counts", junctions, generatedAtIST: nowIST() });
  } catch {
    return serverError("Failed to build the heat grid");
  }
}
