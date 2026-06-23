"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, TriangleAlert } from "lucide-react";
import { useDashboardStore } from "@/lib/store";
import { useHotspots } from "@/lib/hooks";

/** WebGL probe — Brave's fingerprint protection often disables it. */
function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(
      (window as unknown as { WebGLRenderingContext?: unknown }).WebGLRenderingContext &&
      (c.getContext("webgl") || c.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

const HotspotMap3D = dynamic(
  () => import("@/components/dashboard/HotspotMapLibre3D").then((m) => m.HotspotMapLibre3D),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full place-items-center bg-[#06080d]">
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading 3D city…
        </p>
      </div>
    ),
  },
);

const LeafletMap = dynamic(
  () => import("@/components/dashboard/LeafletMap").then((m) => m.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full place-items-center bg-[#06080d]">
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading map…
        </p>
      </div>
    ),
  },
);

export function MapPanel() {
  const { data: hotspots, loading, error } = useHotspots();
  const mapMode = useDashboardStore((s) => s.mapMode);
  const selected = useDashboardStore((s) => s.selectedHotspot);
  const selectHotspot = useDashboardStore((s) => s.selectHotspot);
  const focusNonce = useDashboardStore((s) => s.focusNonce);
  const reduceMotion = useDashboardStore((s) => s.prefersReducedMotion);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // 3D needs WebGL; if it's missing or the map can't paint, fall back to 2D.
  const [webgl, setWebgl] = useState(true);
  const [threeDFailed, setThreeDFailed] = useState(false);
  useEffect(() => setWebgl(hasWebGL()), []);
  useEffect(() => {
    if (mapMode === "3d") setThreeDFailed(false); // retry when re-entering 3D
  }, [mapMode]);

  if (loading) {
    return (
      <div className="grid h-full place-items-center bg-[#06080d]">
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading junctions from the dataset…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid h-full place-items-center bg-[#06080d] p-6 text-center">
        <div className="max-w-sm">
          <TriangleAlert className="mx-auto h-7 w-7 text-amber-400" />
          <p className="mt-3 text-sm font-semibold text-white">Couldn&apos;t load hotspots</p>
          <p className="mt-1 text-sm text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!hotspots || hotspots.length === 0) {
    return (
      <div className="grid h-full place-items-center bg-[#06080d] p-6 text-center">
        <p className="max-w-sm text-sm text-slate-400">
          No named junctions in the dataset. Add the official CSV and run{" "}
          <span className="font-mono text-cyan-300">pnpm run data:build</span>.
        </p>
      </div>
    );
  }

  // Phones never render the heavy WebGL scene.
  const want3D = mapMode === "3d" && !isMobile;
  const use3D = want3D && webgl && !threeDFailed;
  const note3D = want3D && (!webgl || threeDFailed);

  if (use3D) {
    return (
      <HotspotMap3D
        className="h-full w-full"
        hotspots={hotspots}
        selectedId={selected?.id ?? null}
        onSelect={(h) => selectHotspot(h)}
        focusNonce={focusNonce}
        reduceMotion={reduceMotion}
        onFail={() => setThreeDFailed(true)}
      />
    );
  }

  return (
    <div className="relative h-full w-full">
      <LeafletMap
        hotspots={hotspots}
        selectedId={selected?.id ?? null}
        onSelect={(h) => selectHotspot(h)}
        reduceMotion={reduceMotion}
      />
      {note3D && (
        <div className="absolute left-3 top-3 z-[500] max-w-xs rounded-lg border border-amber-400/30 bg-amber-950/80 px-3 py-2 text-[11px] leading-snug text-amber-200 backdrop-blur">
          3D needs WebGL / hardware acceleration, which this browser is blocking — showing the 2D map. It works in Chrome, or turn off Brave Shields for this site.
        </div>
      )}
    </div>
  );
}
