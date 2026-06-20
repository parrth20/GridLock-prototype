// Request validation.
//
// The project has no network access to install dependencies, so rather than a
// broken `import "zod"` this is a tiny, dependency-free, Zod-style validator:
// composable parsers with coercion, bounds, defaults and structured issues.
// Each parser returns a discriminated result so route handlers can produce
// meaningful 400 responses.

import type { RiskLevel } from "@/lib/types";

export interface Issue {
  path: string;
  message: string;
}
export type ParseOk<T> = { ok: true; value: T };
export type ParseErr = { ok: false; issues: Issue[] };
export type ParseResult<T> = ParseOk<T> | ParseErr;
export type Parser<T> = (value: unknown, path: string) => ParseResult<T>;

const ok = <T>(value: T): ParseOk<T> => ({ ok: true, value });
const err = (path: string, message: string): ParseErr => ({
  ok: false,
  issues: [{ path, message }],
});

export function string(opts: { min?: number; max?: number } = {}): Parser<string> {
  return (value, path) => {
    if (typeof value !== "string") return err(path, "Expected a string");
    if (opts.min !== undefined && value.length < opts.min)
      return err(path, `Must be at least ${opts.min} characters`);
    if (opts.max !== undefined && value.length > opts.max)
      return err(path, `Must be at most ${opts.max} characters`);
    return ok(value);
  };
}

export function number(
  opts: { int?: boolean; min?: number; max?: number } = {},
): Parser<number> {
  return (value, path) => {
    const n =
      typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : typeof value === "number"
          ? value
          : NaN;
    if (!Number.isFinite(n)) return err(path, "Expected a number");
    if (opts.int && !Number.isInteger(n)) return err(path, "Expected an integer");
    if (opts.min !== undefined && n < opts.min)
      return err(path, `Must be >= ${opts.min}`);
    if (opts.max !== undefined && n > opts.max)
      return err(path, `Must be <= ${opts.max}`);
    return ok(n);
  };
}

export function enumOf<const T extends readonly string[]>(
  values: T,
): Parser<T[number]> {
  return (value, path) => {
    if (typeof value === "string" && (values as readonly string[]).includes(value))
      return ok(value as T[number]);
    return err(path, `Expected one of: ${values.join(", ")}`);
  };
}

export function optional<T>(parser: Parser<T>): Parser<T | undefined> {
  return (value, path) => {
    if (value === undefined || value === null || value === "")
      return ok(undefined);
    return parser(value, path);
  };
}

export function withDefault<T>(parser: Parser<T>, fallback: T): Parser<T> {
  return (value, path) => {
    if (value === undefined || value === null || value === "")
      return ok(fallback);
    return parser(value, path);
  };
}

type Shape = Record<string, Parser<unknown>>;
type Infer<S extends Shape> = { [K in keyof S]: S[K] extends Parser<infer T> ? T : never };

export function object<S extends Shape>(shape: S): Parser<Infer<S>> {
  return (value, path) => {
    if (typeof value !== "object" || value === null)
      return err(path || "body", "Expected an object");
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    const issues: Issue[] = [];
    for (const key of Object.keys(shape)) {
      const childPath = path ? `${path}.${key}` : key;
      const result = shape[key](record[key], childPath);
      if (result.ok) out[key] = result.value;
      else issues.push(...result.issues);
    }
    if (issues.length) return { ok: false, issues };
    return ok(out as Infer<S>);
  };
}

export function safeParse<T>(parser: Parser<T>, value: unknown): ParseResult<T> {
  return parser(value, "");
}

/** Read & validate URLSearchParams against an object schema. */
export function parseQuery<S extends Shape>(
  shape: S,
  searchParams: URLSearchParams,
): ParseResult<Infer<S>> {
  const raw: Record<string, string> = {};
  searchParams.forEach((v, k) => {
    raw[k] = v;
  });
  return safeParse(object(shape), raw);
}

// ---------------------------------------------------------------------------
// Concrete schemas
// ---------------------------------------------------------------------------

const RISK_LEVELS = ["critical", "high", "moderate", "low"] as const;

export const hotspotsQuerySchema = {
  station: optional(string({ max: 80 })),
  riskLevel: optional(enumOf(RISK_LEVELS)),
  hour: optional(number({ int: true, min: 0, max: 23 })),
  violationType: optional(string({ max: 80 })),
  page: withDefault(number({ int: true, min: 1, max: 1000 }), 1),
  pageSize: withDefault(number({ int: true, min: 1, max: 200 }), 20),
};

export const forecastQuerySchema = {
  hour: optional(number({ int: true, min: 0, max: 23 })),
  shift: optional(enumOf(["late-night", "morning", "afternoon", "evening"] as const)),
  limit: withDefault(number({ int: true, min: 1, max: 50 }), 12),
};

export const enforcementPlanSchema = object({
  shiftStartHour: number({ int: true, min: 0, max: 23 }),
  shiftEndHour: number({ int: true, min: 0, max: 24 }),
  patrolUnits: number({ int: true, min: 1, max: 12 }),
  maxZonesPerUnit: number({ int: true, min: 1, max: 10 }),
});

export const assistantSchema = object({
  message: string({ min: 1, max: 500 }),
  selectedHotspotId: optional(string({ max: 80 })),
  filters: optional(
    object({
      station: optional(string({ max: 80 })),
      riskLevel: optional(enumOf(RISK_LEVELS)),
      hour: optional(number({ int: true, min: 0, max: 23 })),
    }),
  ),
});

export type RiskLevelValue = RiskLevel;
