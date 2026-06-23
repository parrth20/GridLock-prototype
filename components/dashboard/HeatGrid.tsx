"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { loadECharts } from "@/lib/cdn-loaders";

interface GridJunction {
  name: string;
  recordCount: number;
  peakHourIST: number;
  hourly: number[];
}

const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}`);

export function HeatGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    async function build() {
      try {
        const [echarts, res] = await Promise.all([
          loadECharts(),
          fetch("/api/heatgrid", { headers: { accept: "application/json" } }),
        ]);
        if (!res.ok) throw new Error("fetch");
        const data = await res.json();
        const junctions: GridJunction[] = data.junctions ?? [];
        if (cancelled || !containerRef.current || junctions.length === 0) {
          if (!cancelled) setStatus("error");
          return;
        }

        // Busiest junction at the top of the chart.
        const names = junctions.map((j) => j.name).reverse();
        const yCount = names.length;
        let max = 1;
        const points: [number, number, number][] = [];
        junctions.forEach((j, jIdx) => {
          const y = yCount - 1 - jIdx; // reversed axis
          for (let h = 0; h < 24; h++) {
            const v = j.hourly[h] ?? 0;
            if (v > max) max = v;
            points.push([h, y, v]);
          }
        });

        const chart = echarts.init(containerRef.current, null, { renderer: "canvas" });
        chartRef.current = chart;
        chart.setOption({
          backgroundColor: "transparent",
          tooltip: {
            position: "top",
            backgroundColor: "#0d121c",
            borderColor: "#1e293b",
            textStyle: { color: "#e2e8f0", fontSize: 12 },
            formatter: (p: any) =>
              `<b>${names[p.value[1]]}</b><br/>${HOURS[p.value[0]]}:00 IST · ${p.value[2].toLocaleString()} violations`,
          },
          grid: { left: 4, right: 16, top: 8, bottom: 56, containLabel: true },
          xAxis: {
            type: "category",
            data: HOURS,
            name: "Hour (IST)",
            nameLocation: "middle",
            nameGap: 30,
            nameTextStyle: { color: "#64748b", fontSize: 11 },
            axisLabel: { color: "#94a3b8", fontSize: 9, interval: 1 },
            axisLine: { lineStyle: { color: "#1e293b" } },
            splitArea: { show: false },
          },
          yAxis: {
            type: "category",
            data: names,
            axisLabel: { color: "#cbd5e1", fontSize: 10, width: 150, overflow: "truncate" },
            axisLine: { lineStyle: { color: "#1e293b" } },
            splitArea: { show: false },
          },
          visualMap: {
            min: 0,
            max,
            calculable: true,
            orient: "horizontal",
            left: "center",
            bottom: 4,
            itemWidth: 12,
            itemHeight: 120,
            textStyle: { color: "#94a3b8", fontSize: 10 },
            inRange: { color: ["#0b1220", "#155e75", "#22d3ee", "#f7a93b", "#fb5d5d"] },
          },
          series: [
            {
              type: "heatmap",
              data: points,
              progressive: 0,
              itemStyle: { borderColor: "#06080d", borderWidth: 1 },
              emphasis: { itemStyle: { borderColor: "#fff", borderWidth: 1 } },
            },
          ],
        });
        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    build();

    const onResize = () => chartRef.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      try {
        chartRef.current?.dispose();
      } catch {
        /* ignore */
      }
      chartRef.current = null;
    };
  }, []);

  return (
    <div className="relative w-full">
      <div ref={containerRef} className="h-[560px] w-full" />
      {status === "loading" && (
        <div className="absolute inset-0 grid place-items-center">
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Building heat-grid…
          </p>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 grid place-items-center p-4 text-center">
          <p className="flex items-center gap-2 text-sm text-slate-400">
            <TriangleAlert className="h-4 w-4 text-amber-400" /> Couldn&rsquo;t load the heat-grid.
          </p>
        </div>
      )}
    </div>
  );
}
