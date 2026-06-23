"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, CornerDownLeft, Layers, MapPin, Route, Search, TrendingUp, Ambulance, Bot } from "lucide-react";
import { useHotspots } from "@/lib/hooks";
import { useDashboardStore } from "@/lib/store";
import { RISK_HEX } from "@/lib/risk-ui";
import type { Hotspot } from "@/lib/types";

interface Item {
  id: string;
  label: string;
  hint: string;
  icon: typeof Layers;
  color?: string;
  run: () => void;
}

/** Tiny dependency-free fuzzy score. Returns -1 for no match. */
function score(query: string, text: string): number {
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();
  if (!q) return 0.001; // empty query → keep everything (low score)
  const idx = t.indexOf(q);
  if (idx === 0) return 1000 - t.length;
  if (idx > 0) return 600 - idx;
  // subsequence fallback
  let ti = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const f = t.indexOf(q[qi], ti);
    if (f < 0) return -1;
    ti = f + 1;
  }
  return 200;
}

export function CommandPalette() {
  const { data: hotspots } = useHotspots();
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  const selectHotspot = useDashboardStore((s) => s.selectHotspot);
  const setAssistantOpen = useDashboardStore((s) => s.setAssistantOpen);
  const toggleLang = useDashboardStore((s) => s.toggleLang);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global shortcut: Cmd/Ctrl+K, plus a custom event for click triggers.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("cl:command", onOpen as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("cl:command", onOpen as EventListener);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const close = () => setOpen(false);

  const commands: Item[] = useMemo(
    () => [
      { id: "go-map", label: "Go to Hotspots map", hint: "Navigate", icon: Layers, run: () => { setActiveTab("map"); close(); } },
      { id: "go-forecast", label: "Go to Forecast", hint: "Navigate", icon: TrendingUp, run: () => { setActiveTab("forecast"); close(); } },
      { id: "go-enforcement", label: "Go to Patrol plan", hint: "Navigate", icon: Route, run: () => { setActiveTab("enforcement"); close(); } },
      { id: "go-events", label: "Go to Event planning", hint: "Navigate", icon: CalendarClock, run: () => { setActiveTab("events"); close(); } },
      { id: "go-corridor", label: "Go to Green Corridor", hint: "Navigate", icon: Ambulance, run: () => { setActiveTab("corridor"); close(); } },
      { id: "open-assistant", label: "Open ClearLane Sahayak", hint: "Assistant", icon: Bot, run: () => { setAssistantOpen(true); close(); } },
      { id: "toggle-lang", label: "Toggle language (EN / ಕನ್ನಡ)", hint: "Settings", icon: Search, run: () => { toggleLang(); close(); } },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const junctionItems: Item[] = useMemo(
    () =>
      (hotspots ?? []).map((h: Hotspot) => ({
        id: `j-${h.id}`,
        label: h.name,
        hint: `Junction · index ${h.riskIndex} · ${h.policeStation}`,
        icon: MapPin,
        color: RISK_HEX[h.riskLevel],
        run: () => {
          selectHotspot(h);
          setActiveTab("map");
          close();
        },
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hotspots],
  );

  const results = useMemo(() => {
    const pool = [...commands, ...junctionItems];
    const scored = pool
      .map((it) => ({ it, s: score(query, it.label) + (it.id.startsWith("go-") || it.id.startsWith("open") ? 0.0005 : 0) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s);
    return scored.slice(0, query ? 12 : 9).map((x) => x.it);
  }, [query, commands, junctionItems]);

  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, results.length - 1)));
  }, [results.length]);

  if (!open) return null;

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      results[active]?.run();
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-700 bg-[#0d121c] shadow-2xl">
        <div className="flex items-center gap-2.5 border-b border-slate-800 px-4">
          <Search className="h-4 w-4 shrink-0 text-slate-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onListKey}
            placeholder="Search junctions or jump to a view…"
            className="w-full bg-transparent py-3.5 text-sm text-white placeholder:text-slate-600 focus:outline-none"
          />
          <kbd className="hidden shrink-0 rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-500 sm:block">esc</kbd>
        </div>

        <ul className="max-h-[52vh] overflow-y-auto p-1.5">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-slate-500">No matches.</li>
          )}
          {results.map((it, i) => {
            const Icon = it.icon;
            return (
              <li key={it.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => it.run()}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                    i === active ? "bg-cyan-400/10" : "hover:bg-slate-800/50"
                  }`}
                >
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-slate-800"
                    style={it.color ? { color: it.color } : undefined}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">{it.label}</span>
                    <span className="block truncate text-[11px] text-slate-500">{it.hint}</span>
                  </span>
                  {i === active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-slate-500" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
