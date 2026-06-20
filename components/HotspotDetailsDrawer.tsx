"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock, Loader2, MapPin, Plus, X } from "lucide-react";
import { useDashboardStore } from "@/lib/store";
import { fetchHotspot } from "@/lib/api-client";
import type { HotspotDetail } from "@/lib/types";
import { RiskGauge } from "./RiskGauge";

export function HotspotDetailsDrawer() {
  const selected = useDashboardStore((s) => s.selectedHotspot);
  const show = useDashboardStore((s) => s.showDetailsDrawer);
  const setShow = useDashboardStore((s) => s.setShowDetailsDrawer);
  const reduceMotion = useDashboardStore((s) => s.prefersReducedMotion);
  const patrolPlan = useDashboardStore((s) => s.patrolPlan);
  const addToPatrolPlan = useDashboardStore((s) => s.addToPatrolPlan);

  const [detail, setDetail] = useState<HotspotDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!show || !selected) return;
    let active = true;
    setLoading(true);
    setError(null);
    setDetail(null);
    fetchHotspot(selected.id)
      .then((r) => active && setDetail(r.hotspot))
      .catch((e: Error) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [show, selected]);

  const inPlan = selected ? patrolPlan.some((h) => h.id === selected.id) : false;
  const maxHour = detail ? Math.max(1, ...detail.hourlyRecordCounts) : 1;

  return (
    <AnimatePresence>
      {show && selected && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShow(false)}
          />
          <motion.div
            className="cl-scroll fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l border-slate-800 bg-[#0d121c] shadow-2xl"
            initial={reduceMotion ? false : { x: 440 }}
            animate={reduceMotion ? undefined : { x: 0 }}
            exit={reduceMotion ? undefined : { x: 440 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-800 bg-[#0d121c]/95 p-5 backdrop-blur">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5" /> {selected.policeStation} station
                </p>
                <h2 className="mt-1 truncate text-lg font-bold text-white">{selected.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setShow(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                aria-label="Close details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-5">
              {/* Risk gauge + window */}
              <div className="flex items-center gap-4">
                <RiskGauge score={selected.riskIndex} label="Risk index" size="md" />
                <div className="space-y-2 text-sm">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
                    <p className="flex items-center gap-1.5 text-xs text-slate-500"><Clock className="h-3.5 w-3.5" /> Suggested window</p>
                    <p className="font-semibold text-cyan-300">{selected.recommendedWindow.label}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
                    <p className="text-xs text-slate-500">Records (observed)</p>
                    <p className="font-semibold text-white">{selected.recordCount.toLocaleString()} · {selected.shareOfAllRecords}% of all</p>
                  </div>
                </div>
              </div>

              {/* Add to patrol plan */}
              <button
                type="button"
                disabled={inPlan}
                onClick={() => addToPatrolPlan(selected)}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  inPlan
                    ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                }`}
              >
                {inPlan ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {inPlan ? "Added to patrol plan" : "Add to patrol plan"}
              </button>

              {loading && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading explanation…
                </div>
              )}
              {error && <p className="text-sm text-red-300">{error}</p>}

              {detail && (
                <>
                  {/* Plain-language explanation */}
                  <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">Why this zone?</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-200">{detail.explanation}</p>
                  </div>

                  {/* Factor breakdown */}
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white">Risk factors</h3>
                      <span className="rounded border border-amber-400/30 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-amber-300">calculated</span>
                    </div>
                    <div className="mt-3 space-y-3">
                      {detail.factors.map((f) => (
                        <div key={f.key}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-300">{f.label}</span>
                            <span className="font-mono text-xs text-slate-500">{f.value} × {Math.round(f.weight * 100)}%</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                            <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-sky-500" style={{ width: `${f.value}%` }} />
                          </div>
                          <p className="mt-1 text-xs text-slate-500">{f.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hourly profile */}
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white">When violations were recorded</h3>
                      <span className="rounded border border-cyan-400/30 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-cyan-300">observed</span>
                    </div>
                    <div className="mt-3 flex h-20 items-end gap-0.5">
                      {detail.hourlyRecordCounts.map((c, hr) => {
                        const inWindow =
                          hr >= selected.recommendedWindow.startHour &&
                          hr < (selected.recommendedWindow.startHour + 3);
                        return (
                          <div
                            key={hr}
                            className={`flex-1 rounded-sm ${inWindow ? "bg-cyan-400" : "bg-slate-700"}`}
                            style={{ height: `${Math.max(2, (c / maxHour) * 100)}%` }}
                            title={`${String(hr).padStart(2, "0")}:00 — ${c.toLocaleString()} records`}
                          />
                        );
                      })}
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-slate-600">
                      <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span>
                    </div>
                  </div>

                  {/* Top violations / vehicles (observed) */}
                  <div className="grid grid-cols-2 gap-3">
                    <ObservedList title="Top violations" rows={detail.topViolationTypes.slice(0, 4)} />
                    <ObservedList title="Top vehicles" rows={detail.topVehicleTypes.slice(0, 4)} />
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ObservedList({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
      <p className="text-xs font-semibold text-white">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-2 text-[11px]">
            <span className="truncate text-slate-400">{r.label}</span>
            <span className="shrink-0 font-mono text-slate-300">{r.count.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
