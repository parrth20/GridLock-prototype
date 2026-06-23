"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Ambulance, ArrowRight, Loader2, MapPin, Plus, TriangleAlert } from "lucide-react";
import { useHotspots } from "@/lib/hooks";
import { useDashboardStore } from "@/lib/store";
import { routeRoad, lineDistanceKm } from "@/lib/routing";
import { loadTurf } from "@/lib/cdn-loaders";
import { HOSPITALS, ORIGINS, type Place } from "@/lib/places";
import { RISK_HEX } from "@/lib/risk-ui";
import type { Hotspot } from "@/lib/types";

const CorridorMap = dynamic(
  () => import("@/components/dashboard/CorridorMap").then((m) => m.CorridorMap),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full place-items-center bg-[#06080d] text-sm text-slate-500">Loading map…</div>
    ),
  },
);

const BUFFER_KM = 0.6; // a junction within 600 m of the route can choke the lane

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function GreenCorridorView() {
  const { data: hotspots } = useHotspots();
  const selectHotspot = useDashboardStore((s) => s.selectHotspot);
  const addToPatrolPlan = useDashboardStore((s) => s.addToPatrolPlan);

  const [originId, setOriginId] = useState(ORIGINS[1].id); // Silk Board
  const [destId, setDestId] = useState(HOSPITALS[0].id); // Jayadeva Cardiology
  const [route, setRoute] = useState<[number, number][]>([]);
  const [bottlenecks, setBottlenecks] = useState<Hotspot[]>([]);
  const [origin, setOrigin] = useState<Place | null>(null);
  const [dest, setDest] = useState<Place | null>(null);
  const [distanceKm, setDistanceKm] = useState(0);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);

  async function findCorridor() {
    const o = ORIGINS.find((p) => p.id === originId);
    const d = HOSPITALS.find((p) => p.id === destId);
    if (!o || !d) return;
    setLoading(true);
    try {
      const line = await routeRoad([o, d]);

      // Distance of each junction to the route line (Turf if available,
      // nearest route vertex otherwise).
      let turf: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
      try {
        turf = await loadTurf();
      } catch {
        turf = null;
      }
      const lngLat = line.map(([la, ln]) => [ln, la]);

      const near = (hotspots ?? [])
        .map((h) => {
          let distKm = Infinity;
          if (turf && lngLat.length > 1) {
            try {
              distKm = turf.pointToLineDistance(turf.point([h.longitude, h.latitude]), turf.lineString(lngLat), {
                units: "kilometers",
              });
            } catch {
              distKm = Infinity;
            }
          }
          if (!Number.isFinite(distKm)) {
            distKm = Math.min(...line.map(([la, ln]) => haversineKm(h.latitude, h.longitude, la, ln)));
          }
          return { h, distKm };
        })
        .filter((x) => x.distKm <= BUFFER_KM)
        .sort((a, b) => b.h.riskIndex - a.h.riskIndex)
        .slice(0, 8)
        .map((x) => x.h);

      setRoute(line);
      setBottlenecks(near);
      setOrigin(o);
      setDest(d);
      setDistanceKm(lineDistanceKm(line));
      setRan(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="cl-scroll h-full overflow-y-auto bg-[#06080d] p-5 sm:p-7">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
            <Ambulance className="h-3.5 w-3.5" /> Emergency lane
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Green Corridor planner</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-400">
            Traffic police clear a continuous &ldquo;green corridor&rdquo; for ambulances and organ-transport runs.
            Roadside parking that chokes a junction is what breaks it. Pick a route to a hospital and see which
            parking-obstruction junctions along it are the likely bottlenecks to keep clear.
          </p>
        </header>

        {/* Controls */}
        <div className="cl-tile rounded-2xl p-5">
          <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto_1fr_auto]">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-400">Start from</span>
              <select
                value={originId}
                onChange={(e) => setOriginId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              >
                {ORIGINS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <ArrowRight className="mb-2.5 hidden h-4 w-4 text-slate-600 sm:block" />
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-400">Hospital</span>
              <select
                value={destId}
                onChange={(e) => setDestId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              >
                {HOSPITALS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={findCorridor}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ambulance className="h-4 w-4" />}
              {loading ? "Routing…" : "Find corridor"}
            </button>
          </div>
          <p className="mt-3 text-[11px] text-slate-600">
            Approximate landmark coordinates · road path from OSRM (a suggested route, not live traffic).
          </p>
        </div>

        {ran && (
          <>
            <div className="h-80 overflow-hidden rounded-2xl border border-slate-800">
              <CorridorMap route={route} bottlenecks={bottlenecks} origin={origin} dest={dest} />
            </div>

            <div className="cl-tile flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl p-4 text-sm">
              <span className="text-slate-300">
                <span className="font-bold text-white">{distanceKm.toFixed(1)} km</span> corridor
              </span>
              <span className="text-slate-300">
                <span className="font-bold text-white">{bottlenecks.length}</span> parking-obstruction bottleneck
                {bottlenecks.length === 1 ? "" : "s"} within {Math.round(BUFFER_KM * 1000)} m
              </span>
            </div>

            {bottlenecks.length === 0 ? (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-200">
                <MapPin className="h-4 w-4" /> No high-risk parking junctions sit on this route in the dataset — this corridor is relatively clear.
              </div>
            ) : (
              <div className="space-y-2.5">
                {bottlenecks.map((h, i) => (
                  <div
                    key={h.id}
                    className="cl-accent cl-tile flex items-center gap-3 rounded-2xl p-3.5 pl-4"
                    style={{ ["--accent" as string]: RISK_HEX[h.riskLevel] }}
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-800 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <button onClick={() => selectHotspot(h)} className="truncate text-sm font-semibold text-white hover:text-cyan-300">
                        {h.name}
                      </button>
                      <p className="text-[11px] text-slate-500">
                        Index {h.riskIndex} · {h.riskLevel} · busiest {h.recommendedWindow.label} · keep clear / pre-position a unit
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addToPatrolPlan(h)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
                    >
                      <Plus className="h-3.5 w-3.5" /> Patrol
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-start gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-[11px] leading-relaxed text-slate-500">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400/70" />
              <span>
                Decision-support only. Bottlenecks are ranked by the historical parking-obstruction risk index near the
                route — not live ambulance tracking, vehicle telemetry, or an official emergency dispatch service.
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
