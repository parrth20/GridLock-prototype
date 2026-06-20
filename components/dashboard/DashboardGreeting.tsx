"use client";

import { useEffect, useState } from "react";
import { useHotspots } from "@/lib/hooks";

function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardGreeting() {
  const { data: hotspots } = useHotspots();
  const [hour, setHour] = useState<number | null>(null);

  useEffect(() => {
    setHour(new Date().getHours());
  }, []);

  const critical = hotspots?.filter((h) => h.riskLevel === "critical") ?? [];
  const lead = hotspots?.[0];

  return (
    <div className="border-b border-slate-800/70 bg-[#0a0e16]/80 px-4 py-3 backdrop-blur sm:px-6">
      <p className="text-sm font-semibold text-white sm:text-base">
        {hour === null ? "Welcome" : greetingFor(hour)}, Control Room.
      </p>
      <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
        {!hotspots ? (
          "Loading the latest read from the dataset…"
        ) : critical.length > 0 ? (
          <>
            <span className="font-semibold text-red-300">{critical.length} zone{critical.length === 1 ? "" : "s"}</span>{" "}
            flagged critical right now
            {lead ? (
              <>
                {" "}— <span className="text-cyan-300">{lead.name}</span> leads at index {lead.riskIndex}.
              </>
            ) : (
              "."
            )}
          </>
        ) : (
          "No zones at critical risk in the current read."
        )}
      </p>
    </div>
  );
}
