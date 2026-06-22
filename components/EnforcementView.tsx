"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ExternalLink, FileDown, Loader2, Mic, Radio, Route, Square, Trash2, TriangleAlert, Wand2, X } from "lucide-react";
import { postEnforcementPlan } from "@/lib/api-client";
import { useDashboardStore } from "@/lib/store";
import type { EnforcementPlanResponse, PatrolUnitPlan } from "@/lib/types";
import { RISK_HEX } from "@/lib/risk-ui";
import { dispatch, speak, startRecording, stopRecording, playClip, ZELLO_CHANNEL_URL } from "@/lib/dispatch";
import { downloadPatrolBrief } from "@/lib/patrol-brief";

/** Shift length in hours, handling shifts that wrap past midnight. */
function shiftLength(startHour: number, endHour: number): number {
  const d = endHour - startHour;
  return d > 0 ? d : 24 + d;
}

const PatrolRouteMap = dynamic(
  () => import("@/components/dashboard/PatrolRouteMap").then((m) => m.PatrolRouteMap),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full place-items-center bg-[#06080d] text-sm text-slate-500">
        Loading routes…
      </div>
    ),
  },
);

function CoverageRing({ pct }: { pct: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const off = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <svg width={76} height={76} viewBox="0 0 76 76" className="shrink-0">
      <circle cx={38} cy={38} r={r} fill="none" stroke="#1c2533" strokeWidth={6} />
      <circle
        cx={38}
        cy={38}
        r={r}
        fill="none"
        stroke="#38d6ee"
        strokeWidth={6}
        strokeDasharray={c}
        strokeDashoffset={off}
        strokeLinecap="round"
        transform="rotate(-90 38 38)"
      />
      <text x={38} y={39} textAnchor="middle" dominantBaseline="middle" className="fill-white text-[16px] font-bold">
        {pct}%
      </text>
    </svg>
  );
}

