"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import type { PatrolUnitPlan } from "@/lib/types";
import { loadLeaflet, DARK_TILES } from "@/lib/leaflet-loader";

const UNIT_COLORS = ["#22d3ee", "#a78bfa", "#f7a93b", "#34d399", "#fb7185", "#60a5fa"];

export function PatrolRouteMap({ units }: { units: PatrolUnitPlan[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current, { zoomControl: true });
        mapRef.current = map;
        L.tileLayer(DARK_TILES.url, DARK_TILES.options).addTo(map);

        const all: [number, number][] = [];
        units.forEach((unit, i) => {
          const color = UNIT_COLORS[i % UNIT_COLORS.length];
          const pts = unit.zones.map((z) => [z.latitude, z.longitude] as [number, number]);
          if (pts.length >= 2) {
            L.polyline(pts, { color, weight: 3, opacity: 0.85 }).addTo(map);
          }
          unit.zones.forEach((z) => {
            all.push([z.latitude, z.longitude]);
            const marker = L.marker([z.latitude, z.longitude], {
              icon: L.divIcon({
                className: "",
                html: `<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${color};color:#06080d;font:700 12px system-ui;border:2px solid #06080d;box-shadow:0 0 0 1px ${color}">${z.order}</div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12],
              }),
            }).addTo(map);
            marker.bindPopup(
              `<div style="font:13px/1.4 system-ui;min-width:150px"><b>${unit.label}</b> · stop ${z.order}<br/>${z.name}<br/><span style="color:${color}">${z.window.label}</span></div>`,
            );
          });
        });

        if (all.length) map.fitBounds(all, { padding: [40, 40] });
        else map.setView([12.9716, 77.5946], 12);
        setReady(true);
        setTimeout(() => map.invalidateSize(), 200);
      })
      .catch(() => setError("Couldn't load the route map."));

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [units]);

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
            <Loader2 className="h-4 w-4 animate-spin" /> Loading routes…
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
      <div className="absolute right-3 top-3 z-[400] flex flex-col gap-1 rounded-lg bg-slate-950/75 p-2 text-[10px]">
        {units.map((u, i) => (
          <span key={u.unit} className="inline-flex items-center gap-1.5 text-slate-200">
            <span className="h-2 w-2 rounded-full" style={{ background: UNIT_COLORS[i % UNIT_COLORS.length] }} /> {u.label}
          </span>
        ))}
      </div>
    </div>
  );
}
