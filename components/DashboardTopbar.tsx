"use client";

import { useState } from "react";
import { Boxes, Database, Map as MapIcon, Menu } from "lucide-react";
import { useDashboardStore } from "@/lib/store";
import { useHealth } from "@/lib/hooks";
import { DatasetUpload } from "@/components/dashboard/DatasetUpload";

function formatIST(iso: string | undefined): string {
  if (!iso) return "—";
  // iso ends with +05:30; take HH:MM and date directly to stay in IST.
  const m = iso.match(/T(\d{2}:\d{2})/);
  const d = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m || !d) return "—";
  return `${d[3]}/${d[2]} ${m[1]} IST`;
}

export function DashboardTopbar() {
  const setSidebarOpen = useDashboardStore((s) => s.setSidebarOpen);
  const sidebarOpen = useDashboardStore((s) => s.sidebarOpen);
  const activeTab = useDashboardStore((s) => s.activeTab);
  const mapMode = useDashboardStore((s) => s.mapMode);
  const setMapMode = useDashboardStore((s) => s.setMapMode);
  const { data: health } = useHealth();
  const [uploadOpen, setUploadOpen] = useState(false);
  const datasetMode = health?.datasetMode;
  const connected = datasetMode === "uploaded" || datasetMode === "official-aggregates";

  return (
    <>
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-[#0d121c] px-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-lg p-2 text-slate-300 transition hover:bg-slate-800 lg:hidden"
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 ${connected ? "border-emerald-400/30 bg-emerald-400/10" : "border-amber-400/30 bg-amber-400/10"}`}>
          <span className="relative flex h-2 w-2">
            <span className={`cl-blink absolute inline-flex h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`} />
          </span>
          <span className={`text-xs font-semibold ${connected ? "text-emerald-200" : "text-amber-200"}`}>
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>

        <div className="hidden min-w-0 flex-col leading-tight sm:flex">
          <span className="truncate text-xs text-slate-300">
            {datasetMode === "official-aggregates"
              ? "Bengaluru data"
              : datasetMode === "uploaded"
                ? "Your dataset"
                : "Sample data (demo)"}
          </span>
          <span className="truncate text-[10px] text-slate-500">
            {health ? health.dataset.recordCount.toLocaleString() : "—"} records · updated {formatIST(health?.generatedAtIST)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {activeTab === "map" && (
          <div className="flex items-center rounded-lg border border-slate-700 bg-slate-900/60 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMapMode("3d")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${
                mapMode === "3d" ? "bg-cyan-400 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
              aria-pressed={mapMode === "3d"}
            >
              <Boxes className="h-3.5 w-3.5" /> 3D
            </button>
            <button
              type="button"
              onClick={() => setMapMode("2d")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${
                mapMode === "2d" ? "bg-cyan-400 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
              aria-pressed={mapMode === "2d"}
            >
              <MapIcon className="h-3.5 w-3.5" /> Map
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-cyan-400/50 hover:text-white"
        >
          <Database className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Upload data</span>
        </button>
      </div>
    </header>
    <DatasetUpload open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </>
  );
}