export function EnforcementView() {
  const patrolPlan = useDashboardStore((s) => s.patrolPlan);
  const removeFromPatrolPlan = useDashboardStore((s) => s.removeFromPatrolPlan);
  const clearPatrolPlan = useDashboardStore((s) => s.clearPatrolPlan);
  const selectHotspot = useDashboardStore((s) => s.selectHotspot);
  const dispatchLog = useDashboardStore((s) => s.dispatchLog);
  const addDispatch = useDashboardStore((s) => s.addDispatch);
  const clearDispatchLog = useDashboardStore((s) => s.clearDispatchLog);

  const [units, setUnits] = useState(2);
  const [maxZones, setMaxZones] = useState(2);
  const [start, setStart] = useState(8);
  const [end, setEnd] = useState(14);
  const [plan, setPlan] = useState<EnforcementPlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);

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

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dispatchUnit(unit: PatrolUnitPlan) {
    if (unit.zones.length === 0) return;
    const stops = unit.zones.map((z) => `${z.name} at ${z.window.label}`).join(", then ");
    const text = `Control to ${unit.label}. Proceed to ${stops}. Over.`;
    dispatch(`Dispatch · ${unit.label}`, text);
    addDispatch({ unitLabel: unit.label, zoneName: unit.zones[0].name, text });
  }

  function dispatchAll() {
    if (!plan) return;
    plan.units.forEach((u, i) => setTimeout(() => dispatchUnit(u), i * 2600));
  }

  async function togglePTT() {
    if (recording) {
      const url = await stopRecording();
      setRecording(false);
      if (url) {
        addDispatch({ unitLabel: "Voice memo", zoneName: "Broadcast", text: "Recorded voice memo", audioUrl: url });
        playClip(url);
      }
    } else {
      setRecError(null);
      const ok = await startRecording();
      if (ok) setRecording(true);
      else setRecError("Microphone unavailable or blocked.");
    }
  }

  return (
    <div className="cl-scroll h-full overflow-y-auto bg-[#06080d] p-5 sm:p-7">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/80">Deploy smart</p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Patrol planning</h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Rank junctions for a shift and split them across units. Coverage is a share
            of modelled risk — not a promised congestion reduction.
          </p>
        </header>

        {/* Patrol basket */}
        <div className="cl-tile rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">
              Your patrol basket{" "}
              <span className="rounded-full bg-slate-800 px-1.5 text-xs text-slate-400">{patrolPlan.length}</span>
            </p>
            {patrolPlan.length > 0 && (
              <button onClick={clearPatrolPlan} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-300">
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>
          {patrolPlan.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              Pin zones from the map (&ldquo;Add to patrol plan&rdquo;) here. The plan below also auto-ranks the busiest zones for your shift.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {patrolPlan.map((h) => (
                <span
                  key={h.id}
                  className="cl-accent inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] py-1 pl-3 pr-1.5 text-xs text-slate-200"
                  style={{ ["--accent" as string]: RISK_HEX[h.riskLevel] }}
                >
                  <button onClick={() => selectHotspot(h)} className="hover:text-cyan-300">{h.name}</button>
                  <button onClick={() => removeFromPatrolPlan(h.id)} aria-label={`Remove ${h.name}`} className="rounded-full p-0.5 hover:bg-slate-700">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="cl-tile rounded-2xl p-5">
          <div className="grid gap-5 sm:grid-cols-4">
            <Field label={`Patrol units · ${units}`}>
              <input type="range" min={1} max={6} value={units} onChange={(e) => setUnits(+e.target.value)} className="w-full accent-cyan-400" />
            </Field>
            <Field label={`Max zones / unit · ${maxZones}`}>
              <input type="range" min={1} max={5} value={maxZones} onChange={(e) => setMaxZones(+e.target.value)} className="w-full accent-cyan-400" />
            </Field>
            <Field label="Shift start (hr)">
              <input type="number" min={0} max={23} value={start} onChange={(e) => setStart(Math.max(0, Math.min(23, +e.target.value)))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
            </Field>
            <Field label="Shift end (hr)">
              <input type="number" min={0} max={24} value={end} onChange={(e) => setEnd(Math.max(0, Math.min(24, +e.target.value)))} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
            </Field>
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {loading ? "Planning…" : "Generate patrol plan"}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
            <TriangleAlert className="h-4 w-4" /> {error}
          </div>
        )}

        {plan && !loading && (
          <>
            {/* Impact panel */}
            {(() => {
              const shiftLen = shiftLength(plan.shift.startHour, plan.shift.endHour);
              const officerHours = plan.patrolUnits * shiftLen;
              const stops = plan.units.reduce((n, u) => n + u.zones.length, 0);
              const perHour = officerHours > 0 ? plan.estimatedRiskCoverage / officerHours : 0;
              return (
                <div className="cl-tile overflow-hidden rounded-2xl p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-white">Shift impact · {plan.shift.label}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {plan.candidateZoneCount} candidate junctions · {plan.patrolUnits} unit{plan.patrolUnits === 1 ? "" : "s"}
                      </p>
                    </div>
                    <CoverageRing pct={plan.estimatedRiskCoverage} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Stat value={`${plan.estimatedRiskCoverage}%`} label="modelled pressure covered" />
                    <Stat value={`${stops}`} label={`of ${plan.candidateZoneCount} junctions patrolled`} />
                    <Stat value={`${officerHours}`} label="officer-hours" hint={`${plan.patrolUnits} × ${shiftLen}h`} />
                    <Stat value={`${perHour.toFixed(1)}%`} label="pressure per officer-hour" />
                  </div>

                  <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                    {plan.patrolUnits} unit{plan.patrolUnits === 1 ? "" : "s"} covering {stops} junction{stops === 1 ? "" : "s"} across their
                    peak windows reach about <span className="text-slate-300">{plan.estimatedRiskCoverage}%</span> of the modelled
                    parking-congestion pressure this shift, for roughly <span className="text-slate-300">{officerHours} officer-hours</span>.
                    Coverage is a share of modelled risk — not a promised congestion reduction.
                  </p>
                </div>
              );
            })()}

            {/* Routes on the real map */}
            <div className="h-80 overflow-hidden rounded-2xl border border-slate-800">
              <PatrolRouteMap units={plan.units} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-300">Patrol units</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => plan && downloadPatrolBrief(plan)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-400/50 hover:text-white"
                >
                  <FileDown className="h-3.5 w-3.5" /> Download brief
                </button>
                <button
                  type="button"
                  onClick={togglePTT}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    recording
                      ? "cl-blink border border-red-500/50 bg-red-500/15 text-red-200"
                      : "border border-slate-700 text-slate-300 hover:text-white"
                  }`}
                >
                  {recording ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                  {recording ? "Stop & send" : "Push to talk"}
                </button>
                <button
                  type="button"
                  onClick={dispatchAll}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-300"
                >
                  <Radio className="h-3.5 w-3.5" /> Dispatch all units
                </button>
              </div>
            </div>
            {recError && <p className="text-xs text-amber-300">{recError}</p>}

            {/* Patrol units */}
            <div className="grid gap-4 sm:grid-cols-2">
              {plan.units.map((unit) => (
                <div
                  key={unit.unit}
                  className="cl-accent cl-tile rounded-2xl p-4 pl-5"
                  style={{ ["--accent" as string]: "#38d6ee" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-cyan-400/15 text-cyan-300">
                      <Route className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-bold text-white">{unit.label}</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      {unit.zones.length} stop{unit.zones.length === 1 ? "" : "s"}
                    </span>
                    <button
                      type="button"
                      onClick={() => dispatchUnit(unit)}
                      disabled={unit.zones.length === 0}
                      className="ml-auto inline-flex items-center gap-1 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-200 transition hover:bg-cyan-400/20 disabled:opacity-40"
                    >
                      <Radio className="h-3.5 w-3.5" /> Dispatch
                    </button>
                  </div>
                  <ol className="mt-3 space-y-2.5">
                    {unit.zones.length === 0 && <li className="text-xs text-slate-500">No zones assigned.</li>}
                    {unit.zones.map((z) => (
                      <li
                        key={z.hotspotId}
                        className="cl-accent rounded-xl bg-white/[0.025] p-3 pl-3.5"
                        style={{ ["--accent" as string]: RISK_HEX[z.riskLevel] }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-white">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: RISK_HEX[z.riskLevel] }} />
                            <span className="truncate">{z.order}. {z.name}</span>
                          </span>
                          <span className="cl-time-chip shrink-0 rounded-md bg-slate-950/70 px-2 py-0.5 font-mono text-[11px] text-cyan-300">
                            {z.window.label}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{z.rationale}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>

            <div className="cl-tile-soft rounded-2xl p-4">
              <p className="text-sm leading-relaxed text-slate-300">{plan.explanation}</p>
              <div className="cl-hairline my-3" />
              <ul className="space-y-1.5">
                {plan.caveats.map((cv) => (
                  <li key={cv} className="flex gap-2 text-xs text-slate-500">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" /> {cv}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {dispatchLog.length > 0 && (
          <div className="cl-tile rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-bold text-white">
                <Radio className="h-4 w-4 text-cyan-300" /> Radio dispatch log
              </p>
              <div className="flex items-center gap-3">
                <a
                  href={ZELLO_CHANNEL_URL || "https://zello.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-cyan-300 transition hover:text-cyan-200"
                >
                  <ExternalLink className="h-3 w-3" /> Connect radios
                </a>
                <button onClick={clearDispatchLog} className="text-xs text-slate-400 transition hover:text-red-300">
                  Clear
                </button>
              </div>
            </div>
            <ul className="mt-3 space-y-2">
              {dispatchLog.map((d) => (
                <li key={d.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-2.5 text-xs">
                  <div className="min-w-0">
                    <p>
                      <span className="font-mono text-slate-500">{d.timeIST}</span> ·{" "}
                      <span className="font-semibold text-cyan-300">{d.unitLabel}</span>
                    </p>
                    <p className="mt-0.5 text-slate-400">{d.text}</p>
                  </div>
                  <button
                    onClick={() => (d.audioUrl ? playClip(d.audioUrl) : speak(d.text))}
                    className="shrink-0 rounded-md border border-slate-700 px-2 py-1 text-[10px] text-slate-300 transition hover:text-white"
                  >
                    {d.audioUrl ? "Play" : "Repeat"}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] text-slate-600">
              Voice dispatch plays in the browser — connects to Zello / Motorola WAVE radios in production.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function Stat({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-white/[0.02] p-3">
      <p className="text-xl font-bold text-cyan-300">{value}</p>
      <p className="mt-0.5 text-[11px] leading-tight text-slate-400">{label}</p>
      {hint && <p className="mt-0.5 text-[10px] text-slate-600">{hint}</p>}
    </div>
  );
}
