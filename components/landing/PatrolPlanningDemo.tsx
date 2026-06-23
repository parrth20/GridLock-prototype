"use client";

import { useState } from "react";
import { Loader2, Route, Wand2 } from "lucide-react";
import { postEnforcementPlan } from "@/lib/api-client";
import type { EnforcementPlanResponse, RiskLevel } from "@/lib/types";
import { PatrolUnitIcon, TowVehicleIcon, TrafficPoliceIcon } from "@/components/icons/CivicIcons";

const RISK_COLOR: Record<RiskLevel, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  moderate: "#22d3ee",
  low: "#10b981",
};

export function PatrolPlanningDemo() {
  const [units, setUnits] = useState(2);
  const [maxZones, setMaxZones] = useState(2);
  const [start, setStart] = useState(8);
  const [end, setEnd] = useState(14);
  const [plan, setPlan] = useState<EnforcementPlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const result = await postEnforcementPlan({
        shiftStartHour: start,
        shiftEndHour: end,
        patrolUnits: units,
        maxZonesPerUnit: maxZones,
      });
      setPlan(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative overflow-hidden border-y border-slate-800 bg-[#0a0e16] py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mb-12">
          <p className="cl-kicker mb-3 text-cyan-300">Patrol planning, live</p>
          <h2 className="cl-display max-w-2xl text-4xl text-white sm:text-5xl">
            Turn a shift into a deployment in one click.
          </h2>
          <p className="mt-4 max-w-xl text-slate-400">
            Set how many units you have and your shift hours. It ranks every junction for that
            window and sends each unit to the worst parking trouble-spots — try it right here.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* Controls */}
          <div className="cl-card rounded-2xl p-6">
            <div className="space-y-5">
              <Field label={`How many units: ${units}`}>
                <input type="range" min={1} max={6} value={units} onChange={(e) => setUnits(+e.target.value)} className="w-full accent-cyan-400" />
              </Field>
              <Field label={`Stops per unit: ${maxZones}`}>
                <input type="range" min={1} max={5} value={maxZones} onChange={(e) => setMaxZones(+e.target.value)} className="w-full accent-cyan-400" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={`Shift starts: ${fmtHour(start)}`}>
                  <input type="number" min={0} max={23} value={start} onChange={(e) => setStart(Math.max(0, Math.min(23, +e.target.value)))} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
                </Field>
                <Field label={`Shift ends: ${fmtHour(end)}`}>
                  <input type="number" min={0} max={24} value={end} onChange={(e) => setEnd(Math.max(0, Math.min(24, +e.target.value)))} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
                </Field>
              </div>
              <button
                type="button"
                onClick={generate}
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {loading ? "Planning…" : "Generate patrol plan"}
              </button>
              <div className="pt-2">
                <p className="mb-2 text-center text-[10px] uppercase tracking-wide text-slate-600">Who you&rsquo;re deploying</p>
                <div className="flex items-center justify-around text-slate-500">
                  <div className="flex flex-col items-center gap-1"><TrafficPoliceIcon size={24} /><span className="text-[9px] text-slate-600">Officers</span></div>
                  <div className="flex flex-col items-center gap-1"><PatrolUnitIcon size={24} /><span className="text-[9px] text-slate-600">Patrol bikes</span></div>
                  <div className="flex flex-col items-center gap-1"><TowVehicleIcon size={24} /><span className="text-[9px] text-slate-600">Tow units</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Output */}
          <div className="cl-card min-h-[320px] rounded-2xl p-6">
            {!plan && !error && !loading && (
              <div className="grid h-full place-items-center text-center text-sm text-slate-500">
                <p>Set your units and shift hours, then generate a plan.</p>
              </div>
            )}
            {loading && (
              <div className="grid h-full place-items-center text-sm text-slate-500">
                <p className="animate-pulse">Ranking junctions for the shift…</p>
              </div>
            )}
            {error && (
              <div className="grid h-full place-items-center text-center text-sm text-red-300">
                <p>{error}</p>
              </div>
            )}
            {plan && !loading && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <p className="text-sm font-bold text-white">Shift {plan.shift.label}</p>
                    <p className="text-xs text-slate-500">{plan.candidateZoneCount} junctions checked</p>
                  </div>
                  <div className="text-right">
                    <p className="cl-display text-3xl text-cyan-300">{plan.units.reduce((n, u) => n + u.zones.length, 0)}</p>
                    <p className="text-[11px] text-slate-500">worst spots picked for this shift</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {plan.units.map((unit) => (
                    <div key={unit.unit} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                      <p className="flex items-center gap-2 text-sm font-semibold text-white">
                        <Route className="h-4 w-4 text-cyan-300" /> {unit.label}
                      </p>
                      <ol className="mt-3 space-y-2">
                        {unit.zones.length === 0 && (
                          <li className="text-xs text-slate-500">No stops assigned.</li>
                        )}
                        {unit.zones.map((z) => (
                          <li key={z.hotspotId} className="flex items-center justify-between gap-2 text-xs">
                            <span className="flex items-center gap-2 text-slate-200">
                              <span className="h-2 w-2 rounded-full" style={{ background: RISK_COLOR[z.riskLevel] }} />
                              {z.order}. {z.name}
                            </span>
                            <span className="font-mono text-cyan-300">{z.window.label}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>

                <p className="mt-4 rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-xs leading-relaxed text-slate-400">
                  {plan.explanation}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Friendly hour label, e.g. 8 → "8 AM", 14 → "2 PM". */
function fmtHour(h: number): string {
  const hh = ((h % 24) + 24) % 24;
  const ampm = hh < 12 ? "AM" : "PM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12} ${ampm}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-400">{label}</span>
      {children}
    </label>
  );
}
