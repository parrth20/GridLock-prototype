import { json, validationError, badRequest, serverError } from "@/lib/server/http";
import { buildPlan } from "@/lib/server/planner";
import { enforcementPlanSchema, safeParse } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  const parsed = safeParse(enforcementPlanSchema, raw);
  if (!parsed.ok) return validationError(parsed.issues);

  try {
    const plan = buildPlan({
      shiftStartHour: parsed.value.shiftStartHour,
      shiftEndHour: parsed.value.shiftEndHour,
      patrolUnits: parsed.value.patrolUnits,
      maxZonesPerUnit: parsed.value.maxZonesPerUnit,
    });
    return json(plan);
  } catch {
    return serverError("Failed to build enforcement plan");
  }
}
