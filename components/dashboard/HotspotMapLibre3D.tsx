"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { loadMapLibre } from "@/lib/cdn-loaders";
import { RISK_HEX } from "@/lib/risk-ui";
import type { Hotspot, RiskLevel } from "@/lib/types";

interface Props {
  className?: string;
  hotspots: Hotspot[];
  selectedId: string | null;
  onSelect: (h: Hotspot) => void;
  focusNonce?: number;
  reduceMotion?: boolean;
  onFail?: () => void; // called when WebGL/MapLibre can't render → parent shows 2D
}

/** Quick WebGL availability probe (Brave fingerprint protection often blocks it). */
function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(
      (window as any).WebGLRenderingContext &&
      (c.getContext("webgl") || c.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

// Inline MapLibre style on OpenStreetMap raster tiles. OSM sends CORS headers
// (Access-Control-Allow-Origin: *), which WebGL needs to use tiles as GPU
// textures — CARTO's raster endpoint does not, which is why it rendered black.
// We darken the tiles with raster paint so they fit the dark theme. No API key.
const RASTER_STYLE: any = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#0a0e16" } },
    {
      id: "osm",
      type: "raster",
      source: "osm",
      paint: {
        "raster-brightness-max": 0.55,
        "raster-saturation": -0.35,
        "raster-contrast": 0.12,
        "raster-opacity": 0.92,
      },
    },
  ],
};

/** A small circular footprint (polygon ring) around a point, in metres. */
function ring(lng: number, lat: number, radiusM: number, steps = 22): number[][][] {
  const coords: number[][] = [];
  const dLat = radiusM / 111320;
  const dLng = radiusM / (111320 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    coords.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return [coords];
}

function buildFC(hotspots: Hotspot[]) {
  return {
    type: "FeatureCollection",
    features: hotspots.map((h) => ({
      type: "Feature",
      properties: {
        id: h.id,
        name: h.name,
        riskIndex: h.riskIndex,
        height: 120 + h.riskIndex * 22, // taller column = higher risk
        color: RISK_HEX[h.riskLevel as RiskLevel],
      },
      geometry: { type: "Polygon", coordinates: ring(h.longitude, h.latitude, 45) },
    })),
  };
}

export function HotspotMapLibre3D({
  className,
  hotspots,
  selectedId,
  onSelect,
  focusNonce,
  reduceMotion,
  onFail,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const hotspotsRef = useRef<Hotspot[]>(hotspots);
  const onSelectRef = useRef(onSelect);
  const onFailRef = useRef(onFail);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hotspotsRef.current = hotspots;
    onSelectRef.current = onSelect;
    onFailRef.current = onFail;
  }, [hotspots, onSelect, onFail]);

  // Build the map once.
  useEffect(() => {
    let cancelled = false;
    let loadFired = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // No WebGL (e.g. Brave fingerprint protection) → tell the parent to use 2D.
    if (!hasWebGL()) {
      onFailRef.current?.();
      return;
    }

    loadMapLibre()
      .then((maplibregl) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        try {
          const map = new maplibregl.Map({
            container: containerRef.current,
            style: RASTER_STYLE,
            center: [77.5946, 12.9716],
            zoom: 11.3,
            pitch: 55,
            bearing: -18,
            maxPitch: 70,
            attributionControl: true,
          });
          mapRef.current = map;
          map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

          // If the map hasn't painted in a few seconds, fall back to 2D.
          timers.push(
            setTimeout(() => {
              if (!cancelled && !loadFired) onFailRef.current?.();
            }, 4500),
          );

          const addTowers = () => {
            try {
              if (map.getSource("cl-hotspots")) return;
              map.addSource("cl-hotspots", { type: "geojson", data: buildFC(hotspotsRef.current) } as any);
              map.addLayer({
                id: "cl-hotspot-towers",
                source: "cl-hotspots",
                type: "fill-extrusion",
                paint: {
                  "fill-extrusion-color": ["get", "color"],
                  "fill-extrusion-height": ["get", "height"],
                  "fill-extrusion-base": 0,
                  "fill-extrusion-opacity": 0.92,
                },
              });
              map.on("click", "cl-hotspot-towers", (e: any) => {
                const f = e.features?.[0];
                if (!f) return;
                const h = hotspotsRef.current.find((x) => x.id === f.properties.id);
                if (h) onSelectRef.current(h);
              });
              map.on("mouseenter", "cl-hotspot-towers", () => {
                map.getCanvas().style.cursor = "pointer";
              });
              map.on("mouseleave", "cl-hotspot-towers", () => {
                map.getCanvas().style.cursor = "";
              });
            } catch {
              /* ignore */
            }
          };

          map.on("load", () => {
            loadFired = true;
            addTowers();
            map.resize();
            if (!cancelled) setReady(true);
          });
          // Belt-and-suspenders: make sure the canvas is sized to the panel.
          requestAnimationFrame(() => mapRef.current?.resize());
          timers.push(setTimeout(() => mapRef.current?.resize(), 350));
          timers.push(setTimeout(() => mapRef.current?.resize(), 1200));
          map.on("error", () => {
            /* individual tile errors are non-fatal */
          });
        } catch {
          onFailRef.current?.(); // WebGL context creation failed → use 2D
        }
      })
      .catch(() => onFailRef.current?.());

    // Never leave the spinner up forever.
    timers.push(
      setTimeout(() => {
        if (!cancelled) setReady(true);
      }, 6000),
    );

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {
          /* ignore */
        }
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh the towers if the hotspot set changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource("cl-hotspots");
    if (src && src.setData) {
      try {
        src.setData(buildFC(hotspots));
      } catch {
        /* ignore */
      }
    }
  }, [hotspots, ready]);

  // Fly the camera to the selected junction.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !selectedId) return;
    const h = hotspots.find((x) => x.id === selectedId);
    if (!h) return;
    const opts: any = { center: [h.longitude, h.latitude], zoom: 15, pitch: 60, essential: true };
    try {
      if (reduceMotion) map.jumpTo(opts);
      else map.flyTo({ ...opts, duration: 1200 });
    } catch {
      /* ignore */
    }
  }, [selectedId, focusNonce, ready, reduceMotion, hotspots]);

  // Keep the canvas sized to its container.
  useEffect(() => {
    const onResize = () => mapRef.current?.resize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className={`relative ${className ?? "h-full w-full"} bg-[#06080d]`}>
      <div ref={containerRef} className="absolute inset-0" />

      {!ready && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-[#06080d]">
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading 3D map…
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-[5] flex flex-wrap gap-2 text-[10px]">
        {(["critical", "high", "moderate", "low"] as RiskLevel[]).map((lvl) => (
          <span key={lvl} className="inline-flex items-center gap-1 rounded-full bg-slate-950/75 px-2 py-1 text-slate-300">
            <span className="h-2 w-2 rounded-full" style={{ background: RISK_HEX[lvl] }} /> {lvl}
          </span>
        ))}
        <span className="rounded-full bg-slate-950/75 px-2 py-1 text-slate-400">tower height = risk</span>
      </div>
    </div>
  );
}
