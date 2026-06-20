import type { RiskLevel } from "@/lib/types";

export const RISK_HEX: Record<RiskLevel, string> = {
  critical: "#fb5d5d",
  high: "#f7a93b",
  moderate: "#38d6ee",
  low: "#3ddc97",
};

/** Hex colour with an alpha suffix, e.g. tint("critical", 0.12). */
export function riskTint(level: RiskLevel, alpha = 0.12): string {
  const hex = RISK_HEX[level];
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

export const CONFIDENCE_STYLE: Record<string, { dot: string; text: string }> = {
  high: { dot: "#3ddc97", text: "text-emerald-300" },
  medium: { dot: "#f7a93b", text: "text-amber-300" },
  low: { dot: "#94a3b8", text: "text-slate-400" },
};

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
