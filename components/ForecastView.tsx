"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Crosshair, Grid3x3, Loader2, TrendingUp, TriangleAlert } from "lucide-react";
import { fetchForecast } from "@/lib/api-client";
import type { ForecastResponse, ZoneForecast } from "@/lib/types";
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
  if (factor > 1.05) return "busier day than usual";
  if (factor < 0.95) return "quieter day than usual";
  return "a typical day";
}

function Ring({ pct, color }: { pct: number; color: string }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const off = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <svg width={56} height={56} viewBox="0 0 56 56" className="shrink-0">
      <circle cx={28} cy={28} r={r} fill="none" stroke="#1c2533" strokeWidth={5} />
      <circle
        cx={28}
        cy={28}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeDasharray={c}
        strokeDashoffset={off}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
      />
      <text x={28} y={29} textAnchor="middle" dominantBaseline="middle" className="fill-white text-[14px] font-bold">
        {pct}
      </text>
    </svg>
  );
}

/** One junction as a range plot: shaded likely-range + a best-estimate marker,
 *  all rows sharing the same 0..max scale so they're directly comparable. */
function RangeRow({ z, max, rank }: { z: ZoneForecast; max: number; rank: number }) {
  const color = RISK_HEX[z.riskLevel];
  const conf = CONFIDENCE_STYLE[z.confidence] ?? CONFIDENCE_STYLE.low;
  const bandLeft = Math.max(0, Math.min(100, (z.predictedLower / max) * 100));
  const bandRight = Math.max(0, Math.min(100, (z.predictedUpper / max) * 100));
  const bandWidth = Math.max(2, bandRight - bandLeft);
  const pointPct = Math.max(0, Math.min(100, (z.predictedPerDay / max) * 100));

  return (
    <div className="cl-accent cl-tile-soft rounded-xl p-3.5 pl-4 transition hover:bg-white/[0.04]" style={{ ["--accent" as string]: color }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[11px] font-bold"
            style={{ color, background: riskTint(z.riskLevel, 0.16) }}
          >
            {rank}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{z.name}</p>
            <p className="flex items-center gap-1.5 truncate text-[11px] text-slate-500">
              {z.policeStation} · risk {z.riskIndex}
              <span className="inline-flex items-center gap-1">
                · <span className="h-1.5 w-1.5 rounded-full" style={{ background: conf.dot }} /> {cap(z.confidence)}
              </span>
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xl font-bold leading-none text-white">≈{z.predictedPerDay}</p>
          <p className="mt-1 font-mono text-[10px] text-slate-500">{z.predictedLower}–{z.predictedUpper}</p>
        </div>
      </div>

      {/* shared-scale range track */}
      <div className="relative mt-3 h-2 rounded-full bg-slate-800/70">
        <div
          className="absolute top-0 h-full rounded-full"
          style={{ left: `${bandLeft}%`, width: `${bandWidth}%`, background: riskTint(z.riskLevel, 0.45) }}
        />
        <div
          className="absolute top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full shadow"
          style={{ left: `calc(${pointPct}% - 1.5px)`, background: color }}
        />
      </div>
    </div>
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

  // Headline accuracy is the OUT-OF-SAMPLE score (leave-one-hour-out CV).
  const accuracyPct = data ? Math.round(data.model.cvR2 * 100) : 0;
  const inSamplePct = data ? Math.round(data.model.cityWideR2 * 100) : 0;

  // Rank by what the user actually reads — expected count this shift.
  const zones = data ? [...data.zones].sort((a, b) => b.predictedPerDay - a.predictedPerDay) : [];
  const totalExpected = Math.round(zones.reduce((s, z) => s + z.predictedPerDay, 0));
  const maxUpper = Math.max(1, ...zones.map((z) => z.predictedUpper));
  const top = zones[0];

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
            {/* Hero takeaway */}
            <div className="cl-tile overflow-hidden rounded-2xl p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <Ring pct={accuracyPct} color="#3ddc97" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                      Smart forecast · {accuracyPct}% accurate
                    </p>
                    <p className="mt-0.5 text-2xl font-bold leading-tight text-white">
                      ≈{totalExpected} violations expected
                    </p>
                    <p className="text-xs text-slate-400">
                      across {zones.length} hotspot{zones.length === 1 ? "" : "s"} this shift · {dayLabel(data.weekdayFactor)} ·
                      in-sample fit {inSamplePct}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 self-start rounded-xl bg-violet-500/10 px-4 py-2.5 sm:self-auto">
                  <TrendingUp className="h-5 w-5 text-violet-300" />
                  <div>
                    <p className="text-sm font-bold text-white">{data.shift.label}</p>
                    <p className="text-[11px] text-slate-400">from {String(data.referenceHourIST).padStart(2, "0")}:00 IST</p>
                  </div>
                </div>
              </div>

              {top && (
                <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm text-slate-200">
                  <Crosshair className="h-4 w-4 shrink-0 text-amber-300" />
                  <span>
                    Start with <span className="font-semibold text-white">{top.name}</span> — about{" "}
                    <span className="font-semibold text-amber-200">{top.predictedPerDay}</span> expected, the highest this shift.
                  </span>
                </div>
              )}
            </div>

            {/* Ranked range plot */}
            {zones.length === 0 ? (
              <p className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
                No junction has recorded activity in this shift.
              </p>
            ) : (
              <div className="cl-tile rounded-2xl p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-white">Where they&rsquo;ll pile up</p>
                  <p className="text-[11px] text-slate-500">
                    shaded = likely range · line = best estimate · same 0–{maxUpper} scale
                  </p>
                </div>
                <div className="mt-4 space-y-2.5">
                  {zones.map((z, i) => (
                    <RangeRow key={z.id} z={z} max={maxUpper} rank={i + 1} />
                  ))}
                </div>
                <p className="mt-4 text-[11px] text-slate-600">
                  Estimated violation counts — not a measure of traffic speed.
                </p>
              </div>
            )}
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
