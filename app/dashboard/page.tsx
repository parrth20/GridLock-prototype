"use client";

import { useDashboardStore } from "@/lib/store";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { DashboardTopbar } from "@/components/DashboardTopbar";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { MapPanel } from "@/components/dashboard/MapPanel";
import { IntelligencePanel } from "@/components/IntelligencePanel";
import { HotspotDetailsDrawer } from "@/components/HotspotDetailsDrawer";
import { ForecastView } from "@/components/ForecastView";
import { EnforcementView } from "@/components/EnforcementView";
import { EventPlanningView } from "@/components/dashboard/EventPlanningView";
import { GreenCorridorView } from "@/components/dashboard/GreenCorridorView";
import { SahayakAssistant } from "@/components/assistant/SahayakAssistant";
import { CommandPalette } from "@/components/CommandPalette";

export default function DashboardPage() {
  const activeTab = useDashboardStore((s) => s.activeTab);

  return (
    <div className="flex h-[100svh] w-screen overflow-hidden bg-[#06080d] text-white">
      <DashboardSidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardTopbar />

        {activeTab === "map" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <DashboardGreeting />
            <div className="flex min-h-0 flex-1">
              <div className="relative min-w-0 flex-1">
                <MapPanel />
              </div>
              <IntelligencePanel />
            </div>
          </div>
        )}

        {activeTab === "forecast" && (
          <div className="min-h-0 flex-1">
            <ForecastView />
          </div>
        )}

        {activeTab === "enforcement" && (
          <div className="min-h-0 flex-1">
            <EnforcementView />
          </div>
        )}

        {activeTab === "events" && (
          <div className="min-h-0 flex-1">
            <EventPlanningView />
          </div>
        )}

        {activeTab === "corridor" && (
          <div className="min-h-0 flex-1">
            <GreenCorridorView />
          </div>
        )}
      </div>

      <HotspotDetailsDrawer />
      <SahayakAssistant />
      <CommandPalette />
    </div>
  );
}
