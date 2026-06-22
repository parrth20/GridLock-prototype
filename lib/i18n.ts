"use client";
// Lightweight bilingual (English / Kannada) labels for the dashboard chrome.
// Only the navigation + top bar are translated; data values stay as-is.
// Kannada (ಕನ್ನಡ) is the official language of Karnataka, so a bilingual UI
// makes the tool feel native to Bengaluru.

import { useDashboardStore, type Lang } from "@/lib/store";

export const STRINGS = {
  "nav.command": { en: "Bengaluru Traffic Command", kn: "ಬೆಂಗಳೂರು ಸಂಚಾರ ನಿಯಂತ್ರಣ" },
  "nav.map": { en: "Hotspots map", kn: "ಹಾಟ್‌ಸ್ಪಾಟ್ ನಕ್ಷೆ" },
  "nav.forecast": { en: "Forecast", kn: "ಮುನ್ಸೂಚನೆ" },
  "nav.enforcement": { en: "Patrol plan", kn: "ಗಸ್ತು ಯೋಜನೆ" },
  "nav.events": { en: "Event planning", kn: "ಕಾರ್ಯಕ್ರಮ ಯೋಜನೆ" },
  "nav.new": { en: "New", kn: "ಹೊಸ" },
  "nav.comingSoon": { en: "Coming soon", kn: "ಶೀಘ್ರದಲ್ಲೇ" },
  "nav.panIndia": { en: "Pan-India coverage", kn: "ಪ್ಯಾನ್-ಇಂಡಿಯಾ ವ್ಯಾಪ್ತಿ" },
  "nav.chatbot": { en: "Smarter AI chatbot", kn: "ಸ್ಮಾರ್ಟ್ AI ಚಾಟ್‌ಬಾಟ್" },
  "nav.camera": { en: "Live camera detection", kn: "ಲೈವ್ ಕ್ಯಾಮೆರಾ ಪತ್ತೆ" },
  "nav.back": { en: "Back to overview", kn: "ಸಮಗ್ರ ನೋಟಕ್ಕೆ ಹಿಂತಿರುಗಿ" },

  "top.connected": { en: "Connected", kn: "ಸಂಪರ್ಕಿತ" },
  "top.disconnected": { en: "Disconnected", kn: "ಸಂಪರ್ಕ ಇಲ್ಲ" },
  "top.bengaluruData": { en: "Bengaluru data", kn: "ಬೆಂಗಳೂರು ಡೇಟಾ" },
  "top.yourData": { en: "Your dataset", kn: "ನಿಮ್ಮ ಡೇಟಾ" },
  "top.sampleData": { en: "Sample data (demo)", kn: "ಮಾದರಿ ಡೇಟಾ" },
  "top.records": { en: "records", kn: "ದಾಖಲೆಗಳು" },
  "top.updated": { en: "updated", kn: "ನವೀಕರಿಸಲಾಗಿದೆ" },
  "top.upload": { en: "Upload data", kn: "ಡೇಟಾ ಅಪ್‌ಲೋಡ್" },
} as const;

export type StringKey = keyof typeof STRINGS;

export function tr(lang: Lang, key: StringKey): string {
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[lang] ?? entry.en;
}

/** Hook: returns a translator bound to the current UI language. */
export function useT(): (key: StringKey) => string {
  const lang = useDashboardStore((s) => s.lang);
  return (key: StringKey) => tr(lang, key);
}
