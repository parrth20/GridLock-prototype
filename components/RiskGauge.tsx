"use client";

import React from "react";
import { motion } from "framer-motion";
import { useDashboardStore } from "@/lib/store";

interface RiskGaugeProps {
  score: number;
  label?: string;
  size?: "sm" | "md" | "lg";
}

export function RiskGauge({ score, label = "Risk Score", size = "md" }: RiskGaugeProps) {
  const prefersReducedMotion = useDashboardStore((state) => state.prefersReducedMotion);

  const sizeMap = {
    sm: { radius: 40, strokeWidth: 3, fontSize: "text-lg" },
    md: { radius: 60, strokeWidth: 4, fontSize: "text-2xl" },
    lg: { radius: 80, strokeWidth: 5, fontSize: "text-4xl" },
  };

  const { radius, strokeWidth, fontSize } = sizeMap[size];
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  // Determine color based on the Parking-Induced Congestion Risk Index bands
  let color = "#10b981"; // low (green)
  if (score >= 40) color = "#22d3ee"; // moderate (cyan)
  if (score >= 55) color = "#f59e0b"; // high (amber)
  if (score >= 70) color = "#ef4444"; // critical (red)

  const variants = {
    container: {
      initial: { opacity: 0, scale: 0.8 },
      animate: { opacity: 1, scale: 1, transition: { duration: 0.6 } },
    },
    score: {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { delay: 0.2, duration: 0.4 } },
    },
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-center"
      variants={prefersReducedMotion ? {} : variants.container}
      initial={prefersReducedMotion ? false : "initial"}
      animate={prefersReducedMotion ? false : "animate"}
    >
      <div className="relative" style={{ width: radius * 2.5, height: radius * 2.5 }}>
        {/* Outer glow */}
        <div
          className="absolute inset-0 rounded-full blur-lg"
          style={{
            background: `radial-gradient(circle, ${color}33 0%, transparent 70%)`,
          }}
        />

        {/* SVG Gauge */}
        <svg width={radius * 2.5} height={radius * 2.5} viewBox={`0 0 ${radius * 2.5} ${radius * 2.5}`}>
          {/* Background circle */}
          <circle
            cx={radius * 1.25}
            cy={radius * 1.25}
            r={radius}
            fill="none"
            stroke="#374151"
            strokeWidth={strokeWidth}
            opacity={0.3}
          />

          {/* Progress circle */}
          <motion.circle
            cx={radius * 1.25}
            cy={radius * 1.25}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            initial={prefersReducedMotion ? { strokeDashoffset: circumference } : { strokeDashoffset: circumference }}
            animate={prefersReducedMotion ? {} : { strokeDashoffset: offset }}
            transition={prefersReducedMotion ? {} : { duration: 1.5, ease: "easeInOut" }}
          />

          {/* Center text */}
          <text
            x={radius * 1.25}
            y={radius * 1.25}
            textAnchor="middle"
            dominantBaseline="middle"
            className={`${fontSize} font-bold fill-white`}
          >
            {score}
          </text>
        </svg>
      </div>

      <motion.p
        className="mt-3 text-sm text-slate-300 text-center"
        variants={prefersReducedMotion ? {} : variants.score}
        initial={prefersReducedMotion ? false : "initial"}
        animate={prefersReducedMotion ? false : "animate"}
      >
        {label}
      </motion.p>

      {/* Risk level indicator */}
      <div className="mt-2 flex items-center gap-1">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs text-slate-400">
          {score >= 70 ? "Critical" : score >= 55 ? "High" : score >= 40 ? "Moderate" : "Low"}
        </span>
      </div>
    </motion.div>
  );
}
