"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { CalendarClock, Sparkles, Users } from "lucide-react";
import { useHotspots } from "@/lib/hooks";
import type { Hotspot } from "@/lib/types";
import {
  BarricadeIcon,
  ControlRoomIcon,
  PatrolUnitIcon,
  RoadClosureIcon,
} from "@/components/icons/CivicIcons";

const EventMap = dynamic(
  () => import("@/components/dashboard/EventMap").then((m) => m.EventMap),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full place-items-center bg-[#06080d] text-sm text-slate-500">
        Loading map…
      </div>
    ),
  },
);

type Size = "small" | "medium" | "large";

const SIZES: Record<Size, { label: string; mult: number; units: number; barricades: number; radiusM: number }> = {
  small: { label: "Small (under 500 people)", mult: 1.3, units: 1, barricades: 2, radiusM: 180 },
  medium: { label: "Medium (500–5,000)", mult: 1.8, units: 2, barricades: 4, radiusM: 320 },
  large: { label: "Large (5,000+)", mult: 2.6, units: 4, barricades: 6, radiusM: 550 },
};

export function EventPlanningView() {
  const { data: hotspots, loading } = useHotspots();
  const [junctionId, setJunctionId] = useState<string>("");
  const [size, setSize] = useState<Size>("medium");

  const junction: Hotspot | undefined = useMemo(
    () => hotspots?.find((h) => h.id === junctionId) ?? hotspots?.[0],
    [hotspots, junctionId],
  );

  const plan = useMemo(() => {
    if (!junction) return null;
    const s = SIZES[size];
    const riskBump = junction.riskLevel === "critical" ? 2 : junction.riskLevel === "high" ? 1 : 0;
    const units = s.units + riskBump;
    const barricades = s.barricades + (riskBump > 0 ? 1 : 0);
    const officers = units * 2 + barricades + 2; // patrols + barricade staff + control
    const extraPressurePct = Math.round((s.mult - 1) * 100);
    return { units, barricades, officers, extraPressurePct, mult: s.mult };
  }, [junction, size]);

  return (
    <div className="cl-scroll h-full overflow-y-auto bg-[#06080d] p-5 sm:p-7">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Plan for an event</h1>
            <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold uppercase text-cyan-300">New</span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Rally, match, festival or market day? Pick the spot and crowd size to
            get a quick staffing, barricade and diversion plan.
          </p>
        </header>

        {/* Inputs */}
        <div className="grid gap-4 cl-tile rounded-2xl p-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-400">Where is the event?</span>
            <select
              value={junction?.id ?? ""}
              onChange={(e) => setJunctionId(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
            >
              {(hotspots ?? []).map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-400">How big is the crowd?</span>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(SIZES) as Size[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`rounded-lg border px-2 py-2.5 text-xs font-medium capitalize transition ${
                    size === s
                      ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-200"
                      : "border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">{SIZES[size].label}</p>
          </label>
        </div>

        {/* Output */}
        {junction && plan && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
              <div>
                <p className="text-sm font-semibold text-white">{junction.name}</p>
                <p className="text-xs text-slate-400">Busiest around {junction.recommendedWindow.label}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-cyan-300">{plan.mult}×</p>
                <p className="text-[11px] text-slate-500">≈ {plan.extraPressurePct}% busier than normal</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <PlanCard icon={<PatrolUnitIcon size={22} />} value={plan.units} label="Patrol units" hint="On-ground enforcement" />
              <PlanCard icon={<BarricadeIcon size={22} />} value={plan.barricades} label="Barricade points" hint="At main approach roads" />
              <PlanCard icon={<Users className="h-5 w-5" />} value={plan.officers} label="Officers (approx.)" hint="Patrols + barricades + control" />
            </div>

            {/* Location + suggested cordon */}
            <div className="h-72 overflow-hidden rounded-2xl border border-slate-800">
              <EventMap
                lat={junction.latitude}
                lng={junction.longitude}
                name={junction.name}
                radiusM={SIZES[size].radiusM}
                context={(hotspots ?? []).map((h) => [h.latitude, h.longitude] as [number, number])}
              />
            </div>

            <div className="cl-tile rounded-2xl p-5">
              <p className="flex items-center gap-2 text-sm font-bold text-white">
                <RoadClosureIcon size={18} /> Suggested diversion
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Keep through-traffic out of <span className="font-semibold text-white">{junction.name}</span> around {junction.recommendedWindow.label}.
                Hold barricades on the main approaches, leave one lane for buses and
                autos, and station a patrol where the crowd spills onto the carriageway.
              </p>
              <p className="mt-2 text-xs text-slate-500">A starting estimate based on past violations here — adjust on the ground.</p>
            </div>

            {/* Coming soon */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
              <p className="flex items-center gap-2 text-sm font-bold text-white">
                <Sparkles className="h-4 w-4 text-cyan-300" /> Coming soon
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {[
                  { icon: <RoadClosureIcon size={16} />, t: "Turn-by-turn diversion routes" },
                  { icon: <CalendarClock className="h-4 w-4" />, t: "Auto-detect events from the calendar" },
                  { icon: <ControlRoomIcon size={16} />, t: "Live crowd-camera read" },
                  { icon: <Sparkles className="h-4 w-4" />, t: "Learn from each event afterwards" },
                ].map((f) => (
                  <div key={f.t} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs text-slate-400">
                    <span className="text-slate-500">{f.icon}</span>
                    {f.t}
                    <span className="ml-auto rounded border border-slate-700 px-1.5 py-0.5 text-[9px] uppercase text-slate-500">soon</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PlanCard({ icon, value, label, hint }: { icon: React.ReactNode; value: number; label: string; hint: string }) {
  return (
    <div className="cl-tile rounded-2xl p-4">
      <div className="flex items-center justify-between text-cyan-300">
        {icon}
        <span className="text-3xl font-bold text-white">{value}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-white">{label}</p>
      <p className="text-xs text-slate-500">{hint}</p>
    </div>
  );
}
