"use client";

import { useMemo } from "react";
import type { Hotspot, RiskLevel } from "@/lib/types";

const RISK_COLOR: Record<RiskLevel, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  moderate: "#22d3ee",
  low: "#10b981",
};

export function Hotspot2DMap({
  hotspots,
  selectedId,
  onSelect,
}: {
  hotspots: Hotspot[];
  selectedId: string | null;
  onSelect: (h: Hotspot) => void;
}) {
  const bounds = useMemo(() => {
    if (hotspots.length === 0) return null;
    const lats = hotspots.map((h) => h.latitude);
    const lngs = hotspots.map((h) => h.longitude);
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
  }, [hotspots]);

  const project = (h: Hotspot) => {
    if (!bounds) return { x: 50, y: 50 };
    const pad = 6;
    const w = 100 - pad * 2;
    const lngRange = bounds.maxLng - bounds.minLng || 1;
    const latRange = bounds.maxLat - bounds.minLat || 1;
    return {
      x: pad + ((h.longitude - bounds.minLng) / lngRange) * w,
      y: pad + ((bounds.maxLat - h.latitude) / latRange) * w,
    };
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#06080d]">
      <div className="cl-grid-bg-fine absolute inset-0 opacity-50" />
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">
        {/* faint corridor lines between near junctions for texture */}
        {hotspots.map((h) => {
          const { x, y } = project(h);
          const r = 0.9 + (h.riskIndex / 100) * 2.4;
          const isSel = h.id === selectedId;
          return (
            <g
              key={h.id}
              role="button"
              tabIndex={0}
              aria-label={`${h.name}, risk index ${h.riskIndex}, ${h.riskLevel}, busiest ${h.recommendedWindow.label}`}
              className="cursor-pointer focus:outline-none"
              onClick={() => onSelect(h)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(h);
                }
              }}
            >
              {isSel && (
                <circle cx={x} cy={y} r={r + 2.6} fill="none" stroke={RISK_COLOR[h.riskLevel]} strokeWidth={0.5} opacity={0.7} />
              )}
              {h.riskLevel === "critical" && (
                <circle cx={x} cy={y} r={r} fill="none" stroke={RISK_COLOR.critical} strokeWidth={0.4} opacity={0.5}>
                  <animate attributeName="r" values={`${r};${r + 3};${r}`} dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="2.4s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={x} cy={y} r={r} fill={RISK_COLOR[h.riskLevel]} opacity={isSel ? 1 : 0.8}>
                <title>{`${h.name} — index ${h.riskIndex} (${h.riskLevel}); busiest ${h.recommendedWindow.label}`}</title>
              </circle>
            </g>
          );
        })}
      </svg>

      <div className="pointer-events-none absolute right-3 top-3 rounded-lg border border-slate-700/70 bg-slate-950/70 px-2.5 py-1.5 font-mono text-[10px] text-cyan-300/70">
        2D · {hotspots.length} junctions
      </div>
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 text-[10px]">
        {(["critical", "high", "moderate", "low"] as RiskLevel[]).map((lvl) => (
          <span key={lvl} className="inline-flex items-center gap-1 rounded-full bg-slate-950/70 px-2 py-1 text-slate-300">
            <span className="h-2 w-2 rounded-full" style={{ background: RISK_COLOR[lvl] }} /> {lvl}
          </span>
        ))}
      </div>
    </div>
  );
}
