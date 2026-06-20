"use client";

import { useEffect, useState } from "react";
import { fetchHealth, fetchHotspots } from "@/lib/api-client";
import type { HealthResponse, Hotspot } from "@/lib/types";

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

// Module-level caches so the map, the intelligence panel and the assistant
// share a single fetch instead of each hitting the API.
let hotspotsPromise: Promise<Hotspot[]> | null = null;
let healthPromise: Promise<HealthResponse> | null = null;

function loadHotspots(): Promise<Hotspot[]> {
  if (!hotspotsPromise) {
    hotspotsPromise = fetchHotspots({ pageSize: 200, page: 1 })
      .then((r) => r.hotspots)
      .catch((e) => {
        hotspotsPromise = null; // allow retry on next mount
        throw e;
      });
  }
  return hotspotsPromise;
}

function loadHealth(): Promise<HealthResponse> {
  if (!healthPromise) {
    healthPromise = fetchHealth().catch((e) => {
      healthPromise = null;
      throw e;
    });
  }
  return healthPromise;
}

export function useHotspots(): AsyncState<Hotspot[]> {
  const [state, setState] = useState<AsyncState<Hotspot[]>>({
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;
    loadHotspots()
      .then((data) => active && setState({ data, error: null, loading: false }))
      .catch((e: Error) => active && setState({ data: null, error: e.message, loading: false }));
    return () => {
      active = false;
    };
  }, []);

  return state;
}

export function useHealth(): AsyncState<HealthResponse> {
  const [state, setState] = useState<AsyncState<HealthResponse>>({
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;
    loadHealth()
      .then((data) => active && setState({ data, error: null, loading: false }))
      .catch((e: Error) => active && setState({ data: null, error: e.message, loading: false }));
    return () => {
      active = false;
    };
  }, []);

  return state;
}
