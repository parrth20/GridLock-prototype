"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Grid3x3, Loader2, TrendingUp, TriangleAlert } from "lucide-react";
import { fetchForecast } from "@/lib/api-client";
import type { ForecastResponse } from "@/lib/types";
import { RISK_HEX, riskTint, CONFIDENCE_STYLE, cap } from "@/lib/risk-ui";

const HeatGrid = dynamic(() => import("@/components/dashboard/HeatGrid").then((m) => m.HeatGrid), {
  ssr: false,
  loading: () => (
    <div className="grid h-[560px] place-items-center text-sm text-slate-500">Loading heat-grid…</div>
  ),
});

type ShiftId = "late-night" | "morning" | "afternoon" | "evening";

const SHIFT_OPTIONS: { id: ShiftId | "auto"; label: string }[] = [
  { id: "auto", label: "Next shift" },
  { id: "morning", label: "Morning" },
  { id: "afternoon", label: "Afternoon" },
  { id: "evening", label: "Evening" },
  { id: "late-night", label: "Late night" },
];

function dayLabel(factor: number): string {
  if (factor > 1.05) return "Busier day than usual";
  if (factor < 0.95) return "Quieter day than usual";
  return "A typical day";
}

function Ring({ pct, color }: { pct: number; color: string }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  const off = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <svg width={46} height={46} viewBox="0 0 46 46" className="shrink-0">
      <circle cx={23} cy={23} r={r} fill="none" stroke="#1c2533" strokeWidth={4} />
      <circle
        cx={23}
        cy={23}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeDasharray={c}
        strokeDashoffset={off}
        strokeLinecap="round"
        transform="rotate(-90 23 23)"
      />
      <text x={23} y={24} textAnchor="middle" dominantBaseline="middle" className="fill-white text-[12px] font-bold">
        {pct}
      </text>
    </svg>
  );
}

export function ForecastView() {
  const [shift, setShift] = useState<ShiftId | "auto">("auto");
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchForecast(shift === "auto" ? {} : { shift })
      .then((r) => active && setData(r))
      .catch((e: Error) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [shift]);

  // Headline accuracy is the OUT-OF-SAMPLE score (leave-one-hour-out CV) — the
  // honest measure. In-sample fit is shown smaller for transparency.
  const accuracyPct = data ? Math.round(data.model.cvR2 * 100) : 0;
  const inSamplePct = data ? Math.round(data.model.cityWideR2 * 100) : 0;
  const maxExpected = data ? Math.max(1, ...data.zones.map((z) => z.predictedUpper)) : 1;

  return (
    <div className="cl-scroll h-full overflow-y-auto bg-[#06080d] p-5 sm:p-7">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-300/80">Look ahead</p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">What&apos;s coming next shift</h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Where violations are likely to pile up — so you can get ahead of it.
          </p>
        </header>

        {/* Shift selector */}
        <div className="flex flex-wrap gap-2">
          {SHIFT_OPTIONS.map((opt) => {
            const active = shift === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setShift(opt.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20"
                    : "border border-slate-700/80 text-slate-400 hover:border-slate-600 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {loading && (
          <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Building forecast…
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 text-sm text-amber-200">
            <TriangleAlert className="h-4 w-4" /> {error}
          </div>
        )}

        {data && !loading && (
          <>
            {/* Forecast summary */}
            <div className="cl-tile overflow-hidden rounded-2xl">
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <Ring pct={accuracyPct} color="#3ddc97" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">Smart forecast</p>
                    <p className="text-sm text-slate-200">
                      <span className="font-bold text-emerald-300">{accuracyPct}%</span> accurate{" "}
                      <span className="text-slate-400">(out-of-sample)</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Cross-validated · in-sample fit {inSamplePct}% · {dayLabel(data.weekdayFactor)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-violet-500/10 px-4 py-2.5">
                  <TrendingUp className="h-5 w-5 text-violet-300" />
                  <div>
                    <p className="text-sm font-bold text-white">{data.shift.label}</p>
                    <p className="text-[11px] text-slate-400">from {String(data.referenceHourIST).padStart(2, "0")}:00 IST</p>
                  </div>
                </div>
              </div>
              <div className="cl-hairline" />
              <p className="px-5 py-2.5 text-[11px] text-slate-500">
                Estimated violation counts — not a measure of traffic speed.
              </p>
            </div>

            {/* Zones */}
            <div className="space-y-3">
              {data.zones.length === 0 && (
                <p className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
                  No junction has recorded activity in this shift.
                </p>
              )}
              {data.zones.map((z, i) => {
                const color = RISK_HEX[z.riskLevel];
                const conf = CONFIDENCE_STYLE[z.confidence] ?? CONFIDENCE_STYLE.low;
                const barPct = Math.round((z.predictedPerDay / maxExpected) * 100);
                return (
                  <div
                    key={z.id}
                    className="cl-accent cl-tile-soft rounded-2xl p-4 pl-5"
                    style={{ ["--accent" as string]: color }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold"
                          style={{ color, background: riskTint(z.riskLevel, 0.16) }}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{z.name}</p>
                          <p className="truncate text-[11px] text-slate-500">{z.policeStation} · risk index {z.riskIndex}</p>
                        </div>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-700/80 px-2.5 py-1 text-[11px] font-medium">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: conf.dot }} />
                        <span className={conf.text}>{cap(z.confidence)}</span>
                      </span>
                    </div>

                    <div className="mt-4 flex items-end justify-between gap-4">
                      <p className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-bold tracking-tight text-white">≈{z.predictedPerDay}</span>
                        <span className="text-xs text-slate-500">expected this shift</span>
                      </p>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wide text-slate-600">likely range</p>
                        <p className="font-mono text-sm text-violet-200">{z.predictedLower}–{z.predictedUpper}</p>
                      </div>
                    </div>

                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-800/80">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${Math.max(4, barPct)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Junction × hour heat-grid (observed) */}
        <div className="cl-tile overflow-hidden rounded-2xl p-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/15 text-violet-300">
              <Grid3x3 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-white">When each hotspot peaks</p>
              <p className="text-[11px] text-slate-500">
                Observed violations by hour for the busiest junctions — darker is quieter, red is peak.
              </p>
            </div>
          </div>
          <div className="mt-3">
            <HeatGrid />
          </div>
        </div>
      </div>
    </div>
  );
}
