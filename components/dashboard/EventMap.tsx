"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { loadLeaflet, DARK_TILES } from "@/lib/leaflet-loader";

interface Props {
  lat: number;
  lng: number;
  name: string;
  radiusM: number;
  context?: [number, number][]; // faint dots of other junctions for context
}

export function EventMap({ lat, lng, name, radiusM, context = [] }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const ringRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build once.
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        try {
          const map = L.map(containerRef.current, { zoomControl: true });
          mapRef.current = map;
          L.tileLayer(DARK_TILES.url, DARK_TILES.options).addTo(map);
          context.forEach(([la, ln]) => {
            if (Number.isFinite(la) && Number.isFinite(ln)) {
              L.circleMarker([la, ln], { radius: 2.5, weight: 0, fillColor: "#475569", fillOpacity: 0.5 }).addTo(map);
            }
          });
          setReady(true);
          setTimeout(() => {
            try {
              map.invalidateSize();
            } catch {
              /* ignore */
            }
          }, 200);
        } catch {
          setError("Couldn't load the map.");
        }
      })
      .catch(() => setError("Couldn't load the map."));
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Move the marker + cordon ring when the junction or size changes.
  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    if (!L || !map || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    try {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      if (ringRef.current) {
        map.removeLayer(ringRef.current);
        ringRef.current = null;
      }
      ringRef.current = L.circle([lat, lng], {
        radius: radiusM,
        color: "#f7a93b",
        weight: 2,
        fillColor: "#f7a93b",
        fillOpacity: 0.12,
      }).addTo(map);
      markerRef.current = L.circleMarker([lat, lng], {
        radius: 7,
        color: "#22d3ee",
        weight: 2,
        fillColor: "#22d3ee",
        fillOpacity: 0.85,
      }).addTo(map);
      markerRef.current.bindPopup(
        `<div style="font:13px/1.4 system-ui"><b>${name}</b><br/><span style="color:#f7a93b">Suggested cordon ~${radiusM} m</span></div>`,
      );
      map.fitBounds(ringRef.current.getBounds(), { padding: [30, 30] });
    } catch {
      /* leaflet edge case — keep the existing view */
    }
  }, [lat, lng, radiusM, name, ready]);

  useEffect(() => {
    const onResize = () => mapRef.current?.invalidateSize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0 z-0" />
      {!ready && !error && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-[#06080d]">
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading map…
          </p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-[#06080d] p-4 text-center">
          <p className="flex items-center gap-2 text-sm text-slate-400">
            <TriangleAlert className="h-4 w-4 text-amber-400" /> {error}
          </p>
        </div>
      )}
      <div className="absolute right-3 top-3 z-[400] rounded-lg bg-slate-950/75 px-2.5 py-1.5 text-[10px] text-slate-300">
        Suggested cordon · ~{radiusM} m
      </div>
    </div>
  );
}
