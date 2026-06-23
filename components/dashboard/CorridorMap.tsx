"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { loadLeaflet, DARK_TILES } from "@/lib/leaflet-loader";
import { RISK_HEX } from "@/lib/risk-ui";
import type { Hotspot } from "@/lib/types";
import type { Place } from "@/lib/places";

interface Props {
  route: [number, number][];
  bottlenecks: Hotspot[];
  origin: Place | null;
  dest: Place | null;
}

export function CorridorMap({ route, bottlenecks, origin, dest }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const groupRef = useRef<any>(null);
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
          map.setView([12.9716, 77.5946], 11);
          L.tileLayer(DARK_TILES.url, DARK_TILES.options).addTo(map);
          groupRef.current = L.layerGroup().addTo(map);
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

  // Redraw whenever the corridor changes.
  useEffect(() => {
    const L = (window as any).L;
    const map = mapRef.current;
    const group = groupRef.current;
    if (!L || !map || !group) return;
    try {
      group.clearLayers();
      const bounds: [number, number][] = [];

      if (route.length > 1) {
        L.polyline(route, { color: "#38d6ee", weight: 5, opacity: 0.85 }).addTo(group);
        route.forEach((p) => bounds.push(p));
      }

      bottlenecks.forEach((h, i) => {
        const color = RISK_HEX[h.riskLevel];
        L.circleMarker([h.latitude, h.longitude], {
          radius: 8,
          color,
          weight: 2,
          fillColor: color,
          fillOpacity: 0.85,
        })
          .addTo(group)
          .bindPopup(
            `<div style="font:13px/1.4 system-ui;min-width:150px"><b>${i + 1}. ${h.name}</b><br/>` +
              `<span style="color:${color}">Index ${h.riskIndex} · ${h.riskLevel}</span><br/>` +
              `<span style="color:#64748b">Peak ${h.recommendedWindow.label}</span></div>`,
          );
        bounds.push([h.latitude, h.longitude]);
      });

      const endpoint = (p: Place, color: string, label: string) => {
        L.circleMarker([p.lat, p.lng], {
          radius: 7,
          color: "#0b0f17",
          weight: 2,
          fillColor: color,
          fillOpacity: 1,
        })
          .addTo(group)
          .bindTooltip(`${label}: ${p.name}`, { direction: "top", offset: [0, -6] });
        bounds.push([p.lat, p.lng]);
      };
      if (origin) endpoint(origin, "#34d399", "Start");
      if (dest) endpoint(dest, "#f472b6", "Hospital");

      if (bounds.length) map.fitBounds(bounds, { padding: [45, 45] });
    } catch {
      /* leaflet edge case — keep the existing view */
    }
  }, [route, bottlenecks, origin, dest, ready]);

  useEffect(() => {
    const onResize = () => mapRef.current?.invalidateSize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="relative h-full w-full bg-[#06080d]">
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
    </div>
  );
}
