"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
// Loads heavy, browser-only libraries (Turf.js, ECharts) from a CDN once —
// the same approach used for Leaflet. No npm dependency; runs only in the
// browser, so the server bundle stays small and the build needs no registry.

function loadScript(src: string, globalName: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if ((window as any)[globalName]) return resolve((window as any)[globalName]);

    const existing = document.querySelector(
      `script[data-cdn="${globalName}"]`,
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any)[globalName]));
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${globalName}`)));
      return;
    }

    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.cdn = globalName;
    s.onload = () => resolve((window as any)[globalName]);
    s.onerror = () => reject(new Error(`Failed to load ${globalName}`));
    document.body.appendChild(s);
  });
}

let turfPromise: Promise<any> | null = null;
/** Turf.js geospatial toolkit (window.turf). */
export function loadTurf(): Promise<any> {
  if (!turfPromise) {
    turfPromise = loadScript("https://cdn.jsdelivr.net/npm/@turf/turf@7/turf.min.js", "turf");
  }
  return turfPromise;
}

let echartsPromise: Promise<any> | null = null;
/** Apache ECharts charting library (window.echarts). */
export function loadECharts(): Promise<any> {
  if (!echartsPromise) {
    echartsPromise = loadScript("https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js", "echarts");
  }
  return echartsPromise;
}
