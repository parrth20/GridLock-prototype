import { json, validationError, badRequest, serverError } from "@/lib/server/http";
import { answerAssistant } from "@/lib/server/assistant-engine";
import { assistantSchema, safeParse } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  const parsed = safeParse(assistantSchema, raw);
  if (!parsed.ok) return validationError(parsed.issues);

  try {
    const response = answerAssistant({
      message: parsed.value.message,
      selectedHotspotId: parsed.value.selectedHotspotId,
      filters: parsed.value.filters,
    });
    return json(response);
  } catch {
    return serverError("Assistant failed to respond");
  }
}
