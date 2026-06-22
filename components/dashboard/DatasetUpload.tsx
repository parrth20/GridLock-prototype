"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Loader2,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";
import {
  fetchDatasetMeta,
  resetDataset,
  uploadDataset,
  type DatasetMeta,
} from "@/lib/api-client";

type Status =
  | { kind: "idle" }
  | { kind: "working"; text: string }
  | { kind: "error"; text: string }
  | { kind: "success"; text: string };

export function DatasetUpload({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStatus({ kind: "idle" });
    setFile(null);
    fetchDatasetMeta()
      .then(setMeta)
      .catch(() => setMeta(null));
  }, [open]);

  if (!open) return null;

  async function doUpload() {
    if (!file) return;
    setStatus({ kind: "working", text: "Reading and rebuilding from your CSV…" });
    try {
      const result = await uploadDataset(file);
      setMeta(result);
      setStatus({
        kind: "success",
        text: `Loaded ${result.recordCount.toLocaleString()} records · ${result.namedJunctions} junctions · model ${Math.round(result.model.cityWideR2 * 100)}% accurate. Refreshing…`,
      });
      setTimeout(() => window.location.reload(), 1100);
    } catch (e) {
      setStatus({ kind: "error", text: (e as Error).message });
    }
  }

  async function doReset() {
    setStatus({ kind: "working", text: "Resetting to the Bengaluru data…" });
    try {
      const result = await resetDataset();
      setMeta(result);
      setStatus({ kind: "success", text: "Back to the Bengaluru data. Refreshing…" });
      setTimeout(() => window.location.reload(), 900);
    } catch (e) {
      setStatus({ kind: "error", text: (e as Error).message });
    }
  }

  const busy = status.kind === "working";

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-[#0d121c] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-cyan-400/15 text-cyan-300">
              <Database className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-white">Use your own data</p>
              <p className="text-[11px] text-slate-500">The app runs on the real Bengaluru data by default. Upload a violations CSV to rebuild the maps and models on your own city.</p>
            </div>
          </div>
          <button onClick={onClose} disabled={busy} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Current dataset */}
          {meta && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-xs">
              <p className="text-slate-400">
                Currently loaded:{" "}
                <span className="font-semibold text-white">{meta.source}</span>
              </p>
              <p className="mt-1 text-slate-500">
                {meta.recordCount.toLocaleString()} records · {meta.namedJunctions} junctions ·{" "}
                {meta.datasetMode === "official-aggregates"
                  ? "Bengaluru data"
                  : meta.datasetMode === "uploaded"
                    ? "your upload"
                    : "demo sample"}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 text-[11px] text-slate-600">
            <span className="h-px flex-1 bg-slate-800" /> upload your own CSV <span className="h-px flex-1 bg-slate-800" />
          </div>

          {/* File picker */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-slate-600 bg-slate-900/40 px-4 py-8 text-center transition hover:border-cyan-400/50"
          >
            <Upload className="h-6 w-6 text-cyan-300" />
            <span className="text-sm font-medium text-white">{file ? file.name : "Choose a CSV file"}</span>
            <span className="text-[11px] text-slate-500">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "Click to browse"}</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setStatus({ kind: "idle" });
            }}
          />

          {/* Status */}
          {status.kind === "working" && (
            <p className="flex items-center gap-2 text-sm text-slate-300"><Loader2 className="h-4 w-4 animate-spin" /> {status.text}</p>
          )}
          {status.kind === "error" && (
            <p className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {status.text}</p>
          )}
          {status.kind === "success" && (
            <p className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-300"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {status.text}</p>
          )}

          {/* Required columns */}
          {meta && (
            <p className="text-[11px] leading-relaxed text-slate-600">
              Needs these columns: <span className="font-mono text-slate-500">{meta.requiredColumns.join(", ")}</span> (plus the usual vehicle_type, validation_status, data_sent_to_scita).
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={doReset}
              disabled={busy || !meta?.usingUploaded}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset to Bengaluru data
            </button>
            <button
              type="button"
              onClick={doUpload}
              disabled={busy || !file}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload &amp; rebuild
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
