"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Pause, Play, PlayCircle } from "lucide-react";
import { BILINGUAL_LABEL, DATA_BADGE, PROTOTYPE_DISCLAIMER } from "@/lib/site-facts";
import { Logo } from "@/components/Logo";

const HeroScene3D = dynamic(
  () => import("@/components/HeroScene3D").then((m) => m.HeroScene3D),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse rounded-3xl border border-cyan-400/15 bg-[#0d121c]" />
    ),
  },
);

export function Hero() {
  const reduceMotion = useReducedMotion() ?? false;
  const [paused, setPaused] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const frozen = paused || reduceMotion;

  return (
    <section className="relative min-h-[100svh] overflow-hidden cl-bg cl-grid-bg">
      {/* Ambient cyan data trails (decorative, behind everything) */}
      {!frozen && (
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
          <div className="cl-streak absolute left-0 top-[22%] h-px w-40 bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
          <div className="cl-streak absolute left-0 top-[58%] h-px w-56 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent [animation-delay:1.4s]" />
          <div className="cl-streak absolute left-0 top-[78%] h-px w-32 bg-gradient-to-r from-transparent via-sky-400/60 to-transparent [animation-delay:2.6s]" />
        </div>
      )}

      {/* Full-bleed 3D city — overlaps the right side of the headline on desktop */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-full md:w-[62%]">
        <div className="absolute inset-0 bg-gradient-to-r from-[#06080d] via-[#06080d]/40 to-transparent md:via-transparent" />
        {isDesktop ? (
          <div className="pointer-events-auto h-full w-full">
            <HeroScene3D paused={paused} reduceMotion={reduceMotion} />
          </div>
        ) : (
          <MobileHeroVisual frozen={frozen} />
        )}
      </div>

      {/* Top bar */}
      <header className="relative z-30 mx-auto flex max-w-7xl items-center justify-between px-5 pt-6 sm:px-8">
        <Logo size={36} />
        <Link
          href="/dashboard"
          className="hidden items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/20 sm:inline-flex"
        >
          Enter Command Centre <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      {/* Headline block */}
      <div className="relative z-20 mx-auto flex min-h-[calc(100svh-90px)] max-w-7xl flex-col justify-center px-5 pb-16 sm:px-8">
        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="cl-kicker mb-5 max-w-xl text-cyan-300"
        >
          {BILINGUAL_LABEL}
        </motion.p>

        <motion.h1
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="cl-hero-title max-w-[14ch] text-white"
        >
          <span className="block">
            CLEAR THE <span className="cl-outline">LANE.</span>
          </span>
          <span className="block">MOVE THE CITY.</span>
        </motion.h1>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-8 flex max-w-xl flex-col gap-5"
        >
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3.5 py-1.5 text-xs font-medium text-cyan-200">
            <span className="cl-blink h-1.5 w-1.5 rounded-full bg-cyan-400" />
            {DATA_BADGE}
          </div>

          <p className="max-w-md text-base leading-relaxed text-slate-300/90">
            See where illegal parking chokes Bengaluru&apos;s roads — and exactly
            where and when to send patrols. All from real violation data — no
            jargon, no guesswork.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300"
            >
              Enter Command Centre <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-600/70 px-6 py-3.5 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/50 hover:text-white"
            >
              <PlayCircle className="h-4 w-4" /> Watch How It Works
            </a>
          </div>
        </motion.div>
      </div>

      {/* Motion pause control */}
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        className="absolute bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full border border-slate-600/70 bg-slate-950/70 px-4 py-2 text-xs font-medium text-slate-200 backdrop-blur transition hover:border-cyan-400/50"
      >
        {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
        {reduceMotion ? "Reduced motion" : paused ? "Resume motion" : "Pause motion"}
      </button>

      {/* Street-grid coordinate ticks */}
      <span className="pointer-events-none absolute bottom-6 left-5 z-20 font-mono text-[10px] tracking-wider text-cyan-300/40 sm:left-8">
        12.97°N · 77.59°E
      </span>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 h-24 bg-gradient-to-t from-[#06080d] to-transparent" />
      <p className="absolute bottom-2 left-1/2 z-30 -translate-x-1/2 text-[10px] text-slate-500">
        {PROTOTYPE_DISCLAIMER}
      </p>
    </section>
  );
}

/** Lightweight CSS-only hero visual for phones (no WebGL canvas). */
function MobileHeroVisual({ frozen }: { frozen: boolean }) {
  return (
    <div className="relative h-full w-full">
      <div className="cl-grid-bg-fine absolute inset-0 opacity-40" />
      <div className="absolute right-6 top-1/3 grid grid-cols-3 gap-3">
        {[
          { c: "bg-red-500", d: "0s" },
          { c: "bg-amber-400", d: "0.6s" },
          { c: "bg-cyan-400", d: "1.2s" },
          { c: "bg-amber-400", d: "0.3s" },
          { c: "bg-cyan-400", d: "0.9s" },
          { c: "bg-red-500", d: "1.5s" },
        ].map((dot, i) => (
          <span key={i} className="relative grid place-items-center">
            <span className={`h-2.5 w-2.5 rounded-full ${dot.c}`} />
            {!frozen && (
              <span
                className={`cl-pulse-ring absolute h-2.5 w-2.5 rounded-full ${dot.c}`}
                style={{ animationDelay: dot.d }}
              />
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
