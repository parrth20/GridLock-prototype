/* eslint-disable @typescript-eslint/no-explicit-any */
// Loads Leaflet (+ heat plugin) from a CDN once, shared by every map component.
// No npm dependency, nothing bundled — runs only in the browser.

let leafletPromise: Promise<any> | null = null;

export function loadLeaflet(): Promise<any> {
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if ((window as any).L) return resolve((window as any).L);

    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);

    const js = document.createElement("script");
    js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    js.async = true;
    js.onload = () => {
      const heat = document.createElement("script");
      heat.src = "https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js";
      heat.async = true;
      heat.onload = () => resolve((window as any).L);
      heat.onerror = () => resolve((window as any).L); // heat is optional
      document.body.appendChild(heat);
    };
    js.onerror = () => reject(new Error("Failed to load Leaflet"));
    document.body.appendChild(js);
  });
  return leafletPromise;
}

/** Standard dark basemap (OpenStreetMap data via CARTO). */
export const DARK_TILES = {
  url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  options: {
    attribution: "© OpenStreetMap contributors © CARTO",
    subdomains: "abcd",
    maxZoom: 19,
  },
};

/** Free satellite imagery (Esri World Imagery — no API key). */
export const SATELLITE_TILES = {
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  options: {
    attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
    maxZoom: 19,
  },
};

/** Place-name labels to overlay on the satellite view. */
export const LABELS_TILES = {
  url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
  options: {
    attribution: "",
    subdomains: "abcd",
    maxZoom: 19,
  },
};
