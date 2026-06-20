import { json, validationError, serverError } from "@/lib/server/http";
import { getDatasetMode, getSummary, nowIST } from "@/lib/server/data-source";
import { getHotspots } from "@/lib/server/risk-engine";
import { hotspotsQuerySchema, parseQuery } from "@/lib/server/schemas";
import type { Hotspot, HotspotListResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const parsed = parseQuery(hotspotsQuerySchema, url.searchParams);
    if (!parsed.ok) return validationError(parsed.issues);
    const { station, riskLevel, hour, violationType, page, pageSize } = parsed.value;

    const summary = getSummary();
    const junctionById = new Map(summary.junctions.map((j) => [j.id, j]));

    let hotspots: Hotspot[] = getHotspots();

    if (station) {
      const needle = station.toLowerCase();
      hotspots = hotspots.filter((h) => h.policeStation.toLowerCase() === needle);
    }
    if (riskLevel) {
      hotspots = hotspots.filter((h) => h.riskLevel === riskLevel);
    }
    if (hour !== undefined) {
      hotspots = hotspots.filter((h) => {
        const j = junctionById.get(h.id);
        return (j?.hourlyRecordCounts[hour] ?? 0) > 0;
      });
    }
    if (violationType) {
      const needle = violationType.toLowerCase();
      hotspots = hotspots.filter((h) => {
        const j = junctionById.get(h.id);
        return j?.topViolationTypes.some((v) =>
          v.label.toLowerCase().includes(needle),
        );
      });
    }

    const total = hotspots.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const pageItems = hotspots.slice(start, start + pageSize);

    const body: HotspotListResponse = {
      datasetMode: getDatasetMode(),
      generatedAtIST: nowIST(),
      filters: {
        station: station ?? null,
        riskLevel: riskLevel ?? null,
        hour: hour ?? null,
        violationType: violationType ?? null,
      },
      pagination: { page: safePage, pageSize, total, totalPages },
      hotspots: pageItems,
    };
    return json(body);
  } catch {
    return serverError("Failed to compute hotspots");
  }
}
