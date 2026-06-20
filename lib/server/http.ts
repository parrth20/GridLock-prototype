// Small helpers for consistent JSON responses and validation errors.

import type { Issue } from "@/lib/server/schemas";

export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init?.headers ?? {}),
    },
  });
}

export function validationError(issues: Issue[]): Response {
  return json(
    {
      error: "validation_error",
      message: "One or more parameters are invalid.",
      issues,
    },
    { status: 400 },
  );
}

export function notFound(message = "Not found"): Response {
  return json({ error: "not_found", message }, { status: 404 });
}

export function serverError(message = "Unexpected error"): Response {
  return json({ error: "server_error", message }, { status: 500 });
}

export function badRequest(message: string): Response {
  return json({ error: "bad_request", message }, { status: 400 });
}
