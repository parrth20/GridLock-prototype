import { json, validationError, serverError } from "@/lib/server/http";
import { currentHourIST } from "@/lib/server/data-source";
import { buildForecast, getShiftById } from "@/lib/server/forecast-engine";
import { forecastQuerySchema, parseQuery } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const parsed = parseQuery(forecastQuerySchema, url.searchParams);
    if (!parsed.ok) return validationError(parsed.issues);
    const { hour, shift, limit } = parsed.value;

    const referenceHour = hour ?? currentHourIST();
    const shiftOverride = getShiftById(shift);
    const body = buildForecast(referenceHour, shiftOverride, limit);
    return json(body);
  } catch {
    return serverError("Failed to build forecast");
  }
}
