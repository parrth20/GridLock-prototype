"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaces the real cause in the browser console for debugging.
    console.error(error);
  }, [error]);

  return (
    <div className="grid h-[100svh] w-screen place-items-center bg-[#06080d] p-6 text-center text-white">
      <div className="max-w-md">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-300">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold">Something went wrong in the command centre</h2>
        <p className="mt-2 break-words text-sm text-slate-400">
          {error?.message || "An unexpected error occurred."}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:text-white"
          >
            Back to overview
          </a>
        </div>
      </div>
    </div>
  );
}
