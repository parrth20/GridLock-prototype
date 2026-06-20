// Typed browser-side fetchers for the ClearLane API routes.
// Frontend components call these instead of importing data directly.

import type {
  AssistantResponse,
  EnforcementPlanResponse,
  ForecastResponse,
  HealthResponse,
  HotspotDetail,
  HotspotFilters,
  HotspotListResponse,
} from "@/lib/types";

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, headers: { accept: "application/json" } });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

async function postJson<T>(url: string, payload: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return getJson<HealthResponse>("/api/health", signal);
}

export interface HotspotQuery extends Partial<HotspotFilters> {
  page?: number;
  pageSize?: number;
}

export function fetchHotspots(
  query: HotspotQuery = {},
  signal?: AbortSignal,
): Promise<HotspotListResponse> {
  const params = new URLSearchParams();
  if (query.station) params.set("station", query.station);
  if (query.riskLevel) params.set("riskLevel", query.riskLevel);
  if (query.hour !== undefined && query.hour !== null) params.set("hour", String(query.hour));
  if (query.violationType) params.set("violationType", query.violationType);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  const qs = params.toString();
  return getJson<HotspotListResponse>(`/api/hotspots${qs ? `?${qs}` : ""}`, signal);
}

export function fetchHotspot(
  id: string,
  signal?: AbortSignal,
): Promise<{ hotspot: HotspotDetail }> {
  return getJson<{ hotspot: HotspotDetail }>(`/api/hotspots/${encodeURIComponent(id)}`, signal);
}

export interface ForecastQuery {
  hour?: number;
  shift?: "late-night" | "morning" | "afternoon" | "evening";
  limit?: number;
}

export function fetchForecast(
  query: ForecastQuery = {},
  signal?: AbortSignal,
): Promise<ForecastResponse> {
  const params = new URLSearchParams();
  if (query.hour !== undefined) params.set("hour", String(query.hour));
  if (query.shift) params.set("shift", query.shift);
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  return getJson<ForecastResponse>(`/api/forecast${qs ? `?${qs}` : ""}`, signal);
}

export interface EnforcementPlanInput {
  shiftStartHour: number;
  shiftEndHour: number;
  patrolUnits: number;
  maxZonesPerUnit: number;
}

export function postEnforcementPlan(
  input: EnforcementPlanInput,
  signal?: AbortSignal,
): Promise<EnforcementPlanResponse> {
  return postJson<EnforcementPlanResponse>("/api/enforcement-plan", input, signal);
}

export interface AssistantInput {
  message: string;
  selectedHotspotId?: string | null;
  filters?: { station?: string | null; riskLevel?: string | null; hour?: number | null };
}

export interface DatasetMeta {
  datasetMode: string;
  usingUploaded: boolean;
  source: string;
  recordCount: number;
  policeStations: number;
  namedJunctions: number;
  firstRecordIST: string;
  lastRecordIST: string;
  model: { cityWideR2: number; meanMape: number; junctionsModelled: number };
  requiredColumns: string[];
}

export function fetchDatasetMeta(signal?: AbortSignal): Promise<DatasetMeta> {
  return getJson<DatasetMeta>("/api/dataset", signal);
}

export async function uploadDataset(file: File): Promise<DatasetMeta & { message: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/dataset", { method: "POST", body: form });
  if (!res.ok) {
    let message = `Upload failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as DatasetMeta & { message: string };
}

export async function resetDataset(): Promise<DatasetMeta & { message: string }> {
  const res = await fetch("/api/dataset", { method: "DELETE" });
  if (!res.ok) throw new Error(`Reset failed (${res.status})`);
  return (await res.json()) as DatasetMeta & { message: string };
}

export async function connectBengaluruDataset(): Promise<DatasetMeta & { message: string }> {
  const res = await fetch("/api/dataset", { method: "PUT" });
  if (!res.ok) throw new Error(`Connect failed (${res.status})`);
  return (await res.json()) as DatasetMeta & { message: string };
}

export function postAssistant(
  input: AssistantInput,
  signal?: AbortSignal,
): Promise<AssistantResponse> {
  const payload: Record<string, unknown> = { message: input.message };
  if (input.selectedHotspotId) payload.selectedHotspotId = input.selectedHotspotId;
  if (input.filters) {
    const f: Record<string, unknown> = {};
    if (input.filters.station) f.station = input.filters.station;
    if (input.filters.riskLevel) f.riskLevel = input.filters.riskLevel;
    if (input.filters.hour !== undefined && input.filters.hour !== null) f.hour = input.filters.hour;
    if (Object.keys(f).length) payload.filters = f;
  }
  return postJson<AssistantResponse>("/api/assistant", payload, signal);
}
