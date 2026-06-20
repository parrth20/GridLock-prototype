import Link from "next/link";
import { ModelGallery3D } from "@/components/ModelGallery3D";

export default function ModelsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Developer preview</p>
            <h1 className="mt-2 text-3xl font-bold">ClearLane 3D Asset Lab</h1>
            <p className="mt-2 text-sm text-slate-400">Drag to rotate, scroll to zoom, and verify every generated model.</p>
          </div>
          <Link href="/" className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-400 hover:text-white">
            Back to product
          </Link>
        </header>
        <ModelGallery3D />
      </div>
    </main>
  );
}
