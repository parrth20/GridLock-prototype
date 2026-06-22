"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { fetchHotspots } from "@/lib/api-client";
import type { Hotspot, RiskLevel } from "@/lib/types";

const LeafletMap = dynamic(
  () => import("@/components/dashboard/LeafletMap").then((m) => m.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 grid place-items-center">
        <p className="animate-pulse text-sm text-slate-500">Loading map…</p>
      </div>
    ),
  },
);

const RISK_COLOR: Record<RiskLevel, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  moderate: "#22d3ee",
  low: "#10b981",
};

export function HotspotPreview() {
  const [hotspots, setHotspots] = useState<Hotspot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchHotspots({ pageSize: 28, page: 1 }, ctrl.signal)
      .then((res) => {
        setHotspots(res.hotspots);
        setSelectedId(res.hotspots[0]?.id ?? null);
      })
      .catch((e: unknown) => {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      });
    return () => ctrl.abort();
  }, []);

  const selected = hotspots?.find((h) => h.id === selectedId) ?? null;

  return (
    <section className="relative overflow-hidden cl-bg py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mb-12 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="cl-kicker mb-3 text-cyan-300">Interactive preview</p>
            <h2 className="cl-display max-w-xl text-4xl text-white sm:text-5xl">
              The map you&apos;ll command.
            </h2>
            <p className="mt-4 max-w-lg text-slate-400">
              Live from the API — each marker is a named junction in the supplied
              data, sized and coloured by its congestion-risk index. Tap one.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
          >
            Open full dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Map */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-800 bg-[#0a0e16] sm:aspect-[16/9]">
            {error && (
              <div className="absolute inset-0 grid place-items-center p-6 text-center">
                <p className="text-sm text-slate-400">Couldn&apos;t load the preview: {error}</p>
              </div>
            )}
            {!error && !hotspots && (
              <div className="absolute inset-0 grid place-items-center">
                <p className="animate-pulse text-sm text-slate-500">Loading junctions…</p>
              </div>
            )}
            {hotspots && hotspots.length > 0 && (
              <LeafletMap
                hotspots={hotspots}
                selectedId={selectedId}
                onSelect={(h) => setSelectedId(h.id)}
              />
            )}
          </div>

          {/* Detail card */}
          <div className="cl-card flex flex-col rounded-2xl p-6">
            {selected ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5" /> {selected.policeStation} station
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-white">{selected.name}</h3>
                  </div>
                  <span
                    className="rounded-lg px-2.5 py-1 text-xs font-bold uppercase"
                    style={{ color: RISK_COLOR[selected.riskLevel], background: `${RISK_COLOR[selected.riskLevel]}1f` }}
                  >
                    {selected.riskLevel}
                  </span>
                </div>

                <div className="mt-6 flex items-end gap-3">
                  <p className="cl-display text-5xl text-white">{selected.riskIndex}</p>
                  <p className="pb-1.5 text-xs text-slate-500">/ 100 risk index<br />(calculated)</p>
                </div>

                <dl className="mt-6 space-y-3 text-sm">
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <dt className="text-slate-500">Records (observed)</dt>
                    <dd className="font-semibold text-white">{selected.recordCount.toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <dt className="text-slate-500">Suggested window</dt>
                    <dd className="font-semibold text-cyan-300">{selected.recommendedWindow.label}</dd>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <dt className="text-slate-500">Top issue</dt>
                    <dd className="text-right font-medium text-slate-200">{selected.topViolation}</dd>
                  </div>
                </dl>

                <Link
                  href="/dashboard"
                  className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Inspect in command centre <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            ) : (
              <p className="m-auto text-sm text-slate-500">Select a junction on the map.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
