import { json, notFound, serverError } from "@/lib/server/http";
import { getDatasetMode, nowIST } from "@/lib/server/data-source";
import { getHotspotDetail } from "@/lib/server/risk-engine";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await context.params;
    const detail = getHotspotDetail(id);
    if (!detail) return notFound(`No hotspot with id "${id}"`);
    return json({
      datasetMode: getDatasetMode(),
      generatedAtIST: nowIST(),
      hotspot: detail,
    });
  } catch {
    return serverError("Failed to load hotspot");
  }
}
