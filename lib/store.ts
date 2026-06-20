import { create } from "zustand";
import type { Hotspot } from "@/lib/types";

export type DashboardTab = "map" | "forecast" | "enforcement" | "events";
export type MapMode = "3d" | "2d";

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

  // Patrol plan basket
  patrolPlan: Hotspot[];
  addToPatrolPlan: (hotspot: Hotspot) => void;
  removeFromPatrolPlan: (id: string) => void;
  clearPatrolPlan: () => void;

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

  mapMode: "3d",
  setMapMode: (mode) => set({ mapMode: mode }),

  patrolPlan: [],
  addToPatrolPlan: (hotspot) => {
    if (get().patrolPlan.some((h) => h.id === hotspot.id)) return;
    set((state) => ({ patrolPlan: [...state.patrolPlan, hotspot] }));
  },
  removeFromPatrolPlan: (id) =>
    set((state) => ({ patrolPlan: state.patrolPlan.filter((h) => h.id !== id) })),
  clearPatrolPlan: () => set({ patrolPlan: [] }),

  assistantOpen: false,
  setAssistantOpen: (open) => set({ assistantOpen: open }),
  toggleAssistant: () => set((state) => ({ assistantOpen: !state.assistantOpen })),

  prefersReducedMotion:
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  setPrefersReducedMotion: (prefers) => set({ prefersReducedMotion: prefers }),
}));
