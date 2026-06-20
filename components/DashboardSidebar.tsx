"use client";

import Link from "next/link";
import { ArrowLeft, CalendarClock, Layers, Route, TrendingUp } from "lucide-react";
import { useDashboardStore, type DashboardTab } from "@/lib/store";
import { Logo } from "@/components/Logo";

const TABS: { id: DashboardTab; label: string; icon: typeof Layers; isNew?: boolean }[] = [
  { id: "map", label: "Hotspots map", icon: Layers },
  { id: "forecast", label: "Forecast", icon: TrendingUp },
  { id: "enforcement", label: "Patrol plan", icon: Route },
  { id: "events", label: "Event planning", icon: CalendarClock, isNew: true },
];

export function DashboardSidebar() {
  const sidebarOpen = useDashboardStore((s) => s.sidebarOpen);
  const setSidebarOpen = useDashboardStore((s) => s.setSidebarOpen);
  const activeTab = useDashboardStore((s) => s.activeTab);
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  const patrolCount = useDashboardStore((s) => s.patrolPlan.length);

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col border-r border-slate-800 bg-[#0a0e16] transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-5">
          <Logo size={32} href="/" />
          <p className="mt-1.5 pl-0.5 text-[11px] text-slate-500">Bengaluru Traffic Command</p>
        </div>

        <nav className="flex-1 space-y-1.5 px-3 py-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setSidebarOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition ${
                  active
                    ? "border border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="flex-1 text-left">{tab.label}</span>
                {tab.id === "enforcement" && patrolCount > 0 && (
                  <span className="rounded-full bg-cyan-400 px-1.5 text-[10px] font-bold text-slate-950">
                    {patrolCount}
                  </span>
                )}
                {tab.isNew && (
                  <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-1.5 text-[9px] font-bold uppercase text-cyan-300">
                    New
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-4 pb-2">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">Coming soon</p>
          <ul className="space-y-1 text-[11px] text-slate-600">
            <li>• Pan-India coverage</li>
            <li>• Smarter AI chatbot</li>
            <li>• Live camera detection</li>
          </ul>
        </div>

        <div className="border-t border-slate-800 p-3">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-800/60 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" /> Back to overview
          </Link>
        </div>
      </aside>
    </>
  );
}
