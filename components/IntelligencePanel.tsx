"use client";

import { useMemo } from "react";
import { AlertTriangle, ArrowUpRight, Gauge, MapPin } from "lucide-react";
import { useDashboardStore } from "@/lib/store";
import { useHotspots } from "@/lib/hooks";
import type { Hotspot } from "@/lib/types";
import { RISK_HEX, riskTint } from "@/lib/risk-ui";

function BasisBadge({ basis }: { basis: "observed" | "calculated" | "forecast" }) {
  const map = {
    observed: "border-cyan-400/30 text-cyan-300",
    calculated: "border-amber-400/30 text-amber-300",
    forecast: "border-violet-400/30 text-violet-300",
  } as const;
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${map[basis]}`}>
      {basis}
    </span>
  );
}

export function IntelligencePanel() {
  const { data: hotspots, loading } = useHotspots();
  const selectHotspot = useDashboardStore((s) => s.selectHotspot);
  const selectedId = useDashboardStore((s) => s.selectedHotspot?.id ?? null);

  const stats = useMemo(() => {
    if (!hotspots || hotspots.length === 0) return null;
    const avgIndex = Math.round(hotspots.reduce((s, h) => s + h.riskIndex, 0) / hotspots.length);
    const critical = hotspots.filter((h) => h.riskLevel === "critical").length;
    const totalRecords = hotspots.reduce((s, h) => s + h.recordCount, 0);
    return { avgIndex, critical, totalRecords, count: hotspots.length };
  }, [hotspots]);

  const top: Hotspot[] = useMemo(() => (hotspots ? hotspots.slice(0, 6) : []), [hotspots]);
  const maxRecords = top[0]?.recordCount ?? 1;

  return (
    <aside className="cl-scroll hidden w-[22rem] shrink-0 overflow-y-auto border-l border-slate-800/80 bg-gradient-to-b from-[#0a0e16] to-[#070a11] xl:block">
      <div className="space-y-7 p-5">
        {/* Header */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/80">Control room</p>
          <h2 className="mt-1 text-lg font-bold text-white">Shift overview</h2>
        </div>

        {/* Stat cards */}
        {loading || !stats ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`h-24 animate-pulse rounded-2xl bg-slate-800/40 ${i === 2 ? "col-span-2" : ""}`} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Gauge className="h-4 w-4" />}
              accent="#38d6ee"
              value={stats.avgIndex}
              label="Average risk"
            />
            <StatCard
              icon={<AlertTriangle className="h-4 w-4" />}
              accent="#fb5d5d"
              value={stats.critical}
              label="Hotspots to watch"
            />
            <div className="cl-tile col-span-2 overflow-hidden rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">Violations on the map</p>
                <BasisBadge basis="observed" />
              </div>
              <div className="mt-1 flex items-end gap-2">
                <p className="text-3xl font-bold tracking-tight text-white">{stats.totalRecords.toLocaleString()}</p>
                <p className="pb-1 text-xs text-slate-500">across {stats.count} spots</p>
              </div>
              <div className="mt-3 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
                {top.map((h) => (
                  <div
                    key={h.id}
                    style={{ flex: h.recordCount, background: RISK_HEX[h.riskLevel] }}
                    className="opacity-80"
                  />
                ))}
                <div style={{ flex: 6 }} className="bg-slate-700/60" />
              </div>
            </div>
          </div>
        )}

        {/* Do this now */}
        {top.length > 0 && (
          <div className="cl-accent overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/[0.08] to-transparent p-4" style={{ ["--accent" as string]: "#38d6ee" }}>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
              <p className="text-sm font-bold text-white">Do this now</p>
            </div>
            <ol className="mt-3 space-y-1">
              {top.slice(0, 3).map((h, i) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => selectHotspot(h)}
                    className="group flex w-full items-center gap-3 rounded-lg px-1.5 py-1.5 text-left transition hover:bg-white/[0.04]"
                  >
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-cyan-400 text-[10px] font-bold text-slate-950">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 text-xs leading-snug text-slate-300">
                      Send a patrol to <span className="font-semibold text-white">{h.name}</span>
                      <span className="block text-[11px] text-slate-500">around {h.recommendedWindow.label}</span>
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-600 transition group-hover:text-cyan-300" />
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Top risk zones */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Top risk zones</h3>
            <BasisBadge basis="calculated" />
          </div>
          <div className="space-y-2">
            {loading &&
              [0, 1, 2, 3].map((i) => <div key={i} className="h-[4.5rem] animate-pulse rounded-xl bg-slate-800/40" />)}
            {top.map((h, i) => {
              const active = selectedId === h.id;
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => selectHotspot(h)}
                  className={`cl-accent group w-full overflow-hidden rounded-xl p-3 pl-4 text-left transition ${
                    active ? "bg-white/[0.06] ring-1 ring-cyan-400/40" : "bg-white/[0.02] hover:bg-white/[0.05]"
                  }`}
                  style={{ ["--accent" as string]: RISK_HEX[h.riskLevel] }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
                        <span className="text-slate-500">{i + 1}.</span> {h.name}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500">
                        <MapPin className="h-3 w-3" /> {h.policeStation} · {h.recommendedWindow.label}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-xl font-bold leading-none text-white">{h.riskIndex}</span>
                      <span
                        className="mt-1 block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                        style={{ color: RISK_HEX[h.riskLevel], background: riskTint(h.riskLevel, 0.14) }}
                      >
                        {h.riskLevel}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-slate-800/80">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(h.recordCount / maxRecords) * 100}%`, background: RISK_HEX[h.riskLevel] }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="rounded-xl border border-slate-800/80 bg-white/[0.015] p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">What the tags mean</p>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-400">
            <li className="flex items-center gap-2"><BasisBadge basis="observed" /> straight from the data</li>
            <li className="flex items-center gap-2"><BasisBadge basis="calculated" /> we worked it out</li>
            <li className="flex items-center gap-2"><BasisBadge basis="forecast" /> we predict it</li>
          </ul>
        </div>
      </div>
    </aside>
  );
}

function StatCard({
  icon,
  accent,
  value,
  label,
}: {
  icon: React.ReactNode;
  accent: string;
  value: number;
  label: string;
}) {
  return (
    <div className="cl-tile relative overflow-hidden rounded-2xl p-4">
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ color: accent, background: `${accent}1f` }}>
        {icon}
      </span>
      <p className="mt-3 text-3xl font-bold tracking-tight text-white">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
