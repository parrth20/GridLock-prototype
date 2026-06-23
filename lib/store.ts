import { create } from "zustand";
import type { Hotspot } from "@/lib/types";

export type DashboardTab = "map" | "forecast" | "enforcement" | "events" | "corridor";
export type MapMode = "3d" | "2d";
export type Lang = "en" | "kn";

export interface DispatchEntry {
  id: string;
  unitLabel: string;
  zoneName: string;
  text: string;
  timeIST: string;
  audioUrl?: string; // set when it's a recorded mic memo
}

interface DashboardStore {
  // Selection
  selectedHotspot: Hotspot | null;
  selectHotspot: (hotspot: Hotspot | null) => void;

  // Camera focus trigger (incremented whenever the map should re-focus)
  focusNonce: number;
  requestFocus: () => void;

  // Details drawer
  showDetailsDrawer: boolean;
  setShowDetailsDrawer: (show: boolean) => void;

  // Navigation
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // 2D / 3D map
  mapMode: MapMode;
  setMapMode: (mode: MapMode) => void;

  // UI language (English / Kannada)
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;

  // Patrol plan basket
  patrolPlan: Hotspot[];
  addToPatrolPlan: (hotspot: Hotspot) => void;
  removeFromPatrolPlan: (id: string) => void;
  clearPatrolPlan: () => void;

  // Radio dispatch log
  dispatchLog: DispatchEntry[];
  addDispatch: (entry: { unitLabel: string; zoneName: string; text: string; audioUrl?: string }) => void;
  clearDispatchLog: () => void;

  // Assistant
  assistantOpen: boolean;
  setAssistantOpen: (open: boolean) => void;
  toggleAssistant: () => void;

  // Motion
  prefersReducedMotion: boolean;
  setPrefersReducedMotion: (prefers: boolean) => void;
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  selectedHotspot: null,
  selectHotspot: (hotspot) =>
    set((state) => ({
      selectedHotspot: hotspot,
      focusNonce: hotspot ? state.focusNonce + 1 : state.focusNonce,
      showDetailsDrawer: hotspot ? true : state.showDetailsDrawer,
    })),

  focusNonce: 0,
  requestFocus: () => set((state) => ({ focusNonce: state.focusNonce + 1 })),

  showDetailsDrawer: false,
  setShowDetailsDrawer: (show) => set({ showDetailsDrawer: show }),

  activeTab: "map",
  setActiveTab: (tab) => set({ activeTab: tab }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  mapMode: "2d", // real OpenStreetMap view by default; 3D is one toggle away
  setMapMode: (mode) => set({ mapMode: mode }),

  lang: "en",
  setLang: (lang) => set({ lang }),
  toggleLang: () => set((state) => ({ lang: state.lang === "en" ? "kn" : "en" })),

  patrolPlan: [],
  addToPatrolPlan: (hotspot) => {
    if (get().patrolPlan.some((h) => h.id === hotspot.id)) return;
    set((state) => ({ patrolPlan: [...state.patrolPlan, hotspot] }));
  },
  removeFromPatrolPlan: (id) =>
    set((state) => ({ patrolPlan: state.patrolPlan.filter((h) => h.id !== id) })),
  clearPatrolPlan: () => set({ patrolPlan: [] }),

  dispatchLog: [],
  addDispatch: (entry) =>
    set((state) => ({
      dispatchLog: [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timeIST: new Date().toLocaleTimeString(),
          ...entry,
        },
        ...state.dispatchLog,
      ].slice(0, 30),
    })),
  clearDispatchLog: () => set({ dispatchLog: [] }),

  assistantOpen: false,
  setAssistantOpen: (open) => set({ assistantOpen: open }),
  toggleAssistant: () => set((state) => ({ assistantOpen: !state.assistantOpen })),

  prefersReducedMotion:
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  setPrefersReducedMotion: (prefers) => set({ prefersReducedMotion: prefers }),
}));
