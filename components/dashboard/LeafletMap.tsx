"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react";
import { Flame, Loader2, TriangleAlert } from "lucide-react";
import type { Hotspot, RiskLevel } from "@/lib/types";
import { RISK_HEX } from "@/lib/risk-ui";

// Leaflet is loaded from a CDN at runtime — no npm dependency, nothing to bundle.
let leafletPromise: Promise<any> | null = null;
function loadLeaflet(): Promise<any> {
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if ((window as any).L) return resolve((window as any).L);

    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);

    const js = document.createElement("script");
    js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    js.async = true;
    js.onload = () => {
      // Optional heatmap plugin — if it fails the markers still work.
      const heat = document.createElement("script");
      heat.src = "https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js";
      heat.async = true;
      heat.onload = () => resolve((window as any).L);
      heat.onerror = () => resolve((window as any).L);
      document.body.appendChild(heat);
    };
    js.onerror = () => reject(new Error("Failed to load Leaflet"));
    document.body.appendChild(js);
  });
  return leafletPromise;
}

interface Props {
  hotspots: Hotspot[];
  selectedId: string | null;
  onSelect: (h: Hotspot) => void;
  reduceMotion?: boolean;
}

export function LeafletMap({ hotspots, selectedId, onSelect, reduceMotion }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const heatRef = useRef<any>(null);
  const colorById = useRef<Map<string, string>>(new Map());

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHeat, setShowHeat] = useState(true);

  // Build the map once.
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true });
        mapRef.current = map;

        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          attribution: "© OpenStreetMap contributors © CARTO",
          subdomains: "abcd",
          maxZoom: 19,
        }).addTo(map);

        const latlngs: [number, number][] = [];
        hotspots.forEach((h) => {
          const color = RISK_HEX[h.riskLevel as RiskLevel];
          colorById.current.set(h.id, color);
          const marker = L.circleMarker([h.latitude, h.longitude], {
            radius: 5 + h.riskIndex / 11,
            color,
            weight: 1.5,
            fillColor: color,
            fillOpacity: 0.55,
          }).addTo(map);
          marker.bindPopup(
            `<div style="font:13px/1.4 system-ui;min-width:160px">
               <b>${h.name}</b><br/>
               <span style="color:${color}">Index ${h.riskIndex} · ${h.riskLevel}</span><br/>
               <span style="color:#64748b">Busiest ${h.recommendedWindow.label}</span>
             </div>`,
          );
          marker.on("click", () => onSelect(h));
          markersRef.current.set(h.id, marker);
          latlngs.push([h.latitude, h.longitude]);
        });

        if (latlngs.length) map.fitBounds(latlngs, { padding: [40, 40] });
        else map.setView([12.9716, 77.5946], 12);

        if (L.heatLayer && hotspots.length) {
          const maxIdx = Math.max(1, ...hotspots.map((h) => h.riskIndex));
          const points = hotspots.map((h) => [h.latitude, h.longitude, h.riskIndex / maxIdx]);
          heatRef.current = L.heatLayer(points, {
            radius: 30,
            blur: 22,
            maxZoom: 14,
            minOpacity: 0.35,
            gradient: { 0.2: "#22d3ee", 0.5: "#f7a93b", 0.85: "#fb5d5d" },
          });
          heatRef.current.addTo(map);
        }

        setReady(true);
        setTimeout(() => map.invalidateSize(), 200);
      })
      .catch(() => setError("Couldn't load the map (check your connection)."));

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current.clear();
      heatRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotspots]);

  // Toggle the heatmap layer.
  useEffect(() => {
    const map = mapRef.current;
    const heat = heatRef.current;
    if (!map || !heat) return;
    if (showHeat) heat.addTo(map);
    else map.removeLayer(heat);
  }, [showHeat, ready]);

  // Highlight + fly to the selected junction.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m, id) => {
      const color = colorById.current.get(id) ?? "#22d3ee";
      const isSel = id === selectedId;
      m.setStyle({
        weight: isSel ? 3.5 : 1.5,
        color: isSel ? "#ffffff" : color,
        fillOpacity: isSel ? 0.9 : 0.55,
        radius: isSel ? 11 : m.options.radius,
      });
      if (isSel) m.bringToFront();
    });
    if (!selectedId) return;
    const sel = markersRef.current.get(selectedId);
    if (sel) {
      const ll = sel.getLatLng();
      const zoom = Math.max(map.getZoom() ?? 13, 15);
      if (reduceMotion) map.setView(ll, zoom);
      else map.flyTo(ll, zoom, { duration: 0.8 });
      sel.openPopup();
    }
  }, [selectedId, ready, reduceMotion]);

  // Keep the map sized correctly when the panel resizes.
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
        <div className="absolute inset-0 z-10 grid place-items-center bg-[#06080d] p-6 text-center">
          <div className="max-w-xs">
            <TriangleAlert className="mx-auto h-7 w-7 text-amber-400" />
            <p className="mt-3 text-sm text-slate-300">{error}</p>
          </div>
        </div>
      )}

      {/* Heatmap toggle */}
      <button
        type="button"
        onClick={() => setShowHeat((v) => !v)}
        className={`absolute right-3 top-3 z-[400] inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium backdrop-blur transition ${
          showHeat
            ? "border-amber-400/50 bg-amber-400/15 text-amber-200"
            : "border-slate-700 bg-slate-950/70 text-slate-300 hover:text-white"
        }`}
      >
        <Flame className="h-3.5 w-3.5" /> Heatmap {showHeat ? "on" : "off"}
      </button>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[400] flex flex-wrap gap-2 text-[10px]">
        {(["critical", "high", "moderate", "low"] as RiskLevel[]).map((lvl) => (
          <span key={lvl} className="inline-flex items-center gap-1 rounded-full bg-slate-950/75 px-2 py-1 text-slate-300">
            <span className="h-2 w-2 rounded-full" style={{ background: RISK_HEX[lvl] }} /> {lvl}
          </span>
        ))}
      </div>
    </div>
  );
}
